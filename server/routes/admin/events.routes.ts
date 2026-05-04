import { Router } from "express";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";
import { paramString } from "../../utils/params";
import { notFound } from "../../utils/route-helpers";
import { logger } from "../../utils/logger";
import {
  sendEventCanceledEmail,
  sendEventReminderEmail,
  sendRecordingAvailableEmail,
} from "../../services/email.service";
import * as r2Service from "../../services/r2.service";

const router = Router();

const VALID_STATUSES = ["draft", "published", "canceled", "completed"] as const;
const VALID_VISIBILITIES = ["public", "members_only", "counselors_only", "admins_only"] as const;
const VALID_REGISTRATION_TYPES = ["free", "paid"] as const;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidDate(d: Date): boolean {
  return d instanceof Date && !isNaN(d.getTime());
}

const DATE_FIELDS = ["date", "endDate", "registrationOpensAt", "registrationClosesAt", "recurrenceEndDate"] as const;

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function slugifyEventTitle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function buildUniqueEventSlug(title: string, requestedSlug?: string | null, currentEventId?: string): Promise<string> {
  const base = slugifyEventTitle(requestedSlug || title) || "event";

  for (let i = 0; i < 100; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const owner = await storage.events.getEventSlugOwner(candidate);
    if (!owner || owner.id === currentEventId) {
      return candidate;
    }
  }

  return `${base}-${Date.now().toString(36)}`;
}

async function normalizeEventImage<T extends { imageUrl?: string | null }>(event: T): Promise<T> {
  return {
    ...event,
    imageUrl: (await r2Service.normalizePublicUrl(event.imageUrl)) ?? null,
  };
}

function coerceDates(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data };
  for (const field of DATE_FIELDS) {
    if (result[field] !== undefined && result[field] !== null && result[field] !== "") {
      const d = new Date(result[field] as string);
      result[field] = isValidDate(d) ? d : null;
    } else if (result[field] === "" || result[field] === null) {
      result[field] = null;
    }
  }
  return result;
}

function validateEventData(data: any): string | null {
  if (data.status && !VALID_STATUSES.includes(data.status)) {
    return `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`;
  }

  if (data.visibility && !VALID_VISIBILITIES.includes(data.visibility)) {
    return `Invalid visibility. Must be one of: ${VALID_VISIBILITIES.join(", ")}`;
  }

  if (data.registrationType && !VALID_REGISTRATION_TYPES.includes(data.registrationType)) {
    return `Invalid registration type. Must be one of: ${VALID_REGISTRATION_TYPES.join(", ")}`;
  }

  if (data.slug && !SLUG_PATTERN.test(data.slug)) {
    return "Slug must use lowercase letters, numbers, and hyphens only";
  }

  if (data.registrationType === "paid" && (!data.registrationFee || data.registrationFee <= 0)) {
    return "Registration fee must be greater than 0 for paid events";
  }

  if (data.timezone && !isValidTimeZone(data.timezone)) {
    return "Timezone must be a valid IANA timezone, such as America/New_York";
  }

  if (data.registrationOpensAt && data.registrationClosesAt) {
    const opens = new Date(data.registrationOpensAt);
    const closes = new Date(data.registrationClosesAt);
    if (!isValidDate(opens) || !isValidDate(closes)) {
      return "Invalid registration date format";
    }
    if (closes < opens) {
      return "Registration close date must not precede registration open date";
    }
  }

  if (data.date && data.endDate) {
    const start = new Date(data.date);
    const end = new Date(data.endDate);
    if (!isValidDate(start) || !isValidDate(end)) {
      return "Invalid date format";
    }
    if (end < start) {
      return "End date must not precede start date";
    }
  }

  if (data.date && data.recurrenceEndDate) {
    const start = new Date(data.date);
    const recurrenceEnd = new Date(data.recurrenceEndDate);
    if (!isValidDate(start) || !isValidDate(recurrenceEnd)) {
      return "Invalid recurrence end date format";
    }
    if (recurrenceEnd < start) {
      return "Recurrence end date must not precede the event start date";
    }
  }

  if (data.virtualJoinUrl) {
    try {
      new URL(data.virtualJoinUrl);
    } catch {
      return "Virtual join URL must be a valid URL";
    }
  }

  return null;
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const eventsList = await storage.events.getAllEvents();
    res.json(await Promise.all(eventsList.map(normalizeEventImage)));
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const error = validateEventData(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }
    const payload = coerceDates(req.body) as any;
    payload.slug = await buildUniqueEventSlug(payload.title, payload.slug);
    const event = await storage.events.createEvent(payload);
    res.status(201).json(await normalizeEventImage(event));
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const error = validateEventData(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }
    const id = paramString(req.params.id);
    const oldEvent = await storage.events.getEvent(id);
    if (!oldEvent) {
      return notFound(res, "Event");
    }

    const payload = coerceDates(req.body) as any;
    if (payload.slug !== undefined || payload.title !== undefined) {
      const requestedSlug =
        payload.slug !== undefined
          ? payload.slug
          : oldEvent.slug;
      payload.slug = await buildUniqueEventSlug(
        payload.title || oldEvent.title,
        requestedSlug,
        id
      );
    }

    const event = await storage.events.updateEvent(id, payload);
    if (!event) {
      notFound(res, "Event");
      return;
    }

    // Cancellation cascade
    if (req.body.status === "canceled" && oldEvent.status !== "canceled") {
      const canceledCount = await storage.eventRegistrations.cancelAllActiveRegistrations(id);
      if (canceledCount > 0) {
        const confirmedRegistrations = await storage.eventRegistrations.getConfirmedRegistrations(id);
        for (const reg of confirmedRegistrations) {
          sendEventCanceledEmail(
            reg.email,
            reg.fullName.split(" ")[0],
            event.title
          ).catch((err) => {
            logger.email.warn("Failed to send event cancellation email", {
              email: reg.email,
              error: err instanceof Error ? err.message : String(err),
            });
          });
        }
        logger.app.info(`Event ${id} canceled, ${canceledCount} registrations updated.`);
      }
    }

    res.json(await normalizeEventImage(event));
  })
);

router.post(
  "/:id/duplicate",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const sourceEvent = await storage.events.getEvent(id);
    if (!sourceEvent) {
      return notFound(res, "Event");
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const {
      id: _id,
      createdAt: _createdAt,
      slug: _slug,
      ...eventData
    } = sourceEvent;

    const newEvent = await storage.events.createEvent({
      ...eventData,
      title: `Copy of ${sourceEvent.title}`,
      slug: await buildUniqueEventSlug(`Copy of ${sourceEvent.title}`),
      status: "draft",
      date: tomorrow,
      endDate: null,
      registrationOpensAt: null,
      registrationClosesAt: null,
      recordingUrl: null,
    } as any);

    res.status(201).json(await normalizeEventImage(newEvent));
  })
);

router.get(
  "/:id/analytics",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const analytics = await storage.eventRegistrations.getEventAnalytics(id);
    res.json(analytics);
  })
);

router.post(
  "/:id/notify",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const { type } = req.body;
    if (!type || !["reminder", "recording"].includes(type)) {
      return res.status(400).json({ message: "Invalid notification type" });
    }

    const event = await storage.events.getEvent(id);
    if (!event) {
      return notFound(res, "Event");
    }

    if (type === "recording" && !event.recordingUrl) {
      return res.status(400).json({ message: "Event has no recording URL" });
    }

    const confirmed = await storage.eventRegistrations.getConfirmedRegistrations(id);
    const eventDateStr = new Date(event.date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const eventLocation = event.locationName || event.location || (event.isVirtual ? "Virtual" : null);

    for (const reg of confirmed) {
      const firstName = reg.fullName.split(" ")[0];
      if (type === "reminder") {
        sendEventReminderEmail(reg.email, firstName, event.title, eventDateStr, eventLocation).catch((err) => {
          logger.email.warn("Failed to send reminder email", { email: reg.email, error: err });
        });
      } else if (type === "recording") {
        sendRecordingAvailableEmail(reg.email, firstName, event.title, event.recordingUrl!).catch((err) => {
          logger.email.warn("Failed to send recording email", { email: reg.email, error: err });
        });
      }
    }

    res.json({ sent: confirmed.length, message: `Notification sent to ${confirmed.length} registrants` });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await storage.events.deleteEvent(paramString(req.params.id));
    res.json({ message: "Event deleted" });
  })
);

export default router;

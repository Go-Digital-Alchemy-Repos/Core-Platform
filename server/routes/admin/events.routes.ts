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
import {
  EVENT_AUDIENCES,
  EVENT_CATEGORIES,
  EVENT_DELIVERY_MODES,
  EVENT_FORMATS,
  EVENT_REGISTRATION_APPROVAL_MODES,
  EVENT_STATUSES,
  EVENT_TYPES,
  type InsertEvent,
} from "@shared/schema";

const router = Router();

const VALID_STATUSES = EVENT_STATUSES;
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

type EventRequestData = Record<string, unknown> & {
  title?: string;
  slug?: string | null;
  tags?: unknown;
};

function textField(data: EventRequestData, field: string): string | undefined {
  const value = data[field];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberField(data: EventRequestData, field: string): number | undefined {
  const value = data[field];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function dateField(data: EventRequestData, field: string): string | number | Date | undefined {
  const value = data[field];
  if (typeof value === "string" || typeof value === "number" || value instanceof Date) return value;
  return undefined;
}

function validateEventData(data: EventRequestData): string | null {
  const status = textField(data, "status");
  const visibility = textField(data, "visibility");
  const registrationType = textField(data, "registrationType");
  const eventType = textField(data, "eventType");
  const category = textField(data, "category");
  const audience = textField(data, "audience");
  const format = textField(data, "format");
  const deliveryMode = textField(data, "deliveryMode");
  const registrationApprovalMode = textField(data, "registrationApprovalMode");
  const slug = textField(data, "slug");
  const timezone = textField(data, "timezone");
  const virtualJoinUrl = textField(data, "virtualJoinUrl");

  if (status && !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`;
  }

  if (visibility && !VALID_VISIBILITIES.includes(visibility as (typeof VALID_VISIBILITIES)[number])) {
    return `Invalid visibility. Must be one of: ${VALID_VISIBILITIES.join(", ")}`;
  }

  if (registrationType && !VALID_REGISTRATION_TYPES.includes(registrationType as (typeof VALID_REGISTRATION_TYPES)[number])) {
    return `Invalid registration type. Must be one of: ${VALID_REGISTRATION_TYPES.join(", ")}`;
  }

  if (eventType && !EVENT_TYPES.includes(eventType as (typeof EVENT_TYPES)[number])) {
    return `Invalid event type. Must be one of: ${EVENT_TYPES.join(", ")}`;
  }

  if (category && !EVENT_CATEGORIES.includes(category as (typeof EVENT_CATEGORIES)[number])) {
    return `Invalid event category. Must be one of: ${EVENT_CATEGORIES.join(", ")}`;
  }

  if (audience && !EVENT_AUDIENCES.includes(audience as (typeof EVENT_AUDIENCES)[number])) {
    return `Invalid event audience. Must be one of: ${EVENT_AUDIENCES.join(", ")}`;
  }

  if (format && !EVENT_FORMATS.includes(format as (typeof EVENT_FORMATS)[number])) {
    return `Invalid event format. Must be one of: ${EVENT_FORMATS.join(", ")}`;
  }

  if (deliveryMode && !EVENT_DELIVERY_MODES.includes(deliveryMode as (typeof EVENT_DELIVERY_MODES)[number])) {
    return `Invalid delivery mode. Must be one of: ${EVENT_DELIVERY_MODES.join(", ")}`;
  }

  if (
    registrationApprovalMode &&
    !EVENT_REGISTRATION_APPROVAL_MODES.includes(registrationApprovalMode as (typeof EVENT_REGISTRATION_APPROVAL_MODES)[number])
  ) {
    return `Invalid registration approval mode. Must be one of: ${EVENT_REGISTRATION_APPROVAL_MODES.join(", ")}`;
  }

  if (data.tags !== undefined && data.tags !== null) {
    if (!Array.isArray(data.tags) || data.tags.some((tag: unknown) => typeof tag !== "string")) {
      return "Tags must be a list of text values";
    }
  }

  if (slug && !SLUG_PATTERN.test(slug)) {
    return "Slug must use lowercase letters, numbers, and hyphens only";
  }

  if (registrationType === "paid" && (!numberField(data, "registrationFee") || numberField(data, "registrationFee")! <= 0)) {
    return "Registration fee must be greater than 0 for paid events";
  }

  if (timezone && !isValidTimeZone(timezone)) {
    return "Timezone must be a valid IANA timezone, such as America/New_York";
  }

  const registrationOpensAt = dateField(data, "registrationOpensAt");
  const registrationClosesAt = dateField(data, "registrationClosesAt");
  if (registrationOpensAt && registrationClosesAt) {
    const opens = new Date(registrationOpensAt);
    const closes = new Date(registrationClosesAt);
    if (!isValidDate(opens) || !isValidDate(closes)) {
      return "Invalid registration date format";
    }
    if (closes < opens) {
      return "Registration close date must not precede registration open date";
    }
  }

  const date = dateField(data, "date");
  const endDate = dateField(data, "endDate");
  if (date && endDate) {
    const start = new Date(date);
    const end = new Date(endDate);
    if (!isValidDate(start) || !isValidDate(end)) {
      return "Invalid date format";
    }
    if (end < start) {
      return "End date must not precede start date";
    }
  }

  const recurrenceEndDate = dateField(data, "recurrenceEndDate");
  if (date && recurrenceEndDate) {
    const start = new Date(date);
    const recurrenceEnd = new Date(recurrenceEndDate);
    if (!isValidDate(start) || !isValidDate(recurrenceEnd)) {
      return "Invalid recurrence end date format";
    }
    if (recurrenceEnd < start) {
      return "Recurrence end date must not precede the event start date";
    }
  }

  if (virtualJoinUrl) {
    try {
      new URL(virtualJoinUrl);
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
    const payload = coerceDates(req.body) as EventRequestData;
    if (Array.isArray(payload.tags)) {
      payload.tags = payload.tags.map((tag: string) => tag.trim()).filter(Boolean);
    }
    payload.slug = await buildUniqueEventSlug(payload.title ?? "Event", payload.slug);
    const event = await storage.events.createEvent(payload as InsertEvent);
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

    const payload = coerceDates(req.body) as EventRequestData;
    if (Array.isArray(payload.tags)) {
      payload.tags = payload.tags.map((tag: string) => tag.trim()).filter(Boolean);
    }
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

    const event = await storage.events.updateEvent(id, payload as Partial<InsertEvent>);
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
    } as InsertEvent);

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

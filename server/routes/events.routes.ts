import { Router } from "express";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { paramString } from "../utils/params";
import { optionalAuth, authenticateToken } from "../middleware/auth";
import type { Event } from "@shared/schema/events";
import * as r2Service from "../services/r2.service";

const router = Router();

const SENSITIVE_FIELDS = [
  "virtualJoinUrl",
  "zoomLink",
  "virtualDialInInfo",
  "recordingUrl",
] as const;

function canAccessEvent(event: Event, userRole: string | null): boolean {
  if (!event.visibility || event.visibility === "public") return true;
  if (!userRole) return false;
  if (userRole === "admin") return true;
  if (event.visibility === "members_only") return userRole === "therapist" || userRole === "client";
  if (event.visibility === "counselors_only") return userRole === "therapist";
  return false;
}

function redactSensitiveFields(event: Event): Event {
  const redacted = { ...event };
  for (const field of SENSITIVE_FIELDS) {
    (redacted as any)[field] = null;
  }
  return redacted;
}

async function normalizeEventImage(event: Event): Promise<Event> {
  return {
    ...event,
    imageUrl: (await r2Service.normalizePublicUrl(event.imageUrl)) ?? null,
  };
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const eventsList = await storage.events.getUpcomingEvents();
    res.json(await Promise.all(eventsList.map(normalizeEventImage)));
  })
);

router.get(
  "/all",
  asyncHandler(async (_req, res) => {
    const eventsList = await storage.events.getPublishedEvents();
    res.json(await Promise.all(eventsList.map(normalizeEventImage)));
  })
);

router.get(
  "/recordings",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const eventsList = await storage.events.getRecordingEvents();
    const userRole = req.user?.role ?? null;
    const userId = req.user?.id ?? null;

    let purchasedEventIds = new Set<string>();
    if (userId) {
      const purchases = await storage.recordingPurchases.getByUser(userId);
      purchasedEventIds = new Set(
        purchases.filter((p) => p.stripePaymentIntentId).map((p) => p.eventId)
      );
    }

    const filtered = eventsList
      .filter((event) => canAccessEvent(event, userRole))
      .map((event) => {
        if (event.recordingAccess === "paid" && event.recordingPrice) {
          if (userRole === "admin" || purchasedEventIds.has(event.id)) {
            return event;
          }
          return { ...event, recordingUrl: null };
        }
        return event;
      });
    res.json(await Promise.all(filtered.map(normalizeEventImage)));
  })
);

router.get(
  "/recordings/my-purchases",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const purchases = await storage.recordingPurchases.getByUser(req.user!.id);
    res.json(purchases);
  })
);

router.get(
  "/recordings/:eventId/purchase-status",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const eventId = paramString(req.params.eventId);
    const purchase = await storage.recordingPurchases.getByUserAndEvent(req.user!.id, eventId);
    res.json({
      purchased: !!(purchase && purchase.stripePaymentIntentId),
      pending: !!(purchase && !purchase.stripePaymentIntentId && purchase.stripeCheckoutSessionId),
    });
  })
);

router.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const event = await storage.events.getEventByIdentifier(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.status === "draft") {
      return res.status(404).json({ message: "Event not found" });
    }
    const userRole = req.user?.role ?? null;
    if (canAccessEvent(event, userRole)) {
      res.json(await normalizeEventImage(event));
    } else {
      res.json(await normalizeEventImage(redactSensitiveFields(event)));
    }
  })
);

export default router;

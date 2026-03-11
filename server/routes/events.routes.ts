import { Router } from "express";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { paramString } from "../utils/params";
import { optionalAuth } from "../middleware/auth";
import type { Event } from "@shared/schema/events";

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

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const eventsList = await storage.events.getUpcomingEvents();
    res.json(eventsList);
  })
);

router.get(
  "/all",
  asyncHandler(async (_req, res) => {
    const eventsList = await storage.events.getPublishedEvents();
    res.json(eventsList);
  })
);

router.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const event = await storage.events.getEvent(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.status === "draft") {
      return res.status(404).json({ message: "Event not found" });
    }
    const userRole = req.user?.role ?? null;
    if (canAccessEvent(event, userRole)) {
      res.json(event);
    } else {
      res.json(redactSensitiveFields(event));
    }
  })
);

export default router;

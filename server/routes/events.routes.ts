import { Router } from "express";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { paramString } from "../utils/params";

const router = Router();

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
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const event = await storage.events.getEvent(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.status === "draft") {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json(event);
  })
);

export default router;

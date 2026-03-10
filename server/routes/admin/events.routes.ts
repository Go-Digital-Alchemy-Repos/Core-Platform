import { Router } from "express";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";
import { paramString } from "../../utils/params";
import { notFound } from "../../utils/route-helpers";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const eventsList = await storage.events.getAllEvents();
    res.json(eventsList);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const event = await storage.events.createEvent(req.body);
    res.status(201).json(event);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const event = await storage.events.updateEvent(paramString(req.params.id), req.body);
    if (!event) {
      notFound(res, "Event");
      return;
    }
    res.json(event);
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

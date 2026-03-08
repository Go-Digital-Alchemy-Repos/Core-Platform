import { Router } from "express";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";

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
    const eventsList = await storage.events.getAllEvents();
    res.json(eventsList);
  })
);

export default router;

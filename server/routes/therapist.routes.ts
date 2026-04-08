import { Router } from "express";
import { storage } from "../storage/index";
import { authenticateToken, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/error-handler";
import { insertTherapistProfileSchema } from "@shared/schema";
import { enrichTherapistLocationFields } from "../services/therapist-location.service";

const router = Router();
const updateTherapistProfileSchema = insertTherapistProfileSchema.partial().omit({ userId: true });

router.use(authenticateToken);
router.use(requireRole("therapist"));

router.get(
  "/profile",
  asyncHandler(async (req, res) => {
    const profile = await storage.therapists.getProfileByUserId(req.user!.id);
    if (!profile) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }
    res.json(profile);
  })
);

router.put(
  "/profile",
  asyncHandler(async (req, res) => {
    const profile = await storage.therapists.getProfileByUserId(req.user!.id);
    if (!profile) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }

    const data = updateTherapistProfileSchema.parse(req.body);
    const enrichedData = await enrichTherapistLocationFields(data, profile);
    const updated = await storage.therapists.updateProfile(profile.id, enrichedData);
    await storage.activity.log(req.user!.id, "profile_update", "Profile updated by mental health professional");
    res.json(updated);
  })
);

router.get(
  "/subscription",
  asyncHandler(async (req, res) => {
    const subscription = await storage.subscriptions.getSubscriptionByTherapist(req.user!.id);
    res.json(subscription || null);
  })
);

export default router;

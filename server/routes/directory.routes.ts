import { Router } from "express";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { paramString } from "../utils/params";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      search,
      specialization,
      practiceMode,
      language,
      acceptingClients,
      limit,
      offset,
    } = req.query;

    const profiles = await storage.therapists.listProfiles({
      search: search as string,
      specialization: specialization as string,
      practiceMode: practiceMode as string,
      language: language as string,
      acceptingClients: acceptingClients === "true" ? true : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(profiles);
  })
);

router.get(
  "/featured",
  asyncHandler(async (_req, res) => {
    const featured = await storage.therapists.listFeatured();
    res.json(featured);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const profile = await storage.therapists.getProfileWithUser(paramString(req.params.id));
    if (!profile) {
      res.status(404).json({ message: "Therapist not found" });
      return;
    }
    res.json(profile);
  })
);

export default router;

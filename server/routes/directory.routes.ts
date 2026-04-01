import { Router } from "express";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { paramString } from "../utils/params";
import { therapistSearchSchema } from "@shared/types/directory";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = therapistSearchSchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ message: "Invalid query parameters", errors: parsed.error.flatten().fieldErrors });
      return;
    }

    const {
      search,
      specialization,
      practiceMode,
      language,
      country,
      acceptingClients,
      willingToTravel,
      page,
      pageSize,
      sort,
      latitude,
      longitude,
    } = parsed.data;

    const specArray = specialization ? specialization.split(",").filter(Boolean) : undefined;

    const result = await storage.therapists.listProfilesPaginated({
      search: search || undefined,
      specializations: specArray,
      practiceMode: practiceMode || undefined,
      language: language || undefined,
      country: country || undefined,
      acceptingClients,
      willingToTravel,
      page,
      pageSize,
      sort,
      latitude,
      longitude,
    });

    res.json(result);
  })
);

router.get(
  "/filters",
  asyncHandler(async (_req, res) => {
    const options = await storage.therapists.getFilterOptions();
    res.json(options);
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

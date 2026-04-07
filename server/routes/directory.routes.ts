import { Router } from "express";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { paramString } from "../utils/params";
import { therapistSearchSchema } from "@shared/types/directory";
import * as r2Service from "../services/r2.service";

const router = Router();

async function normalizeTherapistResult<T extends { user?: { profileImageUrl?: string | null } | null }>(item: T): Promise<T> {
  if (!item.user) return item;
  return {
    ...item,
    user: {
      ...item.user,
      profileImageUrl: (await r2Service.normalizePublicUrl(item.user.profileImageUrl)) ?? null,
    },
  };
}

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

    res.json({
      ...result,
      items: await Promise.all(result.items.map(normalizeTherapistResult)),
    });
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
    res.json(await Promise.all(featured.map(normalizeTherapistResult)));
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
    res.json(await normalizeTherapistResult(profile));
  })
);

export default router;

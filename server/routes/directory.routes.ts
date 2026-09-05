import { Router } from "express";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { paramString } from "../utils/params";
import { therapistSearchSchema, type TherapistWithUser } from "@shared/types/directory";
import * as r2Service from "../services/r2.service";
import { getDirectorySettings } from "../services/directory-settings.service";
import { getSiteFeatures } from "../services/site-features.service";
import { getDirectoryExperienceMode } from "@shared/types/directory-settings";
import {
  isPublicDirectoryProfile,
  toPublicDirectoryProfile,
} from "../services/directory-public-profile.service";

const router = Router();

async function normalizeTherapistResult(
  item: TherapistWithUser,
  directorySettings: Awaited<ReturnType<typeof getDirectorySettings>>,
) {
  const publicItem = toPublicDirectoryProfile(item, directorySettings);
  if (!publicItem.user) return publicItem;
  return {
    ...publicItem,
    user: {
      ...publicItem.user,
      profileImageUrl:
        (await r2Service.normalizePublicUrl(publicItem.user.profileImageUrl)) ?? null,
    },
  };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = therapistSearchSchema.safeParse(req.query);

    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Invalid query parameters", errors: parsed.error.flatten().fieldErrors });
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

    const directorySettings = await getDirectorySettings();
    const directoryMode = getDirectoryExperienceMode(directorySettings);

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
      requireApprovedApplication: directorySettings.directoryRequiresApprovedApplication,
      directoryMode,
    });

    res.json({
      ...result,
      items: await Promise.all(
        result.items.map((item) => normalizeTherapistResult(item, directorySettings)),
      ),
    });
  }),
);

router.get(
  "/filters",
  asyncHandler(async (_req, res) => {
    const directorySettings = await getDirectorySettings();
    const directoryMode = getDirectoryExperienceMode(directorySettings);
    const options = await storage.therapists.getFilterOptions(
      directorySettings.directoryRequiresApprovedApplication,
      directoryMode,
    );
    res.json(options);
  }),
);

router.get(
  "/featured",
  asyncHandler(async (_req, res) => {
    const directorySettings = await getDirectorySettings();
    const directoryMode = getDirectoryExperienceMode(directorySettings);
    const featured = await storage.therapists.listFeatured(
      directorySettings.directoryRequiresApprovedApplication,
      directoryMode,
    );
    res.json(
      await Promise.all(featured.map((item) => normalizeTherapistResult(item, directorySettings))),
    );
  }),
);

router.get(
  "/:id/jobs",
  asyncHandler(async (req, res) => {
    const directorySettings = await getDirectorySettings();
    const directoryMode = getDirectoryExperienceMode(directorySettings);
    const siteFeatures = await getSiteFeatures();

    if (
      directoryMode !== "store_locator" ||
      !directorySettings.directoryShowLocationJobs ||
      !siteFeatures.careersEnabled
    ) {
      res.json([]);
      return;
    }

    const profileId = paramString(req.params.id);
    const profile = await storage.therapists.getProfileWithUser(profileId);
    if (!profile || !isPublicDirectoryProfile(profile, directorySettings)) {
      res.status(404).json({ message: "Location not found" });
      return;
    }

    res.json(
      await storage.careers.getJobs({
        publicOnly: true,
        directoryProfileId: profileId,
      }),
    );
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const directorySettings = await getDirectorySettings();
    const profile = await storage.therapists.getProfileWithUser(paramString(req.params.id));
    if (!profile || !isPublicDirectoryProfile(profile, directorySettings)) {
      res.status(404).json({ message: "Therapist not found" });
      return;
    }
    res.json(await normalizeTherapistResult(profile, directorySettings));
  }),
);

export default router;

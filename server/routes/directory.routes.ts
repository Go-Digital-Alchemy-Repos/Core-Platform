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
      country,
      acceptingClients,
      page,
      pageSize,
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page as string) || 1);
    const parsedPageSize = Math.min(200, Math.max(1, parseInt(pageSize as string) || 200));

    const result = await storage.therapists.listProfilesPaginated({
      search: search as string,
      specialization: specialization as string,
      practiceMode: practiceMode as string,
      language: language as string,
      country: country as string,
      acceptingClients: acceptingClients === "true" ? true : undefined,
      page: parsedPage,
      pageSize: parsedPageSize,
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

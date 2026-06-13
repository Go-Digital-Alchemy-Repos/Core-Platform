import { Router } from "express";
import { storage } from "../storage";
import { asyncHandler } from "../middleware/error-handler";
import { paramString } from "../utils/params";
import { getPortfolioSettings } from "../services/portfolio.service";

const router = Router();

function getStringQuery(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

router.get(
  "/settings",
  asyncHandler(async (_req, res) => {
    res.json(await getPortfolioSettings());
  }),
);

router.get(
  "/filters",
  asyncHandler(async (_req, res) => {
    res.json(await storage.portfolio.getFilterOptions());
  }),
);

router.get(
  "/projects",
  asyncHandler(async (req, res) => {
    const rawLimit = getStringQuery(req.query.limit);
    const limit = rawLimit ? Math.max(1, Math.min(48, Number(rawLimit) || 0)) : undefined;
    res.json(await storage.portfolio.getProjects({
      publicOnly: true,
      q: getStringQuery(req.query.q),
      industry: getStringQuery(req.query.industry),
      category: getStringQuery(req.query.category),
      location: getStringQuery(req.query.location),
      featured: getStringQuery(req.query.featured) === "true",
      excludeFeatured: getStringQuery(req.query.excludeFeatured) === "true",
      limit,
    }));
  }),
);

router.get(
  "/projects/:slug",
  asyncHandler(async (req, res) => {
    const project = await storage.portfolio.getPublicProjectBySlug(paramString(req.params.slug));
    if (!project) return res.status(404).json({ message: "Portfolio project not found" });
    res.json(project);
  }),
);

export default router;

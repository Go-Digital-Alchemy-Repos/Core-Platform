import { Router } from "express";
import {
  PORTFOLIO_INDUSTRIES,
  PORTFOLIO_STATUSES,
  PORTFOLIO_VISIBILITIES,
  insertPortfolioProjectSchema,
  portfolioSettingsSchema,
  type InsertPortfolioProject,
  type PortfolioProject,
} from "@shared/schema";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/error-handler";
import { paramString } from "../../utils/params";
import { getPortfolioSettings, savePortfolioSettings } from "../../services/portfolio.service";

const router = Router();
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const dateFields = ["startedAt", "completedAt", "publishedAt"] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function buildUniqueSlug(title: string, requestedSlug?: string | null, currentProjectId?: string) {
  const base = slugify(requestedSlug || title) || "project";
  for (let i = 0; i < 100; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const owner = await storage.portfolio.getProjectSlugOwner(candidate);
    if (!owner || owner.id === currentProjectId) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function normalizeBlankStrings(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      typeof value === "string" && value.trim() === "" ? null : value,
    ]),
  );
}

function coerceProjectPayload(body: Record<string, unknown>, userId?: string): Record<string, unknown> {
  const normalized = normalizeBlankStrings(body);
  for (const field of dateFields) {
    const value = normalized[field];
    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      normalized[field] = Number.isNaN(date.getTime()) ? null : date;
    }
  }
  if (typeof normalized.sortOrder === "string") normalized.sortOrder = Number(normalized.sortOrder) || 0;
  if (!normalized.createdBy && userId) normalized.createdBy = userId;
  if (userId) normalized.updatedBy = userId;
  return normalized;
}

function validateProjectData(data: Record<string, unknown>): string | null {
  const status = typeof data.status === "string" ? data.status : undefined;
  const visibility = typeof data.visibility === "string" ? data.visibility : undefined;
  const industry = typeof data.industry === "string" ? data.industry : undefined;
  const slug = typeof data.slug === "string" ? data.slug : undefined;
  if (status && !PORTFOLIO_STATUSES.includes(status as PortfolioProject["status"])) return "Invalid portfolio status";
  if (visibility && !PORTFOLIO_VISIBILITIES.includes(visibility as PortfolioProject["visibility"])) return "Invalid portfolio visibility";
  if (industry && !PORTFOLIO_INDUSTRIES.includes(industry as PortfolioProject["industry"])) return "Invalid portfolio industry";
  if (slug && !SLUG_PATTERN.test(slug)) return "Slug must use lowercase letters, numbers, and hyphens only";
  return null;
}

router.get(
  "/projects",
  asyncHandler(async (req, res) => {
    res.json(await storage.portfolio.getProjects({
      q: typeof req.query.q === "string" ? req.query.q : undefined,
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      industry: typeof req.query.industry === "string" ? req.query.industry : undefined,
      category: typeof req.query.category === "string" ? req.query.category : undefined,
      location: typeof req.query.location === "string" ? req.query.location : undefined,
    }));
  }),
);

router.get(
  "/projects/:id",
  asyncHandler(async (req, res) => {
    const project = await storage.portfolio.getProject(paramString(req.params.id));
    if (!project) return res.status(404).json({ message: "Portfolio project not found" });
    res.json(project);
  }),
);

router.post(
  "/projects",
  asyncHandler(async (req, res) => {
    const payload = coerceProjectPayload(req.body, req.user?.id);
    const validationError = validateProjectData(payload);
    if (validationError) return res.status(400).json({ message: validationError });
    payload.slug = await buildUniqueSlug(String(payload.title ?? ""), typeof payload.slug === "string" ? payload.slug : null);
    const parsed = insertPortfolioProjectSchema.safeParse(payload);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid portfolio project payload", errors: parsed.error.flatten() });
    }
    const project = await storage.portfolio.createProject(parsed.data);
    res.status(201).json(project);
  }),
);

router.put(
  "/projects/:id",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const current = await storage.portfolio.getProject(id);
    if (!current) return res.status(404).json({ message: "Portfolio project not found" });
    const payload = coerceProjectPayload(req.body, req.user?.id);
    const validationError = validateProjectData(payload);
    if (validationError) return res.status(400).json({ message: validationError });
    if (typeof payload.title === "string" || typeof payload.slug === "string") {
      payload.slug = await buildUniqueSlug(
        String(payload.title ?? current.title),
        typeof payload.slug === "string" ? payload.slug : current.slug,
        id,
      );
    }
    const parsed = insertPortfolioProjectSchema.partial().safeParse(payload);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid portfolio project payload", errors: parsed.error.flatten() });
    }
    const project = await storage.portfolio.updateProject(id, parsed.data as Partial<InsertPortfolioProject>);
    res.json(project);
  }),
);

router.delete(
  "/projects/:id",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const existing = await storage.portfolio.getProject(id);
    if (!existing) return res.status(404).json({ message: "Portfolio project not found" });
    await storage.portfolio.deleteProject(id);
    res.json({ success: true });
  }),
);

router.get(
  "/settings",
  asyncHandler(async (_req, res) => {
    res.json(await getPortfolioSettings());
  }),
);

router.put(
  "/settings",
  asyncHandler(async (req, res) => {
    const parsed = portfolioSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid portfolio settings", errors: parsed.error.flatten() });
    }
    res.json(await savePortfolioSettings(parsed.data));
  }),
);

export default router;

import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { paramString } from "../../utils/params";
import { insertCmsPageSchema } from "@shared/schema";

const router = Router();

const PAGE_TYPES = ["home", "about", "contact", "landing", "custom"] as const;
const STATUSES = ["draft", "published", "archived"] as const;

const createPageSchema = insertCmsPageSchema.extend({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-/]+$/, "Slug must be lowercase with hyphens only"),
  pageType: z.enum(PAGE_TYPES).default("custom"),
  status: z.enum(STATUSES).default("draft"),
});

const updatePageSchema = createPageSchema.partial().extend({
  title: z.string().min(1).optional(),
  slug: z.string().regex(/^[a-z0-9-/]+$/).optional(),
});

function normalizeSlug(slug: string): string {
  return slug.toLowerCase().trim().replace(/\s+/g, "-");
}

router.get("/pages", async (req, res) => {
  try {
    const pages = await storage.cmsPages.getAllPages();
    res.json(pages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch CMS pages" });
  }
});

router.post("/pages", async (req, res) => {
  try {
    const parsed = createPageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || "Validation failed" });
    }

    const data = parsed.data;
    const slug = normalizeSlug(data.slug);

    const existing = await storage.cmsPages.getPageBySlug(slug);
    if (existing) {
      return res.status(409).json({ error: "A page with this slug already exists" });
    }

    const adminId = (req as any).user?.id;
    const page = await storage.cmsPages.createPage({
      ...data,
      slug,
      createdBy: adminId,
      updatedBy: adminId,
    });

    await storage.cmsPageRevisions.createRevision({
      pageId: page.id,
      title: page.title,
      content: page.content as Record<string, unknown>,
      status: page.status,
      changedBy: adminId,
      changeNote: "Initial creation",
    });

    res.status(201).json(page);
  } catch (error) {
    res.status(500).json({ error: "Failed to create CMS page" });
  }
});

router.get("/pages/:id", async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const page = await storage.cmsPages.getPage(id);
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json(page);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch CMS page" });
  }
});

router.put("/pages/:id", async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const page = await storage.cmsPages.getPage(id);
    if (!page) return res.status(404).json({ error: "Page not found" });

    const parsed = updatePageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || "Validation failed" });
    }

    const data = parsed.data;
    if (data.slug) {
      data.slug = normalizeSlug(data.slug);
      const existing = await storage.cmsPages.getPageBySlug(data.slug);
      if (existing && existing.id !== id) {
        return res.status(409).json({ error: "A page with this slug already exists" });
      }
    }

    const adminId = (req as any).user?.id;

    await storage.cmsPageRevisions.createRevision({
      pageId: id,
      title: page.title,
      content: page.content as Record<string, unknown>,
      status: page.status,
      changedBy: adminId,
      changeNote: "Updated",
    });

    const updated = await storage.cmsPages.updatePage(id, { ...data, updatedBy: adminId });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update CMS page" });
  }
});

router.delete("/pages/:id", async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const page = await storage.cmsPages.getPage(id);
    if (!page) return res.status(404).json({ error: "Page not found" });

    const force = req.query.force === "true";
    if (page.status === "published" && !force) {
      return res.status(400).json({ error: "Cannot delete a published page. Unpublish it first or use ?force=true" });
    }

    await storage.cmsPages.deletePage(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete CMS page" });
  }
});

router.post("/pages/:id/publish", async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const adminId = (req as any).user?.id;
    const page = await storage.cmsPages.publishPage(id, adminId);
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json(page);
  } catch (error) {
    res.status(500).json({ error: "Failed to publish CMS page" });
  }
});

router.post("/pages/:id/unpublish", async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const adminId = (req as any).user?.id;
    const page = await storage.cmsPages.unpublishPage(id, adminId);
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json(page);
  } catch (error) {
    res.status(500).json({ error: "Failed to unpublish CMS page" });
  }
});

router.get("/pages/:id/revisions", async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const page = await storage.cmsPages.getPage(id);
    if (!page) return res.status(404).json({ error: "Page not found" });
    const revisions = await storage.cmsPageRevisions.getRevisions(id);
    res.json(revisions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch revisions" });
  }
});

export default router;

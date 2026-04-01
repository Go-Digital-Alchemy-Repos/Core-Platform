import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { paramString } from "../../utils/params";
import { insertCmsPageSchema } from "@shared/schema";

const router = Router();

const PAGE_TYPES = ["home", "about", "contact", "landing", "custom"] as const;
const STATUSES = ["draft", "published", "scheduled", "archived"] as const;

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
    console.error("[cms] Failed to fetch pages:", error);
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
    if (data.status === "scheduled") {
      return res.status(400).json({ error: "Use the /schedule endpoint to schedule a page" });
    }
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
    console.error("[cms] Failed to create page:", error);
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
    console.error("[cms] Failed to fetch page:", error);
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
    if (data.status === "scheduled" && page.status !== "scheduled") {
      return res.status(400).json({ error: "Use the /schedule endpoint to schedule a page" });
    }
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
    console.error("[cms] Failed to update page:", error);
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
    console.error("[cms] Failed to delete page:", error);
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
    console.error("[cms] Failed to publish page:", error);
    res.status(500).json({ error: "Failed to publish CMS page" });
  }
});

router.post("/pages/:id/schedule", async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const adminId = (req as any).user?.id;
    const { scheduledAt } = req.body;
    if (!scheduledAt) {
      return res.status(400).json({ error: "scheduledAt is required" });
    }
    const date = new Date(scheduledAt);
    if (isNaN(date.getTime()) || date <= new Date()) {
      return res.status(400).json({ error: "scheduledAt must be a valid future date" });
    }
    const page = await storage.cmsPages.schedulePage(id, date, adminId);
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json(page);
  } catch (error) {
    console.error("[cms] Failed to schedule page:", error);
    res.status(500).json({ error: "Failed to schedule CMS page" });
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
    console.error("[cms] Failed to unpublish page:", error);
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
    console.error("[cms] Failed to fetch revisions:", error);
    res.status(500).json({ error: "Failed to fetch revisions" });
  }
});

router.post("/pages/:pageId/revisions/:revisionId/restore", async (req, res) => {
  try {
    const pageId = paramString(req.params.pageId);
    const revisionId = paramString(req.params.revisionId);
    const adminId = (req as any).user?.id;

    const page = await storage.cmsPages.getPage(pageId);
    if (!page) return res.status(404).json({ error: "Page not found" });

    const revision = await storage.cmsPageRevisions.getRevision(revisionId);
    if (!revision || revision.pageId !== pageId) {
      return res.status(404).json({ error: "Revision not found" });
    }

    await storage.cmsPageRevisions.createRevision({
      pageId,
      title: page.title,
      content: page.content as Record<string, unknown>,
      status: page.status,
      changedBy: adminId,
      changeNote: "Before restore",
    });

    const restored = await storage.cmsPages.updatePage(pageId, {
      title: revision.title,
      content: revision.content as Record<string, unknown>,
      updatedBy: adminId,
    });

    await storage.cmsPageRevisions.createRevision({
      pageId,
      title: revision.title,
      content: revision.content as Record<string, unknown>,
      status: page.status,
      changedBy: adminId,
      changeNote: "Restored from revision",
    });

    res.json(restored);
  } catch (error) {
    console.error("[cms] Failed to restore revision:", error);
    res.status(500).json({ error: "Failed to restore revision" });
  }
});

export default router;

import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";
import { insertBlogPostSchema, insertBlogTaxonomySchema, type BlogPost, type BlogTaxonomy } from "@shared/schema";
import { paramString } from "../../utils/params";
import * as r2Service from "../../services/r2.service";

const router = Router();

const blogPostSchemaWithCoercedDate = insertBlogPostSchema.extend({
  publishedAt: z.coerce.date().optional().nullable(),
  scheduledAt: z.coerce.date().optional().nullable(),
});
const blogTaxonomyMutationSchema = insertBlogTaxonomySchema.pick({
  name: true,
  type: true,
  parentId: true,
  sortOrder: true,
}).extend({
  slug: z.string().optional(),
});

function slugifyTaxonomy(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildUniqueTaxonomySlug(type: BlogTaxonomy["type"], name: string, taxonomies: BlogTaxonomy[], ignoreId?: string) {
  const baseSlug = slugifyTaxonomy(name) || type;
  const existingSlugs = new Set(
    taxonomies
      .filter((taxonomy) => taxonomy.type === type && taxonomy.id !== ignoreId)
      .map((taxonomy) => taxonomy.slug.toLowerCase())
  );

  let suffix = 1;
  let candidate = baseSlug;
  while (existingSlugs.has(candidate.toLowerCase())) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
  return candidate;
}

async function getResolvedTaxonomies(): Promise<BlogTaxonomy[]> {
  const posts = await storage.blog.getAllPosts();
  for (const post of posts) {
    await ensureTaxonomiesExist(post.category, post.tags);
  }
  return storage.blogTaxonomies.getAllTaxonomies();
}

async function ensureTaxonomiesExist(category: string | null | undefined, tags: string[] | null | undefined) {
  const existing = await storage.blogTaxonomies.getAllTaxonomies();

  if (category?.trim()) {
    const match = existing.find((item) => item.type === "category" && item.name.trim().toLowerCase() === category.trim().toLowerCase());
    if (!match) {
      const slug = buildUniqueTaxonomySlug("category", category, existing);
      const created = await storage.blogTaxonomies.createTaxonomy({
        name: category.trim(),
        slug,
        type: "category",
        parentId: null,
        sortOrder: 0,
      });
      existing.push(created);
    }
  }

  for (const tag of tags ?? []) {
    if (!tag.trim()) continue;
    const match = existing.find((item) => item.type === "tag" && item.name.trim().toLowerCase() === tag.trim().toLowerCase());
    if (!match) {
      const slug = buildUniqueTaxonomySlug("tag", tag, existing);
      const created = await storage.blogTaxonomies.createTaxonomy({
        name: tag.trim(),
        slug,
        type: "tag",
        parentId: null,
        sortOrder: 0,
      });
      existing.push(created);
    }
  }
}

async function normalizePostImages(post: BlogPost): Promise<BlogPost> {
  return {
    ...post,
    coverImageUrl: (await r2Service.normalizePublicUrl(post.coverImageUrl)) ?? null,
    ogImageUrl: (await r2Service.normalizePublicUrl(post.ogImageUrl)) ?? null,
  };
}

router.get(
  "/settings/taxonomies",
  asyncHandler(async (_req, res) => {
    res.json(await getResolvedTaxonomies());
  })
);

router.post(
  "/settings/taxonomies",
  asyncHandler(async (req, res) => {
    const data = blogTaxonomyMutationSchema.parse(req.body);
    const allTaxonomies = await storage.blogTaxonomies.getAllTaxonomies();

    const nameExists = allTaxonomies.some(
      (taxonomy) => taxonomy.type === data.type && taxonomy.name.trim().toLowerCase() === data.name.trim().toLowerCase()
    );
    if (nameExists) {
      return res.status(409).json({ message: `A ${data.type} with that name already exists` });
    }

    if (data.parentId) {
      const parent = await storage.blogTaxonomies.getTaxonomy(data.parentId);
      if (!parent || parent.type !== "category") {
        return res.status(400).json({ message: "Parent category not found" });
      }
    }

    const created = await storage.blogTaxonomies.createTaxonomy({
      name: data.name.trim(),
      slug: data.slug?.trim() || buildUniqueTaxonomySlug(data.type, data.name, allTaxonomies),
      type: data.type,
      parentId: data.type === "category" ? data.parentId ?? null : null,
      sortOrder: data.sortOrder ?? 0,
    });

    res.status(201).json(created);
  })
);

router.put(
  "/settings/taxonomies/:id",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const existingTaxonomy = await storage.blogTaxonomies.getTaxonomy(id);
    if (!existingTaxonomy) {
      return res.status(404).json({ message: "Taxonomy not found" });
    }

    const data = blogTaxonomyMutationSchema.partial().parse(req.body);
    const nextName = data.name?.trim() || existingTaxonomy.name;
    const nextType = data.type ?? existingTaxonomy.type;
    const allTaxonomies = await storage.blogTaxonomies.getAllTaxonomies();

    const nameExists = allTaxonomies.some(
      (taxonomy) =>
        taxonomy.id !== id &&
        taxonomy.type === nextType &&
        taxonomy.name.trim().toLowerCase() === nextName.trim().toLowerCase()
    );
    if (nameExists) {
      return res.status(409).json({ message: `A ${nextType} with that name already exists` });
    }

    if (data.parentId) {
      if (data.parentId === id) {
        return res.status(400).json({ message: "A taxonomy cannot be its own parent" });
      }
      const parent = await storage.blogTaxonomies.getTaxonomy(data.parentId);
      if (!parent || parent.type !== "category") {
        return res.status(400).json({ message: "Parent category not found" });
      }
    }

    const updated = await storage.blogTaxonomies.updateTaxonomy(id, {
      name: nextName,
      slug: data.slug?.trim() || buildUniqueTaxonomySlug(nextType, nextName, allTaxonomies, id),
      type: nextType,
      parentId: nextType === "category" ? data.parentId ?? existingTaxonomy.parentId ?? null : null,
      sortOrder: data.sortOrder ?? existingTaxonomy.sortOrder,
    });

    if (!updated) {
      return res.status(404).json({ message: "Taxonomy not found" });
    }

    if (existingTaxonomy.type === "category" && existingTaxonomy.name !== updated.name) {
      await storage.blog.renameCategoryReferences(existingTaxonomy.name, updated.name);
    }
    if (existingTaxonomy.type === "tag" && existingTaxonomy.name !== updated.name) {
      await storage.blog.renameTagReferences(existingTaxonomy.name, updated.name);
    }

    res.json(updated);
  })
);

router.delete(
  "/settings/taxonomies/:id",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const existingTaxonomy = await storage.blogTaxonomies.getTaxonomy(id);
    if (!existingTaxonomy) {
      return res.status(404).json({ message: "Taxonomy not found" });
    }

    if (existingTaxonomy.type === "category") {
      await storage.blogTaxonomies.clearParent(id);
      await storage.blog.renameCategoryReferences(existingTaxonomy.name, null);
    } else {
      await storage.blog.renameTagReferences(existingTaxonomy.name, null);
    }

    await storage.blogTaxonomies.deleteTaxonomy(id);
    res.json({ success: true });
  })
);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const posts = await storage.blog.getAllPosts();
    res.json(await Promise.all(posts.map(normalizePostImages)));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const post = await storage.blog.getPost(paramString(req.params.id));
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(await normalizePostImages(post));
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = blogPostSchemaWithCoercedDate.parse(req.body);
    if (data.scheduledAt && data.scheduledAt <= new Date()) {
      return res.status(400).json({ message: "scheduledAt must be a future date" });
    }
    if (data.scheduledAt) {
      data.isPublished = false;
      data.publishedAt = null;
    }
    if (data.isPublished) {
      data.scheduledAt = null;
    }
    await ensureTaxonomiesExist(data.category, data.tags);
    const post = await storage.blog.createPost(data);
    res.status(201).json(await normalizePostImages(post));
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const data = blogPostSchemaWithCoercedDate.partial().parse(req.body);
    if (data.scheduledAt && data.scheduledAt <= new Date()) {
      return res.status(400).json({ message: "scheduledAt must be a future date" });
    }
    if (data.scheduledAt) {
      data.isPublished = false;
      data.publishedAt = null;
    }
    if (data.isPublished === true) {
      data.scheduledAt = null;
    }
    await ensureTaxonomiesExist(data.category, data.tags);
    const post = await storage.blog.updatePost(id, data);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(await normalizePostImages(post));
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await storage.blog.deletePost(paramString(req.params.id));
    res.json({ message: "Post deleted" });
  })
);

export default router;

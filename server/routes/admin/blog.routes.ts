import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";
import { insertBlogPostSchema, type BlogPost } from "@shared/schema";
import { paramString } from "../../utils/params";
import * as r2Service from "../../services/r2.service";

const router = Router();

const blogPostSchemaWithCoercedDate = insertBlogPostSchema.extend({
  publishedAt: z.coerce.date().optional().nullable(),
  scheduledAt: z.coerce.date().optional().nullable(),
});

async function normalizePostImages(post: BlogPost): Promise<BlogPost> {
  return {
    ...post,
    coverImageUrl: (await r2Service.normalizePublicUrl(post.coverImageUrl)) ?? null,
    ogImageUrl: (await r2Service.normalizePublicUrl(post.ogImageUrl)) ?? null,
  };
}

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

import { Router } from "express";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import type { BlogPost } from "@shared/schema";
import * as r2Service from "../services/r2.service";

const router = Router();

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
    const posts = await storage.blog.getPublishedPosts();
    res.json(await Promise.all(posts.map(normalizePostImages)));
  })
);

router.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const slug = req.params.slug as string;
    const post = await storage.blog.getPostBySlug(slug);
    if (!post || !post.isPublished) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(await normalizePostImages(post));
  })
);

export default router;

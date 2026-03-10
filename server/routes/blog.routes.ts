import { Router } from "express";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const posts = await storage.blog.getPublishedPosts();
    res.json(posts);
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
    res.json(post);
  })
);

export default router;

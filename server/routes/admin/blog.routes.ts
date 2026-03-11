import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";
import { insertBlogPostSchema } from "@shared/schema";
import { paramString } from "../../utils/params";

const router = Router();

const blogPostSchemaWithCoercedDate = insertBlogPostSchema.extend({
  publishedAt: z.coerce.date().optional().nullable(),
});

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const posts = await storage.blog.getAllPosts();
    res.json(posts);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const post = await storage.blog.getPost(paramString(req.params.id));
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(post);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = blogPostSchemaWithCoercedDate.parse(req.body);
    const post = await storage.blog.createPost(data);
    res.status(201).json(post);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const data = blogPostSchemaWithCoercedDate.partial().parse(req.body);
    const post = await storage.blog.updatePost(id, data);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(post);
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

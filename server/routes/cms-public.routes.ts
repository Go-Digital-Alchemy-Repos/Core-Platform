import { Router } from "express";
import { asyncHandler } from "../middleware/error-handler";
import { storage } from "../storage";
import { paramString } from "../utils/params";

const router = Router();

router.get(
  "/pages/by-slug/:slug",
  asyncHandler(async (req, res) => {
    const slug = paramString(req.params.slug);
    const page = await storage.cmsPages.getPageBySlug(slug);
    if (!page || page.status !== "published") {
      return res.status(404).json({ error: "Page not found" });
    }
    res.json(page);
  })
);

export default router;

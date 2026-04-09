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

router.get(
  "/sidebars/default",
  asyncHandler(async (_req, res) => {
    const sidebar = await storage.cmsSidebars.getDefault();
    if (!sidebar) {
      return res.status(404).json({ error: "No default sidebar configured" });
    }
    res.json(sidebar);
  })
);

router.get(
  "/sidebars/:id",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const sidebar = await storage.cmsSidebars.getById(id);
    if (!sidebar) {
      return res.status(404).json({ error: "Sidebar not found" });
    }
    res.json(sidebar);
  })
);

router.get(
  "/menus/:location",
  asyncHandler(async (req, res) => {
    const location = paramString(req.params.location);
    if (!["header", "footer"].includes(location)) {
      return res.status(400).json({ error: "Invalid menu location" });
    }
    const menu = await storage.cmsMenus.getByLocation(location);
    if (!menu) {
      return res.status(404).json({ error: "No menu configured for this location" });
    }
    res.json(menu);
  })
);

export default router;

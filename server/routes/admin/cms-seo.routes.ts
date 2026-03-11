import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/error-handler";
import { insertSeoSettingsSchema } from "@shared/schema";

const router = Router();

const updateSeoSettingsSchema = insertSeoSettingsSchema.partial();

router.get(
  "/seo",
  asyncHandler(async (_req, res) => {
    const settings = await storage.seoSettings.get();
    res.json(settings ?? {});
  })
);

router.put(
  "/seo",
  asyncHandler(async (req, res) => {
    const parsed = updateSeoSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || "Validation failed" });
    }
    const settings = await storage.seoSettings.upsert(parsed.data);
    res.json(settings);
  })
);

export default router;

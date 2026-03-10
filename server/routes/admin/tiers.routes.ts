import { Router } from "express";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";
import { paramString } from "../../utils/params";
import { notFound } from "../../utils/route-helpers";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const tiers = await storage.tiers.getAllTiers();
    res.json(tiers);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const tier = await storage.tiers.createTier(req.body);
    res.status(201).json(tier);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const tier = await storage.tiers.updateTier(paramString(req.params.id), req.body);
    if (!tier) {
      notFound(res, "Tier");
      return;
    }
    res.json(tier);
  })
);

export default router;

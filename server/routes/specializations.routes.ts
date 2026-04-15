import { Router } from "express";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { authenticateToken, requireAdminPermission } from "../middleware/auth";
import { z } from "zod";

const router = Router();

const bodySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  sortOrder: z.number().int().optional(),
});

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const specs = await storage.specializations.getAll();
    res.json(specs);
  })
);

router.post(
  "/",
  authenticateToken,
  requireAdminPermission("directory"),
  asyncHandler(async (req, res) => {
    const body = bodySchema.parse(req.body);
    const spec = await storage.specializations.create(body);
    res.status(201).json(spec);
  })
);

router.put(
  "/:id",
  authenticateToken,
  requireAdminPermission("directory"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const body = bodySchema.partial().parse(req.body);
    const updated = await storage.specializations.update(id, body);
    if (!updated) {
      res.status(404).json({ message: "Specialization not found" });
      return;
    }
    res.json(updated);
  })
);

router.delete(
  "/:id",
  authenticateToken,
  requireAdminPermission("directory"),
  asyncHandler(async (req, res) => {
    await storage.specializations.delete(Number(req.params.id));
    res.json({ ok: true });
  })
);

export default router;

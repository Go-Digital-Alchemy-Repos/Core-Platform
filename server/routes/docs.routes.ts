import { Router } from "express";
import { storage } from "../storage/index";
import { authenticateToken, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/error-handler";

const router = Router();

router.use(authenticateToken);
router.use(requireRole("admin"));

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const allDocs = await storage.docs.getAllDocs();
    res.json(allDocs);
  })
);

router.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const doc = await storage.docs.getDocBySlug(req.params.slug);
    if (!doc) {
      res.status(404).json({ message: "Document not found" });
      return;
    }
    res.json(doc);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const doc = await storage.docs.createDoc({
      ...req.body,
      createdBy: req.user!.id,
    });
    res.status(201).json(doc);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const doc = await storage.docs.updateDoc(req.params.id, req.body);
    if (!doc) {
      res.status(404).json({ message: "Document not found" });
      return;
    }
    res.json(doc);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await storage.docs.deleteDoc(req.params.id);
    res.json({ message: "Document deleted" });
  })
);

export default router;

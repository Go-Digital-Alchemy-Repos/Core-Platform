import { Router } from "express";
import { insertCmsFormSchema } from "@shared/schema";
import { asyncHandler } from "../../middleware/error-handler";
import { storage } from "../../storage";

const router = Router();

router.get(
  "/forms",
  asyncHandler(async (_req, res) => {
    res.json(await storage.forms.getAll());
  })
);

router.get(
  "/forms/:id",
  asyncHandler(async (req, res) => {
    const form = await storage.forms.getById(req.params.id);
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }
    res.json(form);
  })
);

router.get(
  "/forms/:id/submissions",
  asyncHandler(async (req, res) => {
    const form = await storage.forms.getById(req.params.id);
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }
    res.json(await storage.forms.getSubmissionsByFormId(req.params.id));
  })
);

router.post(
  "/forms",
  asyncHandler(async (req, res) => {
    const parsed = insertCmsFormSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid form payload", errors: parsed.error.flatten() });
    }

    const existing = await storage.forms.getBySlug(parsed.data.slug);
    if (existing) {
      return res.status(409).json({ message: "A form with that slug already exists" });
    }

    const form = await storage.forms.create(parsed.data);
    res.status(201).json(form);
  })
);

router.put(
  "/forms/:id",
  asyncHandler(async (req, res) => {
    const parsed = insertCmsFormSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid form payload", errors: parsed.error.flatten() });
    }

    const current = await storage.forms.getById(req.params.id);
    if (!current) {
      return res.status(404).json({ message: "Form not found" });
    }

    const conflicting = await storage.forms.getBySlug(parsed.data.slug);
    if (conflicting && conflicting.id !== req.params.id) {
      return res.status(409).json({ message: "A form with that slug already exists" });
    }

    const form = await storage.forms.update(req.params.id, parsed.data);
    res.json(form);
  })
);

router.delete(
  "/forms/:id",
  asyncHandler(async (req, res) => {
    const existing = await storage.forms.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Form not found" });
    }

    if (existing.isSystem) {
      return res.status(400).json({ message: "System forms cannot be deleted" });
    }

    const deleted = await storage.forms.delete(req.params.id);
    res.json({ success: deleted });
  })
);

export default router;

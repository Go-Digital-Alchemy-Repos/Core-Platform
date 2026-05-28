import { Router } from "express";
import { asyncHandler } from "../middleware/error-handler";
import { storage } from "../storage";
import { submitManagedFormBySlug } from "../services/forms.service";
import { paramString } from "../utils/params";

const router = Router();

router.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const slug = paramString(req.params.slug);
    const form = await storage.forms.getPublicBySlug(slug);
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    res.json({
      ...form,
      settings: {
        submitButtonText:
          typeof form.settings?.submitButtonText === "string" ? form.settings.submitButtonText : "Submit",
        successMessage:
          typeof form.settings?.successMessage === "string"
            ? form.settings.successMessage
            : "Thanks! Your submission has been received.",
      },
    });
  })
);

router.post(
  "/:slug/submit",
  asyncHandler(async (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const result = await submitManagedFormBySlug(paramString(req.params.slug), req.body, {
      baseUrl,
      source: "public",
    });
    res.status(201).json({ message: result.successMessage, submissionId: result.submission.id });
  })
);

export default router;

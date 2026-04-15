import { Router } from "express";
import { asyncHandler } from "../middleware/error-handler";
import { submitManagedFormBySlug } from "../services/forms.service";

const router = Router();

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const result = await submitManagedFormBySlug("contact-form", req.body, {
      baseUrl,
      source: "contact-route",
    });
    res.status(201).json({ message: result.successMessage });
  })
);

export default router;

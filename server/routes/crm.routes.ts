import { Router } from "express";
import { asyncHandler } from "../middleware/error-handler";
import { storage } from "../storage";
import { createOrUpdateCrmLead } from "../services/crm.service";

const router = Router();

router.post(
  "/leads",
  asyncHandler(async (req, res) => {
    const configuredKey = await storage.settings.getDecryptedValue("crm_api_key");
    const suppliedKey = req.get("X-CRM-API-Key");
    if (!configuredKey || suppliedKey !== configuredKey) {
      return res.status(401).json({ message: "Invalid CRM API key" });
    }

    const result = await createOrUpdateCrmLead(req.body);
    res.status(result.duplicate ? 200 : 201).json({
      id: result.lead.id,
      duplicate: result.duplicate,
    });
  })
);

export default router;

import { Router } from "express";
import { requireRole } from "../../middleware/auth";
import { requireCmsEnabled, requireCrmEnabled } from "../../middleware/site-features";
import { asyncHandler } from "../../middleware/error-handler";
import { paramString } from "../../utils/params";
import {
  getCrmFormMapping,
  saveCrmFormMapping,
  previewCrmFormMapping,
} from "../../services/crm-form-mapping.service";
const router = Router();
router.use("/forms/:id/crm-mapping", requireRole("admin"), requireCmsEnabled, requireCrmEnabled);
router.get(
  "/forms/:id/crm-mapping",
  asyncHandler(async (req, res) => {
    res.json(await getCrmFormMapping(paramString(req.params.id)));
  }),
);
router.put(
  "/forms/:id/crm-mapping",
  asyncHandler(async (req, res) => {
    res.json(await saveCrmFormMapping(paramString(req.params.id), req.body, req.user!.id));
  }),
);
router.post(
  "/forms/:id/crm-mapping/preview",
  asyncHandler(async (req, res) => {
    res.json(await previewCrmFormMapping(paramString(req.params.id), req.body));
  }),
);
export default router;

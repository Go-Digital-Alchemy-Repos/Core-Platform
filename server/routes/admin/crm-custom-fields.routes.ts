import { Router } from "express";
import { requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/error-handler";
import { paramString } from "../../utils/params";
import {
  createCrmCustomFieldDefinition,
  getCrmCustomFieldDefinitions,
  getCrmCustomFieldValues,
  patchCrmCustomFieldValues,
  reviseCrmCustomFieldDefinition,
} from "../../services/crm-custom-fields.service";
const router = Router();
// Mounted inside the existing authenticated, feature-gated CRM router.
router.get(
  "/settings/custom-fields",
  asyncHandler(async (_req, res) => {
    res.json(await getCrmCustomFieldDefinitions());
  }),
);
router.post(
  "/settings/custom-fields",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    res.status(201).json(await createCrmCustomFieldDefinition(req.body, req.user!.id));
  }),
);
router.patch(
  "/settings/custom-fields/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    res.json(
      await reviseCrmCustomFieldDefinition(paramString(req.params.id), req.body, req.user!.id),
    );
  }),
);
for (const [path, scope] of [
  ["leads", "lead"],
  ["clients", "client"],
] as const) {
  router.get(
    `/${path}/:id/custom-fields`,
    asyncHandler(async (req, res) => {
      res.json(await getCrmCustomFieldValues(scope, paramString(req.params.id)));
    }),
  );
  router.patch(
    `/${path}/:id/custom-fields`,
    asyncHandler(async (req, res) => {
      res.json(
        await patchCrmCustomFieldValues(scope, paramString(req.params.id), req.body, req.user!.id),
      );
    }),
  );
}
export default router;

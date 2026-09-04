import { Router } from "express";
import { asyncHandler } from "../../middleware/error-handler";
import { validateBody } from "../../middleware/validation";
import {
  clientStackDomainPlanSchema,
  clientStackDnsVerificationSchema,
  clientStackReadinessSchema,
  createClientStackDomainPlan,
  evaluateClientStackReadiness,
  verifyClientStackDnsRecords,
} from "../../services/client-stack-onboarding.service";

const router = Router();

router.post(
  "/domain-plan",
  validateBody(clientStackDomainPlanSchema),
  asyncHandler(async (req, res) => {
    res.json(createClientStackDomainPlan(req.body));
  }),
);

router.post(
  "/dns-verification",
  validateBody(clientStackDnsVerificationSchema),
  asyncHandler(async (req, res) => {
    res.json(await verifyClientStackDnsRecords(req.body));
  }),
);

router.post(
  "/readiness",
  validateBody(clientStackReadinessSchema),
  asyncHandler(async (req, res) => {
    res.json(evaluateClientStackReadiness(req.body));
  }),
);

export default router;

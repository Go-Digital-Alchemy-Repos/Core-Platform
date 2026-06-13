import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";
import { paramString } from "../../utils/params";
import {
  insertMembershipAccessRuleSchema,
  insertMembershipPlanPriceSchema,
  insertMembershipSubscriptionSchema,
  MEMBERSHIP_SUBSCRIPTION_STATUSES,
} from "@shared/schema";
import { createMembershipPlan, updateMembershipPlan } from "../../services/membership-plan.service";
import { assignManualMembership, updateMembershipSubscriptionStatus } from "../../services/membership-subscription.service";
import {
  getMaskedMembershipStripeStatus,
  saveMembershipStripeSettings,
  testMembershipStripeConnection,
} from "../../services/membership-stripe.service";
import { requireMembershipEnabled } from "../../middleware/site-features";
import { noStorePrivateResponse } from "../../middleware/security";

const router = Router();

router.use(requireMembershipEnabled);
router.use(noStorePrivateResponse);

router.get("/plans", asyncHandler(async (_req, res) => {
  res.json(await storage.membership.getPlans({ includeInactive: true }));
}));

router.post("/plans", asyncHandler(async (req, res) => {
  res.status(201).json(await createMembershipPlan(req.body));
}));

router.put("/plans/:id", asyncHandler(async (req, res) => {
  res.json(await updateMembershipPlan(paramString(req.params.id), req.body));
}));

router.delete("/plans/:id", asyncHandler(async (req, res) => {
  await storage.membership.deletePlan(paramString(req.params.id));
  res.json({ success: true });
}));

router.post("/plans/:id/prices", asyncHandler(async (req, res) => {
  const planId = paramString(req.params.id);
  const plan = await storage.membership.getPlan(planId);
  if (!plan) {
    res.status(404).json({ message: "Membership plan not found" });
    return;
  }
  const payload = insertMembershipPlanPriceSchema.parse({ ...req.body, planId });
  res.status(201).json(await storage.membership.createPrice(payload));
}));

router.put("/prices/:id", asyncHandler(async (req, res) => {
  const price = await storage.membership.updatePrice(paramString(req.params.id), insertMembershipPlanPriceSchema.partial().parse(req.body));
  if (!price) {
    res.status(404).json({ message: "Membership price not found" });
    return;
  }
  res.json(price);
}));

router.delete("/prices/:id", asyncHandler(async (req, res) => {
  await storage.membership.deletePrice(paramString(req.params.id));
  res.json({ success: true });
}));

router.get("/members", asyncHandler(async (req, res) => {
  res.json(await storage.membership.getSubscriptions({
    search: typeof req.query.search === "string" ? req.query.search : undefined,
  }));
}));

router.post("/members", asyncHandler(async (req, res) => {
  const payload = insertMembershipSubscriptionSchema.parse(req.body);
  res.status(201).json(await assignManualMembership(req.user?.id, payload));
}));

router.put("/members/:id", asyncHandler(async (req, res) => {
  const subscription = await storage.membership.updateSubscription(
    paramString(req.params.id),
    insertMembershipSubscriptionSchema.partial().parse(req.body),
  );
  if (!subscription) {
    res.status(404).json({ message: "Membership subscription not found" });
    return;
  }
  await storage.membership.createAuditEvent({
    userId: subscription.userId,
    actorUserId: req.user?.id ?? null,
    subscriptionId: subscription.id,
    action: "membership_updated",
    metadata: req.body,
  });
  res.json(subscription);
}));

router.post("/members/:id/status", asyncHandler(async (req, res) => {
  const payload = z.object({
    status: z.enum(MEMBERSHIP_SUBSCRIPTION_STATUSES),
    note: z.string().optional(),
  }).parse(req.body);
  res.json(await updateMembershipSubscriptionStatus(req.user?.id, paramString(req.params.id), payload.status, payload.note));
}));

router.get("/access-rules", asyncHandler(async (req, res) => {
  res.json(await storage.membership.getAccessRules(typeof req.query.resourceType === "string" ? req.query.resourceType : undefined));
}));

router.get("/access-rules/:resourceType/:resourceId", asyncHandler(async (req, res) => {
  const rule = await storage.membership.getAccessRule(paramString(req.params.resourceType), paramString(req.params.resourceId));
  res.json(rule ?? null);
}));

router.put("/access-rules/:resourceType/:resourceId", asyncHandler(async (req, res) => {
  const payload = insertMembershipAccessRuleSchema.parse({
    ...req.body,
    resourceType: paramString(req.params.resourceType),
    resourceId: paramString(req.params.resourceId),
  });
  res.json(await storage.membership.upsertAccessRule(payload));
}));

router.delete("/access-rules/:id", asyncHandler(async (req, res) => {
  await storage.membership.deleteAccessRule(paramString(req.params.id));
  res.json({ success: true });
}));

router.get("/payments/stripe", asyncHandler(async (_req, res) => {
  res.json(await getMaskedMembershipStripeStatus());
}));

router.put("/payments/stripe", asyncHandler(async (req, res) => {
  const payload = z.object({
    mode: z.enum(["test", "live"]).optional(),
    publishableKey: z.string().optional(),
    secretKey: z.string().optional(),
    webhookSecret: z.string().optional(),
    customerPortalEnabled: z.boolean().optional(),
  }).parse(req.body);
  res.json(await saveMembershipStripeSettings(payload));
}));

router.post("/payments/stripe/test", asyncHandler(async (_req, res) => {
  res.json(await testMembershipStripeConnection());
}));

router.get("/activity", asyncHandler(async (_req, res) => {
  res.json(await storage.membership.getAuditEvents());
}));

export default router;

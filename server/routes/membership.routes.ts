import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { authenticateToken, optionalAuth } from "../middleware/auth";
import { createMembershipCheckoutSession, createMembershipPortalSession } from "../services/membership-stripe.service";
import { getUserEntitlements } from "../services/membership-access.service";

const router = Router();

router.get(
  "/plans",
  asyncHandler(async (_req, res) => {
    res.json(await storage.membership.getPlans({ publicOnly: true }));
  }),
);

router.get(
  "/me",
  optionalAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      res.json({ user: null, subscription: null, entitlements: [] });
      return;
    }
    const subscription = await storage.membership.getActiveSubscriptionForUser(req.user.id);
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
      },
      subscription,
      entitlements: await getUserEntitlements(req.user.id),
    });
  }),
);

router.post(
  "/checkout/session",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const payload = z.object({
      planId: z.string().min(1),
      priceId: z.string().min(1),
      successUrl: z.string().url(),
      cancelUrl: z.string().url(),
    }).parse(req.body);
    res.json(await createMembershipCheckoutSession({
      userId: req.user!.id,
      userEmail: req.user!.email,
      ...payload,
    }));
  }),
);

router.post(
  "/portal/session",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const payload = z.object({ returnUrl: z.string().url() }).parse(req.body);
    res.json(await createMembershipPortalSession({
      userId: req.user!.id,
      returnUrl: payload.returnUrl,
    }));
  }),
);

export default router;

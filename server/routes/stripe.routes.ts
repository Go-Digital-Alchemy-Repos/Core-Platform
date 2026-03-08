import { Router } from "express";
import { getUncachableStripeClient } from "../config/stripe";
import { storage } from "../storage/index";
import { authenticateToken, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/error-handler";

const router = Router();

router.post(
  "/create-checkout-session",
  authenticateToken,
  requireRole("therapist"),
  asyncHandler(async (req, res) => {
    const { priceId } = req.body;
    if (!priceId) {
      res.status(400).json({ message: "priceId is required" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const user = req.user!;

    let subscription = await storage.subscriptions.getSubscriptionByTherapist(user.id);
    let customerId = subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      if (!subscription) {
        subscription = await storage.subscriptions.createSubscription({
          therapistId: user.id,
          stripeCustomerId: customerId,
          status: "inactive",
        });
      } else {
        await storage.subscriptions.updateSubscription(subscription.id, {
          stripeCustomerId: customerId,
        });
      }
    }

    const host = req.headers.origin || `${req.protocol}://${req.hostname}`;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${host}/therapist/subscription?success=true`,
      cancel_url: `${host}/therapist/subscription?canceled=true`,
      metadata: { userId: user.id },
    });

    res.json({ url: session.url });
  })
);

router.post(
  "/create-portal-session",
  authenticateToken,
  requireRole("therapist"),
  asyncHandler(async (req, res) => {
    const subscription = await storage.subscriptions.getSubscriptionByTherapist(req.user!.id);
    if (!subscription?.stripeCustomerId) {
      res.status(400).json({ message: "No billing account found" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const host = req.headers.origin || `${req.protocol}://${req.hostname}`;
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${host}/therapist/subscription`,
    });

    res.json({ url: session.url });
  })
);

router.get(
  "/subscription-status",
  authenticateToken,
  requireRole("therapist"),
  asyncHandler(async (req, res) => {
    const subscription = await storage.subscriptions.getSubscriptionByTherapist(req.user!.id);
    res.json(subscription || null);
  })
);

export default router;

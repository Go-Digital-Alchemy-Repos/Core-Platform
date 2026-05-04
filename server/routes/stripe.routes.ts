import { Router } from "express";
import { getUncachableStripeClient } from "../config/stripe";
import { storage } from "../storage/index";
import { logger } from "../utils/logger";
import { authenticateToken, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/error-handler";
import type { Event } from "@shared/schema/events";
import { getEventPath } from "@shared/event-url";
import { getDirectorySettings } from "../services/directory-settings.service";

const router = Router();

function canAccessEvent(event: Event, userRole: string | null): boolean {
  if (!event.visibility || event.visibility === "public") return true;
  if (!userRole) return false;
  if (userRole === "admin") return true;
  if (event.visibility === "members_only") return userRole === "therapist" || userRole === "client";
  if (event.visibility === "counselors_only") return userRole === "therapist";
  return false;
}

router.post(
  "/create-event-checkout-session",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { eventId } = req.body;
    if (!eventId) {
      res.status(400).json({ message: "eventId is required" });
      return;
    }

    const event = await storage.events.getEvent(eventId);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (event.status !== "published") {
      res.status(400).json({ message: "Event is not available" });
      return;
    }

    if (!canAccessEvent(event, req.user!.role)) {
      res.status(403).json({ message: "You do not have access to this event" });
      return;
    }

    if (!event.registrationEnabled || event.registrationType !== "paid") {
      res.status(400).json({ message: "Paid registration is not enabled for this event" });
      return;
    }

    const now = new Date();
    if (event.registrationOpensAt && new Date(event.registrationOpensAt) > now) {
      res.status(400).json({ message: "Registration has not opened yet" });
      return;
    }
    if (event.registrationClosesAt && new Date(event.registrationClosesAt) < now) {
      res.status(400).json({ message: "Registration has closed" });
      return;
    }
    if (event.date && new Date(event.date) < now) {
      res.status(400).json({ message: "This event has already occurred" });
      return;
    }

    const existing = await storage.eventRegistrations.getRegistrationByEventAndUser(eventId, req.user!.id);
    if (existing && existing.status !== "canceled" && existing.paymentStatus !== "pending") {
      res.status(409).json({ message: "You are already registered for this event" });
      return;
    }

    const stripe = await getUncachableStripeClient();

    if (existing && existing.paymentStatus === "pending" && existing.stripeCheckoutSessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(existing.stripeCheckoutSessionId);
        if (session.status === "open") {
          res.json({ url: session.url });
          return;
        }
      } catch (err) {
        logger.stripe.warn("Previous checkout session not found or expired, creating new one", { sessionId: existing.stripeCheckoutSessionId, error: err instanceof Error ? err.message : String(err) });
      }
    }

    // Capacity check
    if (event.capacity) {
      const confirmedCount = await storage.eventRegistrations.getConfirmedCount(eventId);
      if (confirmedCount >= event.capacity) {
        res.status(400).json({ message: "This event is full" });
        return;
      }
    }

    const user = req.user!;
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

    let registration;
    if (existing) {
      registration = await storage.eventRegistrations.updatePaymentDetails(existing.id, {
        status: "confirmed",
        paymentStatus: "pending",
      });
    } else {
      registration = await storage.eventRegistrations.createRegistration({
        eventId,
        userId: user.id,
        fullName,
        email: user.email,
        status: "confirmed",
        paymentStatus: "pending",
      });
    }

    if (!registration) {
      res.status(500).json({ message: "Failed to create/update registration" });
      return;
    }

    const host = req.headers.origin || `${req.protocol}://${req.hostname}`;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: event.registrationCurrency || "usd",
            product_data: { name: event.title },
            unit_amount: event.registrationFee || 0,
          },
          quantity: 1,
        },
      ],
      success_url: `${host}${getEventPath(event)}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${host}${getEventPath(event)}?checkout=canceled`,
      metadata: { registrationId: registration.id, eventId },
      customer_email: user.email,
    });

    await storage.eventRegistrations.updatePaymentDetails(registration.id, {
      stripeCheckoutSessionId: session.id,
    });

    res.json({ url: session.url });
  })
);

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

    const user = req.user!;

    const application = await storage.applications.getByUserId(user.id);
    if (!application || !["approved_pending_subscription", "active_member"].includes(application.status)) {
      res.status(403).json({ message: "Your application must be approved before you can subscribe. Please complete the application process first." });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const directorySettings = await getDirectorySettings();

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

    if (
      subscription &&
      directorySettings.applicationFeeCreditOnApproval &&
      application.paymentStatus === "paid" &&
      (subscription.applicationFeeCreditAppliedAt == null) &&
      directorySettings.applicationFeeCreditAmountCents > 0
    ) {
      try {
        await stripe.customers.createBalanceTransaction(customerId, {
          amount: -directorySettings.applicationFeeCreditAmountCents,
          currency: "usd",
          description: "Application fee credit applied toward first membership invoice",
        });

        subscription = await storage.subscriptions.updateSubscription(subscription.id, {
          applicationFeeCreditAmount: directorySettings.applicationFeeCreditAmountCents,
          applicationFeeCreditAppliedAt: new Date(),
        });
      } catch (err) {
        logger.stripe.error("Failed to apply application fee credit before subscription checkout", err, {
          therapistId: user.id,
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

router.post(
  "/retry-latest-invoice",
  authenticateToken,
  requireRole("therapist"),
  asyncHandler(async (req, res) => {
    const subscription = await storage.subscriptions.getSubscriptionByTherapist(req.user!.id);
    if (!subscription?.lastFailedInvoiceId) {
      res.status(400).json({ message: "No failed renewal payment is available to retry." });
      return;
    }

    const stripe = await getUncachableStripeClient();
    await stripe.invoices.pay(subscription.lastFailedInvoiceId);

    res.json({ success: true });
  }),
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

router.post(
  "/create-recording-checkout",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { eventId } = req.body;
    if (!eventId) {
      res.status(400).json({ message: "eventId is required" });
      return;
    }

    const event = await storage.events.getEvent(eventId);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (event.status !== "published") {
      res.status(400).json({ message: "Event is not available" });
      return;
    }

    if (!canAccessEvent(event, req.user!.role)) {
      res.status(403).json({ message: "You do not have access to this event" });
      return;
    }

    if (!event.recordingUrl || !event.showInArchives) {
      res.status(400).json({ message: "Recording is not available" });
      return;
    }

    if (event.recordingAccess !== "paid" || !event.recordingPrice || event.recordingPrice < 50) {
      res.status(400).json({ message: "This recording is free" });
      return;
    }

    const user = req.user!;
    const existing = await storage.recordingPurchases.getByUserAndEvent(user.id, eventId);
    if (existing && existing.stripePaymentIntentId) {
      res.status(409).json({ message: "You have already purchased this recording" });
      return;
    }

    const stripe = await getUncachableStripeClient();

    if (existing && existing.stripeCheckoutSessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(existing.stripeCheckoutSessionId);
        if (session.status === "open") {
          res.json({ url: session.url });
          return;
        }
      } catch (err) {
        logger.stripe.warn("Previous checkout session not found or expired, creating new one", { sessionId: existing.stripeCheckoutSessionId, error: err instanceof Error ? err.message : String(err) });
      }
    }

    let purchase;
    if (existing) {
      purchase = existing;
    } else {
      purchase = await storage.recordingPurchases.create({
        eventId,
        userId: user.id,
      });
    }

    const host = req.headers.origin || `${req.protocol}://${req.hostname}`;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Recording: ${event.title}` },
            unit_amount: event.recordingPrice,
          },
          quantity: 1,
        },
      ],
      success_url: `${host}/recordings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${host}/recordings?checkout=canceled`,
      metadata: { recordingPurchaseId: purchase.id, eventId },
      customer_email: user.email,
    });

    await storage.recordingPurchases.updatePaymentDetails(purchase.id, {
      stripeCheckoutSessionId: session.id,
    });

    res.json({ url: session.url });
  })
);

export default router;

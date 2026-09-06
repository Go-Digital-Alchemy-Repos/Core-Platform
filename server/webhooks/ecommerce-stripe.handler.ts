import type Stripe from "stripe";
import { storage } from "../storage/index";
import { logger } from "../utils/logger";
import { recordDomainOutcome } from "../utils/metrics";
import {
  getEcommerceStripeClient,
  getEcommerceStripeWebhookSecret,
} from "../services/ecommerce-stripe.service";
import {
  markEcommerceOrderPaid,
  reconcileEcommercePaymentRequestSession,
  recordEcommerceStripeRiskOutcome,
} from "../services/ecommerce-order.service";
import { recordStripeRefundWebhook } from "../services/ecommerce-refund.service";

async function reconcileEcommerceStripeEvent(event: Stripe.Event) {
  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = intent.metadata?.orderId;
    if (!orderId) return;
    const order = await storage.ecommerce.getOrder(orderId);
    if (!order) return;
    if (order.stripePaymentIntentId && order.stripePaymentIntentId !== intent.id) {
      logger.stripe.error("Ecommerce webhook PaymentIntent mismatch", undefined, {
        orderId,
        expectedPaymentIntentId: order.stripePaymentIntentId,
        actualPaymentIntentId: intent.id,
      });
      return;
    }
    if (intent.amount !== order.totalAmount) {
      logger.stripe.error("Ecommerce webhook amount mismatch", undefined, {
        orderId,
        paymentIntentId: intent.id,
        expected: order.totalAmount,
        actual: intent.amount,
      });
      return;
    }
    const latestCharge =
      typeof intent.latest_charge === "object" && intent.latest_charge
        ? intent.latest_charge
        : null;
    if (latestCharge) {
      await recordEcommerceStripeRiskOutcome({
        orderId,
        paymentIntentId: intent.id,
        charge: latestCharge,
      });
    }
    await markEcommerceOrderPaid(orderId, intent.id);
    return;
  }

  if (event.type === "payment_intent.payment_failed" || event.type === "payment_intent.canceled") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = intent.metadata?.orderId;
    if (!orderId) return;
    const order = await storage.ecommerce.getOrder(orderId);
    if (!order || order.status !== "pending" || order.paymentStatus !== "unpaid") return;
    if (order.stripePaymentIntentId && order.stripePaymentIntentId !== intent.id) {
      logger.stripe.error("Ecommerce webhook PaymentIntent mismatch", undefined, {
        orderId,
        expectedPaymentIntentId: order.stripePaymentIntentId,
        actualPaymentIntentId: intent.id,
      });
      return;
    }
    await storage.ecommerce.updateOrder(order.id, {
      status: "cancelled",
      paymentStatus: "failed",
    });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
    if (session.id) {
      await reconcileEcommercePaymentRequestSession(session.id, paymentIntentId);
    }
    return;
  }

  if (event.type === "refund.created" || event.type === "refund.updated") {
    const refund = event.data.object as Stripe.Refund;
    await recordStripeRefundWebhook({
      stripeRefundId: refund.id,
      ...(typeof refund.metadata?.localRefundId === "string"
        ? { localRefundId: refund.metadata.localRefundId }
        : {}),
      orderId: typeof refund.metadata?.orderId === "string" ? refund.metadata.orderId : undefined,
      amount: refund.amount,
      status: refund.status,
    });
    logger.stripe.info("Ecommerce refund webhook reconciled", {
      eventId: event.id,
      eventType: event.type,
    });
  }
}

async function processVerifiedEcommerceStripeEvent(event: Stripe.Event) {
  const processingToken = await storage.ecommerce.claimWebhookProcessing(
    "stripe",
    event.id,
    event.type,
  );
  if (!processingToken) {
    logger.stripe.info("Duplicate ecommerce webhook already claimed or reconciled", {
      eventId: event.id,
      eventType: event.type,
    });
    return { status: "already_claimed" as const, eventId: event.id, eventType: event.type };
  }

  try {
    await reconcileEcommerceStripeEvent(event);
    await storage.ecommerce.completeWebhookProcessing("stripe", event.id, processingToken);
    return { status: "processed" as const, eventId: event.id, eventType: event.type };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 1000) : "Unknown webhook processing failure";
    try {
      await storage.ecommerce.failWebhookProcessing("stripe", event.id, processingToken, message);
    } catch (statusError) {
      logger.stripe.error("Failed to record ecommerce webhook failure", statusError, {
        eventId: event.id,
      });
    }
    throw error;
  }
}

export async function processEcommerceStripeWebhook(payload: Buffer, signature?: string) {
  const stripe = await getEcommerceStripeClient();
  const secret = await getEcommerceStripeWebhookSecret();
  let event: Stripe.Event;

  if (secret) {
    if (!signature) throw new Error("Missing Stripe signature");
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("Ecommerce Stripe webhook secret is required in production");
  } else {
    event = JSON.parse(payload.toString()) as Stripe.Event;
  }

  try {
    const result = await processVerifiedEcommerceStripeEvent(event);
    recordDomainOutcome("webhook", result.status);
    return result;
  } catch (error) {
    recordDomainOutcome("webhook", "failed");
    throw error;
  }
}

export async function replayEcommerceStripeWebhook(eventId: string) {
  const existing = await storage.ecommerce.getWebhookProcessing("stripe", eventId);
  if (existing?.status === "processed") {
    return { status: "already_processed" as const, eventId, eventType: existing.eventType };
  }
  if (existing?.status === "processing") {
    throw Object.assign(new Error("This ecommerce webhook is already being processed."), {
      statusCode: 409,
    });
  }

  const stripe = await getEcommerceStripeClient();
  const event = await stripe.events.retrieve(eventId);
  if (event.id !== eventId) {
    throw new Error("Stripe returned an unexpected ecommerce webhook event.");
  }
  const result = await processVerifiedEcommerceStripeEvent(event);
  return {
    ...result,
    status: result.status === "processed" ? ("replayed" as const) : result.status,
  };
}

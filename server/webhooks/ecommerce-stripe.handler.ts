import type Stripe from "stripe";
import { storage } from "../storage/index";
import { logger } from "../utils/logger";
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

async function processWithWebhookClaim(event: Stripe.Event, process: () => Promise<void>) {
  const claimToken = await storage.ecommerce.claimWebhook("stripe", event.id, event.type);
  if (!claimToken) {
    logger.stripe.info("Duplicate ecommerce webhook already reconciled", {
      eventId: event.id,
      eventType: event.type,
    });
    return false;
  }

  try {
    await process();
    await storage.ecommerce.completeWebhookClaim("stripe", event.id, claimToken);
    return true;
  } catch (error) {
    await storage.ecommerce.releaseWebhookClaim("stripe", event.id, claimToken);
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

  if (await storage.ecommerce.hasProcessedWebhook("stripe", event.id)) {
    logger.stripe.info("Duplicate ecommerce webhook already reconciled", {
      eventId: event.id,
      eventType: event.type,
    });
    return;
  }

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
    await processWithWebhookClaim(event, async () => {
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
    });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
    await processWithWebhookClaim(event, async () => {
      if (session.id) {
        await reconcileEcommercePaymentRequestSession(session.id, paymentIntentId);
      }
    });
    return;
  }

  if (event.type === "refund.created" || event.type === "refund.updated") {
    const refund = event.data.object as Stripe.Refund;
    const processed = await processWithWebhookClaim(event, async () => {
      await recordStripeRefundWebhook({
        stripeRefundId: refund.id,
        orderId: typeof refund.metadata?.orderId === "string" ? refund.metadata.orderId : undefined,
        amount: refund.amount,
        status: refund.status,
      });
    });
    if (processed) {
      logger.stripe.info("Ecommerce refund webhook processed", {
        eventId: event.id,
        eventType: event.type,
      });
    }
  }
}

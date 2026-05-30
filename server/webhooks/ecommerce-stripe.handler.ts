import type Stripe from "stripe";
import { storage } from "../storage/index";
import { logger } from "../utils/logger";
import { getEcommerceStripeClient, getEcommerceStripeWebhookSecret } from "../services/ecommerce-stripe.service";
import { markEcommerceOrderPaid } from "../services/ecommerce-order.service";

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
    const firstProcessing = await storage.ecommerce.markWebhookProcessed("stripe", event.id, event.type);
    if (!firstProcessing) {
      logger.stripe.info("Duplicate ecommerce webhook ignored", { eventId: event.id, eventType: event.type });
      return;
    }
    await markEcommerceOrderPaid(orderId, intent.id);
    return;
  }

  if (event.type === "charge.refunded" || event.type === "refund.updated") {
    const firstProcessing = await storage.ecommerce.markWebhookProcessed("stripe", event.id, event.type);
    if (!firstProcessing) {
      logger.stripe.info("Duplicate ecommerce webhook ignored", { eventId: event.id, eventType: event.type });
      return;
    }
    logger.stripe.info("Ecommerce refund webhook received", { eventId: event.id, eventType: event.type });
  }
}

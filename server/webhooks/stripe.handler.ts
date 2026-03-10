import { getStripeClient } from "../config/stripe";
import { storage } from "../storage/index";
import { logger } from "../utils/logger";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string) {
    try {
      const stripe = await getStripeClient();
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event;
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      } else {
        logger.stripe.warn("STRIPE_WEBHOOK_SECRET not set — skipping signature verification");
        event = JSON.parse(payload.toString());
      }

      logger.stripe.info(`Webhook received: ${event.type}`, { eventId: event.id });

      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const subscription = event.data.object;
          await storage.subscriptions.updateByStripeSubscriptionId(subscription.id, {
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          });
          logger.stripe.info(`Subscription ${event.type}`, { subscriptionId: subscription.id, status: subscription.status });
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object;
          await storage.subscriptions.updateByStripeSubscriptionId(subscription.id, {
            status: "canceled",
          });
          logger.stripe.info("Subscription canceled", { subscriptionId: subscription.id });
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object;
          if (invoice.subscription) {
            await storage.subscriptions.updateByStripeSubscriptionId(
              invoice.subscription as string,
              { status: "active" }
            );
            logger.stripe.info("Invoice payment succeeded", { subscriptionId: invoice.subscription });
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object;
          if (invoice.subscription) {
            await storage.subscriptions.updateByStripeSubscriptionId(
              invoice.subscription as string,
              { status: "past_due" }
            );
            logger.stripe.warn("Invoice payment failed", { subscriptionId: invoice.subscription });
          }
          break;
        }

        default:
          logger.stripe.info(`Unhandled event type: ${event.type}`, { eventId: event.id });
          break;
      }
    } catch (err) {
      logger.stripe.error("Webhook processing error", err);
      throw err;
    }
  }
}

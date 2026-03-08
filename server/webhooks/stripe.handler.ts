import { getStripeClient } from "../config/stripe";
import { storage } from "../storage/index";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string) {
    try {
      const stripe = await getStripeClient();
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event;
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      } else {
        event = JSON.parse(payload.toString());
      }

      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const subscription = event.data.object;
          await storage.subscriptions.updateByStripeSubscriptionId(subscription.id, {
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          });
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object;
          await storage.subscriptions.updateByStripeSubscriptionId(subscription.id, {
            status: "canceled",
          });
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object;
          if (invoice.subscription) {
            await storage.subscriptions.updateByStripeSubscriptionId(
              invoice.subscription as string,
              { status: "active" }
            );
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
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error("Webhook processing error:", err);
      throw err;
    }
  }
}

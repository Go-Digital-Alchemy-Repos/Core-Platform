import { getStripeClient } from "../config/stripe";
import { storage } from "../storage/index";
import { logger } from "../utils/logger";
import { sendPaymentConfirmationEmail } from "../services/email.service";

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
        case "checkout.session.completed": {
          const session = event.data.object;
          const recordingPurchaseId = session.metadata?.recordingPurchaseId;
          const registrationId = session.metadata?.registrationId;

          if (recordingPurchaseId) {
            const purchase = await storage.recordingPurchases.getByCheckoutSession(session.id);
            if (purchase) {
              await storage.recordingPurchases.updatePaymentDetails(purchase.id, {
                stripePaymentIntentId: session.payment_intent as string,
                amountPaid: session.amount_total || 0,
              });
              logger.stripe.info("Recording purchase confirmed", { purchaseId: purchase.id, sessionId: session.id });
            } else {
              logger.stripe.warn("Recording purchase not found for checkout session", { recordingPurchaseId, sessionId: session.id });
            }
            break;
          }

          if (!registrationId) {
            logger.stripe.info("Checkout session completed without registrationId metadata", { sessionId: session.id });
            break;
          }

          const registration = await storage.eventRegistrations.getRegistration(registrationId);
          if (!registration) {
            logger.stripe.warn("Registration not found for checkout session", { registrationId, sessionId: session.id });
            break;
          }

          const eventDetails = await storage.events.getEvent(registration.eventId);

          await storage.eventRegistrations.updatePaymentDetails(registrationId, {
            paymentStatus: "paid",
            paymentIntentId: session.payment_intent as string,
            amountPaid: session.amount_total || 0,
            status: "confirmed",
          });

          if (eventDetails) {
            const user = await storage.users.getUser(registration.userId);
            sendPaymentConfirmationEmail(
              registration.email,
              user?.firstName || registration.fullName.split(" ")[0] || "there",
              eventDetails.title,
              eventDetails.date.toDateString(),
              eventDetails.location,
              session.amount_total || 0,
              session.currency || "usd"
            ).catch(err => logger.email.error("Failed to send payment confirmation email", err));
          }

          logger.stripe.info("Event registration payment confirmed", { registrationId, sessionId: session.id });
          break;
        }

        case "checkout.session.expired": {
          const session = event.data.object;
          const recordingPurchaseId = session.metadata?.recordingPurchaseId;
          const registrationId = session.metadata?.registrationId;

          if (recordingPurchaseId) {
            const purchase = await storage.recordingPurchases.getByCheckoutSession(session.id);
            if (purchase && !purchase.stripePaymentIntentId) {
              await storage.recordingPurchases.delete(purchase.id);
              logger.stripe.info("Deleted expired pending recording purchase", { purchaseId: purchase.id, sessionId: session.id });
            }
            break;
          }

          if (!registrationId) break;

          const registration = await storage.eventRegistrations.getRegistration(registrationId);
          if (registration && registration.paymentStatus === "pending") {
            await storage.eventRegistrations.deleteRegistration(registrationId);
            logger.stripe.info("Deleted expired pending event registration", { registrationId, sessionId: session.id });
          }
          break;
        }

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

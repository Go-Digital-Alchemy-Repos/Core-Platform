import { getStripeClient } from "../config/stripe";
import { storage } from "../storage/index";
import { logger } from "../utils/logger";
import { sendPaymentConfirmationEmail } from "../services/email.service";
import { getDirectorySettings } from "../services/directory-settings.service";
import {
  handleMembershipRecovered,
  notifyMembershipPaymentFailed,
} from "../services/directory-membership-lifecycle.service";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string) {
    try {
      const stripe = await getStripeClient();
      const { getStripeWebhookSecret } = await import("../config/stripe");
      const webhookSecret = await getStripeWebhookSecret();

      let event;
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      } else if (process.env.NODE_ENV === "production") {
        logger.stripe.error("STRIPE_WEBHOOK_SECRET not set in production — rejecting webhook");
        throw new Error("Webhook signature verification is required in production");
      } else {
        logger.stripe.warn("STRIPE_WEBHOOK_SECRET not set — skipping signature verification (dev only)");
        event = JSON.parse(payload.toString());
      }

      logger.stripe.info(`Webhook received: ${event.type}`, { eventId: event.id });

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const applicationId = session.metadata?.applicationId;
          const recordingPurchaseId = session.metadata?.recordingPurchaseId;
          const registrationId = session.metadata?.registrationId;

          if (applicationId && session.metadata?.type === "application_fee") {
            const application = await storage.applications.getById(applicationId);
            if (application && application.paymentStatus !== "paid") {
              const directorySettings = await getDirectorySettings();
              await storage.applications.update(application.id, {
                paymentStatus: "paid",
                paidAt: new Date(),
                amountPaid: session.amount_total || directorySettings.applicationFeeAmountCents,
                refundEligibleAmount: directorySettings.applicationFeeCreditOnApproval
                  ? directorySettings.applicationFeeCreditAmountCents
                  : 0,
                stripePaymentIntentId: session.payment_intent as string,
              } as any);

              await storage.applications.addTimelineEntry({
                applicationId: application.id,
                action: "payment_completed",
                note: `Application fee of $${((session.amount_total || 15000) / 100).toFixed(2)} confirmed via webhook`,
              });

              logger.stripe.info("Application fee payment confirmed via webhook", { applicationId: application.id, sessionId: session.id });
            } else {
              logger.stripe.warn("Application not found for checkout session", { applicationId, sessionId: session.id });
            }
            break;
          }

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

          if (session.mode === "subscription" && session.subscription && session.customer) {
            const sub = await storage.subscriptions.getByStripeCustomerId(session.customer as string);
            if (sub) {
              await storage.subscriptions.updateSubscription(sub.id, {
                stripeSubscriptionId: session.subscription as string,
              });
              logger.stripe.info("Linked stripeSubscriptionId from checkout", {
                subscriptionId: session.subscription,
                customerId: session.customer,
                localSubId: sub.id,
              });
            } else {
              logger.stripe.warn("No local subscription found for customer during subscription checkout", {
                customerId: session.customer,
                sessionId: session.id,
              });
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
            const user = registration.userId ? await storage.users.getUser(registration.userId) : undefined;
            const recipientEmail = registration.email || user?.email;
            if (!recipientEmail) {
              logger.email.warn("Skipping payment confirmation email without recipient", { registrationId, sessionId: session.id });
              break;
            }
            sendPaymentConfirmationEmail(
              recipientEmail,
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
          const canceledSub = await storage.subscriptions.updateByStripeSubscriptionId(subscription.id, {
            status: "canceled",
          });
          logger.stripe.info("Subscription canceled", { subscriptionId: subscription.id });

          if (canceledSub?.therapistId) {
            try {
              const profile = await storage.therapists.getProfileByUserId(canceledSub.therapistId);
              if (profile) {
                await storage.therapists.updateProfile(profile.id, { isActive: false });
              }
            } catch (err) {
              logger.stripe.error("Failed to deactivate profile on subscription cancellation", err);
            }
          }
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object;
          if (invoice.subscription) {
            const previousSub = await storage.subscriptions.getByStripeSubscriptionId(
              invoice.subscription as string,
            );
            const hadBillingIssue = ["past_due", "suspended"].includes(previousSub?.status || "");
            const updatedSub = await storage.subscriptions.updateByStripeSubscriptionId(
              invoice.subscription as string,
              { status: "active" }
            );
            logger.stripe.info("Invoice payment succeeded", { subscriptionId: invoice.subscription });

            if (updatedSub?.therapistId) {
              try {
                await handleMembershipRecovered(
                  updatedSub.id,
                  updatedSub.therapistId,
                  hadBillingIssue,
                );

                const application = await storage.applications.getByUserId(updatedSub.therapistId);
                if (application && application.status === "approved_pending_subscription") {
                  await storage.applications.update(application.id, {
                    status: "active_member",
                    decisionStatus: "completed",
                  } as any);

                  await storage.applications.addTimelineEntry({
                    applicationId: application.id,
                    action: "subscription_activated",
                    fromStatus: "approved_pending_subscription",
                    toStatus: "active_member",
                    note: "Membership subscription activated — provider is now an active member",
                    performedBy: updatedSub.therapistId,
                  });

                  const profile = await storage.therapists.getProfileByUserId(updatedSub.therapistId);
                  if (profile) {
                    await storage.therapists.updateProfile(profile.id, { isActive: true });
                  }

                  logger.stripe.info("Application transitioned to active_member", { applicationId: application.id, therapistId: updatedSub.therapistId });
                }
              } catch (err) {
                logger.stripe.error("Failed to transition application on subscription activation", err);
              }
            }
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object;
          if (invoice.subscription) {
            const previousSub = await storage.subscriptions.getByStripeSubscriptionId(
              invoice.subscription as string,
            );
            const updatedSub = await storage.subscriptions.updateByStripeSubscriptionId(
              invoice.subscription as string,
              {
                status: "past_due",
                lastFailedInvoiceId: invoice.id,
                lastPaymentFailedAt: new Date(),
              }
            );
            logger.stripe.warn("Invoice payment failed", { subscriptionId: invoice.subscription });

            if (
              updatedSub?.therapistId &&
              previousSub?.status !== "past_due" &&
              previousSub?.status !== "suspended"
            ) {
              await notifyMembershipPaymentFailed(updatedSub.id, updatedSub.therapistId);
            }
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

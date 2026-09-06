import type Stripe from "stripe";
import { storage } from "../storage/index";
import { logger } from "../utils/logger";
import {
  getMembershipStripeClient,
  getMembershipStripeWebhookSecret,
} from "./membership-stripe.service";

function fromUnix(value: number | null | undefined): Date | null {
  return value ? new Date(value * 1000) : null;
}

type StripeSubscriptionWithPeriods = Stripe.Subscription & {
  current_period_start?: number | null;
  current_period_end?: number | null;
};

type StripeInvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
};

function metadataFromStripeObject(obj: { metadata?: Stripe.Metadata | null }) {
  return {
    userId: obj.metadata?.userId || "",
    planId: obj.metadata?.planId || "",
    priceId: obj.metadata?.priceId || "",
  };
}

async function syncStripeSubscription(subscription: Stripe.Subscription) {
  const subscriptionWithPeriods = subscription as StripeSubscriptionWithPeriods;
  const metadata = metadataFromStripeObject(subscription);
  const existing = await storage.membership.getSubscriptionByProviderSubscriptionId(
    subscription.id,
  );
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  const data = {
    userId: metadata.userId || existing?.userId || "",
    planId: metadata.planId || existing?.planId || null,
    priceId: metadata.priceId || existing?.priceId || null,
    status: subscription.status,
    source: "stripe",
    provider: "stripe",
    providerCustomerId: customerId ?? existing?.providerCustomerId ?? null,
    providerSubscriptionId: subscription.id,
    currentPeriodStart: fromUnix(subscriptionWithPeriods.current_period_start),
    currentPeriodEnd: fromUnix(subscriptionWithPeriods.current_period_end),
    trialEndsAt: fromUnix(subscription.trial_end),
    canceledAt: fromUnix(subscription.canceled_at),
  };

  if (!data.userId) {
    logger.stripe.warn("Membership subscription webhook missing userId", {
      subscriptionId: subscription.id,
    });
    return null;
  }

  const { userId, ...subscriptionData } = data;
  return storage.membership.upsertStripeWebhookSubscriptionWithAudit({
    userId,
    data: subscriptionData,
    action: "stripe_subscription_synced",
    metadata: { stripeSubscriptionId: subscription.id, status: subscription.status },
  });
}

export async function handleMembershipStripeWebhook(
  payload: Buffer | string,
  signature: string | undefined,
) {
  const stripe = await getMembershipStripeClient();
  const secret = await getMembershipStripeWebhookSecret();
  let event: Stripe.Event;

  if (secret) {
    if (!signature) throw Object.assign(new Error("Missing Stripe signature"), { statusCode: 400 });
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } else {
    if (process.env.NODE_ENV === "production") {
      throw Object.assign(new Error("Membership Stripe webhook secret is required in production"), {
        statusCode: 400,
      });
    }
    event = JSON.parse(payload.toString()) as Stripe.Event;
  }

  const processingToken = await storage.membership.claimWebhookProcessing(
    "stripe",
    event.id,
    event.type,
  );
  if (!processingToken) {
    return { received: true, duplicate: true };
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = metadataFromStripeObject(session);
        if (session.mode === "subscription" && session.subscription && metadata.userId) {
          await storage.membership.upsertStripeWebhookSubscriptionWithAudit({
            userId: metadata.userId,
            data: {
              planId: metadata.planId || null,
              priceId: metadata.priceId || null,
              status: "active",
              source: "stripe",
              provider: "stripe",
              providerCustomerId: typeof session.customer === "string" ? session.customer : null,
              providerSubscriptionId:
                typeof session.subscription === "string"
                  ? session.subscription
                  : session.subscription.id,
              providerCheckoutSessionId: session.id,
            },
            action: "stripe_checkout_completed",
            metadata: { sessionId: session.id },
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncStripeSubscription(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceSubscription = (invoice as StripeInvoiceWithSubscription).subscription;
        const subscriptionId =
          typeof invoiceSubscription === "string" ? invoiceSubscription : invoiceSubscription?.id;
        if (subscriptionId) {
          await storage.membership.updateStripeWebhookSubscriptionStatusWithAudit({
            providerSubscriptionId: subscriptionId,
            status: "active",
            lastPaymentFailedAt: null,
            action: "stripe_invoice_paid",
            metadata: { invoiceId: invoice.id },
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceSubscription = (invoice as StripeInvoiceWithSubscription).subscription;
        const subscriptionId =
          typeof invoiceSubscription === "string" ? invoiceSubscription : invoiceSubscription?.id;
        if (subscriptionId) {
          await storage.membership.updateStripeWebhookSubscriptionStatusWithAudit({
            providerSubscriptionId: subscriptionId,
            status: "past_due",
            lastPaymentFailedAt: new Date(),
            action: "stripe_invoice_failed",
            metadata: { invoiceId: invoice.id },
          });
        }
        break;
      }
      default:
        logger.stripe.info("Unhandled membership Stripe event", {
          eventId: event.id,
          eventType: event.type,
        });
    }

    await storage.membership.completeWebhookProcessing("stripe", event.id, processingToken);
    return { received: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 1000) : "Unknown webhook processing failure";
    try {
      await storage.membership.failWebhookProcessing("stripe", event.id, processingToken, message);
    } catch (statusError) {
      logger.stripe.error("Failed to record membership webhook failure", statusError, {
        eventId: event.id,
      });
    }
    throw error;
  }
}

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

  const synced = existing
    ? await storage.membership.updateSubscription(existing.id, data)
    : await storage.membership.createSubscription(data);
  if (synced) {
    await storage.membership.createAuditEvent({
      userId: synced.userId,
      subscriptionId: synced.id,
      action: "stripe_subscription_synced",
      metadata: { stripeSubscriptionId: subscription.id, status: subscription.status },
    });
  }
  return synced;
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

  const firstProcessing = await storage.membership.markWebhookProcessed(
    "stripe",
    event.id,
    event.type,
  );
  if (!firstProcessing) {
    return { received: true, duplicate: true };
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = metadataFromStripeObject(session);
      if (session.mode === "subscription" && session.subscription && metadata.userId) {
        const subscription = await storage.membership.upsertSubscriptionForUser(metadata.userId, {
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
        });
        await storage.membership.createAuditEvent({
          userId: metadata.userId,
          subscriptionId: subscription.id,
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
        const subscription =
          await storage.membership.getSubscriptionByProviderSubscriptionId(subscriptionId);
        if (subscription) {
          await storage.membership.updateSubscription(subscription.id, {
            status: "active",
            lastPaymentFailedAt: null,
          });
          await storage.membership.createAuditEvent({
            userId: subscription.userId,
            subscriptionId: subscription.id,
            action: "stripe_invoice_paid",
            metadata: { invoiceId: invoice.id },
          });
        }
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceSubscription = (invoice as StripeInvoiceWithSubscription).subscription;
      const subscriptionId =
        typeof invoiceSubscription === "string" ? invoiceSubscription : invoiceSubscription?.id;
      if (subscriptionId) {
        const subscription =
          await storage.membership.getSubscriptionByProviderSubscriptionId(subscriptionId);
        if (subscription) {
          await storage.membership.updateSubscription(subscription.id, {
            status: "past_due",
            lastPaymentFailedAt: new Date(),
          });
          await storage.membership.createAuditEvent({
            userId: subscription.userId,
            subscriptionId: subscription.id,
            action: "stripe_invoice_failed",
            metadata: { invoiceId: invoice.id },
          });
        }
      }
      break;
    }
    default:
      logger.stripe.info("Unhandled membership Stripe event", {
        eventId: event.id,
        eventType: event.type,
      });
  }

  return { received: true };
}

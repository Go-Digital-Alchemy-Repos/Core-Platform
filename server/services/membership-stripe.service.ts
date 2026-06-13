import Stripe from "stripe";
import { storage } from "../storage/index";
import { logger } from "../utils/logger";

export type MembershipStripeMode = "test" | "live";

const SETTINGS_CATEGORY = "membership_stripe";

function maskSecret(value: string | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export async function getMembershipStripeSettings() {
  const settings = await storage.settings.getDecryptedCategory(SETTINGS_CATEGORY);
  return {
    mode: (settings.membership_stripe_mode === "live" ? "live" : "test") as MembershipStripeMode,
    publishableKey: settings.membership_stripe_publishable_key || "",
    secretKey: settings.membership_stripe_secret_key || "",
    webhookSecret: settings.membership_stripe_webhook_secret || "",
    customerPortalEnabled: settings.membership_stripe_customer_portal_enabled !== "false",
  };
}

export async function saveMembershipStripeSettings(input: {
  mode?: MembershipStripeMode;
  publishableKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  customerPortalEnabled?: boolean;
}) {
  const writes = [];
  if (input.mode) writes.push(storage.settings.upsertSetting("membership_stripe_mode", input.mode, SETTINGS_CATEGORY, false));
  if (input.publishableKey !== undefined) writes.push(storage.settings.upsertSetting("membership_stripe_publishable_key", input.publishableKey, SETTINGS_CATEGORY, false));
  if (input.secretKey !== undefined) writes.push(storage.settings.upsertSetting("membership_stripe_secret_key", input.secretKey, SETTINGS_CATEGORY, true));
  if (input.webhookSecret !== undefined) writes.push(storage.settings.upsertSetting("membership_stripe_webhook_secret", input.webhookSecret, SETTINGS_CATEGORY, true));
  if (input.customerPortalEnabled !== undefined) {
    writes.push(storage.settings.upsertSetting("membership_stripe_customer_portal_enabled", String(input.customerPortalEnabled), SETTINGS_CATEGORY, false));
  }
  await Promise.all(writes);
  return getMaskedMembershipStripeStatus();
}

export async function getMaskedMembershipStripeStatus() {
  const settings = await getMembershipStripeSettings();
  return {
    mode: settings.mode,
    publishableKey: maskSecret(settings.publishableKey),
    secretKeyConfigured: !!settings.secretKey,
    webhookSecretConfigured: !!settings.webhookSecret,
    customerPortalEnabled: settings.customerPortalEnabled,
  };
}

export async function getMembershipStripeClient(): Promise<Stripe> {
  const settings = await getMembershipStripeSettings();
  if (!settings.secretKey) throw Object.assign(new Error("Membership Stripe secret key is not configured"), { statusCode: 400 });
  return new Stripe(settings.secretKey);
}

export async function getMembershipStripeWebhookSecret(): Promise<string> {
  const settings = await getMembershipStripeSettings();
  return settings.webhookSecret;
}

export async function testMembershipStripeConnection() {
  const stripe = await getMembershipStripeClient();
  const account = await stripe.accounts.retrieve();
  return {
    ok: true,
    accountId: account.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
  };
}

export async function createMembershipCheckoutSession(params: {
  userId: string;
  userEmail: string;
  planId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const [plan, price] = await Promise.all([
    storage.membership.getPlan(params.planId),
    storage.membership.getPrice(params.priceId),
  ]);
  if (!plan || plan.status !== "active") throw Object.assign(new Error("Membership plan is not available"), { statusCode: 400 });
  if (!price || price.planId !== plan.id || !price.active) throw Object.assign(new Error("Membership price is not available"), { statusCode: 400 });

  if (plan.isFree || price.amount === 0) {
    const subscription = await storage.membership.upsertSubscriptionForUser(params.userId, {
      planId: plan.id,
      priceId: price.id,
      status: "active",
      source: "free",
      currentPeriodStart: new Date(),
    });
    await storage.membership.createAuditEvent({
      userId: params.userId,
      subscriptionId: subscription.id,
      action: "free_membership_started",
      metadata: { planId: plan.id, priceId: price.id },
    });
    return { free: true, subscription, url: params.successUrl };
  }

  if (!price.stripePriceId) throw Object.assign(new Error("This membership price is missing a Stripe price ID"), { statusCode: 400 });
  const stripe = await getMembershipStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: params.userEmail,
    line_items: [{ price: price.stripePriceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    subscription_data: {
      trial_period_days: plan.trialDays > 0 ? plan.trialDays : undefined,
      metadata: {
        userId: params.userId,
        planId: plan.id,
        priceId: price.id,
      },
    },
    metadata: {
      userId: params.userId,
      planId: plan.id,
      priceId: price.id,
    },
  });

  const subscription = await storage.membership.upsertSubscriptionForUser(params.userId, {
    planId: plan.id,
    priceId: price.id,
    status: "incomplete",
    source: "stripe",
    provider: "stripe",
    providerCustomerId: typeof session.customer === "string" ? session.customer : null,
    providerCheckoutSessionId: session.id,
  });
  logger.stripe.info("Membership checkout session created", { sessionId: session.id, subscriptionId: subscription.id });
  return { free: false, sessionId: session.id, url: session.url };
}

export async function createMembershipPortalSession(params: {
  userId: string;
  returnUrl: string;
}) {
  const settings = await getMembershipStripeSettings();
  if (!settings.customerPortalEnabled) throw Object.assign(new Error("Membership customer portal is disabled"), { statusCode: 400 });
  const subscription = await storage.membership.getActiveSubscriptionForUser(params.userId);
  if (!subscription?.providerCustomerId) throw Object.assign(new Error("No Stripe customer is linked to this membership"), { statusCode: 400 });
  const stripe = await getMembershipStripeClient();
  return stripe.billingPortal.sessions.create({
    customer: subscription.providerCustomerId,
    return_url: params.returnUrl,
  });
}

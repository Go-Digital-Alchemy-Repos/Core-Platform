import Stripe from "stripe";
import { storage } from "../storage/index";
import { logger } from "../utils/logger";

export type MembershipStripeMode = "test" | "live";

export interface MembershipStripeSettingsInput {
  mode?: MembershipStripeMode;
  publishableKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  customerPortalEnabled?: boolean;
  clearPublishableKey?: boolean;
  clearSecretKey?: boolean;
  clearWebhookSecret?: boolean;
}

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

function credentialUpdate(value: string | undefined, clear: boolean | undefined, label: string) {
  const normalized = value?.trim();
  if (clear && normalized) {
    throw Object.assign(new Error(`${label} cannot be set and cleared in the same request`), {
      statusCode: 400,
    });
  }
  if (clear) return "";
  return normalized || undefined;
}

export function assertMembershipReturnUrl(
  value: string,
  label: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw Object.assign(new Error(`${label} must be a valid absolute URL`), { statusCode: 400 });
  }
  if (!(["http:", "https:"] as string[]).includes(url.protocol) || url.username || url.password) {
    throw Object.assign(new Error(`${label} must be a safe HTTP URL`), { statusCode: 400 });
  }

  const trustedOrigins = new Set<string>();
  for (const raw of [env.APP_URL, ...(env.TRUSTED_ORIGINS || "").split(",")]) {
    if (!raw?.trim()) continue;
    try {
      trustedOrigins.add(new URL(raw.trim()).origin);
    } catch {
      // Environment validation reports malformed configured origins during deployment preflight.
    }
  }

  const localDevelopmentUrl =
    env.NODE_ENV !== "production" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (!trustedOrigins.has(url.origin) && !localDevelopmentUrl) {
    throw Object.assign(new Error(`${label} must use a trusted application origin`), {
      statusCode: 400,
    });
  }
}

export function normalizeMembershipStripeSettingsInput(input: MembershipStripeSettingsInput) {
  return {
    mode: input.mode,
    publishableKey: credentialUpdate(
      input.publishableKey,
      input.clearPublishableKey,
      "Publishable key",
    ),
    secretKey: credentialUpdate(input.secretKey, input.clearSecretKey, "Secret key"),
    webhookSecret: credentialUpdate(
      input.webhookSecret,
      input.clearWebhookSecret,
      "Webhook secret",
    ),
    customerPortalEnabled: input.customerPortalEnabled,
  };
}

export async function saveMembershipStripeSettings(input: MembershipStripeSettingsInput) {
  const normalized = normalizeMembershipStripeSettingsInput(input);
  const writes = [];
  if (normalized.mode)
    writes.push(
      storage.settings.upsertSetting(
        "membership_stripe_mode",
        normalized.mode,
        SETTINGS_CATEGORY,
        false,
      ),
    );
  if (normalized.publishableKey !== undefined)
    writes.push(
      storage.settings.upsertSetting(
        "membership_stripe_publishable_key",
        normalized.publishableKey,
        SETTINGS_CATEGORY,
        false,
      ),
    );
  if (normalized.secretKey !== undefined)
    writes.push(
      storage.settings.upsertSetting(
        "membership_stripe_secret_key",
        normalized.secretKey,
        SETTINGS_CATEGORY,
        true,
      ),
    );
  if (normalized.webhookSecret !== undefined)
    writes.push(
      storage.settings.upsertSetting(
        "membership_stripe_webhook_secret",
        normalized.webhookSecret,
        SETTINGS_CATEGORY,
        true,
      ),
    );
  if (normalized.customerPortalEnabled !== undefined) {
    writes.push(
      storage.settings.upsertSetting(
        "membership_stripe_customer_portal_enabled",
        String(normalized.customerPortalEnabled),
        SETTINGS_CATEGORY,
        false,
      ),
    );
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
  if (!settings.secretKey)
    throw Object.assign(new Error("Membership Stripe secret key is not configured"), {
      statusCode: 400,
    });
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
  assertMembershipReturnUrl(params.successUrl, "Success URL");
  assertMembershipReturnUrl(params.cancelUrl, "Cancel URL");
  const [plan, price] = await Promise.all([
    storage.membership.getPlan(params.planId),
    storage.membership.getPrice(params.priceId),
  ]);
  if (!plan || plan.status !== "active")
    throw Object.assign(new Error("Membership plan is not available"), { statusCode: 400 });
  if (!price || price.planId !== plan.id || !price.active)
    throw Object.assign(new Error("Membership price is not available"), { statusCode: 400 });

  if (plan.isFree || price.amount === 0) {
    const subscription = await storage.membership.upsertSubscriptionForUserWithAudit({
      userId: params.userId,
      data: {
        planId: plan.id,
        priceId: price.id,
        status: "active",
        source: "free",
        currentPeriodStart: new Date(),
      },
      audit: {
        action: "free_membership_started",
        metadata: { planId: plan.id, priceId: price.id },
      },
    });
    return { free: true, subscription, url: params.successUrl };
  }

  if (!price.stripePriceId)
    throw Object.assign(new Error("This membership price is missing a Stripe price ID"), {
      statusCode: 400,
    });
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
  logger.stripe.info("Membership checkout session created", {
    sessionId: session.id,
    subscriptionId: subscription.id,
  });
  return { free: false, sessionId: session.id, url: session.url };
}

export async function createMembershipPortalSession(params: { userId: string; returnUrl: string }) {
  assertMembershipReturnUrl(params.returnUrl, "Portal return URL");
  const settings = await getMembershipStripeSettings();
  if (!settings.customerPortalEnabled)
    throw Object.assign(new Error("Membership customer portal is disabled"), { statusCode: 400 });
  const subscription = await storage.membership.getActiveSubscriptionForUser(params.userId);
  if (!subscription?.providerCustomerId)
    throw Object.assign(new Error("No Stripe customer is linked to this membership"), {
      statusCode: 400,
    });
  const stripe = await getMembershipStripeClient();
  return stripe.billingPortal.sessions.create({
    customer: subscription.providerCustomerId,
    return_url: params.returnUrl,
  });
}

import Stripe from "stripe";
import { storage } from "../storage/index";
import { logger } from "../utils/logger";

async function fetchStripeCredentials(): Promise<{ stripeSecretKey: string; stripePublishableKey: string }> {
  let settings: Record<string, string> = {};
  try {
    settings = await storage.settings.getDecryptedCategory("stripe");
  } catch (err) {
    logger.stripe.warn("Failed to load Stripe credentials from DB, falling back to env vars", { error: err instanceof Error ? err.message : String(err) });
  }

  const stripeSecretKey = settings.stripe_secret_key || process.env.STRIPE_SECRET_KEY;
  const stripePublishableKey = settings.stripe_publishable_key || process.env.STRIPE_PUBLISHABLE_KEY || "";

  if (!stripeSecretKey) {
    throw new Error("Stripe secret key not configured. Set it in Admin > Settings > Integrations or via STRIPE_SECRET_KEY env var.");
  }

  return { stripeSecretKey, stripePublishableKey };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { stripeSecretKey } = await fetchStripeCredentials();
  return new Stripe(stripeSecretKey);
}

let stripeInstance: Stripe | null = null;

export async function getStripeClient(): Promise<Stripe> {
  if (!stripeInstance) {
    const { stripeSecretKey } = await fetchStripeCredentials();
    stripeInstance = new Stripe(stripeSecretKey);
  }
  return stripeInstance;
}

export function resetStripeClient(): void {
  stripeInstance = null;
}

export async function getStripePublishableKey(): Promise<string> {
  const { stripePublishableKey } = await fetchStripeCredentials();
  return stripePublishableKey;
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  try {
    const settings = await storage.settings.getDecryptedCategory("stripe");
    if (settings.stripe_webhook_secret) {
      return settings.stripe_webhook_secret;
    }
  } catch (err) {
    logger.stripe.warn("Failed to load Stripe webhook secret from DB, falling back to env var", { error: err instanceof Error ? err.message : String(err) });
  }
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}

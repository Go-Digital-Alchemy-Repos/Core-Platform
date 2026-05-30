import Stripe from "stripe";
import { storage } from "../storage/index";
import { logger } from "../utils/logger";

export type EcommerceStripeMode = "test" | "live";

const MASK = "••••••••";

function isTestKey(key: string): boolean {
  return key.includes("_test_");
}

function isLiveKey(key: string): boolean {
  return key.includes("_live_");
}

function stripeConfigurationError(message: string) {
  return Object.assign(new Error(message), { statusCode: 503 });
}

export async function getEcommerceStripeSettings(): Promise<Record<string, string>> {
  return storage.settings.getDecryptedCategory("ecommerce_stripe");
}

export async function getEcommerceStripeMode(): Promise<EcommerceStripeMode> {
  const settings = await getEcommerceStripeSettings();
  return settings.active_mode === "live" ? "live" : "test";
}

export async function getEcommerceStripePublishableKey(): Promise<string> {
  const settings = await getEcommerceStripeSettings();
  const mode = settings.active_mode === "live" ? "live" : "test";
  const key = mode === "live"
    ? settings.live_publishable_key || ""
    : settings.test_publishable_key || "";
  const error = validateStripeKeyMode(mode, key);
  if (error) throw stripeConfigurationError(error);
  if (!key) throw stripeConfigurationError("Ecommerce Stripe publishable key is not configured");
  return key;
}

export async function getEcommerceStripeSecretKey(): Promise<string> {
  const settings = await getEcommerceStripeSettings();
  const mode = settings.active_mode === "live" ? "live" : "test";
  const key = mode === "live" ? settings.live_secret_key : settings.test_secret_key;
  if (!key) throw new Error("Ecommerce Stripe secret key is not configured");
  if (mode === "live" && isTestKey(key)) throw new Error("Live Stripe mode cannot use a test secret key");
  if (mode === "test" && isLiveKey(key)) throw new Error("Test Stripe mode cannot use a live secret key");
  return key;
}

export async function getEcommerceStripeClient(): Promise<Stripe> {
  return new Stripe(await getEcommerceStripeSecretKey());
}

export async function getEcommerceStripeWebhookSecret(): Promise<string | null> {
  const settings = await getEcommerceStripeSettings();
  const mode = settings.active_mode === "live" ? "live" : "test";
  return (mode === "live" ? settings.live_webhook_secret : settings.test_webhook_secret) || null;
}

export async function getMaskedEcommerceStripeStatus() {
  const settings = await getEcommerceStripeSettings();
  const activeMode = settings.active_mode === "live" ? "live" : "test";
  return {
    activeMode,
    testPublishableKey: settings.test_publishable_key || "",
    livePublishableKey: settings.live_publishable_key || "",
    hasTestSecretKey: Boolean(settings.test_secret_key),
    hasLiveSecretKey: Boolean(settings.live_secret_key),
    hasTestWebhookSecret: Boolean(settings.test_webhook_secret),
    hasLiveWebhookSecret: Boolean(settings.live_webhook_secret),
    mask: MASK,
  };
}

export function validateStripeKeyMode(mode: EcommerceStripeMode, publishableKey?: string, secretKey?: string): string | null {
  if (mode === "test") {
    if (publishableKey && isLiveKey(publishableKey)) return "Test mode cannot use a live publishable key";
    if (secretKey && isLiveKey(secretKey)) return "Test mode cannot use a live secret key";
  } else {
    if (publishableKey && isTestKey(publishableKey)) return "Live mode cannot use a test publishable key";
    if (secretKey && isTestKey(secretKey)) return "Live mode cannot use a test secret key";
  }
  return null;
}

export function validateStripeSettingsKeyModes(input: {
  testPublishableKey?: string;
  testSecretKey?: string;
  livePublishableKey?: string;
  liveSecretKey?: string;
}): string | null {
  return (
    validateStripeKeyMode("test", input.testPublishableKey, input.testSecretKey) ??
    validateStripeKeyMode("live", input.livePublishableKey, input.liveSecretKey)
  );
}

export async function testEcommerceStripeConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const stripe = await getEcommerceStripeClient();
    await stripe.accounts.retrieve();
    return { success: true, message: "Stripe connection successful" };
  } catch (err) {
    logger.stripe.warn("Ecommerce Stripe connection failed", { error: err instanceof Error ? err.message : String(err) });
    return { success: false, message: err instanceof Error ? err.message : "Stripe connection failed" };
  }
}

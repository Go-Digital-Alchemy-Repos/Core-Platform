import Stripe from "stripe";
import { storage } from "../storage/index";

async function fetchStripeCredentials(): Promise<{ stripeSecretKey: string; stripePublishableKey: string }> {
  try {
    const settings = await storage.settings.getDecryptedCategory("stripe");
    if (settings.stripe_secret_key) {
      return {
        stripeSecretKey: settings.stripe_secret_key,
        stripePublishableKey: settings.stripe_publishable_key || "",
      };
    }
  } catch (_e) {
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

  if (!secretKey) {
    throw new Error("Stripe secret key not configured. Set it in Admin > Settings > Integrations or via STRIPE_SECRET_KEY env var.");
  }

  return {
    stripeSecretKey: secretKey,
    stripePublishableKey: publishableKey || "",
  };
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

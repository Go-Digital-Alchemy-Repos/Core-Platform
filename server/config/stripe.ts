import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

async function fetchStripeCredentials(): Promise<{ stripeSecretKey: string; stripePublishableKey: string }> {
  const connectorsHostname = process.env.REPLIT_CONNECTORS_HOSTNAME;

  if (connectorsHostname) {
    try {
      const identity = process.env.REPL_IDENTITY;
      const headers: Record<string, string> = {};
      if (identity) {
        headers["Authorization"] = `Bearer ${identity}`;
      }

      const response = await fetch(
        `http://${connectorsHostname}/proxy/stripe/getCredentials`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          stripeSecretKey: data.stripeSecretKey,
          stripePublishableKey: data.stripePublishableKey,
        };
      }
    } catch (e) {
      console.warn("Could not fetch Stripe credentials from connector, falling back to env vars");
    }
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

  if (!secretKey) {
    throw new Error("Stripe secret key not configured. Set STRIPE_SECRET_KEY or connect Stripe integration.");
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

export async function getStripeClient(): Promise<Stripe> {
  if (!stripeInstance) {
    const { stripeSecretKey } = await fetchStripeCredentials();
    stripeInstance = new Stripe(stripeSecretKey);
  }
  return stripeInstance;
}

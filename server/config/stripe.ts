import Stripe from "stripe";

async function fetchStripeCredentials(): Promise<{ stripeSecretKey: string; stripePublishableKey: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (hostname && xReplitToken) {
    try {
      const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
      const targetEnvironment = isProduction ? "production" : "development";

      const url = new URL(`https://${hostname}/api/v2/connection`);
      url.searchParams.set("include_secrets", "true");
      url.searchParams.set("connector_names", "stripe");
      url.searchParams.set("environment", targetEnvironment);

      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "X-Replit-Token": xReplitToken,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const connectionSettings = data.items?.[0];

        if (connectionSettings?.settings?.publishable && connectionSettings?.settings?.secret) {
          return {
            stripeSecretKey: connectionSettings.settings.secret,
            stripePublishableKey: connectionSettings.settings.publishable,
          };
        }
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

let stripeInstance: Stripe | null = null;

export async function getStripeClient(): Promise<Stripe> {
  if (!stripeInstance) {
    const { stripeSecretKey } = await fetchStripeCredentials();
    stripeInstance = new Stripe(stripeSecretKey);
  }
  return stripeInstance;
}

export async function getStripePublishableKey(): Promise<string> {
  const { stripePublishableKey } = await fetchStripeCredentials();
  return stripePublishableKey;
}

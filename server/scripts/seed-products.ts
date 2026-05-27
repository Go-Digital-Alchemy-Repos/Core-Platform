import { getStripeClient } from "../config/stripe";
import { db } from "../db";
import { membershipTiers } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedStripeProducts() {
  console.log("Syncing membership tiers with Stripe...");

  let stripe;
  try {
    stripe = await getStripeClient();
  } catch (e) {
    console.log("Stripe not configured. Skipping product sync.");
    console.log("Tiers exist in database without Stripe price IDs.");
    return;
  }

  const tiers = await db.select().from(membershipTiers);

  for (const tier of tiers) {
    if (tier.stripePriceIdMonthly && tier.stripePriceIdAnnual) {
      console.log(`Tier "${tier.name}" already has Stripe price IDs, skipping.`);
      continue;
    }

    console.log(`Creating Stripe product for tier: ${tier.name}`);

    const product = await stripe.products.create({
      name: `Core Platform - ${tier.name}`,
      description: tier.description || undefined,
      metadata: { tierId: tier.id },
    });

    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: tier.monthlyPrice,
      currency: "usd",
      recurring: { interval: "month" },
    });

    const annualPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: tier.annualPrice,
      currency: "usd",
      recurring: { interval: "year" },
    });

    await db
      .update(membershipTiers)
      .set({
        stripePriceIdMonthly: monthlyPrice.id,
        stripePriceIdAnnual: annualPrice.id,
        updatedAt: new Date(),
      })
      .where(eq(membershipTiers.id, tier.id));

    console.log(`  Product: ${product.id}`);
    console.log(`  Monthly Price: ${monthlyPrice.id}`);
    console.log(`  Annual Price: ${annualPrice.id}`);
  }

  console.log("Stripe product sync complete!");
}

seedStripeProducts().catch(console.error);

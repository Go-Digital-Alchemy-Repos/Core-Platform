import type { MembershipTier } from "@shared/schema";

export function findActiveTierForStripePrice(tiers: MembershipTier[], priceId: string) {
  return tiers.find(
    (tier) =>
      tier.isActive !== false &&
      (tier.stripePriceIdMonthly === priceId || tier.stripePriceIdAnnual === priceId),
  );
}

import {
  shippingQuoteResultSchema,
  type ShippingQuoteResult,
} from "@shared/ecommerce-shipping-quote-result";
import type { ecommerceShippingQuoteAttempts } from "@shared/schema";

type Attempt = typeof ecommerceShippingQuoteAttempts.$inferSelect;
/** Explicit projection is required: storage rows contain private snapshots and fencing tokens. */
export function projectShippingQuoteResult(attempt: Attempt, stale: boolean): ShippingQuoteResult {
  try {
    if (
      attempt.status === "quoted" &&
      (attempt.observedMode !== "test" ||
        !attempt.providerShipmentId ||
        attempt.rates.some(
          (rate) => rate.mode !== "test" || rate.providerShipmentId !== attempt.providerShipmentId,
        ))
    )
      throw new Error("Invalid internal quote identity");
    return shippingQuoteResultSchema.parse({
      id: attempt.id,
      status: attempt.status,
      provider: attempt.provider,
      mode: attempt.expectedMode,
      stale,
      createdAt: attempt.createdAt.toISOString(),
      expiresAt: attempt.expiresAt.toISOString(),
      errorCode: attempt.errorCode,
      rates: attempt.rates.map((rate) => ({
        id: rate.providerRateId,
        carrier: rate.carrier,
        service: rate.service,
        amount: rate.amount,
        currency: rate.currency,
        estimatedDays: rate.estimatedDays,
        deliveryGuaranteed: rate.deliveryGuaranteed,
      })),
    });
  } catch {
    throw Object.assign(new Error("Shipping quote result is unavailable"), { statusCode: 503 });
  }
}

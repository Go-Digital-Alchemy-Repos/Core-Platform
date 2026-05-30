import { describe, expect, it } from "vitest";
import {
  ecommerceCheckoutRateLimitPolicy,
  ecommerceOrderLookupRateLimitPolicy,
  ecommercePricingRateLimitPolicy,
} from "./security";

describe("sensitive ecommerce rate limit policies", () => {
  it("keeps checkout PaymentIntent creation tighter than the general API limit", () => {
    expect(ecommerceCheckoutRateLimitPolicy).toMatchObject({
      windowMs: 10 * 60 * 1000,
      max: 20,
    });
  });

  it("keeps public order lookup constrained because it protects private order data", () => {
    expect(ecommerceOrderLookupRateLimitPolicy).toMatchObject({
      windowMs: 10 * 60 * 1000,
      max: 30,
    });
  });

  it("keeps public ecommerce pricing and quote endpoints below the general API limit", () => {
    expect(ecommercePricingRateLimitPolicy).toMatchObject({
      windowMs: 10 * 60 * 1000,
      max: 120,
    });
  });
});

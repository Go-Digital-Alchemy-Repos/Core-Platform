import { describe, expect, it } from "vitest";
import { getStripeCheckoutUnavailableMessage } from "./checkout-page";

describe("checkout Stripe configuration messaging", () => {
  it("shows a customer-safe message when Stripe config is unavailable", () => {
    expect(getStripeCheckoutUnavailableMessage(new Error("Ecommerce Stripe publishable key is not configured"))).toBe(
      "Secure card checkout is temporarily unavailable. Please contact support before placing this order.",
    );
  });

  it("uses a neutral fallback while no specific config error is available", () => {
    expect(getStripeCheckoutUnavailableMessage(null)).toBe("Secure card checkout is not available yet.");
  });
});

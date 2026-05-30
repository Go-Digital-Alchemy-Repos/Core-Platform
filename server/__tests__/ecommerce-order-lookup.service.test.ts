import { describe, expect, it } from "vitest";
import { isEcommerceOrderLookupAuthorized } from "../services/ecommerce-order-lookup.service";

describe("ecommerce order lookup authorization", () => {
  const details = {
    lookupToken: "secure-token",
    customer: { email: "Buyer@Example.com" },
  };

  it("requires matching email and lookup token", () => {
    expect(isEcommerceOrderLookupAuthorized(details, {
      email: "buyer@example.com",
      token: "secure-token",
    })).toBe(true);
    expect(isEcommerceOrderLookupAuthorized(details, {
      email: "buyer@example.com",
      token: "",
    })).toBe(false);
    expect(isEcommerceOrderLookupAuthorized(details, {
      email: "other@example.com",
      token: "secure-token",
    })).toBe(false);
  });

  it("rejects orders without a customer context", () => {
    expect(isEcommerceOrderLookupAuthorized({
      lookupToken: "secure-token",
      customer: null,
    }, {
      email: "buyer@example.com",
      token: "secure-token",
    })).toBe(false);
  });
});

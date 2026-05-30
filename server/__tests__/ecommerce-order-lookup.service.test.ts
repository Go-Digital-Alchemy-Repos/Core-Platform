import { describe, expect, it } from "vitest";
import {
  ecommerceOrderStatusLookupSchema,
  isEcommerceOrderLookupAuthorized,
} from "../services/ecommerce-order-lookup.service";

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

  it("trims order lookup fields before querying", () => {
    expect(ecommerceOrderStatusLookupSchema.parse({
      orderId: " order-123 ",
      email: " Buyer@Example.com ",
      token: " lookup-token ",
    })).toEqual({
      orderId: "order-123",
      email: "Buyer@Example.com",
      token: "lookup-token",
    });
  });

  it("rejects oversized order lookup fields", () => {
    expect(() => ecommerceOrderStatusLookupSchema.parse({
      orderId: "o".repeat(129),
      email: "buyer@example.com",
      token: "lookup-token",
    })).toThrow();
    expect(() => ecommerceOrderStatusLookupSchema.parse({
      orderId: "order-123",
      email: "buyer@example.com",
      token: "t".repeat(129),
    })).toThrow();
    expect(() => ecommerceOrderStatusLookupSchema.parse({
      orderId: "order-123",
      email: `${"b".repeat(244)}@example.com`,
      token: "lookup-token",
    })).toThrow();
  });
});

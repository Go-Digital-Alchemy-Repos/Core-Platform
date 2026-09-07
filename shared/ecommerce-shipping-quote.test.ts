import { describe, expect, it } from "vitest";
import { parseShippingQuoteUsdCents, shippingQuoteRequestSchema } from "./ecommerce-shipping-quote";

const request = {
  version: "1.0.0",
  locationId: "location-1",
  items: [{ orderItemId: "item-1", quantity: 2 }],
  parcel: { weight: 16, weightUnit: "oz" },
};

describe("shipping quote request boundary", () => {
  it("accepts a weight-only package and complete metric dimensions", () => {
    expect(shippingQuoteRequestSchema.parse(request)).toEqual(request);
    expect(
      shippingQuoteRequestSchema.safeParse({
        ...request,
        parcel: {
          weight: 1,
          weightUnit: "kg",
          dimensions: { length: 10, width: 20, height: 30, unit: "cm" },
        },
      }).success,
    ).toBe(true);
  });
  it("rejects caller-owned price, address, mode and provider identity", () => {
    for (const field of [
      "amount",
      "currency",
      "fromAddress",
      "toAddress",
      "providerShipmentId",
      "apiKey",
      "testMode",
      "provider",
      "parcels",
    ])
      expect(
        shippingQuoteRequestSchema.safeParse({ ...request, [field]: "untrusted" }).success,
      ).toBe(false);
  });
  it("rejects duplicate normalized item identifiers and empty selections", () => {
    expect(shippingQuoteRequestSchema.safeParse({ ...request, items: [] }).success).toBe(false);
    expect(
      shippingQuoteRequestSchema.safeParse({
        ...request,
        items: [request.items[0], { orderItemId: " item-1 ", quantity: 1 }],
      }).success,
    ).toBe(false);
  });
  it("rejects partial dimensions, unknown units and nonpositive or nonfinite weights", () => {
    for (const weight of [0, -1, NaN, Infinity, 1_000_001])
      expect(
        shippingQuoteRequestSchema.safeParse({ ...request, parcel: { ...request.parcel, weight } })
          .success,
      ).toBe(false);
    for (const parcel of [
      { weight: 1, weightUnit: "stone" },
      { ...request.parcel, dimensions: { length: 1, unit: "in" } },
      { ...request.parcel, dimensions: { length: 1, width: 2, height: 3, unit: "ft" } },
    ])
      expect(shippingQuoteRequestSchema.safeParse({ ...request, parcel }).success).toBe(false);
  });
  it("rejects unsupported versions and fractional quantities", () => {
    expect(shippingQuoteRequestSchema.safeParse({ ...request, version: "2.0.0" }).success).toBe(
      false,
    );
    expect(
      shippingQuoteRequestSchema.safeParse({
        ...request,
        items: [{ orderItemId: "item-1", quantity: 0.5 }],
      }).success,
    ).toBe(false);
  });
});

describe("provider USD decimal conversion", () => {
  it("preserves exact cents and the database integer boundary", () => {
    for (const [input, output] of [
      ["0", 0],
      ["0.29", 29],
      ["12.3", 1230],
      ["12.34", 1234],
      ["21474836.47", 2147483647],
    ] as const)
      expect(parseShippingQuoteUsdCents(input)).toBe(output);
  });
  it("rejects overflow, excess precision and ambiguous formats without rounding", () => {
    for (const input of [
      "21474836.48",
      "0.001",
      "-1",
      "+1",
      "1e2",
      "01.00",
      " 1.00",
      "1.",
      ".5",
      "NaN",
      "Infinity",
      1.2,
      null,
    ])
      expect(() => parseShippingQuoteUsdCents(input)).toThrow();
  });
});

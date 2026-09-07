import { expect, it } from "vitest";
import type { ecommerceShippingQuoteAttempts } from "@shared/schema";
import { projectShippingQuoteResult } from "../services/ecommerce-shipping-quote-result";
const row = {
  id: "quote-1",
  status: "quoted",
  provider: "easypost",
  expectedMode: "test",
  observedMode: "test",
  providerShipmentId: "shp_private",
  createdAt: new Date("2026-09-07T00:00:00Z"),
  expiresAt: new Date("2026-09-07T00:15:00Z"),
  errorCode: null,
  fencingToken: "private-token",
  credentialGenerationId: "private-generation",
  acceptedSnapshot: { toAddress: { name: "Private Person", street1: "Private address" } },
  rates: [
    {
      providerRateId: "rate_1",
      mode: "test",
      providerShipmentId: "shp_private",
      carrierAccountId: "ca_private",
      carrier: "Example",
      service: "Ground",
      amount: 123,
      currency: "USD",
      estimatedDays: null,
      deliveryGuaranteed: null,
      raw: "private-raw",
    },
  ],
} as unknown as typeof ecommerceShippingQuoteAttempts.$inferSelect;
it("projects only display fields and preserves unknown delivery guarantees", () => {
  const result = projectShippingQuoteResult(row, true);
  expect(result).toEqual({
    id: "quote-1",
    status: "quoted",
    provider: "easypost",
    mode: "test",
    stale: true,
    createdAt: "2026-09-07T00:00:00.000Z",
    expiresAt: "2026-09-07T00:15:00.000Z",
    errorCode: null,
    rates: [
      {
        id: "rate_1",
        carrier: "Example",
        service: "Ground",
        amount: 123,
        currency: "USD",
        estimatedDays: null,
        deliveryGuaranteed: null,
      },
    ],
  });
  expect(JSON.stringify(result)).not.toMatch(/private|Private/);
});
it("does not invent rates for pending or unknown attempts", () => {
  for (const status of ["pending", "unknown", "unavailable"])
    expect(
      projectShippingQuoteResult(
        {
          ...row,
          status,
          rates: [],
          errorCode:
            status === "unknown" ? "interrupted" : status === "unavailable" ? "no_rates" : null,
        },
        false,
      ).rates,
    ).toEqual([]);
});
it("fails safely when stored result fields are malformed or statuses conflict", () => {
  for (const invalid of [
    { ...row, observedMode: "production" },
    { ...row, rates: [{ ...row.rates[0], mode: "production" }] },
    { ...row, rates: [{ ...row.rates[0], providerShipmentId: "shp_other" }] },
    { ...row, rates: [row.rates[0], row.rates[0]] },
    { ...row, errorCode: "provider_rejected" },
    { ...row, rates: [] },
    { ...row, status: "pending" },
    { ...row, expectedMode: "production" },
    { ...row, errorCode: "private-provider-error" },
    { ...row, rates: [{ ...row.rates[0], amount: -1 }] },
  ]) {
    try {
      projectShippingQuoteResult(invalid, false);
      throw new Error("Expected rejection");
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 503,
        message: "Shipping quote result is unavailable",
      });
    }
  }
});

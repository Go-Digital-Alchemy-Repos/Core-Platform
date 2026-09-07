import { describe, expect, it } from "vitest";
import {
  EasyPostShippingProviderClient,
  type ShippingProviderParcel,
} from "../services/ecommerce-shipping-carrier.service";

const client = new EasyPostShippingProviderClient({ apiKey: "synthetic-unused" });
const address = { street1: "1 Test St", city: "Test", zip: "12345", country: "US" };
function payload(parcels: ShippingProviderParcel[]) {
  return client.buildRateQuotePayload({
    provider: "easypost",
    orderId: "order-test",
    fromAddress: address,
    toAddress: address,
    parcels,
  });
}
const base: ShippingProviderParcel = { weight: 16, weightUnit: "oz" };

describe("EasyPost documented parcel payload", () => {
  it.each([
    ["oz", 16, 16],
    ["lb", 1.25, 20],
    ["g", 28.349523125, 1],
    ["kg", 1, 35.3],
  ])("converts %s to ounces", (weightUnit, weight, expected) => {
    expect(payload([{ weight, weightUnit }]).shipment).toEqual({
      to_address: expect.objectContaining(address),
      from_address: expect.objectContaining(address),
      reference: "order-test",
      parcel: { weight: expected },
    });
  });

  it.each([
    [undefined, 10, 10],
    [null, 10, 10],
    ["in", 10.16, 10.2],
    ["cm", 25.4, 10],
    ["mm", 254, 10],
  ])("converts %s dimensions and omits unsupported unit fields", (distanceUnit, size, expected) => {
    expect(
      payload([{ ...base, distanceUnit, length: size, width: size, height: size }]).shipment.parcel,
    ).toEqual({ weight: 16, length: expected, width: expected, height: expected });
  });

  it("treats all null dimensions as absent", () => {
    expect(payload([{ ...base, length: null, width: null, height: null }]).shipment.parcel).toEqual(
      { weight: 16 },
    );
  });

  it.each(
    [[], [base, base], [undefined] as unknown as ShippingProviderParcel[]].map((parcels) => ({
      parcels,
    })),
  )("rejects missing or multiple parcels: %j", ({ parcels }) => {
    expect(() => payload(parcels)).toThrow("Exactly one parcel");
  });

  it.each([0, -1, NaN, Infinity, -Infinity, Number.MAX_VALUE, Number.MAX_SAFE_INTEGER, 0.049])(
    "rejects invalid or unrepresentable weight %s",
    (weight) => {
      expect(() => payload([{ ...base, weight }])).toThrow(/Parcel measurement/);
    },
  );

  it("accepts the half-tenth positive boundary with nearest-tenth rounding", () => {
    expect(payload([{ ...base, weight: 0.05 }]).shipment.parcel.weight).toBe(0.1);
  });

  it.each(["stone", "", "constructor", "__proto__"])(
    "rejects unknown weight unit %s",
    (weightUnit) => {
      expect(() => payload([{ ...base, weightUnit }])).toThrow("Unsupported parcel weight unit");
    },
  );
  it.each(["ft", "", "constructor", "__proto__"])(
    "rejects unknown distance unit %s even without dimensions",
    (distanceUnit) => {
      expect(() => payload([{ ...base, distanceUnit }])).toThrow(
        "Unsupported parcel distance unit",
      );
    },
  );
  it.each([{ length: 1 }, { length: 1, width: 2 }, { length: null, width: 2, height: 3 }])(
    "rejects incomplete dimensions %j",
    (dimensions) => {
      expect(() => payload([{ ...base, ...dimensions }])).toThrow(
        "must include length, width and height",
      );
    },
  );
  it.each(["length", "width", "height"] as const)("validates %s independently", (field) => {
    for (const value of [0, -1, NaN, Infinity, Number.MAX_VALUE, 0.049]) {
      expect(() => payload([{ ...base, length: 1, width: 1, height: 1, [field]: value }])).toThrow(
        /Parcel measurement/,
      );
    }
  });

  it("rejects converted measurements that round to zero or overflow", () => {
    expect(() => payload([{ weight: 0.1, weightUnit: "g" }])).toThrow("rounds to zero");
    expect(() => payload([{ weight: Number.MAX_VALUE, weightUnit: "lb" }])).toThrow(
      "supported precision",
    );
    expect(() =>
      payload([{ ...base, distanceUnit: "mm", length: 1, width: 1, height: 1 }]),
    ).toThrow("rounds to zero");
  });

  it("keeps rate transport unavailable", async () => {
    await expect(
      client.quoteRates({
        provider: "easypost",
        fromAddress: address,
        toAddress: address,
        parcels: [base],
      }),
    ).rejects.toThrow("transport is not connected");
  });
});

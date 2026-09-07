import { expect, it } from "vitest";
import type {
  EcommerceOrder,
  EcommerceOrderItem,
  EcommerceFulfillmentLocation,
} from "@shared/schema";
import {
  normalizeDomesticQuoteAddress,
  prepareShippingQuoteInputs,
} from "../services/ecommerce-shipping-quote-preparation";
const order = {
  id: "order-1",
  paymentStatus: "paid",
  status: "processing",
  fraudDecision: "allow",
  fraudReviewStatus: "not_required",
  fulfillmentMode: "shipping",
  shippingName: "Recipient",
  shippingAddress: "10 Main St",
  shippingCity: "Detroit",
  shippingState: "Michigan",
  shippingZip: "48226",
  shippingCountry: "us",
} as EcommerceOrder;
const location = {
  id: "location-1",
  active: true,
  name: "Warehouse",
  address: "20 Main St",
  city: "Grand Rapids",
  state: "MI",
  postalCode: "49503",
  country: "US",
} as EcommerceFulfillmentLocation;
const item = {
  id: "item-1",
  orderId: order.id,
  quantity: 3,
  requiresShipping: true,
} as EcommerceOrderItem;
const input = {
  version: "1.0.0",
  locationId: location.id,
  items: [{ orderItemId: item.id, quantity: 2 }],
  parcel: { weight: 1, weightUnit: "lb" },
};
function prepare(overrides: Partial<Parameters<typeof prepareShippingQuoteInputs>[0]> = {}) {
  return prepareShippingQuoteInputs({
    input,
    order,
    location,
    ordered: [item],
    fulfilled: [],
    ...overrides,
  });
}
it("uses stored addresses and existing USD contract, normalizes state and parcel units", () => {
  const result = prepare();
  expect(result).toMatchObject({
    orderId: order.id,
    locationId: location.id,
    currency: "USD",
    parcel: { weight: 16 },
    fromAddress: { name: "Warehouse", state: "MI" },
    toAddress: { name: "Recipient", state: "MI", country: "US" },
  });
  expect(result).not.toHaveProperty("apiKey");
  expect(input.parcel).toEqual({ weight: 1, weightUnit: "lb" });
});
it("enforces existing payment, cancellation, delivery and fraud restrictions", () => {
  for (const update of [
    { paymentStatus: "unpaid" },
    { status: "cancelled" },
    { status: "delivered" },
    { fraudDecision: "manual_review" },
    { fraudDecision: "block" },
    { fraudReviewStatus: "pending" },
    { fraudReviewStatus: "rejected" },
  ])
    expect(() => prepare({ order: { ...order, ...update } })).toThrow();
  expect(() => prepare({ order: undefined })).toThrow("Order not found");
  expect(() => prepare({ order: { ...order, paymentStatus: "partially_refunded" } })).not.toThrow();
});
it("rejects inactive or different origins and pickup orders", () => {
  for (const origin of [undefined, { ...location, active: false }, { ...location, id: "other" }])
    expect(() => prepare({ location: origin })).toThrow("active fulfillment location");
  expect(() => prepare({ order: { ...order, fulfillmentMode: "pickup" } })).toThrow(
    "shipping order",
  );
});
it("rejects foreign items, digital items and quantities already committed to fulfillment", () => {
  expect(() => prepare({ ordered: [{ ...item, orderId: "other" }] })).toThrow("does not belong");
  expect(() => prepare({ ordered: [{ ...item, requiresShipping: false }] })).toThrow(
    "non-shipping",
  );
  expect(() =>
    prepare({ fulfilled: [{ orderItemId: item.id, quantity: 2, status: "pending" }] }),
  ).toThrow("remaining");
  expect(() =>
    prepare({ fulfilled: [{ orderItemId: item.id, quantity: 2, status: "cancelled" }] }),
  ).not.toThrow();
});
it("rejects substituted browser address and rejects normalized zero measurements", () => {
  expect(() => prepare({ input: { ...input, toAddress: { street1: "Injected" } } })).toThrow();
  expect(() => prepare({ input: { ...input, parcel: { weight: 0.1, weightUnit: "g" } } })).toThrow(
    "rounds to zero",
  );
});
it("accepts DC but rejects territories, military addresses and non-US destinations", () => {
  const address = {
    name: "Recipient",
    street1: "10 Main St",
    city: "Washington",
    state: "DC",
    zip: "20001",
    country: "US",
  };
  expect(normalizeDomesticQuoteAddress(address).state).toBe("DC");
  for (const state of ["PR", "GU", "VI", "AS", "MP", "AA", "AE", "AP"])
    expect(() => normalizeDomesticQuoteAddress({ ...address, state })).toThrow("US states and DC");
  expect(() => normalizeDomesticQuoteAddress({ ...address, country: "CA" })).toThrow();
});
it("rejects incomplete, malformed and control-bearing saved addresses without echoing values", () => {
  for (const update of [
    { shippingAddress: "" },
    { shippingZip: "bad" },
    { shippingCity: "secret\nvalue" },
    { shippingCity: "secret\u0085value" },
    { shippingName: "", shippingCompany: "" },
    { shippingAddress: "x".repeat(201) },
  ]) {
    let error: unknown;
    try {
      prepare({ order: { ...order, ...update } });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Error);
    expect(String(error)).not.toContain("secret");
  }
});

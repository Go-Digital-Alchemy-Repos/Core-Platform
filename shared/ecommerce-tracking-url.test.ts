import { expect, it } from "vitest";
import {
  getSafeEcommerceTrackingUrl,
  optionalEcommerceTrackingUrlSchema,
} from "./ecommerce-tracking-url";
import {
  atomicEcommerceFulfillmentSchema,
  insertEcommerceShipmentSchema,
  insertEcommerceFulfillmentSchema,
} from "./schema/ecommerce";
const unsafe = [
  "javascript:alert(1)",
  "data:text/html,test",
  "//example.test/track",
  "https://user:pass@example.test/track",
  "https://example.test/\\bad",
  "https://example.test/\u0000bad",
  "https://example.test/\ntrack",
  "https://example.test/\u007fbad",
];
it.each(unsafe)(
  "rejects unsafe tracking value at all input schemas and rendering: %s",
  (trackingUrl) => {
    expect(getSafeEcommerceTrackingUrl(trackingUrl)).toBeNull();
    expect(insertEcommerceShipmentSchema.safeParse({ orderId: "order", trackingUrl }).success).toBe(
      false,
    );
    expect(
      insertEcommerceFulfillmentSchema.safeParse({ orderId: "order", trackingUrl }).success,
    ).toBe(false);
    expect(
      atomicEcommerceFulfillmentSchema.safeParse({
        trackingUrl,
        items: [{ orderItemId: "item", quantity: 1 }],
      }).success,
    ).toBe(false);
  },
);
it.each(["https://www.ups.com/track?tracknum=1Z%20999", "http://carrier.example.test/track/123"])(
  "preserves explicit HTTP(S) carrier URLs including URL-only writes: %s",
  (trackingUrl) => {
    expect(getSafeEcommerceTrackingUrl(trackingUrl)).toBe(trackingUrl);
    expect(insertEcommerceShipmentSchema.parse({ orderId: "order", trackingUrl }).trackingUrl).toBe(
      trackingUrl,
    );
    expect(
      insertEcommerceFulfillmentSchema.parse({ orderId: "order", trackingUrl }).trackingUrl,
    ).toBe(trackingUrl);
    expect(
      atomicEcommerceFulfillmentSchema.safeParse({
        trackingUrl,
        items: [{ orderItemId: "item", quantity: 1 }],
      }).success,
    ).toBe(true);
  },
);
it("preserves omitted/null legacy updates and treats blanks as absent; atomic blank remains invalid", () => {
  expect(optionalEcommerceTrackingUrlSchema.parse(undefined)).toBeUndefined();
  expect(optionalEcommerceTrackingUrlSchema.parse(null)).toBeNull();
  expect(optionalEcommerceTrackingUrlSchema.parse("  ")).toBeNull();
  expect(
    atomicEcommerceFulfillmentSchema.safeParse({
      trackingUrl: "",
      items: [{ orderItemId: "item", quantity: 1 }],
    }).success,
  ).toBe(false);
});

it("preserves atomic URL spelling used by existing idempotency fingerprints", () => {
  const trackingUrl = "https://Carrier.example.test";
  expect(
    atomicEcommerceFulfillmentSchema.parse({
      trackingUrl,
      items: [{ orderItemId: "item", quantity: 1 }],
    }).trackingUrl,
  ).toBe(trackingUrl);
});

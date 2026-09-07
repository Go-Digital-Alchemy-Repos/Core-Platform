import { describe, expect, it } from "vitest";
import {
  canTransitionShippingLabelPurchase,
  shippingLabelPurchaseRequestSchema,
  SHIPPING_LABEL_PURCHASE_STATES,
  type ShippingLabelPurchaseState,
  type ShippingLabelPurchaseObservationSource,
} from "./ecommerce-shipping-label";
import { shippingQuoteResultSchema } from "./ecommerce-shipping-quote-result";

const request = {
  version: 1,
  quoteAttemptId: "9da430b7-2e69-400c-bc0e-447dd91c3159",
  rateId: "rate_existingOpaqueId",
  confirmedRateAmount: 825,
  currency: "USD",
};
describe("label purchase confirmation contract", () => {
  it("accepts existing quote IDs and exact integer-cent boundaries without transforming input", () => {
    for (const confirmedRateAmount of [0, 825, 2_147_483_647])
      expect(shippingLabelPurchaseRequestSchema.parse({ ...request, confirmedRateAmount })).toEqual(
        {
          ...request,
          confirmedRateAmount,
        },
      );
    const quote = shippingQuoteResultSchema.parse({
      id: request.quoteAttemptId,
      status: "quoted",
      provider: "easypost",
      mode: "test",
      stale: false,
      createdAt: "2026-09-07T00:00:00Z",
      expiresAt: "2026-09-07T00:15:00Z",
      errorCode: null,
      rates: [
        {
          id: request.rateId,
          carrier: "Synthetic",
          service: "Ground",
          amount: 825,
          currency: "USD",
          estimatedDays: null,
          deliveryGuaranteed: null,
        },
      ],
    });
    expect(
      shippingLabelPurchaseRequestSchema.parse({
        ...request,
        quoteAttemptId: quote.id,
        rateId: quote.rates[0].id,
      }),
    ).toEqual(request);
  });
  it("preserves opaque identifier bytes and matches the public quote's 128-character bound", () => {
    const value = { ...request, quoteAttemptId: "q".repeat(128), rateId: "r".repeat(128) };
    expect(shippingLabelPurchaseRequestSchema.parse(value)).toEqual(value);
    const opaque = { ...request, rateId: " rate_opaque " };
    expect(shippingLabelPurchaseRequestSchema.parse(opaque)).toEqual(opaque);
    for (const field of ["quoteAttemptId", "rateId"])
      for (const value of ["", "x".repeat(129), 1, null])
        expect(
          shippingLabelPurchaseRequestSchema.safeParse({ ...request, [field]: value }).success,
        ).toBe(false);
  });
  it("rejects coercion, unsupported versions/currencies, fractions and overflow", () => {
    for (const confirmedRateAmount of [
      -1,
      0.01,
      825.5,
      2_147_483_648,
      Number.MAX_SAFE_INTEGER + 1,
      NaN,
      Infinity,
      "825",
      null,
    ])
      expect(
        shippingLabelPurchaseRequestSchema.safeParse({ ...request, confirmedRateAmount }).success,
      ).toBe(false);
    for (const version of ["1", "1.0.0", 0, 2, null])
      expect(shippingLabelPurchaseRequestSchema.safeParse({ ...request, version }).success).toBe(
        false,
      );
    for (const currency of ["usd", "EUR", null])
      expect(shippingLabelPurchaseRequestSchema.safeParse({ ...request, currency }).success).toBe(
        false,
      );
  });
  it("rejects missing fields and all extra authority-bearing inputs", () => {
    for (const field of Object.keys(request)) {
      const copy: Record<string, unknown> = { ...request };
      delete copy[field];
      expect(shippingLabelPurchaseRequestSchema.safeParse(copy).success).toBe(false);
    }
    for (const field of [
      "shipmentId",
      "carrierAccountId",
      "address",
      "apiKey",
      "labelUrl",
      "requestKey",
      "orderId",
      "extra",
    ])
      expect(
        shippingLabelPurchaseRequestSchema.safeParse({ ...request, [field]: "untrusted" }).success,
      ).toBe(false);
  });
});

const transition = (
  state: ShippingLabelPurchaseState,
  nextState: ShippingLabelPurchaseState,
  dispatchIntentRecorded = state !== "claimed" && state !== "cancelled_before_dispatch",
) => ({
  state,
  nextState,
  dispatchIntentRecorded,
  currentFence: "owner-a",
  expectedFence: "owner-a",
  ...(nextState === "purchased"
    ? {
        observationSource: (state === "claimed"
          ? "preflight"
          : "buy") as ShippingLabelPurchaseObservationSource,
      }
    : {}),
});
describe("pure label lifecycle policy", () => {
  it("allows only the complete reviewed transition matrix", () => {
    const allowed = new Set([
      "claimed:purchased",
      "claimed:dispatching",
      "claimed:cancelled_before_dispatch",
      "dispatching:purchased",
      "dispatching:unknown",
      "dispatching:rejected",
      "unknown:purchased",
      "unknown:rejected",
    ]);
    for (const state of SHIPPING_LABEL_PURCHASE_STATES)
      for (const nextState of SHIPPING_LABEL_PURCHASE_STATES)
        expect(
          canTransitionShippingLabelPurchase(transition(state, nextState)),
          `${state}→${nextState}`,
        ).toBe(allowed.has(`${state}:${nextState}`));
  });
  it("rejects every transition by a stale, empty or oversized owner fence", () => {
    for (const state of SHIPPING_LABEL_PURCHASE_STATES)
      for (const nextState of SHIPPING_LABEL_PURCHASE_STATES)
        for (const expectedFence of ["owner-b", "", "x".repeat(129)])
          expect(
            canTransitionShippingLabelPurchase({ ...transition(state, nextState), expectedFence }),
          ).toBe(false);
    expect(
      canTransitionShippingLabelPurchase({
        ...transition("claimed", "dispatching"),
        currentFence: "",
        expectedFence: "",
      }),
    ).toBe(false);
  });
  it("requires recorded dispatch intent for unresolved completion and forbids cancellation after intent", () => {
    for (const state of ["dispatching", "unknown"] as const)
      for (const nextState of SHIPPING_LABEL_PURCHASE_STATES)
        expect(canTransitionShippingLabelPurchase(transition(state, nextState, false))).toBe(false);
    for (const nextState of SHIPPING_LABEL_PURCHASE_STATES)
      expect(canTransitionShippingLabelPurchase(transition("claimed", nextState, true))).toBe(
        false,
      );
    expect(canTransitionShippingLabelPurchase(transition("unknown", "purchased", true))).toBe(true);
    expect(canTransitionShippingLabelPurchase(transition("unknown", "dispatching", true))).toBe(
      false,
    );
    expect(
      canTransitionShippingLabelPurchase(transition("unknown", "cancelled_before_dispatch", true)),
    ).toBe(false);
  });
  it("requires explicit source for each purchased transition, never defaulting to purchase", () => {
    for (const state of SHIPPING_LABEL_PURCHASE_STATES)
      for (const dispatchIntentRecorded of [false, true])
        for (const observationSource of [
          undefined,
          "preflight",
          "buy",
          "reconciliation",
          "invalid" as ShippingLabelPurchaseObservationSource,
        ]) {
          const expected =
            (state === "claimed" && !dispatchIntentRecorded && observationSource === "preflight") ||
            ((state === "dispatching" || state === "unknown") &&
              dispatchIntentRecorded &&
              (observationSource === "buy" || observationSource === "reconciliation"));
          expect(
            canTransitionShippingLabelPurchase({
              ...transition(state, "purchased", dispatchIntentRecorded),
              observationSource,
            }),
            `${state}/${dispatchIntentRecorded}/${observationSource}`,
          ).toBe(expected);
        }
    const { observationSource: _source, ...withoutSource } = transition(
      "claimed",
      "purchased",
      false,
    );
    expect(canTransitionShippingLabelPurchase(withoutSource)).toBe(false);
  });
  it("retains no-intent provenance on preflight observation and denies unfenced or terminal changes", () => {
    const preflight = Object.freeze(transition("claimed", "purchased", false));
    expect(canTransitionShippingLabelPurchase(preflight)).toBe(true);
    expect(preflight.dispatchIntentRecorded).toBe(false);
    for (const expectedFence of ["", "another-owner"])
      expect(canTransitionShippingLabelPurchase({ ...preflight, expectedFence })).toBe(false);
    for (const state of ["purchased", "rejected", "cancelled_before_dispatch"] as const)
      expect(canTransitionShippingLabelPurchase({ ...preflight, state })).toBe(false);
    expect(
      canTransitionShippingLabelPurchase({ ...preflight, nextState: "cancelled_before_dispatch" }),
    ).toBe(false);
  });
  it("does not mutate observations or infer provider outcomes", () => {
    const observed = Object.freeze(transition("dispatching", "unknown", true));
    expect(canTransitionShippingLabelPurchase(observed)).toBe(true);
    expect(observed.state).toBe("dispatching");
    expect(
      canTransitionShippingLabelPurchase({
        ...observed,
        nextState: "provider_says_retry" as ShippingLabelPurchaseState,
      }),
    ).toBe(false);
    expect(
      canTransitionShippingLabelPurchase({
        ...observed,
        state: "invalid" as ShippingLabelPurchaseState,
      }),
    ).toBe(false);
  });
});

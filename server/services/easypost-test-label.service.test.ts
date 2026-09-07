import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buyEasyPostLabel,
  readEasyPostLabelShipment,
  EASYPOST_LABEL_DEADLINE_MS,
  EASYPOST_LABEL_MAX_BYTES,
  type EasyPostLabelBuyInput,
} from "./easypost-test-label.service";
import {
  shippingLabelReadObservationSchema,
  shippingLabelBuyObservationSchema,
  normalizeShippingLabelFeeDecimal,
} from "@shared/ecommerce-shipping-label-observation";
const key = "syntheticLabelCredentialNeverReal";
const generation = "58da72b0-afac-44f6-93b5-a0b07501b593";
const address = {
  name: "Synthetic Person",
  street1: "100 Test St",
  city: "Test City",
  state: "MI",
  zip: "49503",
  country: "US" as const,
};
const input: EasyPostLabelBuyInput = {
  credentials: {
    capability: "label_purchase",
    provider: "easypost",
    mode: "test",
    apiKey: key,
    credentialGenerationId: generation,
    approvedLabelGenerationId: generation,
  },
  expected: {
    provider: "easypost",
    mode: "test",
    providerShipmentId: "shp_synthetic",
    providerRateId: "rate_synthetic",
    carrierAccountId: "ca_synthetic",
    confirmedRateAmount: 825,
    currency: "USD",
    fromAddress: address,
    toAddress: address,
    parcel: { weight: 16 },
  },
};
const rate = {
  object: "Rate",
  id: "rate_synthetic",
  shipment_id: "shp_synthetic",
  carrier_account_id: "ca_synthetic",
  mode: "test",
  carrier: "Synthetic",
  service: "Ground",
  rate: "8.25",
  currency: "USD",
};
const postage = {
  object: "PostageLabel",
  id: "pl_synthetic",
  label_url: "https://unapproved.example/private-label",
};
const shipment = () => ({
  object: "Shipment",
  id: "shp_synthetic",
  mode: "test",
  from_address: address,
  to_address: address,
  parcel: { weight: 16, length: null, width: null, height: null },
  selected_rate: rate,
  postage_label: postage,
  tracking_code: "SYNTHETIC123",
  rates: [rate],
  fees: [
    { object: "Fee", type: "PostageFee", amount: "8.25000100000", charged: true, refunded: false },
  ],
});
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
const run = (value: unknown = shipment(), buy = true, status = 200) => {
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(response(value, status));
  return {
    fetch,
    promise: buy ? buyEasyPostLabel(input, { fetch }) : readEasyPostLabelShipment(input, { fetch }),
  };
};
afterEach(() => vi.useRealTimers());
describe("EasyPost test label transport: no provider calls", () => {
  it("uses exact buy endpoint/body and Basic auth once without asset requests", async () => {
    const { fetch, promise } = run();
    const result = await promise;
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe("https://api.easypost.com/v2/shipments/shp_synthetic/buy");
    expect(fetch.mock.calls[0][1]).toMatchObject({
      method: "POST",
      redirect: "manual",
      body: JSON.stringify({ rate: { id: "rate_synthetic" } }),
      headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` },
    });
    expect(result).toMatchObject({
      kind: "purchase_observed",
      purchase: {
        evidence: "both",
        selection: "matches",
        inputs: "matches",
        price: "matches",
        asset: "disabled_pending_origin_policy",
        finances: {
          fees: [{ usdDecimal: "8.250001", charged: true, refunded: false }],
          finalTotalKnown: false,
        },
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/label_url|https:|syntheticLabelCredential/);
  });
  it("GET with no positive purchase evidence is observational and never buys", async () => {
    const { fetch, promise } = run(
      { ...shipment(), selected_rate: null, postage_label: null },
      false,
    );
    const result = await promise;
    expect(result).toMatchObject({
      kind: "no_purchase_evidence",
      rate: "matches",
      inputs: "matches",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]).toMatchObject([
      "https://api.easypost.com/v2/shipments/shp_synthetic",
      { method: "GET" },
    ]);
    expect(fetch.mock.calls[0][1]?.body).toBeUndefined();
    expect(shippingLabelBuyObservationSchema.safeParse(result).success).toBe(false);
  });
  it("buy with a clean negative body remains unresolved", async () => {
    expect(await run({ ...shipment(), selected_rate: null, postage_label: null }).promise).toEqual({
      kind: "unresolved",
      reason: "invalid_response",
    });
  });
  it.each(["selected_rate", "postage_label"])(
    "retains independent positive evidence when %s is missing",
    async (field) => {
      const result = await run({ ...shipment(), [field]: null }).promise;
      expect(result.kind).toBe("purchase_observed");
      if (result.kind !== "purchase_observed") throw Error("missing evidence");
      expect(result.purchase.evidence).toBe(
        field === "selected_rate" ? "postage_label" : "selected_rate",
      );
      expect(result.purchase.reviewCodes).toContain(
        field === "selected_rate" ? "selected_rate_missing" : "label_metadata_unavailable",
      );
    },
  );
  it("preserves postage despite malformed rate, input, fee, tracking and asset siblings", async () => {
    const result = await run({
      ...shipment(),
      selected_rate: { ...rate, mode: "production" },
      from_address: { ...address, city: 123 },
      fees: [{ ...shipment().fees[0], amount: "1e5" }],
      tracking_code: "\u0000",
      postage_label: { ...postage, label_url: key },
    }).promise;
    expect(result).toMatchObject({
      kind: "purchase_observed",
      purchase: {
        evidence: "postage_label",
        inputs: "unverifiable",
        finances: { selectedPostage: null, fees: null },
        trackingCode: null,
      },
    });
    expect(JSON.stringify(result)).not.toContain(key);
  });
  it("redacts a reflected credential in optional metadata without discarding postage", async () => {
    const result = await run({
      ...shipment(),
      tracking_code: key,
      selected_rate: { ...rate, carrier: key },
      fees: [{ ...shipment().fees[0], type: key }],
    }).promise;
    expect(result).toMatchObject({
      kind: "purchase_observed",
      purchase: {
        evidence: "postage_label",
        trackingCode: null,
        finances: { selectedPostage: null, fees: null },
      },
    });
    expect(JSON.stringify(result)).not.toContain(key);
  });
  it.each([{ id: "shp_other" }, { mode: "production" }, { object: "Unknown" }])(
    "rejects wrong outer identity without exposing foreign metadata %j",
    async (patch) => {
      expect(await run({ ...shipment(), ...patch }).promise).toEqual({
        kind: "unresolved",
        reason: "identity_mismatch",
      });
    },
  );
  it("does not accept invalid non-null pseudo-purchase objects as a clean negative", async () => {
    expect(
      await run({ ...shipment(), postage_label: { id: "wrong" }, selected_rate: null }, false)
        .promise,
    ).toEqual({ kind: "unresolved", reason: "invalid_response" });
  });
  it("retains purchased selection and price discrepancies for review without retry", async () => {
    const { fetch, promise } = run({
      ...shipment(),
      selected_rate: { ...rate, id: "rate_other", carrier_account_id: "ca_other", rate: "9.25" },
    });
    expect(await promise).toMatchObject({
      kind: "purchase_observed",
      purchase: {
        selection: "mismatch",
        price: "mismatch",
        finances: { selectedPostage: { amount: 925 } },
      },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("conservatively matches formatting but not corrected ZIP or parcel precision", async () => {
    expect(
      await run({
        ...shipment(),
        from_address: { ...address, name: " SYNTHETIC  PERSON ", street1: "100 TEST ST" },
      }).promise,
    ).toMatchObject({ purchase: { inputs: "matches" } });
    expect(
      await run({ ...shipment(), to_address: { ...address, zip: "49503-1234" } }).promise,
    ).toMatchObject({ purchase: { inputs: "mismatch" } });
    expect(await run({ ...shipment(), parcel: { weight: 16.01 } }).promise).toMatchObject({
      purchase: { inputs: "unverifiable" },
    });
  });
  it("distinguishes missing fees from a valid empty fee list", async () => {
    expect(await run({ ...shipment(), fees: undefined }).promise).toMatchObject({
      purchase: { finances: { fees: null }, reviewCodes: ["fees_unverifiable"] },
    });
    expect(await run({ ...shipment(), fees: [] }).promise).toMatchObject({
      purchase: { finances: { fees: [], finalTotalKnown: false } },
    });
  });
  it("bounds rates and fees without losing independent purchased evidence", async () => {
    expect(
      await run({ ...shipment(), fees: Array(101).fill(shipment().fees[0]) }).promise,
    ).toMatchObject({ purchase: { finances: { fees: null } } });
    expect(
      await run(
        { ...shipment(), selected_rate: null, postage_label: null, rates: Array(101).fill(rate) },
        false,
      ).promise,
    ).toMatchObject({ kind: "no_purchase_evidence", rate: "unverifiable" });
    expect(
      await run(
        { ...shipment(), selected_rate: null, postage_label: null, rates: [rate, rate] },
        false,
      ).promise,
    ).toMatchObject({ kind: "no_purchase_evidence", rate: "unverifiable" });
  });
  it.each([400, 401, 403, 404, 409, 422, 429, 500, 503])(
    "never infers terminal nonpurchase from HTTP%s",
    async (status) => {
      const { fetch, promise } = run({ error: { code: "ARBITRARY", message: key } }, true, status);
      expect(await promise).toMatchObject({ kind: "unresolved" });
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(await promise)).not.toContain(key);
    },
  );
  it.each([
    ["SHIPMENT.POSTAGE.EXISTS", "already_purchased"],
    ["SHIPMENT.PURCHASE.IN_PROGRESS", "purchase_in_progress"],
    ["SHIPMENT.POSTAGE.TIMED_OUT", "transport_timeout"],
  ])("maps safe diagnostic %s without retry", async (code, reason) => {
    expect(await run({ error: { code, message: key } }, true, 400).promise).toEqual({
      kind: "unresolved",
      reason,
    });
  });
  it("rejects malformed body, redirect, foreign response URL, size mismatch and invalid UTF8", async () => {
    const values = [
      new Response("not-json", { headers: { "content-type": "application/json" } }),
      new Response("", { status: 302, headers: { location: "https://other.example" } }),
      new Response("{}", { headers: { "content-type": "text/html" } }),
      new Response("{}", {
        headers: { "content-type": "application/json", "content-length": "99" },
      }),
      new Response(new Uint8Array([255]), { headers: { "content-type": "application/json" } }),
      new Response("x".repeat(EASYPOST_LABEL_MAX_BYTES + 1), {
        headers: { "content-type": "application/json" },
      }),
    ];
    const other = response(shipment());
    Object.defineProperty(other, "url", { value: "https://other.example/" });
    values.push(other);
    for (const value of values) {
      const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(value);
      expect(await buyEasyPostLabel(input, { fetch })).toEqual({
        kind: "unresolved",
        reason: "invalid_response",
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  });
  it("aborts a stalled fetch at the total deadline", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation((_url, init) => {
      signal = init?.signal as AbortSignal;
      return new Promise(() => {});
    });
    const result = buyEasyPostLabel(input, { fetch });
    await vi.advanceTimersByTimeAsync(EASYPOST_LABEL_DEADLINE_MS);
    expect(await result).toEqual({ kind: "unresolved", reason: "transport_timeout" });
    expect(signal?.aborted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("cancels a stalled response reader and releases its lock", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({ pull: () => new Promise(() => {}), cancel });
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(body, { headers: { "content-type": "application/json" } }));
    const result = readEasyPostLabelShipment(input, { fetch });
    await vi.advanceTimersByTimeAsync(EASYPOST_LABEL_DEADLINE_MS);
    expect(await result).toEqual({ kind: "unresolved", reason: "transport_timeout" });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(body.locked).toBe(false);
  });
  it("rejects mismatched approval, extra input and reconciliation capability before buy", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const wrong = [
      { ...input, endpoint: "https://other.example" },
      {
        ...input,
        credentials: {
          ...input.credentials,
          approvedLabelGenerationId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        },
      },
      {
        ...input,
        credentials: {
          capability: "label_reconciliation",
          provider: "easypost",
          mode: "test",
          apiKey: key,
          credentialGenerationId: generation,
          originalPurchaseGenerationId: generation,
          recoveryBindingId: generation,
        },
      },
    ];
    for (const value of wrong)
      await expect(buyEasyPostLabel(value as EasyPostLabelBuyInput, { fetch })).rejects.toThrow(
        "Shipping label transport input rejected",
      );
    expect(fetch).not.toHaveBeenCalled();
  });
  it("allows an explicitly bound reconciliation capability only for exact GET", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(response(shipment()));
    await readEasyPostLabelShipment(
      {
        ...input,
        credentials: {
          capability: "label_reconciliation",
          provider: "easypost",
          mode: "test",
          apiKey: key,
          credentialGenerationId: generation,
          originalPurchaseGenerationId: generation,
          recoveryBindingId: generation,
        },
      },
      { fetch },
    );
    expect(fetch.mock.calls[0][1]?.method).toBe("GET");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("shared schemas reject unknown authority and internally inconsistent evidence", async () => {
    const result = await run().promise;
    if (result.kind !== "purchase_observed") throw Error("purchase expected");
    expect(
      shippingLabelReadObservationSchema.safeParse({ ...result, raw: { private: true } }).success,
    ).toBe(false);
    expect(
      shippingLabelReadObservationSchema.safeParse({
        ...result,
        purchase: { ...result.purchase, evidence: "selected_rate" },
      }).success,
    ).toBe(false);
    expect(
      shippingLabelReadObservationSchema.safeParse({
        ...result,
        purchase: {
          ...result.purchase,
          finances: {
            ...result.purchase.finances,
            selectedPostage: {
              ...result.purchase.finances.selectedPostage,
              providerShipmentId: "shp_other",
            },
          },
        },
      }).success,
    ).toBe(false);
  });
  it("normalizes fee decimals exactly without cents rounding or total inference", () => {
    for (const [value, expected] of [
      ["8.20000", "8.2"],
      ["-0.000", "0"],
      ["-0.000000000001", "-0.000000000001"],
      ["9999999999.999999999999", "9999999999.999999999999"],
    ])
      expect(normalizeShippingLabelFeeDecimal(value)).toBe(expected);
    for (const value of ["1e2", "01.2", "1.0000000000001", "10000000000", "+1", " 1", 1, NaN])
      expect(() => normalizeShippingLabelFeeDecimal(value)).toThrow();
  });
});

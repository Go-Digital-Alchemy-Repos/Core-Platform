import { z } from "zod";
import { US_STATES } from "@shared/ecommerce-shipping-settings";
import { parseShippingQuoteUsdCents } from "@shared/ecommerce-shipping-quote";
import {
  normalizeShippingLabelFeeDecimal,
  shippingLabelVerifiedRateSchema,
  shippingLabelExactFeeSchema,
  shippingLabelReadObservationSchema,
  shippingLabelBuyObservationSchema,
  type ShippingLabelReadObservation,
  type ShippingLabelBuyObservation,
  type ShippingLabelPurchaseEvidence,
} from "@shared/ecommerce-shipping-label-observation";

export const EASYPOST_LABEL_DEADLINE_MS = 15000;
export const EASYPOST_LABEL_MAX_BYTES = 256 * 1024;
const id = (prefix: string) => z.string().regex(new RegExp(`^${prefix}_[A-Za-z0-9]{1,100}$`));
const controls = (value: string) =>
  Array.from(value).some(
    (c) => c.charCodeAt(0) < 32 || (c.charCodeAt(0) >= 127 && c.charCodeAt(0) <= 159),
  );
const text = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((value) => !controls(value));
const address = z
  .object({
    name: text(200).optional(),
    company: text(200).optional(),
    street1: text(200),
    street2: text(200).optional(),
    city: text(200),
    state: z.string().refine((value) => US_STATES.some(([code]) => code === value)),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/),
    country: z.literal("US"),
  })
  .strict()
  .refine((value) => Boolean(value.name || value.company));
const measurement = z
  .number()
  .finite()
  .positive()
  .max(1e9)
  .refine((value) => Number(value.toFixed(1)) === value);
const parcel = z
  .object({
    weight: measurement,
    length: measurement.optional(),
    width: measurement.optional(),
    height: measurement.optional(),
  })
  .strict()
  .refine(
    (value) =>
      [value.length, value.width, value.height].filter((v) => v !== undefined).length % 3 === 0,
  );
const expectedSchema = z
  .object({
    provider: z.literal("easypost"),
    mode: z.literal("test"),
    providerShipmentId: id("shp"),
    providerRateId: id("rate"),
    carrierAccountId: id("ca"),
    confirmedRateAmount: z.number().int().min(0).max(2147483647),
    currency: z.literal("USD"),
    fromAddress: address,
    toAddress: address,
    parcel,
  })
  .strict();
const secret = text(4096).refine((value) => !/[\s:]/.test(value));
const purchaseCredentials = z
  .object({
    capability: z.literal("label_purchase"),
    provider: z.literal("easypost"),
    mode: z.literal("test"),
    apiKey: secret,
    credentialGenerationId: z.string().uuid(),
    approvedLabelGenerationId: z.string().uuid(),
  })
  .strict()
  .refine((value) => value.credentialGenerationId === value.approvedLabelGenerationId);
const recoveryCredentials = z
  .object({
    capability: z.literal("label_reconciliation"),
    provider: z.literal("easypost"),
    mode: z.literal("test"),
    apiKey: secret,
    credentialGenerationId: z.string().uuid(),
    originalPurchaseGenerationId: z.string().uuid(),
    recoveryBindingId: z.string().uuid(),
  })
  .strict();
const readInput = z
  .object({
    credentials: z.union([purchaseCredentials, recoveryCredentials]),
    expected: expectedSchema,
  })
  .strict();
const buyInput = z.object({ credentials: purchaseCredentials, expected: expectedSchema }).strict();
export type EasyPostLabelReadInput = z.infer<typeof readInput>;
export type EasyPostLabelBuyInput = z.infer<typeof buyInput>;
type Expected = z.infer<typeof expectedSchema>;
type Reason = Extract<ShippingLabelReadObservation, { kind: "unresolved" }>["reason"];
const unresolved = (
  reason: Reason,
): ShippingLabelReadObservation & ShippingLabelBuyObservation => ({ kind: "unresolved", reason });
const object = z.record(z.unknown());
const labelIdentity = z.object({ object: z.literal("PostageLabel"), id: id("pl") });
const rawRate = z.object({
  object: z.literal("Rate"),
  id: id("rate"),
  shipment_id: id("shp"),
  carrier_account_id: id("ca"),
  mode: z.literal("test"),
  carrier: z.unknown(),
  service: z.unknown(),
  rate: z.unknown(),
  currency: z.literal("USD"),
});
function rate(value: unknown, shipmentId: string) {
  const raw = rawRate.parse(value);
  if (raw.shipment_id !== shipmentId) throw new Error("Mismatched rate");
  return shippingLabelVerifiedRateSchema.parse({
    providerRateId: raw.id,
    providerShipmentId: raw.shipment_id,
    carrierAccountId: raw.carrier_account_id,
    mode: raw.mode,
    carrier: raw.carrier,
    service: raw.service,
    amount: parseShippingQuoteUsdCents(raw.rate),
    currency: raw.currency,
  });
}
const canonical = (value: string) =>
  value
    .trim()
    .replace(/ +/g, " ")
    .replace(/[a-z]/g, (c) => c.toUpperCase());
function normalizedAddress(value: unknown) {
  const raw = object.parse(value);
  const picked: Record<string, unknown> = {};
  for (const key of ["name", "company", "street1", "street2", "city", "state", "zip", "country"]) {
    const v = raw[key];
    if (["name", "company", "street2"].includes(key) && (v == null || v === "")) continue;
    if (typeof v !== "string" || controls(v)) throw new Error("Invalid address");
    picked[key] = canonical(v);
  }
  return address.parse(picked);
}
function inputMatch(
  raw: Record<string, unknown>,
  expected: Expected,
): ShippingLabelPurchaseEvidence["inputs"] {
  try {
    const rawParcel = object.parse(raw.parcel);
    const picked = {
      weight: rawParcel.weight,
      ...Object.fromEntries(
        ["length", "width", "height"]
          .filter((k) => rawParcel[k] != null)
          .map((k) => [k, rawParcel[k]]),
      ),
    };
    const actual = parcel.parse(picked);
    return JSON.stringify(normalizedAddress(raw.from_address)) ===
      JSON.stringify(normalizedAddress(expected.fromAddress)) &&
      JSON.stringify(normalizedAddress(raw.to_address)) ===
        JSON.stringify(normalizedAddress(expected.toAddress)) &&
      ["weight", "length", "width", "height"].every(
        (k) => actual[k as keyof typeof actual] === expected.parcel[k as keyof typeof actual],
      )
      ? "matches"
      : "mismatch";
  } catch {
    return "unverifiable";
  }
}
function fees(value: unknown) {
  return z
    .array(
      z.object({
        object: z.literal("Fee"),
        type: z.unknown(),
        amount: z.unknown(),
        charged: z.boolean(),
        refunded: z.boolean(),
      }),
    )
    .max(100)
    .parse(value)
    .map((f) =>
      shippingLabelExactFeeSchema.parse({
        type: f.type,
        usdDecimal: normalizeShippingLabelFeeDecimal(f.amount),
        charged: f.charged,
        refunded: f.refunded,
      }),
    );
}
function observe(value: unknown, expected: Expected): ShippingLabelReadObservation {
  const envelope = z
    .object({ object: z.literal("Shipment"), id: id("shp"), mode: z.literal("test") })
    .safeParse(value);
  if (!envelope.success || envelope.data.id !== expected.providerShipmentId)
    return unresolved("identity_mismatch");
  const raw = object.parse(value);
  const postage = labelIdentity.safeParse(raw.postage_label);
  let selected: ReturnType<typeof rate> | null = null;
  try {
    selected = rate(raw.selected_rate, expected.providerShipmentId);
  } catch {
    /* Independent postage evidence survives. */
  }
  const inputs = inputMatch(raw, expected);
  if (postage.success || selected) {
    const reviewCodes: ShippingLabelPurchaseEvidence["reviewCodes"] = [];
    const selection = selected
      ? selected.providerRateId === expected.providerRateId &&
        selected.carrierAccountId === expected.carrierAccountId
        ? "matches"
        : "mismatch"
      : "unverifiable";
    const price = selected
      ? selected.amount === expected.confirmedRateAmount
        ? "matches"
        : "mismatch"
      : "unverifiable";
    if (!selected)
      reviewCodes.push(
        raw.selected_rate == null ? "selected_rate_missing" : "selected_rate_invalid",
      );
    if (selection === "mismatch") reviewCodes.push("selection_mismatch");
    if (price === "mismatch") reviewCodes.push("price_mismatch");
    if (inputs !== "matches")
      reviewCodes.push(inputs === "mismatch" ? "input_mismatch" : "input_unverifiable");
    let parsedFees: ReturnType<typeof fees> | null = null;
    try {
      parsedFees = fees(raw.fees);
    } catch {
      reviewCodes.push("fees_unverifiable");
    }
    const tracking = text(200).safeParse(raw.tracking_code);
    if (!tracking.success) reviewCodes.push("tracking_unavailable");
    if (!postage.success) reviewCodes.push("label_metadata_unavailable");
    return {
      kind: "purchase_observed",
      purchase: {
        providerShipmentId: expected.providerShipmentId,
        mode: "test",
        evidence: postage.success ? (selected ? "both" : "postage_label") : "selected_rate",
        postageLabelId: postage.success ? postage.data.id : null,
        trackingCode: tracking.success ? tracking.data : null,
        asset: postage.success ? "disabled_pending_origin_policy" : "missing",
        finances: { selectedPostage: selected, fees: parsedFees, finalTotalKnown: false },
        selection,
        inputs,
        price,
        reviewCodes,
      },
    };
  }
  if (raw.postage_label != null || raw.selected_rate != null) return unresolved("invalid_response");
  let candidate: ReturnType<typeof rate> | null = null;
  try {
    const rates = z
      .array(z.unknown())
      .max(100)
      .parse(raw.rates)
      .map((v) => rate(v, expected.providerShipmentId));
    if (new Set(rates.map((r) => r.providerRateId)).size !== rates.length)
      throw new Error("Duplicate rates");
    candidate = rates.find((r) => r.providerRateId === expected.providerRateId) ?? null;
  } catch {
    return {
      kind: "no_purchase_evidence",
      providerShipmentId: expected.providerShipmentId,
      mode: "test",
      candidateRate: null,
      inputs,
      rate: "unverifiable",
    };
  }
  return {
    kind: "no_purchase_evidence",
    providerShipmentId: expected.providerShipmentId,
    mode: "test",
    candidateRate: candidate,
    inputs,
    rate: !candidate
      ? "missing"
      : candidate.carrierAccountId === expected.carrierAccountId &&
          candidate.amount === expected.confirmedRateAmount
        ? "matches"
        : "mismatch",
  };
}
function errorReason(status: number, value: unknown): Reason {
  const error = z.object({ error: z.object({ code: text(200) }) }).safeParse(value);
  if (error.success) {
    if (error.data.error.code === "SHIPMENT.POSTAGE.EXISTS") return "already_purchased";
    if (error.data.error.code === "SHIPMENT.PURCHASE.IN_PROGRESS") return "purchase_in_progress";
    if (
      ["SHIPMENT.POSTAGE.TIMED_OUT", "SHIPMENT.POSTAGE.NO_RESPONSE"].includes(error.data.error.code)
    )
      return "transport_timeout";
  }
  return status === 401 || status === 403
    ? "access_unavailable"
    : status === 404
      ? "not_found"
      : "provider_error";
}
function redactReflections(value: unknown, secrets: string[]): unknown {
  if (typeof value === "string")
    return secrets.some((secret) => value.includes(secret)) ? null : value;
  if (Array.isArray(value)) return value.map((item) => redactReflections(item, secrets));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redactReflections(item, secrets)]),
    );
  return value;
}
/** One bounded call only; caller owns uncached authorization, preflight and durable intent/CAS. */
async function request(
  input: EasyPostLabelReadInput,
  buy: boolean,
  fetcher: typeof fetch,
): Promise<ShippingLabelReadObservation> {
  const endpoint = `https://api.easypost.com/v2/shipments/${input.expected.providerShipmentId}${buy ? "/buy" : ""}`;
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timedOut = false;
  const abort = () => {
    controller.abort();
    void reader?.cancel().catch(() => undefined);
  };
  let rejectDeadline: (error: Error) => void = () => undefined;
  const deadline = new Promise<never>((_, reject) => {
    rejectDeadline = reject;
  });
  const timer = setTimeout(() => {
    timedOut = true;
    rejectDeadline(new Error("deadline"));
    abort();
  }, EASYPOST_LABEL_DEADLINE_MS);
  const authorization = `Basic ${Buffer.from(`${input.credentials.apiKey}:`).toString("base64")}`;
  try {
    const response = await Promise.race([
      Promise.resolve(
        fetcher(endpoint, {
          method: buy ? "POST" : "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            Authorization: authorization,
            Accept: "application/json",
            ...(buy ? { "Content-Type": "application/json" } : {}),
          },
          ...(buy ? { body: JSON.stringify({ rate: { id: input.expected.providerRateId } }) } : {}),
        }),
      ).then((r) => {
        if (controller.signal.aborted) void r.body?.cancel().catch(() => undefined);
        return r;
      }),
      deadline,
    ]);
    reader = response.body?.getReader();
    if (
      response.redirected ||
      (response.url && response.url !== endpoint) ||
      (response.status >= 300 && response.status < 400)
    )
      return unresolved("invalid_response");
    if (
      !/^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type") ?? "") ||
      !reader
    )
      return unresolved("invalid_response");
    const declared = response.headers.get("content-length");
    if (
      declared !== null &&
      (!/^\d+$/.test(declared) || Number(declared) > EASYPOST_LABEL_MAX_BYTES)
    )
      return unresolved("invalid_response");
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const chunk = await Promise.race([reader.read(), deadline]);
      if (timedOut) return unresolved("transport_timeout");
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > EASYPOST_LABEL_MAX_BYTES) return unresolved("invalid_response");
      chunks.push(chunk.value);
    }
    if (declared !== null && Number(declared) !== size) return unresolved("invalid_response");
    let value: unknown;
    try {
      value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
    } catch {
      return unresolved("invalid_response");
    }
    if (!response.ok) return unresolved(errorReason(response.status, value));
    let result: ShippingLabelReadObservation;
    try {
      result = shippingLabelReadObservationSchema.parse(
        observe(
          redactReflections(value, [input.credentials.apiKey, authorization]),
          input.expected,
        ),
      );
    } catch {
      return unresolved("invalid_response");
    }
    // Even a provider reflection must not leak credentials into normalized metadata.
    if (
      [input.credentials.apiKey, authorization].some((secret) =>
        JSON.stringify(result).includes(secret),
      )
    )
      return unresolved("invalid_response");
    return buy && result.kind === "no_purchase_evidence" ? unresolved("invalid_response") : result;
  } catch {
    return unresolved(timedOut ? "transport_timeout" : "transport_failure");
  } finally {
    clearTimeout(timer);
    abort();
    try {
      reader?.releaseLock();
    } catch {
      /* Cancelled read may retain its lock temporarily. */
    }
  }
}
export async function readEasyPostLabelShipment(
  input: EasyPostLabelReadInput,
  dependencies: { fetch?: typeof fetch } = {},
): Promise<ShippingLabelReadObservation> {
  const parsed = readInput.safeParse(input);
  if (!parsed.success) throw new Error("Shipping label transport input rejected");
  return request(parsed.data, false, dependencies.fetch ?? globalThis.fetch);
}
export async function buyEasyPostLabel(
  input: EasyPostLabelBuyInput,
  dependencies: { fetch?: typeof fetch } = {},
): Promise<ShippingLabelBuyObservation> {
  const parsed = buyInput.safeParse(input);
  if (!parsed.success) throw new Error("Shipping label transport input rejected");
  return shippingLabelBuyObservationSchema.parse(
    await request(parsed.data, true, dependencies.fetch ?? globalThis.fetch),
  );
}

import { z } from "zod";
import { US_STATES } from "@shared/ecommerce-shipping-settings";
import { parseShippingQuoteUsdCents } from "@shared/ecommerce-shipping-quote";

export const EASYPOST_QUOTE_DEADLINE_MS = 15_000;
export const EASYPOST_QUOTE_MAX_BYTES = 256 * 1024;
export const EASYPOST_QUOTE_MAX_RATES = 100;
const ENDPOINT = "https://api.easypost.com/v2/shipments";
// Deliberately reject C0/C1 controls in address and credential boundaries.
// eslint-disable-next-line no-control-regex
const controls = /[\x00-\x1f\x7f-\x9f]/;
const text = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((s) => !controls.test(s));
const states = new Set<string>(US_STATES.map(([code]) => code));
const addressSchema = z
  .object({
    name: text(200).optional(),
    company: text(200).optional(),
    street1: text(200),
    street2: text(200).optional(),
    city: text(200),
    state: z.string().refine((s) => states.has(s)),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/),
    country: z.literal("US"),
  })
  .strict()
  .refine((address) => Boolean(address.name || address.company));
const measurement = z
  .number()
  .finite()
  .positive()
  .max(1_000_000_000)
  .refine((v) => Number(v.toFixed(1)) === v);
const shipmentSchema = z
  .object({
    from_address: addressSchema,
    to_address: addressSchema,
    parcel: z
      .object({
        weight: measurement,
        length: measurement.optional(),
        width: measurement.optional(),
        height: measurement.optional(),
      })
      .strict()
      .refine((p) => [p.length, p.width, p.height].filter((v) => v !== undefined).length % 3 === 0),
  })
  .strict();
const credentialsSchema = z
  .object({
    provider: z.literal("easypost"),
    mode: z.literal("test"),
    credentialGenerationId: z.string().uuid(),
    approvedCredentialGenerationId: z.string().uuid(),
    apiKey: text(4096).refine((s) => !/[\s:]/.test(s)),
  })
  .strict()
  .refine((c) => c.credentialGenerationId === c.approvedCredentialGenerationId);

export type ApprovedEasyPostTestCredentials = z.infer<typeof credentialsSchema>;
/** Already normalized to one-decimal ounces/inches; no conversion or rounding here. */
export type EasyPostQuoteShipment = z.infer<typeof shipmentSchema>;
export interface EasyPostTestQuoteRate {
  providerRateId: string;
  providerShipmentId: string;
  carrierAccountId: string;
  mode: "test";
  carrier: string;
  service: string;
  currency: "USD";
  amount: number;
  estimatedDays: number | null;
  deliveryGuaranteed: boolean | null;
}
export type EasyPostTestQuoteResult =
  | { status: "quoted"; providerShipmentId: string; mode: "test"; rates: EasyPostTestQuoteRate[] }
  | { status: "unavailable"; code: "no_rates"; providerShipmentId: string; mode: "test" }
  | { status: "unavailable"; code: "provider_rejected" }
  | { status: "unknown"; code: "provider_outcome_unknown" };

const shipmentId = z.string().regex(/^shp_[A-Za-z0-9]{1,100}$/);
const rateId = z.string().regex(/^rate_[A-Za-z0-9]{1,100}$/);
const label = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9 ._()/+-]{0,99}$/);
// Validate every consumed field; unrelated documented provider fields are stripped, never returned.
const rateSchema = z.object({
  id: rateId,
  object: z.literal("Rate"),
  mode: z.literal("test"),
  shipment_id: shipmentId,
  carrier_account_id: z.string().regex(/^ca_[A-Za-z0-9]{1,100}$/),
  carrier: label,
  service: label,
  currency: z.literal("USD"),
  rate: z.string(),
  delivery_days: z.number().int().min(0).max(365).nullish(),
  delivery_date_guaranteed: z.boolean().nullish(),
});
const responseSchema = z.object({
  id: shipmentId,
  object: z.literal("Shipment"),
  mode: z.literal("test"),
  rates: z.array(rateSchema).max(EASYPOST_QUOTE_MAX_RATES),
});
const rejectionSchema = z.object({ error: z.object({ code: text(200), message: text(2000) }) });
const unknown = (): EasyPostTestQuoteResult => ({
  status: "unknown",
  code: "provider_outcome_unknown",
});

/** No settings access, retries, logging, persistence or application startup. Caller owns claim/rotation checks. */
export async function fetchEasyPostTestQuotes(
  credentialSnapshot: ApprovedEasyPostTestCredentials,
  normalizedShipment: EasyPostQuoteShipment,
  dependencies: { fetch?: typeof fetch } = {},
): Promise<EasyPostTestQuoteResult> {
  const credentials = credentialsSchema.safeParse(credentialSnapshot);
  const shipment = shipmentSchema.safeParse(normalizedShipment);
  if (!credentials.success || !shipment.success)
    throw new Error("Shipping quote preflight rejected");
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const abort = () => {
    controller.abort();
    // Cancel the stream as well as fetch. A broken injected cancel must not hold this operation open.
    void reader?.cancel().catch(() => undefined);
  };
  let rejectDeadline: (reason: Error) => void = () => undefined;
  const expired = new Promise<never>((_, reject) => {
    rejectDeadline = reject;
  });
  const timer = setTimeout(() => {
    abort();
    rejectDeadline(new Error("Quote deadline"));
  }, EASYPOST_QUOTE_DEADLINE_MS);
  const transport = dependencies.fetch ?? globalThis.fetch;
  const authorization = `Basic ${Buffer.from(`${credentials.data.apiKey}:`).toString("base64")}`;
  try {
    // The race bounds even a misbehaving injected fetch; AbortSignal cancels the actual network operation.
    const response = await Promise.race([
      Promise.resolve(
        transport(ENDPOINT, {
          method: "POST",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            Authorization: authorization,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ shipment: shipment.data }),
        }),
      ).then((response) => {
        if (controller.signal.aborted) void response.body?.cancel().catch(() => undefined);
        return response;
      }),
      expired,
    ]);
    reader = response.body?.getReader();
    if (response.redirected || (response.url && response.url !== ENDPOINT)) return unknown();
    if (response.status >= 300 && response.status < 400) return unknown();
    if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type") ?? ""))
      return unknown();
    const declared = response.headers.get("content-length");
    if (
      declared !== null &&
      (!/^\d+$/.test(declared) || Number(declared) > EASYPOST_QUOTE_MAX_BYTES)
    )
      return unknown();
    if (!response.body) return unknown();
    if (!reader) return unknown();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const chunk = await Promise.race([reader.read(), expired]);
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > EASYPOST_QUOTE_MAX_BYTES) return unknown();
      chunks.push(chunk.value);
    }
    const parsed: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
    );
    if (!response.ok) {
      // Only definitive client rejection, with a valid error envelope; transient/ambiguous outcomes stay unknown.
      return [400, 401, 403, 422].includes(response.status) &&
        rejectionSchema.safeParse(parsed).success
        ? { status: "unavailable", code: "provider_rejected" }
        : unknown();
    }
    const data = responseSchema.parse(parsed);
    const seen = new Set<string>();
    const rates = data.rates.map((rate): EasyPostTestQuoteRate => {
      if (rate.shipment_id !== data.id || seen.has(rate.id)) throw new Error("Rate identity");
      seen.add(rate.id);
      return {
        providerRateId: rate.id,
        providerShipmentId: rate.shipment_id,
        carrierAccountId: rate.carrier_account_id,
        mode: "test",
        carrier: rate.carrier,
        service: rate.service,
        currency: "USD",
        amount: parseShippingQuoteUsdCents(rate.rate),
        estimatedDays: rate.delivery_days ?? null,
        deliveryGuaranteed: rate.delivery_date_guaranteed ?? null,
      };
    });
    const result: EasyPostTestQuoteResult = rates.length
      ? { status: "quoted", providerShipmentId: data.id, mode: "test", rates }
      : { status: "unavailable", code: "no_rates", providerShipmentId: data.id, mode: "test" };
    // Even a provider reflecting our authentication in a consumed label/ID must not leak it.
    if (
      JSON.stringify(result).includes(credentials.data.apiKey) ||
      JSON.stringify(result).includes(authorization)
    )
      return unknown();
    return result;
  } catch {
    return unknown();
  } finally {
    clearTimeout(timer);
    abort();
    reader?.releaseLock();
  }
}

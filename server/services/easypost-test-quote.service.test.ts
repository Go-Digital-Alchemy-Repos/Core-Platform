import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EASYPOST_QUOTE_DEADLINE_MS,
  EASYPOST_QUOTE_MAX_BYTES,
  fetchEasyPostTestQuotes,
  type ApprovedEasyPostTestCredentials,
  type EasyPostQuoteShipment,
} from "./easypost-test-quote.service";

const key = "syntheticOnlyCredentialNeverReal";
const generation = "58da72b0-afac-44f6-93b5-a0b07501b593";
const credentials: ApprovedEasyPostTestCredentials = {
  provider: "easypost",
  mode: "test",
  apiKey: key,
  credentialGenerationId: generation,
  approvedCredentialGenerationId: generation,
};
const address = {
  name: "Synthetic recipient",
  street1: "123 Test Lane",
  city: "Test City",
  state: "CA",
  zip: "94104",
  country: "US" as const,
};
const shipment: EasyPostQuoteShipment = {
  from_address: address,
  to_address: address,
  parcel: { weight: 16.1, length: 10, width: 5.5, height: 2 },
};
const rate = {
  id: "rate_abc123",
  object: "Rate",
  mode: "test",
  shipment_id: "shp_abc123",
  carrier_account_id: "ca_abc123",
  carrier: "USPS",
  service: "Priority",
  rate: "0.29",
  currency: "USD",
  delivery_days: 2,
  delivery_date: null,
  delivery_date_guaranteed: false,
};
const success = { id: "shp_abc123", object: "Shipment", mode: "test", rates: [rate] };
const unknown = { status: "unknown", code: "provider_outcome_unknown" };
const response = (body: unknown, status = 201) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
function fakeResponse(body: unknown, status = 201) {
  return vi.fn<typeof fetch>().mockResolvedValue(response(body, status));
}
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("EasyPost test quote boundary", () => {
  it("sends one fixed POST with Basic key username and no address/credential leakage in normalized result", async () => {
    const fetch = fakeResponse({ ...success, raw_address: address, secret: key });
    const result = await fetchEasyPostTestQuotes(credentials, shipment, { fetch });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.easypost.com/v2/shipments");
    expect(init).toMatchObject({
      method: "POST",
      redirect: "manual",
      headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` },
    });
    expect(JSON.parse(init!.body as string)).toEqual({ shipment });
    expect(result).toEqual({
      status: "quoted",
      mode: "test",
      providerShipmentId: "shp_abc123",
      rates: [
        {
          providerRateId: rate.id,
          providerShipmentId: "shp_abc123",
          carrierAccountId: "ca_abc123",
          mode: "test",
          carrier: "USPS",
          service: "Priority",
          currency: "USD",
          amount: 29,
          estimatedDays: 2,
          deliveryGuaranteed: false,
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain(key);
    expect(JSON.stringify(result)).not.toContain(address.street1);
    expect(init!.signal!.aborted).toBe(true);
  });
  it("preserves missing estimates and guarantee as null, without persisting unconsumed provider date", async () => {
    const { delivery_days: _days, delivery_date_guaranteed: _guarantee, ...minimal } = rate;
    const result = await fetchEasyPostTestQuotes(credentials, shipment, {
      fetch: fakeResponse({ ...success, rates: [minimal] }),
    });
    expect(result).toMatchObject({ rates: [{ estimatedDays: null, deliveryGuaranteed: null }] });
    expect(JSON.stringify(result)).not.toContain("deliveryDate");
  });
  it("accepts company-only recipients, long accepted cities and normalized converted large weights", async () => {
    const { name: _name, ...companyAddress } = address;
    const result = await fetchEasyPostTestQuotes(
      credentials,
      {
        ...shipment,
        to_address: { ...companyAddress, company: "Test Company", city: "A".repeat(200) },
        parcel: { weight: 16_000_000 },
      },
      { fetch: fakeResponse(success) },
    );
    expect(result.status).toBe("quoted");
  });
  it("rejects unapproved, rotated or production credentials before fetch with a safe error", async () => {
    for (const change of [
      { mode: "production" },
      { provider: "shippo" },
      { approvedCredentialGenerationId: "9d40483b-fd53-41ad-a7ab-5fa6d92fb45e" },
      { apiKey: "unsafe:key" },
      { apiKey: "key\nheader" },
    ]) {
      const fetch = fakeResponse(success);
      await expect(
        fetchEasyPostTestQuotes(
          { ...credentials, ...change } as ApprovedEasyPostTestCredentials,
          shipment,
          { fetch },
        ),
      ).rejects.toThrow(/^Shipping quote preflight rejected$/);
      expect(fetch).not.toHaveBeenCalled();
    }
  });
  it("rejects arbitrary shipment options, non-US/military states and unnormalized measurements before fetch", async () => {
    for (const change of [
      { options: { currency: "CAD" } },
      { to_address: { ...address, country: "CA" } },
      { to_address: { ...address, state: "PR" } },
      { to_address: { ...address, state: "AE" } },
      { parcel: { weight: 0.01 } },
      { parcel: { weight: 1e-9 } },
      { to_address: { ...address, name: "blocked\u0085name" } },
      { parcel: { weight: 1, length: 10 } },
      { parcel: { weight: Infinity } },
      { parcel: { weight: 1_000_000_000.1 } },
      { to_address: { ...address, phone: "5555555555" } },
      { to_address: { ...address, name: undefined } },
    ]) {
      const fetch = fakeResponse(success);
      await expect(
        fetchEasyPostTestQuotes(credentials, { ...shipment, ...change } as EasyPostQuoteShipment, {
          fetch,
        }),
      ).rejects.toThrow(/^Shipping quote preflight rejected$/);
      expect(fetch).not.toHaveBeenCalled();
    }
  });
  it("does not infer a test key from a prefix; explicit snapshot approval is still required", async () => {
    expect(
      await fetchEasyPostTestQuotes({ ...credentials, apiKey: "NoMagicPrefixRequired" }, shipment, {
        fetch: fakeResponse(success),
      }),
    ).toMatchObject({ status: "quoted" });
  });
  it("requires test shipment identity even for no rates", async () => {
    expect(
      await fetchEasyPostTestQuotes(credentials, shipment, {
        fetch: fakeResponse({ ...success, rates: [] }),
      }),
    ).toEqual({
      status: "unavailable",
      code: "no_rates",
      providerShipmentId: success.id,
      mode: "test",
    });
    for (const change of [
      { mode: "production" },
      { id: "other" },
      { object: "Order" },
      { rates: null },
    ])
      expect(
        await fetchEasyPostTestQuotes(credentials, shipment, {
          fetch: fakeResponse({ ...success, rates: [], ...change }),
        }),
      ).toEqual(unknown);
  });
  it.each([
    { shipment_id: "shp_other" },
    { mode: "production" },
    { currency: "CAD" },
    { currency: "usd" },
    { object: "Other" },
    { id: "notRate" },
    { rate: "21474836.48" },
    { rate: "1.001" },
    { rate: -1 },
    { delivery_days: -1 },
    { carrier_account_id: null },
    { carrier_account_id: "bad" },
    { carrier_account_id: undefined },
    { delivery_date_guaranteed: "yes" },
    { carrier: "<script>secret</script>" },
    { service: key },
  ])("rejects an invalid or mismatched rate without partial quotes: %j", async (change) => {
    expect(
      await fetchEasyPostTestQuotes(credentials, shipment, {
        fetch: fakeResponse({
          ...success,
          rates: [rate, { ...rate, id: "rate_second", ...change }],
        }),
      }),
    ).toEqual(unknown);
  });
  it("rejects duplicate rate IDs and rates beyond the bounded inventory", async () => {
    for (const rates of [
      [rate, rate],
      Array.from({ length: 101 }, (_, n) => ({ ...rate, id: `rate_${n}` })),
    ])
      expect(
        await fetchEasyPostTestQuotes(credentials, shipment, {
          fetch: fakeResponse({ ...success, rates }),
        }),
      ).toEqual(unknown);
  });
  it.each([400, 401, 403, 422])(
    "normalizes definitive HTTP %i rejection without provider message leakage",
    async (status) => {
      const fetch = fakeResponse(
        { error: { code: "AUTH.BAD", message: `${key} ${address.street1}` } },
        status,
      );
      expect(await fetchEasyPostTestQuotes(credentials, shipment, { fetch })).toEqual({
        status: "unavailable",
        code: "provider_rejected",
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
  it.each([429, 500, 503, 409])("keeps HTTP %i ambiguous and never retries", async (status) => {
    const fetch = fakeResponse({ error: { code: "UNKNOWN", message: key } }, status);
    expect(await fetchEasyPostTestQuotes(credentials, shipment, { fetch })).toEqual(unknown);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("keeps malformed rejection, JSON, UTF-8 and wrong media type unknown", async () => {
    const bodies = [
      response({}, 401),
      new Response("broken", { headers: { "Content-Type": "application/json" } }),
      new Response(new Uint8Array([0xff]), { headers: { "Content-Type": "application/json" } }),
      new Response(JSON.stringify(success), { headers: { "Content-Type": "text/html" } }),
    ];
    for (const body of bodies)
      expect(
        await fetchEasyPostTestQuotes(credentials, shipment, {
          fetch: vi.fn<typeof fetch>().mockResolvedValue(body),
        }),
      ).toEqual(unknown);
  });
  it("rejects redirects without following arbitrary locations and cancels their body", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({ cancel });
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response(body, { status: 302, headers: { location: "https://untrusted.example/" } }),
      );
    expect(await fetchEasyPostTestQuotes(credentials, shipment, { fetch })).toEqual(unknown);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it("bounds declared and actual bytes, including streamed chunks, and cancels", async () => {
    for (const declared of [true, false]) {
      const cancel = vi.fn();
      const bytes = new Uint8Array(EASYPOST_QUOTE_MAX_BYTES + 1);
      const body = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(bytes);
        },
        cancel,
      });
      const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        new Response(body, {
          headers: {
            "Content-Type": "application/json",
            ...(declared ? { "Content-Length": String(bytes.length) } : {}),
          },
        }),
      );
      expect(await fetchEasyPostTestQuotes(credentials, shipment, { fetch })).toEqual(unknown);
      expect(cancel).toHaveBeenCalledTimes(1);
    }
  });
  it("bounds a fetch stall, aborts it, and never retries or logs sensitive errors", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    const error = vi.spyOn(console, "error");
    const warn = vi.spyOn(console, "warn");
    const log = vi.spyOn(console, "log");
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation((_url, init) => {
      signal = init?.signal;
      return new Promise((_, reject) =>
        signal!.addEventListener("abort", () => reject(new Error(key))),
      );
    });
    const promise = fetchEasyPostTestQuotes(credentials, shipment, { fetch });
    await vi.advanceTimersByTimeAsync(EASYPOST_QUOTE_DEADLINE_MS);
    expect(await promise).toEqual(unknown);
    expect(signal!.aborted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });
  it("bounds a stalled reader and cancellation even when the injected stream ignores abort", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn(() => new Promise<void>(() => undefined));
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode('{"id":'));
      },
      cancel,
    });
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(body, { headers: { "Content-Type": "application/json" } }));
    const promise = fetchEasyPostTestQuotes(credentials, shipment, { fetch });
    await vi.advanceTimersByTimeAsync(EASYPOST_QUOTE_DEADLINE_MS);
    expect(await promise).toEqual(unknown);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1]!.signal!.aborted).toBe(true);
  });
  it("sanitizes synchronous and asynchronous transport errors", async () => {
    for (const fetch of [
      vi.fn<typeof globalThis.fetch>().mockImplementation(() => {
        throw new Error(key);
      }),
      vi.fn<typeof globalThis.fetch>().mockRejectedValue(new Error(address.street1)),
    ])
      expect(await fetchEasyPostTestQuotes(credentials, shipment, { fetch })).toEqual(unknown);
  });
});

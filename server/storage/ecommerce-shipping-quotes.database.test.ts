import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
const testUrl = process.env.SHIPPING_QUOTES_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/core_shipping_quotes_test" ||
    url.search ||
    url.hash
  )
    throw new Error("Owned local shipping quote fixture required");
}
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({
    connectionString: process.env.SHIPPING_QUOTES_TEST_DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
    statement_timeout: 10000,
  });
  return { pool, db: drizzle(pool, { schema }) };
});
vi.mock("../utils/logger", () => ({
  logger: { app: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } },
}));
import { db, pool } from "../db";
import { runMigrations } from "../migrate";
import {
  EcommerceShippingQuotesStorage,
  shippingQuoteRequestHash,
} from "./ecommerce-shipping-quotes.storage";
const storage = new EcommerceShippingQuotesStorage();
const now = new Date("2026-09-07T00:00:00Z");
const request = {
  version: "1.0.0",
  locationId: "location",
  items: [{ orderItemId: "item", quantity: 1 }],
  parcel: { weight: 16, weightUnit: "oz" },
};
const address = {
  name: "Synthetic Name",
  street1: "1 Synthetic St",
  city: "Test",
  state: "MI",
  zip: "49503",
  country: "US",
};
const snapshot = {
  version: "1.0.0",
  orderId: "order",
  locationId: "location",
  items: request.items,
  currency: "USD",
  fromAddress: address,
  toAddress: address,
  parcel: { weight: 16 },
};
const input = (key = randomUUID()) => ({
  orderId: "order",
  requestKey: key,
  request,
  snapshot,
  credentialGenerationId: "generation-a",
  now,
  deadlineAt: new Date(now.getTime() + 1000),
});
const quoted = (shipment = "shp_synthetic") => ({
  status: "quoted",
  identity: { providerShipmentId: shipment, observedMode: "test" },
  rates: [
    {
      providerRateId: "rate_synthetic",
      providerShipmentId: shipment,
      carrierAccountId: "ca_synthetic",
      carrier: "Synthetic",
      service: "Ground",
      amount: 101,
      currency: "USD",
      mode: "test",
      estimatedDays: null,
      deliveryGuaranteed: false,
    },
  ],
});
const claim = (data = input()) => db.transaction((tx) => storage.claim(tx, data));
const complete = (
  row: Awaited<ReturnType<typeof claim>>["attempt"],
  result: unknown = quoted(),
  time = now,
) => db.transaction((tx) => storage.complete(tx, row.id, row.fencingToken, result, time));

describe.skipIf(!testUrl)("shipping quote attempts disposable PostgreSQL", () => {
  beforeAll(async () => {
    await runMigrations();
  }, 60000);
  beforeEach(async () => {
    await pool.query("TRUNCATE ecommerce_shipping_quote_attempts,ecommerce_customers CASCADE");
    await pool.query(
      "INSERT INTO ecommerce_customers(id,name,email) VALUES ('customer','Synthetic','synthetic@example.test')",
    );
    await pool.query(
      "INSERT INTO ecommerce_orders(id,customer_id,total_amount,status,payment_status) VALUES ('order','customer',100,'paid','paid')",
    );
  });
  afterAll(async () => {
    await pool.end();
  });
  it("replays concurrent identical claims once", async () => {
    const data = input();
    const results = await Promise.all([claim(data), claim(data)]);
    expect(new Set(results.map((r) => r.attempt.id)).size).toBe(1);
    expect(results.filter((r) => r.replayed)).toHaveLength(1);
  });
  it("rejects concurrent changed request body with 409", async () => {
    const data = input();
    const results = await Promise.allSettled([
      claim(data),
      claim({
        ...data,
        request: { ...request, parcel: { weight: 32, weightUnit: "oz" } },
        snapshot: { ...snapshot, parcel: { weight: 32 } },
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: { statusCode: 409 },
    });
  });
  it("replays before validating changed server snapshot or credentials", async () => {
    const data = input();
    const first = await claim(data);
    const replay = await claim({
      ...data,
      snapshot: { invalid: true },
      credentialGenerationId: "",
    });
    expect(replay.attempt).toEqual(first.attempt);
  });
  it("hashes sorted client selections independently of accepted snapshot", async () => {
    const a = {
      ...request,
      items: [
        { orderItemId: "b", quantity: 1 },
        { orderItemId: "a", quantity: 2 },
      ],
    };
    expect(shippingQuoteRequestHash(a)).toBe(
      shippingQuoteRequestHash({ ...a, items: [...a.items].reverse() }),
    );
    const first = await claim();
    const second = await claim({
      ...input(),
      snapshot: { ...snapshot, toAddress: { ...address, street1: "2 Synthetic St" } },
    });
    expect(first.attempt.requestHash).toBe(second.attempt.requestHash);
    expect(first.attempt.acceptedSnapshotHash).not.toBe(second.attempt.acceptedSnapshotHash);
  });
  it("expires at exact deadline then accepts late same-owner result only once", async () => {
    const row = (await claim()).attempt;
    await db.transaction(async (tx) => {
      expect(await storage.expirePending(tx, new Date(now.getTime() + 999))).toHaveLength(0);
      expect(await storage.expirePending(tx, new Date(now.getTime() + 1000))).toHaveLength(1);
    });
    expect(
      await db.transaction((tx) => storage.complete(tx, row.id, randomUUID(), quoted(), now)),
    ).toBeNull();
    const late = await complete(row);
    expect(late?.status).toBe("quoted");
    expect(await complete(row, { status: "unavailable", errorCode: "no_rates" })).toBeNull();
  });
  it("serializes expiry against completion without losing a result", async () => {
    const row = (await claim()).attempt;
    await Promise.all([
      complete(row),
      db.transaction((tx) => storage.expirePending(tx, new Date(now.getTime() + 1000))),
    ]);
    const result = await db.transaction((tx) =>
      storage.get(tx, "order", row.id, new Date(now.getTime() + 2000)),
    );
    expect(result?.status).toBe("quoted");
  });
  it("enforces provider shipment uniqueness within generation, allows independent generations", async () => {
    const a = (await claim()).attempt,
      b = (await claim()).attempt;
    await complete(a);
    await expect(complete(b)).rejects.toThrow();
    const c = (await claim({ ...input(), credentialGenerationId: "generation-b" })).attempt;
    expect((await complete(c))?.status).toBe("quoted");
  });
  it("rolls claim and completion back with caller transaction failure", async () => {
    await expect(
      db.transaction(async (tx) => {
        const row = await storage.claim(tx, input());
        await storage.complete(tx, row.attempt.id, row.attempt.fencingToken, quoted(), now);
        throw new Error("synthetic rollback");
      }),
    ).rejects.toThrow("synthetic rollback");
    expect(
      (await pool.query("SELECT count(*)::int AS n FROM ecommerce_shipping_quote_attempts")).rows[0]
        .n,
    ).toBe(0);
  });
  it("retains audit identities and rates while redacting terminal PII exactly at 30 days", async () => {
    const a = (await claim()).attempt;
    await complete(a);
    const b = (await claim()).attempt;
    await complete(b, { status: "unavailable", errorCode: "no_rates" });
    const pending = (await claim()).attempt;
    const unknown = (await claim()).attempt;
    await complete(unknown, { status: "unknown", errorCode: "transport_error" });
    const boundary = new Date(now.getTime() + 30 * 86400000);
    await db.transaction(async (tx) => {
      expect(
        await storage.redactTerminalSnapshots(tx, new Date(boundary.getTime() - 1)),
      ).toHaveLength(0);
      expect(await storage.redactTerminalSnapshots(tx, boundary)).toHaveLength(2);
      expect(await storage.redactTerminalSnapshots(tx, boundary)).toHaveLength(0);
    });
    const rows = (await pool.query("SELECT * FROM ecommerce_shipping_quote_attempts")).rows;
    expect(rows.find((r) => r.id === a.id)).toMatchObject({
      accepted_snapshot: null,
      request_hash: a.requestHash,
      accepted_snapshot_hash: a.acceptedSnapshotHash,
      provider_shipment_id: "shp_synthetic",
      status: "quoted",
      items: request.items,
    });
    expect(rows.find((r) => r.id === a.id).rates[0].amount).toBe(101);
    for (const id of [pending.id, unknown.id])
      expect(rows.find((r) => r.id === id).accepted_snapshot).not.toBeNull();
  });
  it("rejects unsafe snapshot/raw fields and mismatched rate identity without writes", async () => {
    await expect(
      claim({ ...input(), snapshot: { ...snapshot, apiKey: "synthetic" } }),
    ).rejects.toThrow();
    const row = (await claim()).attempt;
    await expect(complete(row, { ...quoted(), raw: { secret: "synthetic" } })).rejects.toThrow();
    const response = quoted();
    response.rates[0].providerShipmentId = "shp_other";
    await expect(complete(row, response)).rejects.toThrow("identity_mismatch");
    expect((await pool.query("SELECT status FROM ecommerce_shipping_quote_attempts")).rows).toEqual(
      [{ status: "pending" }],
    );
  });
  it("preserves populated rows across full migration replay", async () => {
    const row = (await claim()).attempt;
    await complete(row);
    const before = (
      await pool.query("SELECT row_to_json(t) AS row FROM ecommerce_shipping_quote_attempts t")
    ).rows;
    const orders = (await pool.query("SELECT row_to_json(t) AS row FROM ecommerce_orders t")).rows;
    await runMigrations();
    await runMigrations();
    expect(
      (await pool.query("SELECT row_to_json(t) AS row FROM ecommerce_shipping_quote_attempts t"))
        .rows,
    ).toEqual(before);
    expect((await pool.query("SELECT row_to_json(t) AS row FROM ecommerce_orders t")).rows).toEqual(
      orders,
    );
  }, 60000);
  it("GET scopes expiry to the order and reports the exact freshness boundary", async () => {
    const row = (await claim()).attempt;
    expect(
      await db.transaction((tx) =>
        storage.get(tx, "other", row.id, new Date(now.getTime() + 1000)),
      ),
    ).toBeNull();
    expect(
      (await pool.query("SELECT status FROM ecommerce_shipping_quote_attempts")).rows[0].status,
    ).toBe("pending");
    await complete(row);
    expect(
      (
        await db.transaction((tx) =>
          storage.get(tx, "order", row.id, new Date(now.getTime() + 899999)),
        )
      )?.stale,
    ).toBe(false);
    expect(
      (
        await db.transaction((tx) =>
          storage.get(tx, "order", row.id, new Date(now.getTime() + 900000)),
        )
      )?.stale,
    ).toBe(true);
  });
  it("rejects structural snapshot and normalized result boundaries", async () => {
    for (const bad of [
      { ...snapshot, locationId: "other" },
      { ...snapshot, fromAddress: { ...address, name: undefined } },
      { ...snapshot, toAddress: { ...address, state: "PR" } },
      { ...snapshot, toAddress: { ...address, phone: "5555555555" } },
      { ...snapshot, toAddress: { ...address, city: "bad\u0085text" } },
      { ...snapshot, parcel: { weight: 0.04 } },
      { ...snapshot, parcel: { weight: 16, length: 1 } },
    ])
      await expect(claim({ ...input(), snapshot: bad })).rejects.toThrow();
    const row = (await claim()).attempt;
    for (const patch of [
      { amount: -1 },
      { amount: 2147483648 },
      { currency: "EUR" },
      { mode: "production" },
      { amount: 1.1 },
    ]) {
      const result = quoted();
      Object.assign(result.rates[0], patch);
      await expect(complete(row, result)).rejects.toThrow();
    }
    await expect(
      claim({ ...input(), deadlineAt: new Date(now.getTime() + 60001) }),
    ).rejects.toThrow("invalid_deadline");
  });
  it("uses locale-independent ordering for distinct identifiers", () => {
    const items = ["a", "A", "é", "e\u0301", "Z"].map((orderItemId) => ({
      orderItemId,
      quantity: 1,
    }));
    expect(shippingQuoteRequestHash({ ...request, items })).toBe(
      shippingQuoteRequestHash({ ...request, items: [...items].reverse() }),
    );
  });
  it("never replaces a verified unknown shipment identity", async () => {
    const row = (await claim()).attempt;
    await complete(row, {
      status: "unknown",
      errorCode: "transport_error",
      identity: { providerShipmentId: "shp_A", observedMode: "test" },
    });
    expect(await complete(row, quoted("shp_B"))).toBeNull();
    expect(
      (
        await pool.query(
          "SELECT status,provider_shipment_id FROM ecommerce_shipping_quote_attempts",
        )
      ).rows[0],
    ).toEqual({ status: "unknown", provider_shipment_id: "shp_A" });
    expect((await complete(row, quoted("shp_A")))?.status).toBe("quoted");
  });
  it("rejects controls before trimming address text", async () => {
    for (const name of ["\nSynthetic", "Synthetic\t", "\u0085Synthetic"]) {
      await expect(
        claim({ ...input(), snapshot: { ...snapshot, toAddress: { ...address, name } } }),
      ).rejects.toThrow();
    }
  });
  it("preserves unknown delivery guarantee instead of inventing false", async () => {
    const row = (await claim()).attempt;
    const result = quoted();
    const nullableResult = {
      ...result,
      rates: result.rates.map((rate) => ({ ...rate, deliveryGuaranteed: null })),
    };
    await expect(
      complete(row, {
        ...nullableResult,
        rates: nullableResult.rates.map((rate) => ({ ...rate, carrierAccountId: "invalid" })),
      }),
    ).rejects.toThrow();
    await complete(row, nullableResult);
    const stored = await db.transaction((tx) => storage.get(tx, "order", row.id, now));
    expect(stored?.rates[0].deliveryGuaranteed).toBeNull();
  });
  it("enforces database FK and lifecycle checks", async () => {
    const row = (await claim()).attempt;
    await expect(
      pool.query("UPDATE ecommerce_shipping_quote_attempts SET order_id='missing' WHERE id=$1", [
        row.id,
      ]),
    ).rejects.toThrow();
    await expect(
      pool.query("UPDATE ecommerce_shipping_quote_attempts SET status='quoted' WHERE id=$1", [
        row.id,
      ]),
    ).rejects.toThrow();
    await expect(
      pool.query(
        "UPDATE ecommerce_shipping_quote_attempts SET accepted_snapshot=NULL WHERE id=$1",
        [row.id],
      ),
    ).rejects.toThrow();
    await expect(
      pool.query(
        "UPDATE ecommerce_shipping_quote_attempts SET expected_mode='production' WHERE id=$1",
        [row.id],
      ),
    ).rejects.toThrow();
  });
});

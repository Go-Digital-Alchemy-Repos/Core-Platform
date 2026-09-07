import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("../storage/index", () => ({ storage: { settings: { invalidateAll: vi.fn() } } }));
const testUrl = process.env.SHIPPING_QUOTE_SERVICE_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/core_shipping_quote_service_test" ||
    url.search ||
    url.hash
  )
    throw new Error("Owned local shipping quote service fixture required");
}
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({
    connectionString: process.env.SHIPPING_QUOTE_SERVICE_TEST_DATABASE_URL,
    max: 8,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
    statement_timeout: 10000,
  });
  return { pool, db: drizzle(pool, { schema }) };
});
vi.mock("../utils/logger", () => ({
  logger: { app: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } },
}));
import express from "express";
import { createShippingQuoteRouter } from "../routes/admin/ecommerce-shipping-quotes.routes";
import { errorHandler } from "../middleware/error-handler";
import { logger } from "../utils/logger";
import { sql } from "drizzle-orm";
import { db, pool } from "../db";
import { runMigrations } from "../migrate";
import {
  createShippingQuoteService,
  type ShippingQuoteAuthorization,
  easyPostShippingQuoteAuthorization,
} from "./ecommerce-shipping-quote-orchestration";
import { EcommerceShippingQuotesStorage } from "../storage/ecommerce-shipping-quotes.storage";
import { fetchEasyPostTestQuotes } from "./easypost-test-quote.service";
import {
  rotateEasyPostCredentials,
  approveEasyPostTestGeneration,
  saveEasyPostProviderConfiguration,
} from "./ecommerce-shipping-credential-authorization.service";
const request = {
  version: "1.0.0",
  locationId: "location",
  items: [{ orderItemId: "item", quantity: 1 }],
  parcel: { weight: 1, weightUnit: "lb" },
};
const initial = new Date("2026-09-07T00:00:00Z");
let time: Date;
let generation: string;
let denied: boolean;
let authFailure: boolean;
class Denial extends Error {}
const auth: ShippingQuoteAuthorization = {
  async lockEasyPostCredentialAuthorization(tx) {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(880120998)`);
  },
  async readAuthorizedEasyPostTestCredentials() {
    if (authFailure) throw new Error("synthetic DB failure");
    if (denied) throw new Denial();
    return {
      provider: "easypost",
      mode: "test",
      apiKey: "synthetic-test-only",
      credentialGenerationId: generation,
      approvedCredentialGenerationId: generation,
    };
  },
  async recheckEasyPostTestGeneration(tx, expected) {
    const credentials = await this.readAuthorizedEasyPostTestCredentials(tx);
    if (expected !== generation) throw new Denial();
    return credentials;
  },
  async readEasyPostQuoteAuthorizationReadiness() {
    if (authFailure) throw new Error("synthetic DB failure");
    return {
      implemented: true,
      configured: true,
      approvedTestCredentials: !denied,
      enabled: !denied,
      mode: "test",
      reasonCode: denied ? "test_approval_required" : null,
    };
  },
  isAuthorizationDenied: (error) => error instanceof Denial,
};
function syntheticFetch() {
  return vi.fn<typeof fetch>().mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          id: "shp_synthetic",
          object: "Shipment",
          mode: "test",
          rates: [
            {
              id: "rate_synthetic",
              object: "Rate",
              mode: "test",
              shipment_id: "shp_synthetic",
              carrier_account_id: "ca_synthetic",
              carrier: "Synthetic",
              service: "Ground",
              currency: "USD",
              rate: "1.25",
            },
          ],
        }),
        { headers: { "content-type": "application/json" } },
      ),
  );
}
function service(overrides: Partial<Parameters<typeof createShippingQuoteService>[0]> = {}) {
  const fetch = syntheticFetch();
  return {
    fetch,
    service: createShippingQuoteService({
      database: db,
      authorization: auth,
      transport: (credentials, shipment) =>
        fetchEasyPostTestQuotes(credentials, shipment, { fetch }),
      now: () => new Date(time),
      ...overrides,
    }),
  };
}
async function rows() {
  return (await pool.query("SELECT * FROM ecommerce_shipping_quote_attempts")).rows;
}

describe.skipIf(!testUrl)(
  "shipping quote orchestration: real PostgreSQL, synthetic transport only",
  () => {
    beforeAll(async () => {
      await runMigrations();
    }, 60000);
    beforeEach(async () => {
      time = new Date(initial);
      generation = randomUUID();
      denied = false;
      authFailure = false;
      await pool.query(
        "TRUNCATE ecommerce_shipping_quote_attempts,ecommerce_customers,ecommerce_products,ecommerce_fulfillment_locations,ecommerce_shipping_providers,system_settings CASCADE",
      );
      await pool.query(
        "INSERT INTO ecommerce_customers(id,name,email) VALUES ('customer','Synthetic','synthetic@example.test')",
      );
      await pool.query(
        "INSERT INTO ecommerce_products(id,name,url_slug,price) VALUES ('product','Synthetic','synthetic',100)",
      );
      await pool.query(
        "INSERT INTO ecommerce_orders(id,customer_id,total_amount,status,payment_status,fulfillment_mode,shipping_name,shipping_address,shipping_city,shipping_state,shipping_zip,shipping_country) VALUES ('order','customer',100,'paid','paid','shipping','Synthetic','1 Test St','Test','MI','49503','US')",
      );
      await pool.query(
        "INSERT INTO ecommerce_order_items(id,order_id,product_id,product_name,quantity,unit_price,line_total) VALUES ('item','order','product','Synthetic',2,100,200)",
      );
      await pool.query(
        "INSERT INTO ecommerce_fulfillment_locations(id,name,address,city,state,postal_code,country) VALUES ('location','Synthetic','2 Test St','Test','MI','49503','US')",
      );
    });
    afterAll(async () => {
      await pool.end();
    });
    it("same-key race commits one claim and dispatches exactly one synthetic fetch", async () => {
      const { service: s, fetch } = service();
      const key = randomUUID();
      const result = await Promise.all([
        s.create("order", key, request),
        s.create("order", key, request),
      ]);
      expect(new Set(result.map((r) => r.quote.id)).size).toBe(1);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(await rows()).toHaveLength(1);
      expect(result.filter((r) => r.replayed)).toHaveLength(1);
      expect((await pool.query("SELECT * FROM ecommerce_fulfillments")).rows).toEqual([]);
      expect((await pool.query("SELECT * FROM ecommerce_notification_jobs")).rows).toEqual([]);
    });
    it("changed body for the same key rejects 409 without redispatch", async () => {
      const { service: s, fetch } = service();
      const key = randomUUID();
      await s.create("order", key, request);
      await expect(
        s.create("order", key, { ...request, parcel: { weight: 2, weightUnit: "lb" } }),
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(fetch).toHaveBeenCalledTimes(1);
    });
    it("replays after revoked credentials and changed eligibility; returned history is stale", async () => {
      const { service: s, fetch } = service();
      const key = randomUUID();
      const first = await s.create("order", key, request);
      denied = true;
      await pool.query(
        "UPDATE ecommerce_orders SET status='cancelled',shipping_address='Changed' WHERE id='order'",
      );
      const replay = await s.create("order", key, request);
      expect(replay.quote.id).toBe(first.quote.id);
      expect(replay.quote.stale).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(1);
    });
    it("real authorization creates once, replays after rotation, and rejects unapproved fresh claims", async () => {
      await saveEasyPostProviderConfiguration(db, {
        provider: "easypost",
        displayName: "EasyPost",
        type: "aggregator",
        active: true,
        testMode: true,
      });
      const firstGeneration = await rotateEasyPostCredentials(db, "synthetic-real-auth-only");
      await approveEasyPostTestGeneration(db, firstGeneration!);
      const { service: s, fetch } = service({ authorization: easyPostShippingQuoteAuthorization });
      const key = randomUUID();
      await Promise.all([s.create("order", key, request), s.create("order", key, request)]);
      expect(fetch).toHaveBeenCalledTimes(1);
      await rotateEasyPostCredentials(db, "synthetic-rotated-only");
      expect((await s.create("order", key, request)).quote.stale).toBe(true);
      await expect(s.create("order", randomUUID(), request)).rejects.toMatchObject({
        statusCode: 409,
      });
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(await rows()).toHaveLength(1);
    });
    it("real credential rotation after commit prevents dispatch with the captured generation", async () => {
      await saveEasyPostProviderConfiguration(db, {
        provider: "easypost",
        displayName: "EasyPost",
        active: true,
        testMode: true,
      });
      const gen = await rotateEasyPostCredentials(db, "synthetic-original");
      await approveEasyPostTestGeneration(db, gen!);
      const database = { transaction: vi.fn(db.transaction.bind(db)) };
      let calls = 0;
      database.transaction.mockImplementation(
        async (...args: Parameters<typeof db.transaction>) => {
          const call = ++calls;
          const value = await db.transaction(...args);
          if (call === 1) await rotateEasyPostCredentials(db, "synthetic-next");
          return value;
        },
      );
      const { service: s, fetch } = service({
        database,
        authorization: easyPostShippingQuoteAuthorization,
      });
      expect((await s.create("order", randomUUID(), request)).quote).toMatchObject({
        status: "unavailable",
        errorCode: "configuration_changed",
      });
      expect(fetch).not.toHaveBeenCalled();
    });
    it("invalid request and unpaid order reject before claims and transport", async () => {
      const { service: s, fetch } = service();
      await expect(
        s.create("order", randomUUID(), { ...request, currency: "EUR" }),
      ).rejects.toThrow();
      await pool.query("UPDATE ecommerce_orders SET payment_status='unpaid' WHERE id='order'");
      await expect(s.create("order", randomUUID(), request)).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(await rows()).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });
    it("pending replay during an in-flight provider request cannot take ownership", async () => {
      let release!: () => void;
      let started!: () => void;
      const waiting = new Promise<void>((resolve) => {
        release = resolve;
      });
      const entered = new Promise<void>((resolve) => {
        started = resolve;
      });
      const fetch = syntheticFetch();
      const transport = vi.fn(async (credentials, shipment) => {
        started();
        await waiting;
        return fetchEasyPostTestQuotes(credentials, shipment, { fetch });
      });
      const { service: s } = service({ transport });
      const key = randomUUID();
      const owner = s.create("order", key, request);
      try {
        await entered;
        const replay = await s.create("order", key, request);
        expect(replay).toMatchObject({
          replayed: true,
          statusCode: 202,
          quote: { status: "pending" },
        });
        expect(transport).toHaveBeenCalledTimes(1);
      } finally {
        release();
      }
      expect((await owner).quote.status).toBe("quoted");
    });
    it("current snapshot hashing uses storage code-unit item ordering", async () => {
      await pool.query(
        "INSERT INTO ecommerce_order_items(id,order_id,product_id,product_name,quantity,unit_price,line_total) VALUES ('Zitem','order','product','Synthetic',2,100,200)",
      );
      const { service: s } = service();
      const result = await s.create("order", randomUUID(), {
        ...request,
        items: [...request.items, { orderItemId: "Zitem", quantity: 1 }],
      });
      expect(result.quote.stale).toBe(false);
    });
    it("denied authorization has zero claims and transport calls", async () => {
      denied = true;
      const { service: s, fetch } = service();
      await expect(s.create("order", randomUUID(), request)).rejects.toMatchObject({
        statusCode: 409,
      });
      expect(await rows()).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });
    it("rotation between committed claim and dispatch prevents transport", async () => {
      const storage = new EcommerceShippingQuotesStorage();
      const original = storage.claim.bind(storage);
      vi.spyOn(storage, "claim").mockImplementation(async (tx, input) => {
        const result = await original(tx, input);
        generation = randomUUID();
        return result;
      });
      const { service: s, fetch } = service({ storage });
      const result = await s.create("order", randomUUID(), request);
      expect(result.quote).toMatchObject({
        status: "unavailable",
        errorCode: "configuration_changed",
        stale: true,
      });
      expect(fetch).not.toHaveBeenCalled();
    });
    it("ambiguous transport returns unknown; GET and same-key replay never retry", async () => {
      const transport = vi.fn().mockRejectedValue(new Error("synthetic ambiguous response"));
      const { service: s } = service({ transport });
      const key = randomUUID();
      const first = await s.create("order", key, request);
      expect(first.statusCode).toBe(202);
      expect(first.quote.status).toBe("unknown");
      expect((await s.read("order", first.quote.id)).status).toBe("unknown");
      await s.create("order", key, request);
      expect(transport).toHaveBeenCalledTimes(1);
    });
    it("completion persistence failure after response records unknown without another fetch", async () => {
      const storage = new EcommerceShippingQuotesStorage();
      vi.spyOn(storage, "complete").mockRejectedValueOnce(new Error("synthetic write failure"));
      const { service: s, fetch } = service({ storage });
      const result = await s.create("order", randomUUID(), request);
      expect(result.quote).toMatchObject({ status: "unknown", errorCode: "interrupted" });
      expect(fetch).toHaveBeenCalledTimes(1);
    });
    it("lost completion acknowledgement preserves the already committed quoted result", async () => {
      const storage = new EcommerceShippingQuotesStorage();
      const database = { transaction: vi.fn(db.transaction.bind(db)) };
      // Third transaction is completion; throw only after its real commit has succeeded.
      let calls = 0;
      database.transaction.mockImplementation(
        async (...args: Parameters<typeof db.transaction>) => {
          calls += 1;
          const value = await db.transaction(...args);
          if (calls === 3) throw new Error("synthetic lost acknowledgement");
          return value;
        },
      );
      const { service: s, fetch } = service({ database, storage });
      expect((await s.create("order", randomUUID(), request)).quote.status).toBe("quoted");
      expect(fetch).toHaveBeenCalledTimes(1);
    });
    it("scopes GET to order and marks changed address or elapsed lifetime stale", async () => {
      const { service: s } = service();
      const result = await s.create("order", randomUUID(), request);
      expect(result.quote.stale).toBe(false);
      await pool.query(
        "INSERT INTO ecommerce_orders(id,customer_id,total_amount) VALUES ('other','customer',100)",
      );
      await expect(s.read("other", result.quote.id)).rejects.toMatchObject({ statusCode: 404 });
      await pool.query("UPDATE ecommerce_orders SET shipping_city='Changed' WHERE id='order'");
      expect((await s.read("order", result.quote.id)).stale).toBe(true);
      await pool.query("UPDATE ecommerce_orders SET shipping_city='Test' WHERE id='order'");
      time = new Date(initial.getTime() + 16 * 60000);
      expect((await s.read("order", result.quote.id)).stale).toBe(true);
    });
    it("expires pending without dispatch on GET and retains the original fence", async () => {
      const { service: s } = service();
      const quoted = await s.create("order", randomUUID(), request);
      const row = (await rows())[0];
      await pool.query(
        "UPDATE ecommerce_shipping_quote_attempts SET status='pending',rates='[]',completed_at=NULL,provider_shipment_id=NULL,observed_mode=NULL WHERE id=$1",
        [quoted.quote.id],
      );
      time = new Date(initial.getTime() + 31000);
      const got = await s.read("order", quoted.quote.id);
      expect(got).toMatchObject({ status: "unknown", errorCode: "request_timeout" });
      expect((await rows())[0].fencing_token).toBe(row.fencing_token);
    });
    it("corrupt stored snapshots produce sanitized 503 through the real error handler", async () => {
      const { service: s } = service();
      const first = await s.create("order", randomUUID(), request);
      await pool.query(
        "UPDATE ecommerce_shipping_quote_attempts SET accepted_snapshot=jsonb_set(accepted_snapshot,'{fromAddress,country}',to_jsonb($1::text)) WHERE id=$2",
        ["PRIVATE_STORED_ADDRESS_MARKER", first.quote.id],
      );
      vi.mocked(logger.app.error).mockClear();
      const app = express();
      app.use(
        createShippingQuoteRouter(s, {
          requireAdmin: (_req, _res, next) => next(),
          requireEcommerceEnabled: (_req, _res, next) => next(),
        }),
      );
      app.use(errorHandler);
      const server = app.listen(0, "127.0.0.1");
      try {
        await new Promise<void>((resolve) => server.once("listening", resolve));
        const address = server.address();
        if (!address || typeof address === "string") throw new Error("No fixture address");
        const response = await fetch(
          `http://127.0.0.1:${address.port}/orders/order/shipping-quotes/${first.quote.id}`,
          { signal: AbortSignal.timeout(2000) },
        );
        expect(response.status).toBe(503);
        expect(await response.text()).not.toContain("PRIVATE_STORED_ADDRESS_MARKER");
        const errors = vi.mocked(logger.app.error).mock.calls.flat();
        expect(
          errors
            .map((value) => (value instanceof Error ? value.message : JSON.stringify(value)))
            .join(" "),
        ).not.toContain("PRIVATE_STORED_ADDRESS_MARKER");
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    });
    it("readiness database failure is 503 rather than a fabricated unconfigured state", async () => {
      const { service: s } = service();
      expect((await s.readiness()).enabled).toBe(true);
      authFailure = true;
      await expect(s.readiness()).rejects.toMatchObject({ statusCode: 503 });
    });
    it("retention redacts only the locked bounded terminal selection, never unknown", async () => {
      const { service: s } = service();
      await s.create("order", randomUUID(), request);
      await pool.query(
        "INSERT INTO ecommerce_shipping_quote_attempts SELECT (jsonb_populate_record(NULL::ecommerce_shipping_quote_attempts,to_jsonb(q)||jsonb_build_object('id',gen_random_uuid(),'request_key',gen_random_uuid(),'provider_shipment_id',NULL,'observed_mode',NULL,'status','unavailable','error_code','provider_rejected','rates','[]'::jsonb))).* FROM ecommerce_shipping_quote_attempts q LIMIT 1",
      );
      const unknown = await service({
        transport: async () => ({ status: "unknown", code: "provider_outcome_unknown" }),
      }).service.create("order", randomUUID(), request);
      time = new Date(initial.getTime() + 31 * 86400000);
      expect(await s.maintain(1)).toEqual({ expired: 0, redacted: 1 });
      expect((await rows()).filter((r) => r.accepted_snapshot === null)).toHaveLength(1);
      expect(
        (await rows()).find((r) => r.id === unknown.quote.id).accepted_snapshot,
      ).not.toBeNull();
    });
  },
);

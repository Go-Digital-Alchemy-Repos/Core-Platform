import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
const testUrl = process.env.ATOMIC_FULFILLMENT_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/core_atomic_fulfillment_test" ||
    url.search ||
    url.hash
  )
    throw new Error("Owned local fixture required");
}
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({
    connectionString: process.env.ATOMIC_FULFILLMENT_TEST_DATABASE_URL,
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
import { EcommerceStorage } from "./ecommerce.storage";
import {
  ecommerceProducts,
  ecommerceCustomers,
  ecommerceOrders,
  ecommerceOrderItems,
  insertEcommerceFulfillmentSchema,
} from "@shared/schema";
const storage = new EcommerceStorage();
const body = (quantity = 1) => ({
  carrier: "UPS",
  trackingNumber: "SYNTHETIC",
  items: [{ orderItemId: "item", quantity }],
});
async function counts() {
  return (
    await pool.query(
      "SELECT (SELECT count(*)::int FROM ecommerce_shipments) AS shipments,(SELECT count(*)::int FROM ecommerce_fulfillments) AS fulfillments,(SELECT count(*)::int FROM ecommerce_notification_jobs) AS notifications",
    )
  ).rows[0];
}
describe.skipIf(!testUrl)("atomic fulfillment disposable PostgreSQL", () => {
  beforeAll(async () => {
    await runMigrations();
  }, 60000);
  beforeEach(async () => {
    await pool.query("TRUNCATE ecommerce_customers,ecommerce_products CASCADE");
    await db
      .insert(ecommerceCustomers)
      .values({ id: "customer", name: "Synthetic", email: "synthetic@example.test" });
    await db
      .insert(ecommerceProducts)
      .values({ id: "product", name: "Synthetic", price: 100, urlSlug: "synthetic" });
    await db.insert(ecommerceOrders).values([
      {
        id: "order",
        customerId: "customer",
        totalAmount: 200,
        status: "paid",
        paymentStatus: "paid",
      },
      {
        id: "other",
        customerId: "customer",
        totalAmount: 100,
        status: "paid",
        paymentStatus: "paid",
      },
    ]);
    await db.insert(ecommerceOrderItems).values({
      id: "item",
      orderId: "order",
      productId: "product",
      productName: "Synthetic item",
      quantity: 2,
      unitPrice: 100,
      lineTotal: 200,
    });
  });
  afterAll(async () => {
    await pool.end();
  });
  it("partial then complete shipment is atomic and replay survives later state changes", async () => {
    const key = randomUUID();
    const first = await storage.shipAndFulfillOrder("order", key, body(), null);
    expect(first.replayed).toBe(false);
    expect((await storage.getOrder("order"))?.status).toBe("paid");
    expect(await counts()).toEqual({ shipments: 1, fulfillments: 1, notifications: 1 });
    await pool.query(
      "UPDATE ecommerce_orders SET status='delivered',payment_status='refunded',fraud_review_status='rejected' WHERE id='order'",
    );
    const replay = await storage.shipAndFulfillOrder("order", key, body(), null);
    expect(replay.shipment.id).toBe(first.shipment.id);
    expect(replay.fulfillment.id).toBe(first.fulfillment.id);
    expect(replay.replayed).toBe(true);
    await expect(storage.shipAndFulfillOrder("order", key, body(2), null)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(await counts()).toEqual({ shipments: 1, fulfillments: 1, notifications: 1 });
    await pool.query(
      "UPDATE ecommerce_orders SET status='paid',payment_status='paid',fraud_review_status='approved',fraud_decision='allow' WHERE id='order'",
    );
    await storage.shipAndFulfillOrder("order", randomUUID(), body(), null);
    expect((await storage.getOrder("order"))?.status).toBe("shipped");
  });
  it("concurrent same-key requests return one receipt and notification", async () => {
    const key = randomUUID();
    const result = await Promise.all([
      storage.shipAndFulfillOrder("order", key, body(), null),
      storage.shipAndFulfillOrder("order", key, body(), null),
    ]);
    expect(new Set(result.map((item) => item.shipment.id)).size).toBe(1);
    expect(await counts()).toEqual({ shipments: 1, fulfillments: 1, notifications: 1 });
  });
  it("concurrent different requests cannot overfulfill", async () => {
    const result = await Promise.allSettled([
      storage.shipAndFulfillOrder("order", randomUUID(), body(2), null),
      storage.shipAndFulfillOrder("order", randomUUID(), body(2), null),
    ]);
    expect(result.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect(await counts()).toEqual({ shipments: 1, fulfillments: 1, notifications: 1 });
  });
  it("legacy fulfillments share the same quantity lock with atomic fulfillment", async () => {
    const result = await Promise.allSettled([
      storage.createFulfillment({ orderId: "order", status: "fulfilled" }, [
        { orderItemId: "item", quantity: 2 },
      ]),
      storage.shipAndFulfillOrder("order", randomUUID(), body(2), null),
    ]);
    expect(result.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect((await counts()).fulfillments).toBe(1);
  });
  it("rolls back shipment,items,status,receipt when notification insertion fails", async () => {
    await pool.query(
      "CREATE FUNCTION fail_notification() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $$; CREATE TRIGGER fail_notification BEFORE INSERT ON ecommerce_notification_jobs FOR EACH ROW EXECUTE FUNCTION fail_notification()",
    );
    const key = randomUUID();
    try {
      await expect(storage.shipAndFulfillOrder("order", key, body(2), null)).rejects.toThrow();
      expect(await counts()).toEqual({ shipments: 0, fulfillments: 0, notifications: 0 });
      expect((await storage.getOrder("order"))?.status).toBe("paid");
    } finally {
      await pool.query(
        "DROP TRIGGER fail_notification ON ecommerce_notification_jobs; DROP FUNCTION fail_notification()",
      );
    }
    await storage.shipAndFulfillOrder("order", key, body(2), null);
    expect((await counts()).notifications).toBe(1);
  });
  it.each([
    { payment_status: "unpaid" },
    { status: "cancelled" },
    { status: "delivered" },
    { fraud_review_status: "pending" },
    { fraud_review_status: "rejected" },
    { fraud_decision: "block" },
  ])("rejects current locked order state %j", async (patch) => {
    for (const [column, value] of Object.entries(patch))
      await pool.query(`UPDATE ecommerce_orders SET ${column}=$1 WHERE id='order'`, [value]);
    await expect(
      storage.shipAndFulfillOrder("order", randomUUID(), body(), null),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      storage.createShipmentAndMarkOrderShipped({ orderId: "order" }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(await counts()).toEqual({ shipments: 0, fulfillments: 0, notifications: 0 });
  });
  it("rejects wrong scope,empty,zero,bad key,unknown server fields and nonexistent location without writes", async () => {
    for (const input of [
      { items: [] },
      body(0),
      { ...body(), status: "shipped" },
      { ...body(), locationId: "missing" },
    ])
      await expect(
        storage.shipAndFulfillOrder("order", randomUUID(), input, null),
      ).rejects.toThrow();
    await expect(
      storage.shipAndFulfillOrder("other", randomUUID(), body(), null),
    ).rejects.toThrow();
    await expect(storage.shipAndFulfillOrder("order", "invalid", body(), null)).rejects.toThrow();
    const shipment = await storage.createShipment({ orderId: "other" });
    await expect(
      storage.createFulfillment({ orderId: "order", shipmentId: shipment.id }, [
        { orderItemId: "item", quantity: 1 },
      ]),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect((await counts()).fulfillments).toBe(0);
    expect(
      insertEcommerceFulfillmentSchema.parse({
        orderId: "order",
        requestKey: "forged",
        requestHash: "forged",
      }),
    ).not.toHaveProperty("requestKey");
  });
  it("revalidates payment after waiting for a competing order update", async () => {
    const connection = await pool.connect();
    let pending: Promise<unknown> | undefined;
    try {
      await connection.query("BEGIN");
      await connection.query(
        "UPDATE ecommerce_orders SET payment_status='refunded' WHERE id='order'",
      );
      pending = storage.shipAndFulfillOrder("order", randomUUID(), body(), null).then(
        (value) => ({ value }),
        (error) => ({ error }),
      );
      const blockerPid = (await connection.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
      let blocked = false;
      for (let attempt = 0; attempt < 40; attempt++) {
        const result = await pool.query(
          "SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND $1 = ANY(pg_blocking_pids(pid))",
          [blockerPid],
        );
        if (result.rows[0].count > 0) {
          blocked = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(blocked).toBe(true);
      await connection.query("COMMIT");
      expect(await pending).toMatchObject({ error: { statusCode: 400 } });
      expect(await counts()).toEqual({ shipments: 0, fulfillments: 0, notifications: 0 });
    } finally {
      await connection.query("ROLLBACK");
      connection.release();
      if (pending) await pending;
    }
  });

  it("migration rerun preserves old null receipts and newly recorded replay data", async () => {
    await storage.createFulfillment({ orderId: "order", status: "fulfilled" }, [
      { orderItemId: "item", quantity: 1 },
    ]);
    const key = randomUUID();
    const first = await storage.shipAndFulfillOrder("order", key, body(), null);
    await runMigrations();
    const rows = (
      await pool.query(
        "SELECT request_key,request_hash FROM ecommerce_fulfillments ORDER BY request_key NULLS FIRST",
      )
    ).rows;
    expect(rows[0]).toEqual({ request_key: null, request_hash: null });
    expect(rows[1].request_key).toBe(key);
    expect((await storage.shipAndFulfillOrder("order", key, body(), null)).fulfillment.id).toBe(
      first.fulfillment.id,
    );
  });
});

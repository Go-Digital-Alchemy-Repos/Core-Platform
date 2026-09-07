import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { gunzipSync } from "node:zlib";
const testUrl = process.env.SHIPPING_LABEL_SCHEMA_TEST_DATABASE_URL;
if (testUrl) {
  const u = new URL(testUrl);
  if (
    !["postgres:", "postgresql:"].includes(u.protocol) ||
    u.hostname !== "127.0.0.1" ||
    u.pathname !== "/core_shipping_label_schema_test" ||
    u.search ||
    u.hash
  )
    throw new Error("Owned local label schema fixture required");
}
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({
    connectionString: process.env.SHIPPING_LABEL_SCHEMA_TEST_DATABASE_URL,
    max: 3,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
    statement_timeout: 10000,
  });
  return { pool, db: drizzle(pool, { schema }) };
});
vi.mock("../utils/logger", () => ({
  logger: {
    app: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    backup: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    db: { warn: vi.fn() },
  },
}));
vi.mock("../services/backup-storage.service", () => ({
  deleteBackupObject: vi.fn(),
  downloadBackupObject: vi.fn(),
  getBackupStorageInfo: vi.fn(),
  isBackupStorageConfigured: vi.fn(),
  listBackupObjects: vi.fn(),
  uploadBackupObject: vi.fn(),
}));
import { pool } from "../db";
import { runMigrations } from "../migrate";
import { runSystemBackup } from "../services/system-backup.service";
import * as backupStorage from "../services/backup-storage.service";
const table = "ecommerce_shipping_label_purchases";
async function insert(values: Record<string, unknown> = {}) {
  const row = {
    created_at: new Date("2026-01-01T00:00:00Z"),
    id: randomUUID(),
    order_id: "order",
    quote_attempt_id: "quote",
    location_id: "location",
    request_key: randomUUID(),
    request_hash: "a".repeat(64),
    accepted_quote_hash: "b".repeat(64),
    accepted_snapshot_hash: "c".repeat(64),
    accepted_snapshot: { version: 1 },
    provider_shipment_id: "shp_" + randomUUID().replaceAll("-", ""),
    selected_rate_id: "rate_synthetic",
    carrier_account_id: "ca_synthetic",
    credential_generation_id: randomUUID(),
    confirmed_rate_amount: 101,
    claim_fence: randomUUID(),
    claim_deadline_at: new Date(Date.now() + 60000),
    ...values,
  };
  const keys = Object.keys(row);
  await pool.query(
    `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map((_, i) => "$" + (i + 1)).join(",")})`,
    Object.values(row),
  );
  return row.id;
}
async function reject(values: Record<string, unknown>, code = "23514") {
  await expect(insert(values)).rejects.toMatchObject({ code });
}
const purchased = {
  state: "purchased",
  observation_source: "preflight",
  observed_mode: "test",
  observed_postage_label_id: "pl_synthetic",
  purchase_completed_at: new Date(Date.now() + 1000),
};
describe.skipIf(!testUrl)("shipping label schema disposable PostgreSQL", () => {
  beforeAll(async () => {
    await runMigrations();
    await runMigrations();
  }, 60000);
  beforeEach(async () => {
    await pool.query(
      "TRUNCATE ecommerce_shipping_label_events,ecommerce_shipping_label_operations,ecommerce_shipping_label_allocations,ecommerce_shipping_label_purchases,ecommerce_shipping_quote_attempts,ecommerce_customers,ecommerce_fulfillment_locations,ecommerce_products CASCADE",
    );
    await pool.query(
      "INSERT INTO ecommerce_customers(id,name,email) VALUES ('customer','Synthetic','synthetic@example.test')",
    );
    await pool.query(
      "INSERT INTO ecommerce_orders(id,customer_id,total_amount,status,payment_status) VALUES ('order','customer',100,'paid','paid'),('other','customer',100,'paid','paid')",
    );
    await pool.query(
      "INSERT INTO ecommerce_fulfillment_locations(id,name) VALUES ('location','Synthetic')",
    );
    await pool.query(
      "INSERT INTO ecommerce_products(id,name,url_slug,price) VALUES ('product','Synthetic','synthetic',100)",
    );
    await pool.query(
      "INSERT INTO ecommerce_order_items(id,order_id,product_id,product_name,quantity,unit_price,line_total) VALUES ('item','order','product','Synthetic',2,50,100),('other-item','other','product','Synthetic',2,50,100)",
    );
    await pool.query(
      "INSERT INTO ecommerce_fulfillments(id,order_id) VALUES ('fulfillment','order'),('other-fulfillment','other')",
    );
    await pool.query(
      `INSERT INTO ecommerce_shipping_quote_attempts(id,order_id,request_key,contract_version,request_hash,accepted_snapshot_hash,accepted_snapshot,location_id,items,provider,credential_generation_id,expected_mode,fencing_token,deadline_at,expires_at) VALUES ('quote','order',$1,'1.0.0',$2,$2,'{}','location','[]','easypost',$1,'test',$1,now()+interval '1 minute',now()+interval '2 minutes'),('other-quote','other',$3,'1.0.0',$2,$2,'{}','location','[]','easypost',$3,'test',$3,now()+interval '1 minute',now()+interval '2 minutes')`,
      [randomUUID(), "a".repeat(64), randomUUID()],
    );
  });
  afterAll(async () => {
    await pool.end();
    vi.unstubAllEnvs();
  });
  it("migrates twice and preserves populated rows on replay", async () => {
    const id = await insert();
    await runMigrations();
    expect((await pool.query(`SELECT id FROM ${table} WHERE id=$1`, [id])).rowCount).toBe(1);
  }, 60000);
  it("rejects cross-order quote and fulfillment identities", async () => {
    await reject({ quote_attempt_id: "other-quote" }, "23503");
    await reject(
      {
        ...purchased,
        fulfillment_id: "other-fulfillment",
        selection_assessment: "matches",
        input_assessment: "matches",
        price_assessment: "matches",
        operational_resolved_at: new Date(Date.now() + 1000),
      },
      "23503",
    );
  });
  it("permits preflight purchase without fabricated intent and buy/reconciliation with intent", async () => {
    await insert(purchased);
    for (const source of ["buy", "reconciliation"])
      await insert({
        ...purchased,
        observation_source: source,
        dispatch_intent_at: new Date(Date.now() + 1000),
      });
  });
  it("rejects null source, mode, evidence and mismatched purchase intent", async () => {
    await reject({ ...purchased, observation_source: null });
    await reject({ ...purchased, observed_mode: null });
    await reject({ ...purchased, observed_postage_label_id: null });
    await reject({ ...purchased, observation_source: "buy" });
    await reject({ ...purchased, dispatch_intent_at: new Date(Date.now() + 1000) });
  });
  it("requires dispatch intent for unknown/rejected and forbids it for cancelled/claimed", async () => {
    await reject({ state: "unknown" });
    await reject({ state: "rejected", purchase_completed_at: new Date(Date.now() + 1000) });
    await reject({ dispatch_intent_at: new Date(Date.now() + 1000) });
    await reject({
      state: "cancelled_before_dispatch",
      purchase_completed_at: new Date(Date.now() + 1000),
      dispatch_intent_at: new Date(Date.now() + 1000),
    });
    await insert({
      state: "rejected",
      purchase_completed_at: new Date(Date.now() + 1000),
      dispatch_intent_at: new Date(Date.now() + 1000),
    });
  });
  it("keeps shipment unique across credential generations", async () => {
    await insert({ provider_shipment_id: "shp_unique" });
    await reject(
      { provider_shipment_id: "shp_unique", credential_generation_id: randomUUID() },
      "23505",
    );
  });
  it("distinguishes absent fees from observed empty/exact decimal fees", async () => {
    await insert({ fees_complete: true, fees: JSON.stringify([]) });
    await insert({
      fees_complete: true,
      fees: JSON.stringify([
        { type: "PostageFee", usdDecimal: "0.00001", charged: true, refunded: false },
      ]),
    });
    await reject({ fees_complete: true, fees: null });
    await reject({ fees_complete: false, fees: "[]" });
    await reject({ final_total_known: true });
  });
  it("fences allocation order and consumption state", async () => {
    const id = await insert();
    const allocate = (item: string, state: string, fulfillment: string | null) =>
      pool.query(
        "INSERT INTO ecommerce_shipping_label_allocations(purchase_id,order_id,order_item_id,quantity,state,fulfillment_id) VALUES ($1,'order',$2,1,$3,$4)",
        [id, item, state, fulfillment],
      );
    await expect(allocate("other-item", "held", null)).rejects.toMatchObject({ code: "23503" });
    await expect(allocate("item", "consumed", null)).rejects.toMatchObject({ code: "23514" });
    await expect(allocate("item", "held", "fulfillment")).rejects.toMatchObject({ code: "23514" });
    await allocate("item", "held", null);
  });
  it("requires caller supplied operation deadline, one claimed operation and completion timestamp", async () => {
    const id = await insert();
    const op = (status: string, deadline: Date | null) =>
      pool.query(
        "INSERT INTO ecommerce_shipping_label_operations(purchase_id,order_id,operation_key,kind,request_hash,fencing_token,status,lease_deadline_at) VALUES ($1,'order',$2,'dispatch',$3,$4,$5,$6)",
        [id, randomUUID(), "d".repeat(64), randomUUID(), status, deadline],
      );
    await expect(op("claimed", null)).rejects.toMatchObject({ code: "23502" });
    await expect(op("completed", new Date(Date.now() + 60000))).rejects.toMatchObject({
      code: "23514",
    });
    await op("claimed", new Date(Date.now() + 60000));
    await expect(op("claimed", new Date(Date.now() + 60000))).rejects.toMatchObject({
      code: "23505",
    });
  });
  it("rolls back purchase update and allocation when event insertion fails", async () => {
    const id = await insert();
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      await c.query(
        "INSERT INTO ecommerce_shipping_label_allocations(purchase_id,order_id,order_item_id,quantity) VALUES ($1,'order','item',1)",
        [id],
      );
      await c.query(
        "UPDATE ecommerce_shipping_label_purchases SET state='cancelled_before_dispatch',purchase_completed_at=now() WHERE id=$1",
        [id],
      );
      await expect(
        c.query(
          "INSERT INTO ecommerce_shipping_label_events(purchase_id,order_id,event_key,action) VALUES ($1,'other',$2,'claim')",
          [id, randomUUID()],
        ),
      ).rejects.toMatchObject({ code: "23503" });
      await c.query("ROLLBACK");
    } finally {
      c.release();
    }
    expect(
      (await pool.query("SELECT state FROM ecommerce_shipping_label_purchases WHERE id=$1", [id]))
        .rows[0].state,
    ).toBe("claimed");
    expect((await pool.query("SELECT * FROM ecommerce_shipping_label_allocations")).rowCount).toBe(
      0,
    );
  });
  it("rejects duplicate request keys on the same order", async () => {
    const key = randomUUID();
    await insert({ request_key: key });
    await reject({ request_key: key }, "23505");
  });
  it("retains unresolved snapshots and enforces thirty-day resolved retention", async () => {
    const resolved = new Date("2026-02-01T00:00:00Z");
    const terminal = {
      state: "cancelled_before_dispatch",
      purchase_completed_at: resolved,
      operational_resolved_at: resolved,
      accepted_snapshot: null,
    };
    await reject({ ...terminal, redacted_at: new Date("2026-03-02T23:59:59Z") });
    await insert({ ...terminal, redacted_at: new Date("2026-03-03T00:00:00Z") });
    await reject({
      ...purchased,
      accepted_snapshot: null,
      redacted_at: new Date("2026-04-01T00:00:00Z"),
    });
  });
  it("binds event operation to its exact purchase and order", async () => {
    const first = await insert();
    const second = await insert();
    const op = randomUUID();
    await pool.query(
      "INSERT INTO ecommerce_shipping_label_operations(id,purchase_id,order_id,operation_key,kind,request_hash,fencing_token,lease_deadline_at) VALUES ($1,$2,'order',$3,'reconcile',$4,$5,now()+interval '1 minute')",
      [op, first, randomUUID(), "a".repeat(64), randomUUID()],
    );
    await expect(
      pool.query(
        "INSERT INTO ecommerce_shipping_label_events(purchase_id,order_id,operation_id,event_key,action) VALUES ($1,'order',$2,$3,'reconciliation')",
        [second, op, randomUUID()],
      ),
    ).rejects.toMatchObject({ code: "23503" });
    await pool.query(
      "INSERT INTO ecommerce_shipping_label_events(purchase_id,order_id,operation_id,event_key,action) VALUES ($1,'order',$2,$3,'reconciliation')",
      [first, op, randomUUID()],
    );
  });
  it("actual backup orders new dependencies before their children", async () => {
    await insert();
    vi.stubEnv("CLIENT_STACK_ID", "label-schema-test");
    vi.stubEnv("SYSTEM_BACKUP_EXCLUDED_TABLES", "session,__drizzle_migrations");
    vi.mocked(backupStorage.isBackupStorageConfigured).mockResolvedValue(true);
    vi.mocked(backupStorage.getBackupStorageInfo).mockResolvedValue({
      source: "env",
      bucketName: "synthetic",
      prefix: "synthetic",
    });
    vi.mocked(backupStorage.listBackupObjects).mockResolvedValue([]);
    vi.mocked(backupStorage.uploadBackupObject).mockResolvedValue(true);
    await runSystemBackup();
    const call = vi
      .mocked(backupStorage.uploadBackupObject)
      .mock.calls.find(([key]) => key.startsWith("db/"));
    expect(call).toBeDefined();
    const snapshot = JSON.parse(gunzipSync(call![1]).toString("utf8"));
    const order: string[] = snapshot.manifest.restoreOrder;
    expect(order).toBeDefined();
    for (const [parent, child] of [
      ["ecommerce_shipping_quote_attempts", table],
      [table, "ecommerce_shipping_label_operations"],
      ["ecommerce_shipping_label_operations", "ecommerce_shipping_label_events"],
      ["ecommerce_order_items", "ecommerce_shipping_label_allocations"],
    ]) {
      expect(order.indexOf(parent)).toBeGreaterThanOrEqual(0);
      expect(order.indexOf(child)).toBeGreaterThanOrEqual(0);
      expect(order.indexOf(parent)).toBeLessThan(order.indexOf(child));
    }
  });
});

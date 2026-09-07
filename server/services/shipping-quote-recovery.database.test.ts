import { gunzipSync } from "node:zlib";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
const url = process.env.SHIPPING_QUOTE_RECOVERY_TEST_DATABASE_URL;
if (url) {
  const parsed = new URL(url);
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.pathname !== "/core_shipping_quote_recovery_test" ||
    parsed.search ||
    parsed.hash
  )
    throw new Error("Owned local quote recovery database required");
}
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({
    connectionString: process.env.SHIPPING_QUOTE_RECOVERY_TEST_DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
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
vi.mock("./backup-storage.service", () => ({
  isBackupStorageConfigured: vi.fn(async () => true),
  getBackupStorageInfo: vi.fn(async () => ({
    source: "env",
    bucketName: "synthetic",
    prefix: "synthetic",
  })),
  listBackupObjects: vi.fn(async () => []),
  uploadBackupObject: vi.fn(async (key: string) => ({ key })),
  downloadBackupObject: vi.fn(),
  deleteBackupObject: vi.fn(),
}));
import { db, pool } from "../db";
import { runMigrations } from "../migrate";
import * as transport from "./backup-storage.service";
import { runSystemBackup, restoreBackupSnapshot } from "./system-backup.service";
import { EcommerceShippingQuotesStorage } from "../storage/ecommerce-shipping-quotes.storage";
const quotes = new EcommerceShippingQuotesStorage();
const now = new Date("2026-09-07T00:00:00Z");
const request = {
  version: "1.0.0",
  locationId: "location",
  items: [{ orderItemId: "item", quantity: 1 }],
  parcel: { weight: 16, weightUnit: "oz" },
};
const address = {
  name: "Synthetic",
  street1: "1 Example St",
  city: "Example",
  state: "MI",
  zip: "49503",
  country: "US",
};
const snapshot = {
  version: "1.0.0",
  orderId: "order",
  locationId: "location",
  currency: "USD",
  items: request.items,
  fromAddress: address,
  toAddress: address,
  parcel: { weight: 16 },
};
const result = (id: string) => ({
  status: "quoted",
  identity: { providerShipmentId: id, observedMode: "test" },
  rates: [
    {
      providerRateId: "rate_" + id.replaceAll("_", ""),
      providerShipmentId: id,
      carrierAccountId: "ca_synthetic",
      carrier: "Example",
      service: "Ground",
      amount: 29,
      currency: "USD",
      mode: "test",
      estimatedDays: null,
      deliveryGuaranteed: null,
    },
  ],
});
const rows = async () =>
  (
    await pool.query(
      "SELECT row_to_json(t) AS value FROM ecommerce_shipping_quote_attempts t ORDER BY id",
    )
  ).rows;
describe.skipIf(!url)("shipping quote recovery through application backup", () => {
  beforeAll(async () => {
    vi.stubEnv("CLIENT_STACK_ID", "quote-recovery-test");
    vi.stubEnv("SYSTEM_BACKUP_EXCLUDED_TABLES", "session,__drizzle_migrations");
    await runMigrations();
    await pool.query(
      "INSERT INTO ecommerce_customers(id,name,email) VALUES ('customer','Synthetic','synthetic@example.test')",
    );
    await pool.query(
      "INSERT INTO ecommerce_orders(id,customer_id,total_amount,payment_status) VALUES ('order','customer',100,'paid')",
    );
  }, 60000);
  afterAll(async () => {
    vi.unstubAllEnvs();
    await pool.end();
  });
  it("restores pending, unknown and quoted attempts with original replay and fencing identities", async () => {
    const attempts = [];
    for (let index = 0; index < 3; index++)
      attempts.push(
        (
          await db.transaction((tx) =>
            quotes.claim(tx, {
              orderId: "order",
              requestKey: randomUUID(),
              request,
              snapshot,
              credentialGenerationId: "generation",
              now,
              deadlineAt: new Date(now.getTime() + 1000),
            }),
          )
        ).attempt,
      );
    await db.transaction((tx) =>
      quotes.complete(
        tx,
        attempts[1].id,
        attempts[1].fencingToken,
        { status: "unknown", errorCode: "interrupted" },
        now,
      ),
    );
    await db.transaction((tx) =>
      quotes.complete(tx, attempts[2].id, attempts[2].fencingToken, result("shp_finished"), now),
    );
    const before = await rows();
    await runSystemBackup();
    const call = vi
      .mocked(transport.uploadBackupObject)
      .mock.calls.find(([key]) => key.startsWith("db/"));
    expect(call).toBeDefined();
    const backup = JSON.parse(gunzipSync(call![1]).toString("utf8"));
    expect(
      backup.tables.find(
        (table: { name: string }) => table.name === "ecommerce_shipping_quote_attempts",
      ).rowCount,
    ).toBe(3);
    await pool.query("DELETE FROM ecommerce_shipping_quote_attempts");
    await restoreBackupSnapshot(backup);
    expect(await rows()).toEqual(before);
    await runMigrations();
    expect(await rows()).toEqual(before);
    const replay = await db.transaction((tx) =>
      quotes.claim(tx, {
        orderId: "order",
        requestKey: attempts[0].requestKey,
        request,
        snapshot: null,
        credentialGenerationId: "changed",
        now,
        deadlineAt: now,
      }),
    );
    expect(replay.replayed).toBe(true);
    expect(replay.attempt.fencingToken).toBe(attempts[0].fencingToken);
    await db.transaction((tx) => quotes.expirePending(tx, new Date(now.getTime() + 1000)));
    expect(
      await db.transaction((tx) =>
        quotes.complete(tx, attempts[0].id, randomUUID(), result("shp_wrong"), now),
      ),
    ).toBeNull();
    expect(
      await db.transaction((tx) =>
        quotes.complete(tx, attempts[0].id, attempts[0].fencingToken, result("shp_late"), now),
      ),
    ).toMatchObject({ status: "quoted" });
    expect(
      await db.transaction((tx) =>
        quotes.complete(tx, attempts[2].id, attempts[2].fencingToken, result("shp_replaced"), now),
      ),
    ).toBeNull();
  }, 60000);
});

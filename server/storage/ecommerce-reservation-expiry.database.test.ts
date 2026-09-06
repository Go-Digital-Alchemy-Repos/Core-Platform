import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Opt-in disposable database only; never use the application's DATABASE_URL.
const testUrl = process.env.RESERVATION_EXPIRY_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.pathname !== "/core_reservation_expiry_test"
  ) {
    throw new Error(
      "RESERVATION_EXPIRY_TEST_DATABASE_URL must target local disposable core_reservation_expiry_test",
    );
  }
}
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({
    connectionString: process.env.RESERVATION_EXPIRY_TEST_DATABASE_URL,
    max: 1,
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
  ecommerceCustomers,
  ecommerceInventoryReservations,
  ecommerceOrders,
  ecommerceProducts,
  ecommerceProductVariants,
} from "@shared/schema";

const storage = new EcommerceStorage();
const expiry = new Date("2026-09-05T12:00:00.123Z");

// Run this suite with TZ=America/New_York and TZ=UTC. Testing both the process
// and PostgreSQL session timezones catches host-local pg Date serialization.
describe.skipIf(!testUrl)("inventory reservation expiry in disposable PostgreSQL", () => {
  beforeAll(async () => {
    await runMigrations();
  }, 60_000);

  beforeEach(async () => {
    await pool.query("TRUNCATE ecommerce_customers, ecommerce_products CASCADE");
    await db
      .insert(ecommerceCustomers)
      .values({ id: "customer", name: "Test", email: "test@example.test" });
    await db
      .insert(ecommerceProducts)
      .values({ id: "product", name: "Test", price: 100, urlSlug: "test" });
    await db.insert(ecommerceProductVariants).values([
      { id: "variant-a", productId: "product", optionSignature: "a" },
      { id: "variant-b", productId: "product", optionSignature: "b" },
    ]);
  });

  afterAll(async () => {
    await pool.end();
  });

  async function reserve(
    id: string,
    options: { status?: string; paymentStatus?: string; releasedAt?: Date; expiresAt?: Date } = {},
  ) {
    await db.insert(ecommerceOrders).values({
      id,
      customerId: "customer",
      totalAmount: 100,
      status: options.status ?? "pending",
      paymentStatus: options.paymentStatus ?? "unpaid",
    });
    // Use the real schema's typed Date encoder, just as checkout reservation
    // writes do, rather than hand-serializing a fixture to match the query.
    await db.insert(ecommerceInventoryReservations).values({
      orderId: id,
      variantId: "variant-a",
      quantity: 1,
      expiresAt: options.expiresAt ?? expiry,
      releasedAt: options.releasedAt,
    });
  }

  describe.each(["UTC", "America/New_York"])("database timezone %s", (timezone) => {
    beforeEach(async () => {
      await pool.query("SELECT set_config('TimeZone', $1, false)", [timezone]);
    });

    it("expires exactly at the UTC instant, not one millisecond before", async () => {
      await reserve("boundary");
      expect(
        await storage.getExpiredEcommerceInventoryReservationOrderIds(
          new Date(expiry.getTime() - 1),
        ),
      ).toEqual([]);
      expect(await storage.getExpiredEcommerceInventoryReservationOrderIds(expiry)).toEqual([
        "boundary",
      ]);
      expect(
        await storage.getExpiredEcommerceInventoryReservationOrderIds(
          new Date(expiry.getTime() + 1),
        ),
      ).toEqual(["boundary"]);
    });

    it("excludes paid, non-pending, released and future reservations; preserves order, distinct and limit", async () => {
      await reserve("b-expired");
      await reserve("a-expired");
      await reserve("paid", { paymentStatus: "paid" });
      await reserve("cancelled", { status: "cancelled" });
      await reserve("released", { releasedAt: expiry });
      await reserve("future", { expiresAt: new Date(expiry.getTime() + 1) });
      await db.insert(ecommerceInventoryReservations).values({
        orderId: "a-expired",
        variantId: "variant-b",
        quantity: 1,
        expiresAt: expiry,
      });
      expect(await storage.getExpiredEcommerceInventoryReservationOrderIds(expiry)).toEqual([
        "a-expired",
        "b-expired",
      ]);
      expect(await storage.getExpiredEcommerceInventoryReservationOrderIds(expiry, 1)).toEqual([
        "a-expired",
      ]);
    });
  });
});

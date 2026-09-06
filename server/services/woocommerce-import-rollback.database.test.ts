import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import envelopeFixture from "../__tests__/fixtures/woocommerce-catalog-envelope.json";
const fixtureUrl = process.env.WOO_ROLLBACK_TEST_DATABASE_URL;
if (fixtureUrl) {
  const url = new URL(fixtureUrl);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/core_woo_rollback_test" ||
    url.search ||
    url.hash
  )
    throw new Error("Owned local Woo rollback fixture required");
}
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({
    connectionString: process.env.WOO_ROLLBACK_TEST_DATABASE_URL,
    max: 3,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
    statement_timeout: 10000,
  });
  return { pool, db: drizzle(pool, { schema }) };
});
import { pool } from "../db";
import { runMigrations } from "../migrate";
import { createDrizzleWooImportRepository } from "./woocommerce-import-drizzle.repository";
import { buildWooCommerceCatalogPlan } from "./woocommerce-import.service";
import { applyWooCommercePlan } from "./woocommerce-import-repository.service";
const repository = createDrizzleWooImportRepository();
async function apply(change?: (input: typeof envelopeFixture) => void) {
  const input = structuredClone(envelopeFixture);
  change?.(input);
  const plan = buildWooCommerceCatalogPlan(input);
  return applyWooCommercePlan(repository, {
    plan,
    run: {
      contractVersion: plan.contractVersion,
      sourceStoreId: plan.sourceStoreId,
      targetStackId: "synthetic-rollback",
      sourceFingerprint: plan.fingerprint,
      highWaterMark: plan.highWaterMark,
      mode: "rehearsal",
      enabledPhases: [1],
      operatorReference: "synthetic-test",
    },
  });
}
async function state(runId: string) {
  return (await pool.query("SELECT status, failure_code FROM woo_import_runs WHERE id=$1", [runId]))
    .rows[0];
}
async function catalog() {
  return (await pool.query("SELECT name FROM ecommerce_products ORDER BY name")).rows;
}
describe.skipIf(!fixtureUrl)("actual WooCommerce rollback ownership", () => {
  afterAll(async () => pool.end());
  beforeEach(async () => {
    await pool.query(
      "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public",
    );
    await runMigrations();
  });
  it("requires restoration for prior-run updates, including repeated rollback attempts", async () => {
    await apply();
    const b = await apply((input) => {
      input.entities.products[0].name = "Updated mug";
    });
    for (let attempt = 0; attempt < 2; attempt++) {
      await expect(repository.rollbackRun(b.runId)).rejects.toMatchObject({
        reasonCode: "rollback_requires_preexisting_target_restore",
      });
      expect(await state(b.runId)).toMatchObject({
        status: "manual_review",
        failure_code: "rollback_requires_preexisting_target_restore",
      });
      expect(await catalog()).toEqual([{ name: "Updated mug" }]);
    }
  });
  it("preserves a mixed run's new records when an earlier target requires restoration", async () => {
    await apply();
    const b = await apply((input) => {
      input.entities.categories[0].name = "Changed category";
      input.entities.products.push({
        ...input.entities.products[0],
        id: 102,
        name: "New mug",
        slug: "new-mug",
        sku: "MUG-102",
      });
    });
    await expect(repository.rollbackRun(b.runId)).rejects.toMatchObject({
      reasonCode: "rollback_requires_preexisting_target_restore",
    });
    expect(await catalog()).toEqual([{ name: "Migration-safe mug" }, { name: "New mug" }]);
    expect((await pool.query("SELECT name FROM ecommerce_categories")).rows).toEqual([
      { name: "Changed category" },
    ]);
    expect(await state(b.runId)).toMatchObject({ status: "manual_review" });
  });
  it("rolls back an unchanged matched run without removing earlier-owned records", async () => {
    const a = await apply();
    const b = await apply();
    expect(b.matched).toBe(2);
    await repository.rollbackRun(b.runId);
    expect(await state(b.runId)).toMatchObject({ status: "rolled_back" });
    expect(await state(a.runId)).toMatchObject({ status: "completed" });
    expect(await catalog()).toEqual([{ name: "Migration-safe mug" }]);
  });
  it("removes created-only catalog dependencies and rejects repeated completed rollback", async () => {
    const a = await apply();
    await pool.query(
      "INSERT INTO ecommerce_products(name,price,url_slug) VALUES ('Unrelated product',100,'unrelated-product')",
    );
    await repository.rollbackRun(a.runId);
    expect(await catalog()).toEqual([{ name: "Unrelated product" }]);
    for (const table of [
      "ecommerce_categories",
      "ecommerce_product_variants",
      "ecommerce_product_categories",
      "ecommerce_product_media",
    ]) {
      expect((await pool.query(`SELECT count(*)::int AS total FROM ${table}`)).rows[0].total).toBe(
        0,
      );
    }
    expect((await pool.query("SELECT lifecycle_state FROM woo_import_mappings")).rows).toEqual([
      { lifecycle_state: "rolled_back" },
      { lifecycle_state: "rolled_back" },
    ]);
    await expect(repository.rollbackRun(a.runId)).rejects.toThrow();
    expect(await state(a.runId)).toMatchObject({ status: "rolled_back" });
  });
});

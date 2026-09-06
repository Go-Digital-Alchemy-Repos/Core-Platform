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
async function assertFailedFirstBatch(originalRunId: string) {
  const result = await pool.query(
    "SELECT id,status,failure_code,latest_checkpoint FROM woo_import_runs WHERE id<>$1",
    [originalRunId],
  );
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0]).toMatchObject({
    status: "manual_review",
    failure_code: "target_edited_since_import",
    latest_checkpoint: {},
  });
  expect(
    (
      await pool.query(
        "SELECT count(*)::int AS total FROM woo_import_audit_entries WHERE run_id=$1",
        [result.rows[0].id],
      )
    ).rows[0].total,
  ).toBe(0);
  expect(
    (
      await pool.query(
        "SELECT count(*)::int AS total FROM woo_import_mappings WHERE latest_run_id=$1",
        [result.rows[0].id],
      )
    ).rows[0].total,
  ).toBe(0);
}
describe.skipIf(!fixtureUrl)("actual WooCommerce merchant interleavings", () => {
  afterAll(async () => pool.end());
  beforeEach(async () => {
    await pool.query(
      "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public",
    );
    await runMigrations();
  });
  for (const concurrent of [false, true]) {
    it(`preserves a merchant child of a created category (concurrent=${concurrent})`, async () => {
      const a = await apply();
      const parentId = (await pool.query("SELECT id FROM ecommerce_categories")).rows[0].id;
      const merchant = await pool.connect();
      let pending: Promise<unknown> | undefined;
      try {
        await merchant.query("BEGIN");
        await merchant.query(
          "INSERT INTO ecommerce_categories(name,slug,parent_id) VALUES ('Merchant child','merchant-child',$1)",
          [parentId],
        );
        if (!concurrent) await merchant.query("COMMIT");
        pending = repository.rollbackRun(a.runId).then(
          () => ({ succeeded: true }),
          (error) => ({ error }),
        );
        if (concurrent) {
          let waiting = false;
          for (let attempt = 0; attempt < 300; attempt++) {
            const result = await pool.query(
              "SELECT count(*)::int AS total FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'",
            );
            if (result.rows[0].total > 0) {
              waiting = true;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
          expect(waiting).toBe(true);
          await merchant.query("COMMIT");
        }
        expect(await pending).toMatchObject({
          error: { reasonCode: "rollback_target_edited_since_import" },
        });
        expect(
          (
            await pool.query(
              "SELECT count(*)::int AS total FROM ecommerce_categories WHERE id=$1 OR parent_id=$1",
              [parentId],
            )
          ).rows[0].total,
        ).toBe(2);
        expect(
          (await pool.query("SELECT count(*)::int AS total FROM ecommerce_products")).rows[0].total,
        ).toBe(1);
      } finally {
        await merchant.query("ROLLBACK");
        merchant.release();
        await pending;
      }
    });
  }
  for (const concurrent of [false, true]) {
    it(`preserves category assignment to unrelated merchant product (concurrent=${concurrent})`, async () => {
      const a = await apply();
      const categoryId = (await pool.query("SELECT id FROM ecommerce_categories")).rows[0].id;
      const productId = (
        await pool.query(
          "INSERT INTO ecommerce_products(name,price,url_slug) VALUES ('Merchant',100,'merchant') RETURNING id",
        )
      ).rows[0].id;
      const merchant = await pool.connect();
      let pending: Promise<unknown> | undefined;
      try {
        await merchant.query("BEGIN");
        await merchant.query(
          "INSERT INTO ecommerce_product_categories(product_id,category_id) VALUES ($1,$2)",
          [productId, categoryId],
        );
        if (!concurrent) await merchant.query("COMMIT");
        pending = repository.rollbackRun(a.runId).then(
          () => ({ succeeded: true }),
          (error) => ({ error }),
        );
        if (concurrent) {
          let waiting = false;
          for (let attempt = 0; attempt < 300; attempt++) {
            const result = await pool.query(
              "SELECT count(*)::int AS total FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'",
            );
            if (result.rows[0].total > 0) {
              waiting = true;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
          expect(waiting).toBe(true);
          await merchant.query("COMMIT");
        }
        expect(await pending).toMatchObject({
          error: { reasonCode: "rollback_target_edited_since_import" },
        });
        expect(
          (
            await pool.query(
              "SELECT count(*)::int AS total FROM ecommerce_product_categories WHERE product_id=$1 AND category_id=$2",
              [productId, categoryId],
            )
          ).rows[0].total,
        ).toBe(1);
        expect(
          (await pool.query("SELECT status FROM woo_import_runs WHERE id=$1", [a.runId])).rows[0]
            .status,
        ).toBe("manual_review");
      } finally {
        await merchant.query("ROLLBACK");
        merchant.release();
        await pending;
      }
    });
  }
  for (const operation of ["apply", "rollback"] as const) {
    for (const kind of ["variant", "media"] as const) {
      it(`${operation} waits for FK-protected merchant ${kind} insertion and preserves it`, async () => {
        const a = await apply();
        const productId = (await pool.query("SELECT id FROM ecommerce_products")).rows[0].id;
        const merchant = await pool.connect();
        let pending: Promise<unknown> | undefined;
        try {
          await merchant.query("BEGIN");
          if (kind === "variant") {
            await merchant.query(
              "INSERT INTO ecommerce_product_variants(product_id,title,option_signature,is_default) VALUES ($1,'Merchant variant','merchant',false)",
              [productId],
            );
          } else {
            await merchant.query(
              "INSERT INTO ecommerce_product_media(product_id,url) VALUES ($1,'https://synthetic.example.test/merchant.webp')",
              [productId],
            );
          }
          pending = (
            operation === "rollback"
              ? repository.rollbackRun(a.runId)
              : apply((input) => {
                  input.entities.products[0].name = "Next import";
                })
          ).then(
            () => ({ succeeded: true }),
            (error) => ({ error }),
          );
          let waiting = false;
          for (let attempt = 0; attempt < 300; attempt++) {
            const result = await pool.query(
              "SELECT count(*)::int AS total FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'",
            );
            if (result.rows[0].total > 0) {
              waiting = true;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
          expect(waiting).toBe(true);
          await merchant.query("COMMIT");
          expect(await pending).toMatchObject({
            error: {
              reasonCode:
                operation === "rollback"
                  ? "rollback_target_edited_since_import"
                  : "target_edited_since_import",
            },
          });
          if (operation === "apply") {
            await assertFailedFirstBatch(a.runId);
            expect((await pool.query("SELECT name FROM ecommerce_products")).rows).toEqual([
              { name: "Migration-safe mug" },
            ]);
          }
          const table =
            kind === "variant" ? "ecommerce_product_variants" : "ecommerce_product_media";
          expect(
            (await pool.query(`SELECT count(*)::int AS total FROM ${table}`)).rows[0].total,
          ).toBe(2);
          expect(
            (await pool.query("SELECT count(*)::int AS total FROM ecommerce_products")).rows[0]
              .total,
          ).toBe(1);
        } finally {
          await merchant.query("ROLLBACK");
          merchant.release();
          await pending;
        }
      });
    }
  }
  for (const operation of ["apply", "rollback"] as const) {
    for (const table of [
      "ecommerce_products",
      "ecommerce_categories",
      "ecommerce_product_variants",
      "ecommerce_product_media",
    ]) {
      it(`${operation} preserves a merchant edit committed during target checking: ${table}`, async () => {
        const a = await apply();
        const merchant = await pool.connect();
        const column =
          table === "ecommerce_product_variants"
            ? "inventory_quantity"
            : table === "ecommerce_product_media"
              ? "alt_text"
              : "name";
        const value = column === "inventory_quantity" ? 99 : "Merchant edit";
        let pending: Promise<unknown> | undefined;
        try {
          await merchant.query("BEGIN");
          await merchant.query(`UPDATE ${table} SET ${column}=$1`, [value]);
          pending = (
            operation === "rollback"
              ? repository.rollbackRun(a.runId)
              : apply((input) => {
                  input.entities.products[0].name = "Next import";
                  input.entities.categories[0].name = "Next category";
                })
          ).then(
            () => ({ succeeded: true }),
            (error) => ({ error }),
          );
          // Observe a real database lock wait rather than relying on a timed sleep.
          let waiting = false;
          for (let attempt = 0; attempt < 300; attempt++) {
            const result = await pool.query(
              "SELECT count(*)::int AS total FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'",
            );
            if (result.rows[0].total > 0) {
              waiting = true;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
          expect(waiting).toBe(true);
          await merchant.query("COMMIT");
          expect(await pending).toMatchObject({
            error: {
              reasonCode:
                operation === "rollback"
                  ? "rollback_target_edited_since_import"
                  : "target_edited_since_import",
            },
          });
          if (operation === "apply") {
            await assertFailedFirstBatch(a.runId);
            expect((await pool.query("SELECT name FROM ecommerce_products")).rows).toEqual([
              { name: table === "ecommerce_products" ? "Merchant edit" : "Migration-safe mug" },
            ]);
            expect((await pool.query("SELECT name FROM ecommerce_categories")).rows).toEqual([
              { name: table === "ecommerce_categories" ? "Merchant edit" : "Drinkware" },
            ]);
          }
          expect((await pool.query(`SELECT ${column} AS value FROM ${table}`)).rows).toEqual([
            { value },
          ]);
        } finally {
          await merchant.query("ROLLBACK");
          merchant.release();
          await pending;
        }
      });
    }
  }
});

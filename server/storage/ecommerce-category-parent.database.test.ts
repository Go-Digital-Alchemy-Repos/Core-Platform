import { readFile } from "node:fs/promises";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import envelopeFixture from "../__tests__/fixtures/woocommerce-catalog-envelope.json";
const fixtureUrl = process.env.CATEGORY_PARENT_TEST_DATABASE_URL;
if (fixtureUrl) {
  const url = new URL(fixtureUrl);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/core_category_parent_test" ||
    url.search ||
    url.hash
  )
    throw new Error("Owned local category parent fixture required");
}
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({
    connectionString: process.env.CATEGORY_PARENT_TEST_DATABASE_URL,
    max: 6,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
    statement_timeout: 10000,
  });
  return { pool, db: drizzle(pool, { schema }) };
});
import { EcommerceStorage } from "./ecommerce.storage";
import { pool } from "../db";
import { runMigrations } from "../migrate";
import { createDrizzleWooImportRepository } from "../services/woocommerce-import-drizzle.repository";
import { buildWooCommerceCatalogPlan } from "../services/woocommerce-import.service";
import { applyWooCommercePlan } from "../services/woocommerce-import-repository.service";
const repository = createDrizzleWooImportRepository();
async function apply(
  change?: (input: typeof envelopeFixture) => void,
  batchSize?: number,
  resumeRunId?: string,
) {
  const input = structuredClone(envelopeFixture);
  change?.(input);
  const plan = buildWooCommerceCatalogPlan(input);
  return applyWooCommercePlan(repository, {
    plan,
    batchSize,
    resumeRunId,
    run: {
      contractVersion: "1.1.0",
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

const storage = new EcommerceStorage();
const category = (name: string, parentId?: string | null) =>
  storage.createCategory({ name, slug: name.toLowerCase(), parentId });
async function waitForLocks(total: number) {
  for (let i = 0; i < 300; i++) {
    const r = await pool.query(
      "SELECT count(*)::int AS total FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'",
    );
    if (r.rows[0].total >= total) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Expected database interleaving did not occur");
}
describe.skipIf(!fixtureUrl)("category parent integrity in PostgreSQL", () => {
  afterAll(async () => pool.end());
  beforeEach(async () => {
    await pool.query(
      "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public",
    );
    await runMigrations();
  });
  it("rejects missing/self/descendant parents without writing", async () => {
    await expect(category("Missing", "missing")).rejects.toMatchObject({
      statusCode: 400,
      message: "Parent category not found",
    });
    const a = await category("A"),
      b = await category("B", a.id);
    await expect(storage.updateCategory(a.id, { parentId: a.id })).rejects.toMatchObject({
      statusCode: 400,
      message: "A category cannot be its own parent",
    });
    await expect(storage.updateCategory(a.id, { parentId: b.id })).rejects.toMatchObject({
      statusCode: 400,
      message: "A category cannot be moved under one of its subcategories",
    });
    expect((await storage.getCategory(a.id))?.parentId).toBeNull();
  });
  it("bounds corrupt ancestry and permits explicit root repair", async () => {
    const a = await category("A"),
      b = await category("B", a.id);
    await pool.query("UPDATE ecommerce_categories SET parent_id=$1 WHERE id=$2", [b.id, a.id]);
    await category("Unrelated");
    await expect(category("Cycle", a.id)).rejects.toMatchObject({
      statusCode: 400,
      message: "Parent category hierarchy is invalid",
    });
    await storage.updateCategory(a.id, { parentId: null });
    await category("Repaired", b.id);
    await pool.query("UPDATE ecommerce_categories SET parent_id='missing' WHERE id=$1", [a.id]);
    await expect(category("Dangling", b.id)).rejects.toMatchObject({
      statusCode: 400,
      message: "Parent category hierarchy is invalid",
    });
    await storage.updateCategory(a.id, { parentId: null });
  });
  it("preserves undefined/null/empty-root, inactive parent, missing update and soft delete", async () => {
    const a = await category("A"),
      b = await category("B", a.id);
    await storage.updateCategory(b.id, { name: "B renamed", parentId: undefined });
    expect((await storage.getCategory(b.id))?.parentId).toBe(a.id);
    await storage.updateCategory(b.id, { parentId: "" });
    expect((await storage.getCategory(b.id))?.parentId).toBeNull();
    await storage.updateCategory(b.id, { parentId: a.id });
    await storage.deleteCategory(a.id);
    expect((await storage.getCategory(a.id))?.active).toBe(false);
    expect((await storage.getCategory(b.id))?.parentId).toBeNull();
    await storage.updateCategory(b.id, { parentId: a.id });
    expect(await storage.updateCategory("missing", { parentId: "missing" })).toBeUndefined();
  });
  it("serializes opposite parent updates so only one succeeds", async () => {
    const a = await category("A"),
      b = await category("B");
    const blocker = await pool.connect();
    let pending: Promise<PromiseSettledResult<unknown>[]> | undefined;
    try {
      await blocker.query("BEGIN; LOCK TABLE ecommerce_categories IN SHARE ROW EXCLUSIVE MODE");
      pending = Promise.allSettled([
        storage.updateCategory(a.id, { parentId: b.id }),
        storage.updateCategory(b.id, { parentId: a.id }),
      ]);
      await waitForLocks(2);
      await blocker.query("COMMIT");
      const results = await pending;
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.find((r) => r.status === "rejected")).toMatchObject({
        reason: { statusCode: 400 },
      });
    } finally {
      await blocker.query("ROLLBACK");
      blocker.release();
      await pending;
    }
  });
  it("schedules child-first input parent-first across batches and resumes the persisted schedule", async () => {
    const reversed = (input: typeof envelopeFixture) => {
      input.entities.products = [];
      input.entities.categories[0].name = "Child";
      input.entities.categories[0].parent = 10;
      input.entities.categories.push({
        ...input.entities.categories[0],
        id: 10,
        name: "Parent",
        slug: "parent",
        parent: 0,
      });
    };
    const original = repository.applyBatch.bind(repository);
    let interrupted = false;
    const hook = vi.spyOn(repository, "applyBatch").mockImplementation(async (request) => {
      const persisted = (
        await pool.query(
          "SELECT contract_version,latest_checkpoint FROM woo_import_runs WHERE id=$1",
          [request.runId],
        )
      ).rows[0];
      expect(persisted.contract_version).toBe("1.1.0");
      expect(persisted.latest_checkpoint).toMatchObject({
        categoryOrdering: "parent-first-v1",
        batchSize: 1,
      });
      expect(request.operations[0].externalId).toBe("10");
      const result = await original(request);
      if (!interrupted) {
        interrupted = true;
        throw new Error("Synthetic interruption after committed parent batch");
      }
      return result;
    });
    try {
      await expect(apply(reversed, 1)).rejects.toThrow("Synthetic interruption");
    } finally {
      hook.mockRestore();
    }
    const failed = (await pool.query("SELECT id,status FROM woo_import_runs")).rows[0];
    expect(failed.status).toBe("failed");
    await expect(apply(reversed, 2, failed.id)).rejects.toThrow("batch size mismatch");
    expect(
      (await pool.query("SELECT status FROM woo_import_runs WHERE id=$1", [failed.id])).rows[0]
        .status,
    ).toBe("failed");
    const completed = await apply(reversed, undefined, failed.id);
    expect(completed.runId).toBe(failed.id);
    const categories = await storage.getCategories();
    expect(categories.find((c) => c.name === "Child")?.parentId).toBe(
      categories.find((c) => c.name === "Parent")?.id,
    );
    expect(
      (await pool.query("SELECT count(*)::int AS total FROM woo_import_audit_entries")).rows[0]
        .total,
    ).toBe(2);
  });
  it("imports child-before-parent input in one atomic batch without changing its source fingerprint", async () => {
    const change = (input: typeof envelopeFixture) => {
      input.entities.products = [];
      input.entities.categories[0].parent = 10;
      input.entities.categories.push({
        ...input.entities.categories[0],
        id: 10,
        name: "Parent",
        slug: "parent",
        parent: 0,
      });
    };
    const input = structuredClone(envelopeFixture);
    change(input);
    const fingerprint = buildWooCommerceCatalogPlan(input).fingerprint;
    const result = await apply(change, 100);
    expect(
      (
        await pool.query(
          "SELECT source_fingerprint,contract_version FROM woo_import_runs WHERE id=$1",
          [result.runId],
        )
      ).rows[0],
    ).toEqual({ source_fingerprint: fingerprint, contract_version: "1.1.0" });
    expect((await storage.getCategories()).filter((c) => c.parentId !== null)).toHaveLength(1);
  });
  it("resumes a populated legacy checkpoint without rewriting prior batch or audit identities", async () => {
    const input = structuredClone(envelopeFixture);
    input.entities.products = [];
    input.entities.categories.push({
      ...input.entities.categories[0],
      id: 10,
      name: "Second",
      slug: "second",
      parent: 9,
    });
    const plan = buildWooCommerceCatalogPlan(input);
    const id = (
      await pool.query(
        "INSERT INTO woo_import_runs(contract_version,source_store_id,target_stack_id,source_fingerprint,high_water_mark,mode,status,enabled_phases,operator_reference) VALUES ('1.0.0',$1,'synthetic-rollback',$2,$3,'rehearsal','planned',ARRAY[1],'synthetic-test') RETURNING id",
        [plan.sourceStoreId, plan.fingerprint, plan.highWaterMark],
      )
    ).rows[0].id;
    await repository.applyBatch({
      runId: id,
      sourceStoreId: plan.sourceStoreId,
      batchKey: "phase-1-1",
      operations: [plan.operations[0]],
      nextCheckpoint: { phase: 1, batchKey: "phase-1-1", appliedOperationCount: 1 },
    });
    const priorAudit = (
      await pool.query("SELECT * FROM woo_import_audit_entries WHERE run_id=$1", [id])
    ).rows;
    await pool.query("UPDATE woo_import_runs SET status='failed' WHERE id=$1", [id]);
    await apply(
      (current) => {
        current.entities = input.entities;
      },
      1,
      id,
    );
    const audits = (
      await pool.query(
        "SELECT * FROM woo_import_audit_entries WHERE run_id=$1 ORDER BY batch_key",
        [id],
      )
    ).rows;
    expect(audits).toHaveLength(2);
    expect(audits[0]).toEqual(priorAudit[0]);
    expect(audits.map((row) => row.batch_key)).toEqual(["phase-1-1", "phase-1-2"]);
    expect(
      (
        await pool.query(
          "SELECT contract_version,latest_checkpoint FROM woo_import_runs WHERE id=$1",
          [id],
        )
      ).rows[0],
    ).toEqual({
      contract_version: "1.0.0",
      latest_checkpoint: { phase: 1, batchKey: "phase-1-2", appliedOperationCount: 2 },
    });
  });
  it("retains an empty legacy run's ordering and rejects an unavailable future parent without upgrading", async () => {
    const input = structuredClone(envelopeFixture);
    input.entities.products = [];
    input.entities.categories[0].parent = 10;
    input.entities.categories.push({
      ...input.entities.categories[0],
      id: 10,
      name: "Parent",
      slug: "parent",
      parent: 0,
    });
    const plan = buildWooCommerceCatalogPlan(input);
    const id = (
      await pool.query(
        "INSERT INTO woo_import_runs(contract_version,source_store_id,target_stack_id,source_fingerprint,high_water_mark,mode,status,enabled_phases,operator_reference) VALUES ('1.0.0',$1,'synthetic-rollback',$2,$3,'rehearsal','failed',ARRAY[1],'synthetic-test') RETURNING id",
        [plan.sourceStoreId, plan.fingerprint, plan.highWaterMark],
      )
    ).rows[0].id;
    await expect(
      apply(
        (current) => {
          current.entities = input.entities;
        },
        1,
        id,
      ),
    ).rejects.toMatchObject({ reasonCode: "category_parent_precondition_failed" });
    expect(
      (
        await pool.query(
          "SELECT contract_version,status,latest_checkpoint FROM woo_import_runs WHERE id=$1",
          [id],
        )
      ).rows[0],
    ).toEqual({ contract_version: "1.0.0", status: "manual_review", latest_checkpoint: {} });
    expect(
      (await pool.query("SELECT count(*)::int AS total FROM woo_import_audit_entries")).rows[0]
        .total,
    ).toBe(0);
  });
  it("preserves legacy rows through migration replay and atomically rolls back constraint replacement", async () => {
    const inserted = await pool.query(
      "INSERT INTO woo_import_runs(contract_version,source_store_id,target_stack_id,source_fingerprint,high_water_mark,mode,status,enabled_phases,operator_reference,latest_checkpoint) VALUES ('1.0.0','legacy','legacy',$1,'legacy','rehearsal','failed',ARRAY[1],'synthetic',$2) RETURNING *",
      ["a".repeat(64), { phase: "category", batchKey: "legacy:0", appliedOperationCount: 1 }],
    );
    const legacy = inserted.rows[0];
    await pool.query(
      "ALTER TABLE woo_import_runs DROP CONSTRAINT woo_import_runs_contract_version_check, ADD CONSTRAINT woo_import_runs_contract_version_check CHECK(contract_version='1.0.0')",
    );
    const migration = await readFile("migrations/0064_woo_import_execution_version.sql", "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(migration);
      await client.query("UPDATE woo_import_runs SET contract_version='1.1.0' WHERE id=$1", [
        legacy.id,
      ]);
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
    await expect(
      pool.query("UPDATE woo_import_runs SET contract_version='1.1.0' WHERE id=$1", [legacy.id]),
    ).rejects.toMatchObject({ code: "23514" });
    await runMigrations();
    await runMigrations();
    expect(
      (await pool.query("SELECT * FROM woo_import_runs WHERE id=$1", [legacy.id])).rows[0],
    ).toEqual(legacy);
    await expect(
      pool.query("UPDATE woo_import_runs SET contract_version='9.0.0' WHERE id=$1", [legacy.id]),
    ).rejects.toMatchObject({ code: "23514" });
    await pool.query("UPDATE woo_import_runs SET contract_version='1.1.0' WHERE id=$1", [
      legacy.id,
    ]);
    await runMigrations();
    expect(
      (await pool.query("SELECT contract_version FROM woo_import_runs WHERE id=$1", [legacy.id]))
        .rows[0].contract_version,
    ).toBe("1.1.0");
  });
  it("accepts a valid atomic reversal of existing parent relationships", async () => {
    const change = (input: typeof envelopeFixture) => {
      input.entities.products = [];
      input.entities.categories[0].name = "A";
      input.entities.categories.push({
        ...input.entities.categories[0],
        id: 10,
        name: "B",
        slug: "b",
        parent: 9,
      });
    };
    await apply(change);
    await apply((input) => {
      change(input);
      input.entities.categories[0].parent = 10;
      input.entities.categories[1].parent = 0;
    });
    const rows = await storage.getCategories();
    expect(rows.find((row) => row.name === "A")?.parentId).toBe(
      rows.find((row) => row.name === "B")?.id,
    );
    expect(rows.find((row) => row.name === "B")?.parentId).toBeNull();
  });
  it("rejects stale live ancestry changed by a merchant between category batches", async () => {
    const roots = (input: typeof envelopeFixture) => {
      input.entities.products = [];
      input.entities.categories[0].name = "A";
      input.entities.categories[0].slug = "a";
      input.entities.categories.push({
        ...input.entities.categories[0],
        id: 10,
        name: "B",
        slug: "b",
      });
    };
    await apply(roots, 1);
    const categories = await storage.getCategories();
    const a = categories.find((c) => c.name === "A")!,
      b = categories.find((c) => c.name === "B")!;
    const original = repository.applyBatch.bind(repository);
    let changed = false;
    const intercepted = vi.spyOn(repository, "applyBatch").mockImplementation(async (request) => {
      const result = await original(request);
      if (!changed) {
        changed = true;
        await storage.updateCategory(a.id, { parentId: b.id });
      }
      return result;
    });
    try {
      await expect(
        apply((input) => {
          roots(input);
          input.entities.categories[1].parent = 9;
        }, 1),
      ).rejects.toMatchObject({ reasonCode: "category_parent_precondition_failed" });
      expect((await storage.getCategory(a.id))?.parentId).toBe(b.id);
      expect((await storage.getCategory(b.id))?.parentId).toBeNull();
    } finally {
      intercepted.mockRestore();
    }
  });
  for (const first of ["update", "delete"] as const) {
    it(`serializes parent update and soft deletion with ${first} first`, async () => {
      const a = await category("A"),
        b = await category("B");
      const blocker = await pool.connect();
      let update: Promise<unknown> | undefined, remove: Promise<unknown> | undefined;
      try {
        await blocker.query("BEGIN; LOCK TABLE ecommerce_categories IN SHARE ROW EXCLUSIVE MODE");
        if (first === "update") update = storage.updateCategory(b.id, { parentId: a.id });
        else remove = storage.deleteCategory(a.id);
        await waitForLocks(1);
        if (first === "update") remove = storage.deleteCategory(a.id);
        else update = storage.updateCategory(b.id, { parentId: a.id });
        await waitForLocks(2);
        await blocker.query("COMMIT");
        await Promise.all([update, remove]);
        expect((await storage.getCategory(a.id))?.active).toBe(false);
        expect((await storage.getCategory(b.id))?.parentId).toBe(first === "update" ? null : a.id);
      } finally {
        await blocker.query("ROLLBACK");
        blocker.release();
        await Promise.allSettled([update, remove]);
      }
    });
  }
  for (const operation of ["create", "update"] as const)
    for (const first of ["merchant", "rollback"] as const) {
      it(`${operation} versus Woo rollback serializes with ${first} first`, async () => {
        const run = await apply((input) => {
          input.entities.products = [];
        });
        const parent = (await storage.getCategories())[0];
        const existing = operation === "update" ? await category("Existing") : null;
        const blocker = await pool.connect();
        let merchant: Promise<PromiseSettledResult<unknown>> | undefined,
          rollback: Promise<PromiseSettledResult<unknown>> | undefined;
        const settle = (p: Promise<unknown>) =>
          p.then(
            (value) => ({ status: "fulfilled" as const, value }),
            (reason) => ({ status: "rejected" as const, reason }),
          );
        const write = () =>
          settle(
            existing
              ? storage.updateCategory(existing.id, { parentId: parent.id })
              : category("Merchant", parent.id),
          );
        try {
          await blocker.query("BEGIN; LOCK TABLE ecommerce_categories IN SHARE ROW EXCLUSIVE MODE");
          if (first === "merchant") merchant = write();
          else rollback = settle(repository.rollbackRun(run.runId));
          await waitForLocks(1);
          if (first === "merchant") rollback = settle(repository.rollbackRun(run.runId));
          else merchant = write();
          await waitForLocks(2);
          await blocker.query("COMMIT");
          if (first === "merchant") {
            expect(await merchant).toMatchObject({ status: "fulfilled" });
            expect(await rollback).toMatchObject({
              status: "rejected",
              reason: { reasonCode: "rollback_target_edited_since_import" },
            });
            expect(await storage.getCategory(parent.id)).toBeDefined();
          } else {
            expect(await rollback).toMatchObject({ status: "fulfilled" });
            expect(await merchant).toMatchObject({
              status: "rejected",
              reason: { statusCode: 400, message: "Parent category not found" },
            });
            expect(await storage.getCategory(parent.id)).toBeUndefined();
          }
        } finally {
          await blocker.query("ROLLBACK");
          blocker.release();
          await merchant;
          await rollback;
        }
      });
    }
});

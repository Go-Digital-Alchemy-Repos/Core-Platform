import { describe, expect, it } from "vitest";
import type { WooImportRun } from "@shared/schema/woocommerce-import";
import type { BeginWooImportRun } from "./woocommerce-import-lifecycle.service";
import { buildWooCommerceCatalogPlan } from "./woocommerce-import.service";
import {
  applyWooCommercePlan,
  type WooImportBatchRequest,
  type WooImportBatchResult,
  type WooImportQuarantineRequest,
  type WooImportRepositoryV1,
  type WooImportRunEvidence,
} from "./woocommerce-import-repository.service";

function readyPlan() {
  return buildWooCommerceCatalogPlan({
    contract: "core.woocommerce-import",
    contractVersion: "1.0.0",
    source: {
      system: "woocommerce",
      storeId: "synthetic-store",
      baseUrl: "https://store.example.test",
      woocommerceVersion: "9.0.0",
      wordpressTimezone: "America/New_York",
      currency: "USD",
      currencyMinorUnits: 2,
      exportedAt: "2026-09-03T12:00:00Z",
      highWaterMark: "2026-09-03T12:00:00Z:101",
    },
    entities: {
      categories: [{ id: 9, name: "Drinkware", slug: "drinkware", parent: 0 }],
      products: [
        {
          id: 101,
          name: "Mug",
          slug: "mug",
          type: "simple",
          status: "publish",
          price: "12.50",
          regular_price: "12.50",
          tax_status: "taxable",
          backorders: "no",
          categories: [{ id: 9 }],
          date_created: "2026-08-01T12:00:00Z",
        },
      ],
      customers: [],
      orders: [],
    },
  });
}

class RecordingRepository implements WooImportRepositoryV1 {
  readonly batches: WooImportBatchRequest[] = [];
  completed = false;
  failed = false;
  manualReview = false;
  began = false;
  resumedRunId: string | undefined;

  async beginRun(_request: BeginWooImportRun) {
    this.began = true;
    return { id: "run-1" } as WooImportRun;
  }

  async resumeRun(runId: string, _request: BeginWooImportRun) {
    this.resumedRunId = runId;
    return {
      id: runId,
      contractVersion: "1.0.0",
      latestCheckpoint: { phase: 1, batchKey: "phase-1-1", appliedOperationCount: 1 },
    } as WooImportRun;
  }

  async inspect() {
    return { mappings: [], categories: [], products: [] };
  }

  async applyBatch(request: WooImportBatchRequest): Promise<WooImportBatchResult> {
    this.batches.push(request);
    return {
      applied: request.operations.length,
      matched: 0,
      checkpoint: request.nextCheckpoint,
    };
  }

  async completeRun() {
    this.completed = true;
  }

  async failRun() {
    this.failed = true;
  }

  async markRunManualReview() {
    this.manualReview = true;
  }

  async quarantine(_records: WooImportQuarantineRequest[]) {}

  async rollbackRun() {}

  async inspectRun(runId: string): Promise<WooImportRunEvidence | undefined> {
    return {
      run: {
        id: runId,
        contractVersion: "1.0.0",
        latestCheckpoint: { phase: 1, batchKey: "phase-1-1", appliedOperationCount: 1 },
      } as WooImportRun,
      auditCount: 1,
      appliedCount: 1,
      matchedCount: 0,
      unresolvedQuarantineCount: 0,
    };
  }
}

function runFor(plan: ReturnType<typeof readyPlan>): BeginWooImportRun {
  return {
    contractVersion: "1.1.0",
    sourceStoreId: plan.sourceStoreId,
    targetStackId: "isolated-rehearsal",
    sourceFingerprint: plan.fingerprint,
    highWaterMark: plan.highWaterMark,
    mode: "rehearsal",
    enabledPhases: [1],
    operatorReference: "synthetic-test",
  };
}

describe("WooCommerce durable apply coordinator", () => {
  it("rejects a new legacy execution request before creating a run", async () => {
    const plan = readyPlan();
    const repository = new RecordingRepository();
    await expect(
      applyWooCommercePlan(repository, {
        plan,
        run: { ...runFor(plan), contractVersion: "1.0.0" },
      }),
    ).rejects.toThrow("New WooCommerce runs require");
    expect(repository.batches).toHaveLength(0);
  });
  it("freezes parent-first-v1 depth-first input ties without changing operation contents", async () => {
    const plan = readyPlan();
    const prototype = plan.operations.find((operation) => operation.entityType === "category")!;
    const make = (id: string, parentId: string | null) => ({
      ...structuredClone(prototype),
      targetId: id,
      externalId: id,
      targetRecord: { ...prototype.targetRecord, id, parentId },
    });
    plan.operations = [
      make("child-a", "parent"),
      make("unrelated", null),
      make("child-b", "parent"),
      make("parent", null),
    ];
    const original = structuredClone(plan.operations);
    const repository = new RecordingRepository();
    await applyWooCommercePlan(repository, { plan, run: runFor(plan), batchSize: 1 });
    expect(repository.batches.map((batch) => batch.operations[0].targetId)).toEqual([
      "parent",
      "child-a",
      "unrelated",
      "child-b",
    ]);
    expect(plan.operations).toEqual(original);
  });
  it("applies catalog batches in dependency order and completes balanced reconciliation", async () => {
    const plan = readyPlan();
    const repository = new RecordingRepository();

    const result = await applyWooCommercePlan(repository, {
      plan,
      run: runFor(plan),
      batchSize: 1,
    });

    expect(repository.batches).toHaveLength(2);
    expect(repository.batches.map((batch) => batch.operations[0].entityType)).toEqual([
      "category",
      "product",
    ]);
    expect(repository.batches.map((batch) => batch.nextCheckpoint.appliedOperationCount)).toEqual([
      1, 2,
    ]);
    expect(result).toMatchObject({ applied: 2, matched: 0 });
    expect(repository.completed).toBe(true);
    expect(repository.failed).toBe(false);
  });

  it("does not create a run when target inspection detects an unowned identity", async () => {
    const plan = readyPlan();
    const repository = new RecordingRepository();
    repository.inspect = async () => ({
      mappings: [],
      categories: [
        {
          id: plan.categories[0].targetId,
          slug: plan.categories[0].slug,
          targetHash: "a".repeat(64),
        },
      ],
      products: [],
    });
    let began = false;
    repository.beginRun = async () => {
      began = true;
      return { id: "run-1" } as WooImportRun;
    };

    await expect(applyWooCommercePlan(repository, { plan, run: runFor(plan) })).rejects.toThrow(
      /target inspection blocked/,
    );
    expect(began).toBe(false);
  });

  it("fails the run when a persisted batch operation fails", async () => {
    const plan = readyPlan();
    const repository = new RecordingRepository();
    repository.applyBatch = async () => {
      throw new Error("database_unavailable");
    };

    await expect(applyWooCommercePlan(repository, { plan, run: runFor(plan) })).rejects.toThrow(
      /database_unavailable/,
    );
    expect(repository.failed).toBe(true);
    expect(repository.completed).toBe(false);
  });

  it("resumes only the batches after a durable checkpoint on the original run", async () => {
    const plan = readyPlan();
    const repository = new RecordingRepository();

    const result = await applyWooCommercePlan(repository, {
      plan,
      run: runFor(plan),
      batchSize: 1,
      resumeRunId: "run-failed-1",
    });

    expect(repository.began).toBe(false);
    expect(repository.resumedRunId).toBe("run-failed-1");
    expect(repository.batches).toHaveLength(1);
    expect(repository.batches[0]).toMatchObject({
      runId: "run-failed-1",
      batchKey: "phase-1-2",
      nextCheckpoint: { appliedOperationCount: 2 },
    });
    expect(result).toMatchObject({ applied: 2, matched: 0 });
  });

  it("moves a resume with inconsistent checkpoint evidence to manual review", async () => {
    const plan = readyPlan();
    const repository = new RecordingRepository();
    repository.inspectRun = async (runId) => ({
      run: {
        id: runId,
        contractVersion: "1.0.0",
        latestCheckpoint: { phase: 1, batchKey: "phase-1-1", appliedOperationCount: 1 },
      } as WooImportRun,
      auditCount: 0,
      appliedCount: 0,
      matchedCount: 0,
      unresolvedQuarantineCount: 0,
    });

    await expect(
      applyWooCommercePlan(repository, {
        plan,
        run: runFor(plan),
        batchSize: 1,
        resumeRunId: "run-failed-1",
      }),
    ).rejects.toMatchObject({ reasonCode: "resume_checkpoint_audit_mismatch" });
    expect(repository.batches).toHaveLength(0);
    expect(repository.manualReview).toBe(true);
  });

  it("moves a resume with a target conflict to manual review", async () => {
    const plan = readyPlan();
    const repository = new RecordingRepository();
    repository.inspect = async () => ({
      mappings: [],
      categories: [
        {
          id: plan.categories[0].targetId,
          slug: plan.categories[0].slug,
          targetHash: "a".repeat(64),
        },
      ],
      products: [],
    });

    await expect(
      applyWooCommercePlan(repository, {
        plan,
        run: runFor(plan),
        batchSize: 1,
        resumeRunId: "run-failed-1",
      }),
    ).rejects.toMatchObject({ reasonCode: "resume_target_inspection_conflict" });
    expect(repository.batches).toHaveLength(0);
    expect(repository.manualReview).toBe(true);
  });
});

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

  async beginRun(_request: BeginWooImportRun) {
    return { id: "run-1" } as WooImportRun;
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

  async markRunManualReview() {}

  async quarantine(_records: WooImportQuarantineRequest[]) {}

  async rollbackRun() {}

  async inspectRun(): Promise<WooImportRunEvidence | undefined> {
    return undefined;
  }
}

function runFor(plan: ReturnType<typeof readyPlan>): BeginWooImportRun {
  return {
    contractVersion: plan.contractVersion,
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
});

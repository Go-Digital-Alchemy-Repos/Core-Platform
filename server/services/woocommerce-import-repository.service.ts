import type { WooImportRun } from "@shared/schema/woocommerce-import";
import {
  assertWooImportCanComplete,
  type BeginWooImportRun,
  type WooImportReconciliationSummary,
} from "./woocommerce-import-lifecycle.service";
import {
  assertWooCommercePlanCanApply,
  inspectWooCommerceTarget,
  type WooImportOperation,
  type WooImportPlan,
  type WooImportTargetSnapshot,
} from "./woocommerce-import.service";

export interface WooImportCheckpoint {
  phase: 1;
  batchKey: string;
  appliedOperationCount: number;
}

export interface WooImportBatchRequest {
  runId: string;
  batchKey: string;
  sourceStoreId: string;
  operations: WooImportOperation[];
  nextCheckpoint: WooImportCheckpoint;
}

export interface WooImportBatchResult {
  applied: number;
  matched: number;
  checkpoint: WooImportCheckpoint;
}

export interface WooImportQuarantineRequest {
  runId: string;
  entityType: string;
  sourceRef: string;
  reasonCode: string;
  fieldNames: string[];
  sourceHash: string;
  retryDisposition?: "unresolved" | "retry" | "excluded-approved" | "resolved";
}

export interface WooImportRunEvidence {
  run: WooImportRun;
  auditCount: number;
  unresolvedQuarantineCount: number;
}

export class WooImportManualReviewError extends Error {
  constructor(readonly reasonCode: string) {
    super(`WooCommerce import requires manual review: ${reasonCode}`);
    this.name = "WooImportManualReviewError";
  }
}

/**
 * The durable boundary for the WooCommerce importer. Implementations own database
 * transactions; callers only supply normalized, validated planner output.
 */
export interface WooImportRepositoryV1 {
  beginRun(request: BeginWooImportRun): Promise<WooImportRun>;
  inspect(request: {
    sourceStoreId: string;
    operations: WooImportOperation[];
  }): Promise<WooImportTargetSnapshot>;
  applyBatch(request: WooImportBatchRequest): Promise<WooImportBatchResult>;
  completeRun(runId: string, reconciliation: WooImportReconciliationSummary): Promise<void>;
  failRun(runId: string, failureCode: string): Promise<void>;
  markRunManualReview(runId: string, reasonCode: string): Promise<void>;
  quarantine(records: WooImportQuarantineRequest[]): Promise<void>;
  rollbackRun(runId: string): Promise<void>;
  inspectRun(runId: string): Promise<WooImportRunEvidence | undefined>;
}

export interface ApplyWooCommercePlanRequest {
  plan: WooImportPlan;
  run: BeginWooImportRun;
  batchSize?: number;
}

export interface ApplyWooCommercePlanResult {
  runId: string;
  applied: number;
  matched: number;
  reconciliation: WooImportReconciliationSummary;
}

function batches<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let offset = 0; offset < items.length; offset += size) {
    result.push(items.slice(offset, offset + size));
  }
  return result;
}

/**
 * Applies a Phase 1 catalog plan through the repository port. Categories always
 * precede products so relationship replacement can remain inside product batches.
 */
export async function applyWooCommercePlan(
  repository: WooImportRepositoryV1,
  request: ApplyWooCommercePlanRequest,
): Promise<ApplyWooCommercePlanResult> {
  assertWooCommercePlanCanApply(request.plan);
  if (request.run.sourceStoreId.trim() !== request.plan.sourceStoreId) {
    throw new Error("WooCommerce run sourceStoreId must match the planned source store");
  }
  if (request.run.sourceFingerprint.trim().toLowerCase() !== request.plan.fingerprint) {
    throw new Error("WooCommerce run source fingerprint must match the plan fingerprint");
  }

  const target = await repository.inspect({
    sourceStoreId: request.plan.sourceStoreId,
    operations: request.plan.operations,
  });
  const inspection = inspectWooCommerceTarget(request.plan, target);
  if (inspection.issues.length) {
    throw new Error(
      `WooCommerce target inspection blocked by ${inspection.issues.length} conflict(s)`,
    );
  }

  const run = await repository.beginRun(request.run);
  const batchSize = request.batchSize ?? 100;
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 1_000) {
    throw new Error("WooCommerce batchSize must be an integer between 1 and 1000");
  }

  const orderedOperations = [
    ...request.plan.operations.filter((operation) => operation.entityType === "category"),
    ...request.plan.operations.filter((operation) => operation.entityType === "product"),
  ];

  let applied = 0;
  let matched = 0;
  try {
    for (const [index, operations] of batches(orderedOperations, batchSize).entries()) {
      const result = await repository.applyBatch({
        runId: run.id,
        sourceStoreId: request.plan.sourceStoreId,
        batchKey: `phase-1-${index + 1}`,
        operations,
        nextCheckpoint: {
          phase: 1,
          batchKey: `phase-1-${index + 1}`,
          appliedOperationCount: applied + matched + operations.length,
        },
      });
      applied += result.applied;
      matched += result.matched;
    }

    const reconciliation: WooImportReconciliationSummary = {
      source: orderedOperations.length,
      planned: orderedOperations.length,
      applied,
      matched,
      excludedApproved: 0,
      quarantined: 0,
      unresolvedQuarantine: 0,
      moneyDifference: 0,
    };
    assertWooImportCanComplete(reconciliation);
    await repository.completeRun(run.id, reconciliation);
    return { runId: run.id, applied, matched, reconciliation };
  } catch (error) {
    if (error instanceof WooImportManualReviewError) {
      await repository.markRunManualReview(run.id, error.reasonCode);
    } else {
      await repository.failRun(run.id, error instanceof Error ? error.message : "unexpected_error");
    }
    throw error;
  }
}

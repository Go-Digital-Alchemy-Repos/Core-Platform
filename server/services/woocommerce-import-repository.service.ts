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
  appliedCount: number;
  matchedCount: number;
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
  resumeRun(runId: string, request: BeginWooImportRun): Promise<WooImportRun>;
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
  resumeRunId?: string;
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

function resumeProgress(evidence: WooImportRunEvidence, batchesToApply: WooImportOperation[][]) {
  const checkpoint = evidence.run.latestCheckpoint;
  if (!checkpoint || typeof checkpoint !== "object" || Array.isArray(checkpoint)) {
    throw new WooImportManualReviewError("invalid_resume_checkpoint");
  }
  const record = checkpoint as Record<string, unknown>;
  if (Object.keys(record).length === 0) {
    if (evidence.auditCount !== 0 || evidence.appliedCount !== 0 || evidence.matchedCount !== 0) {
      throw new WooImportManualReviewError("resume_checkpoint_audit_mismatch");
    }
    return { completedBatches: 0, applied: 0, matched: 0, completedOperations: 0 };
  }
  const batchKey = typeof record.batchKey === "string" ? record.batchKey : "";
  const batchMatch = /^phase-1-(\d+)$/.exec(batchKey);
  const completedBatches = batchMatch ? Number(batchMatch[1]) : NaN;
  const completedOperations = record.appliedOperationCount;
  if (
    record.phase !== 1 ||
    !Number.isSafeInteger(completedBatches) ||
    completedBatches < 1 ||
    completedBatches > batchesToApply.length ||
    typeof completedOperations !== "number" ||
    !Number.isSafeInteger(completedOperations) ||
    completedOperations < 1
  ) {
    throw new WooImportManualReviewError("invalid_resume_checkpoint");
  }
  const expectedOperations = batchesToApply
    .slice(0, completedBatches)
    .reduce((total, batch) => total + batch.length, 0);
  if (
    completedOperations !== expectedOperations ||
    evidence.auditCount !== expectedOperations ||
    evidence.appliedCount + evidence.matchedCount !== expectedOperations
  ) {
    throw new WooImportManualReviewError("resume_checkpoint_audit_mismatch");
  }
  return {
    completedBatches,
    applied: evidence.appliedCount,
    matched: evidence.matchedCount,
    completedOperations: expectedOperations,
  };
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

  const batchSize = request.batchSize ?? 100;
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 1_000) {
    throw new Error("WooCommerce batchSize must be an integer between 1 and 1000");
  }

  const orderedOperations = [
    ...request.plan.operations.filter((operation) => operation.entityType === "category"),
    ...request.plan.operations.filter((operation) => operation.entityType === "product"),
  ];
  const plannedBatches = batches(orderedOperations, batchSize);
  let run: WooImportRun | undefined;
  let applied = 0;
  let matched = 0;
  try {
    if (request.resumeRunId) {
      run = await repository.resumeRun(request.resumeRunId, request.run);
    }
    const target = await repository.inspect({
      sourceStoreId: request.plan.sourceStoreId,
      operations: request.plan.operations,
    });
    const inspection = inspectWooCommerceTarget(request.plan, target);
    if (inspection.issues.length) {
      if (run) throw new WooImportManualReviewError("resume_target_inspection_conflict");
      throw new Error(
        `WooCommerce target inspection blocked by ${inspection.issues.length} conflict(s)`,
      );
    }
    const activeRun = run ?? (await repository.beginRun(request.run));
    run = activeRun;
    let progress = { completedBatches: 0, applied: 0, matched: 0, completedOperations: 0 };
    if (request.resumeRunId) {
      const evidence = await repository.inspectRun(activeRun.id);
      if (!evidence) throw new WooImportManualReviewError("resume_run_evidence_missing");
      progress = resumeProgress(evidence, plannedBatches);
    }
    applied = progress.applied;
    matched = progress.matched;
    for (const [index, operations] of plannedBatches.slice(progress.completedBatches).entries()) {
      const batchIndex = progress.completedBatches + index;
      const result = await repository.applyBatch({
        runId: activeRun.id,
        sourceStoreId: request.plan.sourceStoreId,
        batchKey: `phase-1-${batchIndex + 1}`,
        operations,
        nextCheckpoint: {
          phase: 1,
          batchKey: `phase-1-${batchIndex + 1}`,
          appliedOperationCount:
            progress.completedOperations +
            plannedBatches
              .slice(progress.completedBatches, batchIndex + 1)
              .reduce((total, batch) => total + batch.length, 0),
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
    await repository.completeRun(activeRun.id, reconciliation);
    return { runId: activeRun.id, applied, matched, reconciliation };
  } catch (error) {
    if (!run) throw error;
    if (error instanceof WooImportManualReviewError) {
      await repository.markRunManualReview(run.id, error.reasonCode);
    } else {
      await repository.failRun(run.id, error instanceof Error ? error.message : "unexpected_error");
    }
    throw error;
  }
}

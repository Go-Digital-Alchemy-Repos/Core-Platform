import { createHash } from "node:crypto";
import { WOO_IMPORT_RUN_MODES, WOO_IMPORT_RUN_STATUSES } from "@shared/schema/woocommerce-import";

export const WOO_IMPORT_CONTRACT_VERSION = "1.0.0" as const;
export const WOO_IMPORT_ENABLED_APPLY_PHASES = [1] as const;

export type WooImportRunStatus = (typeof WOO_IMPORT_RUN_STATUSES)[number];
export type WooImportRunMode = (typeof WOO_IMPORT_RUN_MODES)[number];

export interface BeginWooImportRun {
  contractVersion: string;
  sourceStoreId: string;
  targetStackId: string;
  sourceFingerprint: string;
  highWaterMark: string;
  mode: WooImportRunMode;
  enabledPhases: number[];
  operatorReference: string;
}

export interface WooImportReconciliationSummary {
  source: number;
  planned: number;
  applied: number;
  matched: number;
  excludedApproved: number;
  quarantined: number;
  unresolvedQuarantine: number;
  moneyDifference: number;
}

const transitions: Record<WooImportRunStatus, ReadonlySet<WooImportRunStatus>> = {
  planned: new Set(["applying", "failed"]),
  applying: new Set(["completed", "failed", "manual_review", "rollback_pending"]),
  completed: new Set(["rollback_pending"]),
  failed: new Set(["applying", "rollback_pending", "manual_review"]),
  rollback_pending: new Set(["rolled_back", "manual_review", "failed"]),
  rolled_back: new Set(),
  manual_review: new Set(["applying", "rollback_pending", "failed"]),
};

function requireIdentifier(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length > 200) {
    throw new Error(`${field} must be a non-empty value of at most 200 characters`);
  }
  return normalized;
}

function requireSha256(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error("sourceFingerprint must be a SHA-256 hex digest");
  }
  return normalized;
}

export function validateBeginWooImportRun(input: BeginWooImportRun): BeginWooImportRun {
  if (input.contractVersion !== WOO_IMPORT_CONTRACT_VERSION) {
    throw new Error(`Unsupported WooCommerce import contract ${input.contractVersion}`);
  }
  if (!(WOO_IMPORT_RUN_MODES as readonly string[]).includes(input.mode)) {
    throw new Error(`Unsupported WooCommerce import mode ${input.mode}`);
  }

  const enabledPhases = [...new Set(input.enabledPhases)].sort((left, right) => left - right);
  if (!enabledPhases.length) throw new Error("At least one import phase must be enabled");
  const unsupportedPhase = enabledPhases.find(
    (phase) => !(WOO_IMPORT_ENABLED_APPLY_PHASES as readonly number[]).includes(phase),
  );
  if (unsupportedPhase) {
    throw new Error(
      `WooCommerce import phase ${unsupportedPhase} is not enabled for durable apply`,
    );
  }

  return {
    ...input,
    sourceStoreId: requireIdentifier(input.sourceStoreId, "sourceStoreId"),
    targetStackId: requireIdentifier(input.targetStackId, "targetStackId"),
    sourceFingerprint: requireSha256(input.sourceFingerprint),
    highWaterMark: requireIdentifier(input.highWaterMark, "highWaterMark"),
    operatorReference: requireIdentifier(input.operatorReference, "operatorReference"),
    enabledPhases,
  };
}

export function assertWooImportRunTransition(
  current: WooImportRunStatus,
  next: WooImportRunStatus,
) {
  if (!transitions[current].has(next)) {
    throw new Error(`Invalid WooCommerce import run transition: ${current} -> ${next}`);
  }
}

export function assertWooImportCanComplete(summary: WooImportReconciliationSummary) {
  for (const [field, value] of Object.entries(summary)) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`WooCommerce reconciliation ${field} must be a non-negative integer`);
    }
  }

  const dispositionTotal =
    summary.applied + summary.matched + summary.excludedApproved + summary.quarantined;
  if (summary.source !== summary.planned || summary.source !== dispositionTotal) {
    throw new Error("WooCommerce import record reconciliation does not balance");
  }
  if (summary.unresolvedQuarantine !== 0) {
    throw new Error("WooCommerce import has unresolved quarantine records");
  }
  if (summary.moneyDifference !== 0) {
    throw new Error("WooCommerce import monetary reconciliation does not balance");
  }
}

export function wooImportSourceRef(entityType: string, externalId: unknown) {
  return createHash("sha256")
    .update(`${entityType}:${String(externalId ?? "invalid")}`)
    .digest("hex")
    .slice(0, 16);
}

export function sanitizeWooImportFailureCode(value: string) {
  const normalized = value.trim().toLowerCase();
  if (/^[a-z][a-z0-9_]{0,79}$/.test(normalized)) return normalized;
  const opaqueRef = createHash("sha256").update(value).digest("hex").slice(0, 12);
  return `import_failed_${opaqueRef}`;
}

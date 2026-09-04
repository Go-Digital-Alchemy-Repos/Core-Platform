import { createHash } from "node:crypto";
import { z } from "zod";
import type { WooImportIssue, WooImportPlan } from "./woocommerce-import.service";

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i);
const issueEntitySchema = z.enum(["bundle", "category", "product", "customer", "order"]);
const approvalReferenceSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/);

const dispositionScheduleSchema = z
  .object({
    contract: z.literal("core.woocommerce-import-dispositions"),
    contractVersion: z.literal("1.0.0"),
    sourceFingerprint: sha256Schema,
    approvalReference: approvalReferenceSchema,
    entries: z
      .array(
        z
          .object({
            code: z.string().trim().min(1).max(100),
            entity: issueEntitySchema,
            sourceRef: z.string().trim().min(1).max(100).nullable(),
            field: z.string().trim().min(1).max(200).nullable(),
            disposition: z.literal("excluded-approved"),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type WooImportDispositionSchedule = z.infer<typeof dispositionScheduleSchema>;

export interface WooImportDispositionEvidence {
  approvalReference: string;
  fingerprint: string;
  appliedIssueCount: number;
}

export interface DispositionedWooImportPlan {
  plan: WooImportPlan;
  evidence: WooImportDispositionEvidence;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function issueKey(issue: Pick<WooImportIssue, "code" | "entity" | "sourceRef" | "field">) {
  return stableJson({
    code: issue.code,
    entity: issue.entity,
    sourceRef: issue.sourceRef ?? null,
    field: issue.field ?? null,
  });
}

function scheduleEntryKey(entry: WooImportDispositionSchedule["entries"][number]) {
  return stableJson({
    code: entry.code,
    entity: entry.entity,
    sourceRef: entry.sourceRef,
    field: entry.field,
  });
}

/**
 * Validates a non-secret, fingerprint-bound schedule for fields explicitly excluded
 * from a Phase 1 rehearsal. It cannot turn validation errors or already mapped
 * behavior into an approval.
 */
export function applyWooImportDispositionSchedule(
  plan: WooImportPlan,
  rawSchedule: unknown,
): DispositionedWooImportPlan {
  const schedule = dispositionScheduleSchema.parse(rawSchedule);
  const sourceFingerprint = schedule.sourceFingerprint.toLowerCase();
  if (sourceFingerprint !== plan.fingerprint) {
    throw new Error("WooCommerce disposition schedule does not match the source fingerprint");
  }

  const unresolvedWarnings = new Map(
    plan.issues
      .filter((issue) => issue.severity === "warning" && !issue.disposition)
      .map((issue) => [issueKey(issue), issue]),
  );
  const seenEntries = new Set<string>();
  for (const entry of schedule.entries) {
    const key = scheduleEntryKey(entry);
    if (seenEntries.has(key)) {
      throw new Error("WooCommerce disposition schedule contains a duplicate issue entry");
    }
    seenEntries.add(key);
    if (!unresolvedWarnings.has(key)) {
      throw new Error(
        "WooCommerce disposition schedule references an unknown or non-actionable warning",
      );
    }
  }

  const scheduled = new Map(
    schedule.entries.map((entry) => [scheduleEntryKey(entry), entry.disposition]),
  );
  const issues = plan.issues.map((issue) => {
    const disposition = scheduled.get(issueKey(issue));
    return disposition ? { ...issue, disposition } : issue;
  });

  return {
    plan: { ...plan, issues },
    evidence: {
      approvalReference: schedule.approvalReference,
      fingerprint: createHash("sha256").update(stableJson(schedule)).digest("hex"),
      appliedIssueCount: schedule.entries.length,
    },
  };
}

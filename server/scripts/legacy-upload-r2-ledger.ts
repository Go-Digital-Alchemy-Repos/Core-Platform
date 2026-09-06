import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { validateLegacyUploadApproval } from "../services/legacy-upload-source-verification";
import type { LegacyUploadStorage } from "../services/legacy-upload-storage";
import type { ApplyLedger, validateApplyInputs } from "./legacy-upload-apply-support";

export const auditHash = (bytes: Buffer | string) =>
  createHash("sha256").update(bytes).digest("hex");
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const approvalSchema = z
  .object({
    schemaVersion: z.literal(1),
    action: z.literal("create-immutable-upload-audit"),
    planId: z.string(),
    sourceIdentity: z.unknown(),
    target: z.unknown(),
    mediaApprovalSha256: digest,
    writerDrainSha256: digest,
    attemptId: z.string().uuid(),
    bucketName: z.string(),
    prefix: z.string(),
    maxRecords: z.literal(8),
    maxRecordBytes: z.literal(8192),
    approvalReference: z
      .string()
      .min(1)
      .max(500)
      .refine(
        (value) => !Array.from(value).some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127),
      ),
  })
  .strict();

export function validateR2LedgerApproval(
  input: unknown,
  binding: {
    verified: ReturnType<typeof validateApplyInputs>;
    mediaApprovalSha256: string;
    writerDrainSha256: string;
  },
) {
  const approval = approvalSchema.parse(input);
  const { plan, approval: media } = binding.verified;
  validateLegacyUploadApproval(
    {
      ...media,
      planId: approval.planId,
      sourceIdentity: approval.sourceIdentity,
      target: approval.target,
    },
    plan,
  );
  const prefix = `operations/legacy-upload-ledgers/${auditHash(plan.planId)}/${approval.attemptId}`;
  if (
    approval.mediaApprovalSha256 !== binding.mediaApprovalSha256 ||
    approval.writerDrainSha256 !== binding.writerDrainSha256 ||
    approval.bucketName !== media.target.bucketName ||
    approval.prefix !== prefix
  )
    throw new Error("Audit approval binding mismatch");
  const overlaps = (a: string, b: string) =>
    a === b || a.startsWith(b + "/") || b.startsWith(a + "/");
  if (
    overlaps(prefix, plan.destinationPrefix) ||
    plan.entries.some(
      (entry) => overlaps(prefix, entry.sourceKey) || overlaps(prefix, entry.destinationKey),
    )
  )
    throw new Error("Audit prefix overlaps media");
  return approval;
}

type Approval = ReturnType<typeof validateR2LedgerApproval>;
export function r2LedgerKeys(approval: Approval) {
  return Array.from(
    { length: 8 },
    (_, index) => `${approval.prefix}/${String(index).padStart(6, "0")}.json`,
  );
}

/** Only whitelisted outcome fields leave the process; never serialize arbitrary caller records. */
function sanitize(record: Record<string, unknown>) {
  switch (record.event) {
    case "apply-start":
      return { event: "apply-start" };
    case "copy-dispatch-intent":
      return { event: "copy-dispatch-intent" };
    case "object-result":
      return {
        event: "object-result",
        status: z
          .enum(["would-copy", "verified", "source-changed", "destination-conflict"])
          .parse(record.status),
      };
    case "apply-finished":
      return { event: "apply-finished", complete: z.boolean().parse(record.complete) };
    case "apply-failed":
      return {
        event: "apply-failed",
        possibleRemoteWrite: z.boolean().parse(record.possibleRemoteWrite),
      };
    default:
      throw new Error("Invalid audit event");
  }
}

export function createR2ApplyLedger(options: {
  approval: Approval;
  approvalSha256: string;
  storage: LegacyUploadStorage;
  verifyBeforeWrite: () => Promise<void>;
}): ApplyLedger {
  const { approval, storage } = options;
  if (
    storage.bucketName !== approval.bucketName ||
    !digest.safeParse(options.approvalSha256).success
  )
    throw new Error("Audit storage binding mismatch");
  const keys = r2LedgerKeys(approval);
  const invocationNonce = randomUUID();
  let index = 0;
  let previousSha256: string | null = null;
  let failed = false;
  let active = false;
  let closed = false;
  const requireOpen = () => {
    if (failed || closed) throw new Error("Audit ledger unavailable");
  };
  return {
    async append(record) {
      if (active) {
        failed = true;
        throw new Error("Concurrent audit append forbidden");
      }
      requireOpen();
      active = true;
      try {
        if (index >= keys.length) throw new Error("Audit record limit exceeded");
        const event = sanitize(record);
        if ((index === 0) !== (event.event === "apply-start"))
          throw new Error("Audit header required once");
        const bytes = Buffer.from(
          JSON.stringify({
            schemaVersion: 1,
            attemptId: approval.attemptId,
            planId: approval.planId,
            invocationNonce,
            index,
            previousSha256,
            approvalSha256: options.approvalSha256,
            ...event,
          }),
        );
        if (bytes.length > approval.maxRecordBytes) throw new Error("Audit byte limit exceeded");
        await options.verifyBeforeWrite();
        requireOpen();
        if (index === 0 && (await storage.read(keys[0])))
          throw new Error("Audit attempt already exists");
        // Recheck after an awaited header read, immediately before any audit PUT.
        await options.verifyBeforeWrite();
        requireOpen();
        try {
          await storage.createOnly(keys[index], {
            body: bytes,
            contentType: "application/json",
            cacheControl: "no-store",
          });
        } catch {
          // A bounded GET is the only resolution action after an ambiguous PUT.
        }
        const observed = await storage.read(keys[index]);
        requireOpen();
        if (
          !observed ||
          observed.body.length !== bytes.length ||
          !observed.body.equals(bytes) ||
          auditHash(observed.body) !== auditHash(bytes)
        )
          throw new Error("Audit acknowledgment unavailable");
        previousSha256 = auditHash(bytes);
        index += 1;
        if (event.event === "apply-finished" || event.event === "apply-failed") closed = true;
      } catch {
        failed = true;
        throw new Error("Audit persistence failed; preserve objects and verify the attempt");
      } finally {
        active = false;
      }
    },
    async close() {
      closed = true;
    },
  };
}

import { z } from "zod";
import { validateLegacyUploadApproval } from "../services/legacy-upload-source-verification";
import type { LegacyUploadStorage } from "../services/legacy-upload-storage";
import { auditHash, createR2ApplyLedger, r2LedgerKeys } from "./legacy-upload-r2-ledger";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const probeSchema = z
  .object({
    schemaVersion: z.literal(1),
    action: z.literal("probe-immutable-upload-audit"),
    sourceApproval: z.unknown(),
    planSha256: hash,
    attemptId: z.string().uuid(),
    bucketName: z.string(),
    prefix: z.string(),
    maxRecords: z.literal(8),
    maxRecordBytes: z.literal(8192),
    expectedRecords: z.literal(2),
  })
  .strict();

export function validateProbeApproval(input: unknown, plan: unknown, planSha256: string) {
  const probe = probeSchema.parse(input);
  const verified = validateLegacyUploadApproval(probe.sourceApproval, plan);
  if (
    verified.plan.schemaVersion !== 2 ||
    verified.plan.entries.length !== 1 ||
    probe.planSha256 !== planSha256 ||
    probe.bucketName !== verified.approval.target.bucketName ||
    probe.prefix !==
      `operations/legacy-upload-ledgers/${auditHash(verified.plan.planId)}/${probe.attemptId}`
  )
    throw new Error("Probe binding mismatch");
  const overlaps = (a: string, b: string) =>
    a === b || a.startsWith(b + "/") || b.startsWith(a + "/");
  if (
    overlaps(probe.prefix, verified.plan.destinationPrefix) ||
    verified.plan.entries.some(
      (entry) =>
        overlaps(probe.prefix, entry.sourceKey) || overlaps(probe.prefix, entry.destinationKey),
    )
  )
    throw new Error("Probe overlaps media");
  return { probe, ...verified, ledgerApproval: { ...probe, planId: verified.plan.planId } };
}
type Verified = ReturnType<typeof validateProbeApproval>;
const receiptSchema = z
  .object({
    schemaVersion: z.literal(1),
    mode: z.literal("audit-probe"),
    complete: z.literal(true),
    planId: z.string(),
    attemptId: z.string().uuid(),
    bucketName: z.string(),
    prefix: z.string(),
    approvalSha256: hash,
    recordSha256: z.tuple([hash, hash]),
  })
  .strict();

export async function verifyProbeReceipt(options: {
  verified: Verified;
  approvalSha256: string;
  receipt: unknown;
  storage: Pick<LegacyUploadStorage, "bucketName" | "read">;
}) {
  const receipt = receiptSchema.parse(options.receipt);
  const { probe, plan } = options.verified;
  if (
    receipt.planId !== plan.planId ||
    receipt.attemptId !== probe.attemptId ||
    receipt.bucketName !== probe.bucketName ||
    receipt.prefix !== probe.prefix ||
    receipt.approvalSha256 !== options.approvalSha256 ||
    options.storage.bucketName !== probe.bucketName
  )
    throw new Error("Probe receipt binding mismatch");
  const keys = r2LedgerKeys(options.verified.ledgerApproval);
  let nonce: string | undefined;
  for (let index = 0; index < 2; index++) {
    const object = await options.storage.read(keys[index]);
    if (
      !object ||
      object.body.length > 8192 ||
      auditHash(object.body) !== receipt.recordSha256[index]
    )
      throw new Error("Probe record verification failed");
    const envelope = z
      .object({
        schemaVersion: z.literal(1),
        attemptId: z.string().uuid(),
        planId: z.string(),
        invocationNonce: z.string().uuid(),
        index: z.number().int(),
        previousSha256: hash.nullable(),
        approvalSha256: hash,
        event: z.enum(["apply-start", "apply-finished"]),
        complete: z.boolean().optional(),
      })
      .strict()
      .parse(JSON.parse(object.body.toString("utf8")));
    if (index === 0) nonce = envelope.invocationNonce;
    if (
      envelope.attemptId !== probe.attemptId ||
      envelope.planId !== plan.planId ||
      envelope.index !== index ||
      envelope.approvalSha256 !== options.approvalSha256 ||
      envelope.invocationNonce !== nonce ||
      envelope.previousSha256 !== (index === 0 ? null : receipt.recordSha256[0]) ||
      envelope.event !== (index === 0 ? "apply-start" : "apply-finished") ||
      (index === 0 ? envelope.complete !== undefined : envelope.complete !== true)
    )
      throw new Error("Probe chain mismatch");
  }
  return receipt;
}

export async function runLedgerProbe(options: {
  verified: Verified;
  approvalSha256: string;
  storage: LegacyUploadStorage;
  verifySource: () => Promise<void>;
}) {
  const ledger = createR2ApplyLedger({
    approval: options.verified.ledgerApproval,
    approvalSha256: options.approvalSha256,
    storage: options.storage,
    verifyBeforeWrite: options.verifySource,
  });
  try {
    await ledger.append({ event: "apply-start" });
    await ledger.append({ event: "apply-finished", complete: true });
    const keys = r2LedgerKeys(options.verified.ledgerApproval);
    const hashes: string[] = [];
    for (const key of keys.slice(0, 2)) {
      const object = await options.storage.read(key);
      if (!object || object.body.length > 8192) throw new Error("Probe receipt read failed");
      hashes.push(auditHash(object.body));
    }
    const receipt = {
      schemaVersion: 1,
      mode: "audit-probe",
      complete: true,
      planId: options.verified.plan.planId,
      attemptId: options.verified.probe.attemptId,
      bucketName: options.verified.probe.bucketName,
      prefix: options.verified.probe.prefix,
      approvalSha256: options.approvalSha256,
      recordSha256: hashes,
    };
    return await verifyProbeReceipt({ ...options, receipt });
  } finally {
    await ledger.close();
  }
}

import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildLegacyUploadMigrationPlan } from "../services/legacy-upload-migration-plan";
import { validateApplyInputs } from "./legacy-upload-apply-support";
import { auditHash } from "./legacy-upload-r2-ledger";
import { validateProbeApproval, runLedgerProbe, verifyProbeReceipt } from "./upload-ledger-probe";
import { main } from "./probe-upload-ledger";
function fixture() {
  const env = {
    RAILWAY_PROJECT_ID: "project",
    RAILWAY_ENVIRONMENT_ID: "environment",
    RAILWAY_SERVICE_ID: "service",
    RAILWAY_DEPLOYMENT_ID: "deployment",
    RAILWAY_GIT_COMMIT_SHA: "a".repeat(40),
    DATABASE_URL: "postgresql://synthetic:synthetic@db.railway.internal/core",
  };
  const identity = {
    railwayProjectId: "project",
    railwayEnvironmentId: "environment",
    railwayServiceId: "service",
    deploymentId: "deployment",
    gitCommitSha: "a".repeat(40),
    databaseIdentityReference:
      "sha256:" + createHash("sha256").update("project|db.railway.internal|core").digest("hex"),
  };
  const body = Buffer.from("synthetic");
  const hash = createHash("sha256").update(body).digest("hex");
  const plan = buildLegacyUploadMigrationPlan({
    stackId: "core-platform",
    bucketName: "core-media",
    sourcePrefix: "",
    destinationPrefix: "clients/core-platform/uploads",
    entries: [{ sourceKey: "cms/image.webp", sha256: hash, byteLength: body.length }],
    ownership: {
      scope: "exact-object",
      reference: "independent-review-1",
      stackId: "core-platform",
      sourcePrefix: "",
      sourceIdentity: identity,
      record: {
        table: "cms_media",
        id: "media-1",
        r2Key: "cms/image.webp",
        sha256: hash,
        byteLength: body.length,
      },
    },
  });
  const approval = {
    schemaVersion: 1,
    planId: plan.planId,
    ownershipReference: "independent-review-1",
    sourceIdentity: identity,
    target: {
      stackId: plan.stackId,
      bucketName: plan.bucketName,
      uploadPrefix: plan.destinationPrefix,
    },
  };
  const row = { id: "media-1", r2_key: "cms/image.webp", file_size: body.length };
  const database = {
    query: vi.fn(async (query: string) => ({
      rows: query.includes("current_database") ? [{ name: "core" }] : [row],
    })),
  };
  const storage = {
    bucketName: plan.bucketName,
    read: vi.fn(async (key: string) => (key === row.r2_key ? { body } : null)),
    createOnly: vi.fn(async (_key: string, _object: { body: Buffer }) => "created" as const),
  };
  const drain = {
    schemaVersion: 1 as const,
    id: "drain-1",
    planId: plan.planId,
    sourceIdentity: identity,
    target: approval.target,
    operatorReference: "approved-operator-reference",
    attestedAt: "2026-09-05T12:00:00Z",
    statement: "writers-drained-and-frozen" as const,
  };
  const applyApproval = {
    schemaVersion: 1,
    action: "copy-exact-object",
    sourceApproval: approval,
    writerDrainAttestationId: drain.id,
  };
  const objects = new Map([[row.r2_key, { body }]]);
  storage.read.mockImplementation(async (key) => objects.get(key) ?? null);
  storage.createOnly.mockImplementation(async (...args: unknown[]) => {
    const [key, object] = args as [string, { body: Buffer }];
    objects.set(key, object);
    return "created";
  });
  return { env, plan, approval, database, storage, row, drain, applyApproval, objects };
}

function probeFixture() {
  const f = fixture();
  const attemptId = "4e24f9cf-fd32-4745-9f46-e73d24c905ae";
  const planSha256 = auditHash(JSON.stringify(f.plan));
  const input = {
    schemaVersion: 1,
    action: "probe-immutable-upload-audit",
    sourceApproval: f.approval,
    planSha256,
    attemptId,
    bucketName: f.plan.bucketName,
    prefix: `operations/legacy-upload-ledgers/${auditHash(f.plan.planId)}/${attemptId}`,
    maxRecords: 8,
    maxRecordBytes: 8192,
    expectedRecords: 2,
  };
  const verified = validateProbeApproval(input, f.plan, planSha256);
  const approvalSha256 = auditHash(JSON.stringify(input));
  const verifySource = vi.fn(async () => {});
  return {
    f,
    input,
    verified,
    planSha256,
    options: { verified, approvalSha256, verifySource, storage: f.storage },
  };
}

describe("audit-only probe", () => {
  it("writes exactly two audit keys without media writes or freeze and verifies in a new sink", async () => {
    const a = probeFixture();
    const receipt = await runLedgerProbe(a.options);
    expect(a.options.verifySource).toHaveBeenCalledTimes(4);
    expect(a.f.storage.createOnly.mock.calls.map(([key]) => key)).toEqual([
      a.input.prefix + "/000000.json",
      a.input.prefix + "/000001.json",
    ]);
    const read = vi.fn(a.f.storage.read);
    expect(
      await verifyProbeReceipt({
        verified: a.verified,
        approvalSha256: a.options.approvalSha256,
        receipt: JSON.parse(JSON.stringify(receipt)),
        storage: { bucketName: a.f.storage.bucketName, read },
      }),
    ).toEqual(receipt);
    expect(read.mock.calls.map(([key]) => key)).toEqual([
      a.input.prefix + "/000000.json",
      a.input.prefix + "/000001.json",
    ]);
    expect(a.f.storage.createOnly).toHaveBeenCalledTimes(2);
  });
  it("rejects media authorization in probe and probe authorization in apply", () => {
    const a = probeFixture();
    expect(() => validateProbeApproval(a.f.applyApproval, a.f.plan, a.planSha256)).toThrow();
    expect(() => validateApplyInputs(a.f.plan, a.input, a.f.drain)).toThrow();
    for (const patch of [
      { planSha256: "a".repeat(64) },
      { prefix: "cms/unsafe" },
      { expectedRecords: 3 },
      {
        sourceApproval: {
          ...a.f.approval,
          sourceIdentity: { ...a.f.approval.sourceIdentity, deploymentId: "other" },
        },
      },
    ])
      expect(() =>
        validateProbeApproval({ ...a.input, ...patch }, a.f.plan, a.planSha256),
      ).toThrow();
  });
  it("rejects source identity failure before any audit write", async () => {
    const a = probeFixture();
    a.options.verifySource.mockRejectedValue(new Error("source changed"));
    await expect(runLedgerProbe(a.options)).rejects.toThrow();
    expect(a.f.storage.createOnly).not.toHaveBeenCalled();
  });
  it("preserves an incomplete attempt without further writes after result failure", async () => {
    const a = probeFixture();
    a.f.storage.createOnly.mockImplementation(async (key, object) => {
      if (key.endsWith("000001.json")) throw new Error("ambiguous result");
      a.f.objects.set(key, object);
      return "created";
    });
    await expect(runLedgerProbe(a.options)).rejects.toThrow();
    expect(a.f.storage.createOnly).toHaveBeenCalledTimes(2);
    expect(a.f.objects.has(a.input.prefix + "/000000.json")).toBe(true);
    await expect(runLedgerProbe(a.options)).rejects.toThrow();
    expect(a.f.storage.createOnly).toHaveBeenCalledTimes(2);
  });
  it("rejects mismatched receipt before GET and altered remote bytes without writes", async () => {
    const a = probeFixture();
    const receipt = await runLedgerProbe(a.options);
    a.f.storage.read.mockClear();
    const verify = (candidate: unknown) => verifyProbeReceipt({ ...a.options, receipt: candidate });
    await expect(verify({ ...receipt, approvalSha256: "f".repeat(64) })).rejects.toThrow();
    expect(a.f.storage.read).not.toHaveBeenCalled();
    a.f.objects.get(a.input.prefix + "/000001.json")!.body[0] ^= 1;
    await expect(verify(receipt)).rejects.toThrow();
    expect(a.f.storage.createOnly).toHaveBeenCalledTimes(2);
  });
  it("rejects a modified chain even when the supplied record hash is updated", async () => {
    const a = probeFixture();
    const receipt = await runLedgerProbe(a.options);
    const key = a.input.prefix + "/000001.json";
    const body = Buffer.from(
      JSON.stringify({
        ...JSON.parse(a.f.objects.get(key)!.body.toString()),
        previousSha256: "f".repeat(64),
      }),
    );
    a.f.objects.set(key, { body });
    await expect(
      verifyProbeReceipt({
        ...a.options,
        receipt: { ...receipt, recordSha256: [receipt.recordSha256[0], auditHash(body)] },
      }),
    ).rejects.toThrow("chain mismatch");
  });
  it("rejects missing or media-operation arguments without emitting supplied values", async () => {
    const output = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      expect(await main([], {})).toBe(1);
      expect(await main(["--apply", "sensitive-argument"], {})).toBe(1);
      expect(JSON.stringify(output.mock.calls)).not.toContain("sensitive-argument");
    } finally {
      output.mockRestore();
    }
  });
});

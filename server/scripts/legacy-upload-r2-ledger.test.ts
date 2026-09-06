import { Readable } from "node:stream";
import { GetObjectCommand, PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { createLegacyUploadStorage } from "../services/legacy-upload-storage";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildLegacyUploadMigrationPlan } from "../services/legacy-upload-migration-plan";
import { createLegacyUploadSourceVerifier } from "../services/legacy-upload-source-verification";
import { validateApplyInputs } from "./legacy-upload-apply-support";
import { runLegacyUploadApply } from "./apply-legacy-upload-migration";
import {
  auditHash,
  createR2ApplyLedger,
  r2LedgerKeys,
  validateR2LedgerApproval,
} from "./legacy-upload-r2-ledger";
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

function auditFixture() {
  const f = fixture();
  const binding = {
    verified: validateApplyInputs(f.plan, f.applyApproval, f.drain),
    mediaApprovalSha256: "a".repeat(64),
    writerDrainSha256: "b".repeat(64),
  };
  const attemptId = "72e99c9f-44bc-41ee-a711-d3b19de6fbc2";
  const input = {
    schemaVersion: 1,
    action: "create-immutable-upload-audit",
    planId: f.plan.planId,
    sourceIdentity: f.approval.sourceIdentity,
    target: f.approval.target,
    mediaApprovalSha256: binding.mediaApprovalSha256,
    writerDrainSha256: binding.writerDrainSha256,
    attemptId,
    bucketName: f.plan.bucketName,
    prefix: `operations/legacy-upload-ledgers/${auditHash(f.plan.planId)}/${attemptId}`,
    maxRecords: 8,
    maxRecordBytes: 8192,
    approvalReference: "synthetic-review",
  };
  const approval = validateR2LedgerApproval(input, binding);
  const objects = new Map<string, { body: Buffer }>();
  const storage = {
    bucketName: f.plan.bucketName,
    read: vi.fn(async (key: string) => objects.get(key) ?? null),
    createOnly: vi.fn(async (key: string, object: { body: Buffer }) => {
      if (objects.has(key)) return "already-exists" as const;
      objects.set(key, object);
      return "created" as const;
    }),
  };
  const verifyBeforeWrite = vi.fn(async () => {});
  const options = { approval, approvalSha256: "c".repeat(64), storage, verifyBeforeWrite };
  return {
    f,
    binding,
    input,
    approval,
    objects,
    storage,
    verifyBeforeWrite,
    options,
    ledger: createR2ApplyLedger(options),
    keys: r2LedgerKeys(approval),
  };
}

describe("immutable R2 audit ledger", () => {
  afterEach(() => vi.useRealTimers());
  it("binds independent authorization, exact inputs and target before writes", () => {
    const a = auditFixture();
    for (const patch of [
      { action: "copy-exact-object" },
      { mediaApprovalSha256: "d".repeat(64) },
      { writerDrainSha256: "d".repeat(64) },
      { planId: "other" },
      { bucketName: "other" },
      { prefix: "cms/unsafe" },
      { attemptId: "not-uuid" },
      { maxRecords: 9 },
      { maxRecordBytes: 9000 },
      { sourceIdentity: { ...a.input.sourceIdentity, deploymentId: "other" } },
      { target: { ...a.input.target, bucketName: "other" } },
    ]) {
      expect(() => validateR2LedgerApproval({ ...a.input, ...patch }, a.binding)).toThrow();
    }
    expect(a.storage.createOnly).not.toHaveBeenCalled();
  });
  it("acknowledges exact bytes and chains sanitized immutable records", async () => {
    const a = auditFixture();
    await a.ledger.append({ event: "apply-start", secret: "secret-value" });
    await a.ledger.append({ event: "copy-dispatch-intent", destinationKey: "private-filename" });
    const first = a.objects.get(a.keys[0])!.body;
    const second = a.objects.get(a.keys[1])!.body;
    expect(JSON.parse(second.toString())).toMatchObject({
      index: 1,
      previousSha256: auditHash(first),
    });
    expect(first.toString() + second.toString()).not.toMatch(/secret-value|private-filename/);
    expect(a.storage.read).toHaveBeenCalledWith(a.keys[0]);
    expect(a.verifyBeforeWrite).toHaveBeenCalledTimes(4);
    expect(a.keys).toHaveLength(8);
  });
  it("resolves an ambiguous PUT only through matching GET bytes", async () => {
    const a = auditFixture();
    a.storage.createOnly.mockImplementation(async (key, object) => {
      a.objects.set(key, object);
      throw new Error("secret-provider-error");
    });
    await expect(a.ledger.append({ event: "apply-start" })).resolves.toBeUndefined();
    expect(a.storage.createOnly).toHaveBeenCalledOnce();
  });
  it.each(["missing", "conflicting", "read-failed"])(
    "stops every later write after %s acknowledgment",
    async (outcome) => {
      const a = auditFixture();
      a.storage.createOnly.mockImplementation(async (key) => {
        if (outcome === "conflicting") a.objects.set(key, { body: Buffer.from("wrong") });
        if (outcome === "read-failed") a.storage.read.mockRejectedValue(new Error("read deadline"));
        throw new Error("uncertain PUT");
      });
      await expect(a.ledger.append({ event: "apply-start" })).rejects.toThrow(
        "Audit persistence failed",
      );
      const calls = a.storage.createOnly.mock.calls.length;
      await expect(
        a.ledger.append({ event: "apply-failed", possibleRemoteWrite: false }),
      ).rejects.toThrow();
      expect(a.storage.createOnly).toHaveBeenCalledTimes(calls);
    },
  );
  it("rejects old attempts and concurrent processes sharing a prefix", async () => {
    const a = auditFixture();
    const other = createR2ApplyLedger(a.options);
    const results = await Promise.allSettled([
      a.ledger.append({ event: "apply-start" }),
      other.append({ event: "apply-start" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const old = createR2ApplyLedger(a.options);
    const writes = a.storage.createOnly.mock.calls.length;
    await expect(old.append({ event: "apply-start" })).rejects.toThrow();
    expect(a.storage.createOnly).toHaveBeenCalledTimes(writes);
  });
  it("poisons concurrent append calls before either can dispatch", async () => {
    const a = auditFixture();
    let release!: () => void;
    a.verifyBeforeWrite.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const first = a.ledger.append({ event: "apply-start" });
    await expect(a.ledger.append({ event: "apply-start" })).rejects.toThrow("Concurrent");
    release();
    await expect(first).rejects.toThrow();
    expect(a.storage.createOnly).not.toHaveBeenCalled();
  });
  it("bounds records and disallows writes after terminal completion", async () => {
    const a = auditFixture();
    await a.ledger.append({ event: "apply-start" });
    for (let i = 1; i < 8; i++) await a.ledger.append({ event: "copy-dispatch-intent" });
    await expect(a.ledger.append({ event: "copy-dispatch-intent" })).rejects.toThrow();
    expect(a.storage.createOnly).toHaveBeenCalledTimes(8);
    const b = auditFixture();
    await b.ledger.append({ event: "apply-start" });
    await b.ledger.append({ event: "apply-finished", complete: true });
    await expect(b.ledger.append({ event: "apply-start" })).rejects.toThrow();
  });
  it("rechecks source/freeze before audit creation", async () => {
    const a = auditFixture();
    a.storage.read.mockImplementation(async () => {
      a.verifyBeforeWrite.mockRejectedValue(new Error("freeze removed"));
      return null;
    });
    await expect(a.ledger.append({ event: "apply-start" })).rejects.toThrow();
    expect(a.storage.createOnly).not.toHaveBeenCalled();
  });
  it("acknowledges intent before media PUT and handles postcopy audit failure with a new attempt", async () => {
    const a = auditFixture();
    a.f.storage.createOnly.mockImplementation(async (key, object) => {
      expect(JSON.parse(a.objects.get(a.keys[1])!.body.toString()).event).toBe(
        "copy-dispatch-intent",
      );
      expect(a.storage.read).toHaveBeenCalledWith(a.keys[1]);
      a.f.objects.set(key, object);
      a.storage.createOnly.mockRejectedValue(new Error("audit outage"));
      return "created";
    });
    const options = {
      verifier: createLegacyUploadSourceVerifier(a.f),
      storage: a.f.storage,
      ledger: a.ledger,
      drain: a.f.drain,
      assertRuntime: () => {},
    };
    await expect(runLegacyUploadApply(options)).rejects.toThrow();
    expect(a.f.objects.has(a.f.plan.entries[0].destinationKey)).toBe(true);
    expect(a.storage.createOnly).toHaveBeenCalledTimes(3);
    const retry = auditFixture();
    const attemptId = "ed183d41-bfd6-4c30-9f14-9b2c5944fbe7";
    const approval = validateR2LedgerApproval(
      {
        ...retry.input,
        attemptId,
        prefix: `operations/legacy-upload-ledgers/${auditHash(retry.f.plan.planId)}/${attemptId}`,
      },
      retry.binding,
    );
    expect(
      (
        await runLegacyUploadApply({
          ...options,
          ledger: createR2ApplyLedger({ ...retry.options, approval }),
        })
      ).complete,
    ).toBe(true);
    expect(a.f.storage.createOnly).toHaveBeenCalledOnce();
  });
  it.each(["same-length-altered", "truncated"])(
    "blocks media and index progression for %s intent bytes",
    async (damage) => {
      const a = auditFixture();
      a.storage.read.mockImplementation(async (key) => {
        const object = a.objects.get(key);
        if (!object || key !== a.keys[1]) return object ?? null;
        const body = Buffer.from(object.body);
        if (damage === "truncated") return { body: body.subarray(0, body.length - 1) };
        body[body.length - 1] ^= 1;
        return { body };
      });
      await expect(
        runLegacyUploadApply({
          verifier: createLegacyUploadSourceVerifier(a.f),
          storage: a.f.storage,
          ledger: a.ledger,
          drain: a.f.drain,
          assertRuntime: () => {},
        }),
      ).rejects.toThrow();
      expect(a.f.storage.createOnly).not.toHaveBeenCalled();
      expect(a.storage.createOnly.mock.calls.map(([key]) => key)).toEqual(a.keys.slice(0, 2));
      await expect(
        a.ledger.append({ event: "apply-failed", possibleRemoteWrite: false }),
      ).rejects.toThrow();
      expect(a.storage.createOnly).toHaveBeenCalledTimes(2);
      expect(a.objects.has(a.keys[2])).toBe(false);
    },
  );

  it("aborts a stalled intent body through the bounded adapter without media dispatch or index advancement", async () => {
    vi.useFakeTimers();
    const a = auditFixture();
    const stalled = new Readable({ read() {} });
    let signal: AbortSignal | undefined;
    const send = vi.fn(
      async (
        command: GetObjectCommand | PutObjectCommand,
        options: { abortSignal: AbortSignal },
      ) => {
        const key = command.input.Key!;
        if (command instanceof PutObjectCommand) {
          a.objects.set(key, { body: Buffer.from(command.input.Body as Buffer) });
          return {};
        }
        const object = a.objects.get(key);
        if (!object)
          throw Object.assign(new Error("missing"), { $metadata: { httpStatusCode: 404 } });
        if (key === a.keys[1]) {
          signal = options.abortSignal;
          return { Body: stalled, ContentLength: object.body.length };
        }
        return { Body: Readable.from([object.body]), ContentLength: object.body.length };
      },
    );
    const ledger = createR2ApplyLedger({
      ...a.options,
      storage: createLegacyUploadStorage(
        { send } as unknown as S3Client,
        a.approval.bucketName,
        8192,
        50,
      ),
    });
    const pending = expect(
      runLegacyUploadApply({
        verifier: createLegacyUploadSourceVerifier(a.f),
        storage: a.f.storage,
        ledger,
        drain: a.f.drain,
        assertRuntime: () => {},
      }),
    ).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(50);
    await pending;
    expect(signal?.aborted).toBe(true);
    expect(stalled.destroyed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(a.f.storage.createOnly).not.toHaveBeenCalled();
    expect(
      send.mock.calls
        .filter(([command]) => command instanceof PutObjectCommand)
        .map(([command]) => command.input.Key),
    ).toEqual(a.keys.slice(0, 2));
    const count = send.mock.calls.length;
    await expect(
      ledger.append({ event: "apply-failed", possibleRemoteWrite: false }),
    ).rejects.toThrow();
    expect(send).toHaveBeenCalledTimes(count);
    expect(a.objects.has(a.keys[2])).toBe(false);
  });

  it("never dispatches media when intent acknowledgment is unavailable", async () => {
    const a = auditFixture();
    a.storage.createOnly.mockImplementation(async (key, object) => {
      if (key === a.keys[1]) throw new Error("intent timeout");
      a.objects.set(key, object);
      return "created";
    });
    await expect(
      runLegacyUploadApply({
        verifier: createLegacyUploadSourceVerifier(a.f),
        storage: a.f.storage,
        ledger: a.ledger,
        drain: a.f.drain,
        assertRuntime: () => {},
      }),
    ).rejects.toThrow();
    expect(a.f.storage.createOnly).not.toHaveBeenCalled();
    expect(a.storage.createOnly).toHaveBeenCalledTimes(2);
  });
});

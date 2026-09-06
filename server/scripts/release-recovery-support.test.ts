import { describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import {
  approvalSchema,
  captureExact,
  captureSnapshot,
  parseCanonicalInput,
  recoveryDatabaseConfig,
  retrieveExact,
  verifyIdentity,
  sha256,
  type Approval,
} from "./release-recovery-support";
const approval = (): Approval =>
  approvalSchema.parse({
    schemaVersion: 1,
    operation: "capture-release-recovery",
    attemptId: "11111111-1111-4111-8111-111111111111",
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    sourceIdentity: {
      railwayProjectId: "22222222-2222-4222-8222-222222222222",
      railwayEnvironmentId: "33333333-3333-4333-8333-333333333333",
      railwayServiceId: "44444444-4444-4444-8444-444444444444",
      deploymentId: "55555555-5555-4555-8555-555555555555",
      gitCommitSha: "a".repeat(40),
      databaseIdentityReference: "sha256:" + "b".repeat(64),
    },
    bucketName: "core-platform",
    clientStackId: "core-platform",
    objectKey: "release-recovery/11111111-1111-4111-8111-111111111111/database.json.gz",
  });
function fixture() {
  const queries: string[] = [];
  const query = vi.fn(async (sql: string) => {
    queries.push(sql);
    if (sql.includes("pg_try_advisory_lock")) return { rows: [{ acquired: true }] };
    if (sql.includes("pg_advisory_unlock")) return { rows: [{ released: true }] };
    if (sql.includes("FROM pg_tables"))
      return { rows: [{ table_name: "example" }, { table_name: "session" }] };
    if (sql.startsWith("SELECT *")) return { rows: [{ id: 1, value: false, quantity: 0 }] };
    return { rows: [] };
  });
  const objects = new Map<string, Buffer>();
  const read = vi.fn(async (key: string) =>
    objects.has(key) ? { body: objects.get(key)! } : null,
  );
  const createOnly = vi.fn(async (key: string, object: { body: Buffer }) => {
    objects.set(key, object.body);
    return "created" as const;
  });
  return {
    queries,
    client: { query } as unknown as Pick<PoolClient, "query">,
    query,
    objects,
    storage: { bucketName: "core-platform", read, createOnly },
    verify: vi.fn(async () => {}),
    persistIntent: vi.fn(async (_receipt: Awaited<ReturnType<typeof captureExact>>) => {}),
  };
}
describe("bounded non-pruning recovery", () => {
  it("captures once, acknowledges exact bytes and uses only readonly snapshot transaction", async () => {
    const f = fixture(),
      a = approval();
    const r = await captureExact({ ...f, approval: a });
    expect(f.storage.createOnly).toHaveBeenCalledTimes(1);
    expect(f.persistIntent.mock.invocationCallOrder[0]).toBeLessThan(
      f.storage.createOnly.mock.invocationCallOrder[0],
    );
    expect(f.queries).toContain("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    expect(f.queries).toContain("COMMIT");
    const body = await retrieveExact({ read: f.storage.read }, a, r);
    expect(sha256(body)).toBe(r.backupSha256);
    expect(r.rowCount).toBe(1);
  });
  it("rejects expired and wrong namespace approval", async () => {
    const f = fixture();
    await expect(
      captureExact({ ...f, approval: { ...approval(), expiresAt: new Date(0).toISOString() } }),
    ).rejects.toThrow();
    expect(f.query).not.toHaveBeenCalled();
    expect(() =>
      approvalSchema.parse({ ...approval(), objectKey: "system-backups/db/old.gz" }),
    ).toThrow();
  });
  it("rejects URL overrides and duplicate sslmode before creating database pool", () => {
    for (const suffix of [
      "?options=-c%20default_transaction_read_only=off",
      "?host=other",
      "?sslmode=disable&sslmode=disable",
    ])
      expect(() =>
        recoveryDatabaseConfig({ DATABASE_URL: "postgres://x:x@127.0.0.1/test" + suffix }),
      ).toThrow();
  });
  it("rejects duplicate JSON keys", () =>
    expect(() => parseCanonicalInput('{"x":1,"x":1}')).toThrow());
  it("makes no PUT after intent persistence failure", async () => {
    const f = fixture();
    f.persistIntent.mockRejectedValue(new Error("disk"));
    await expect(captureExact({ ...f, approval: approval() })).rejects.toThrow();
    expect(f.storage.createOnly).not.toHaveBeenCalled();
    expect(f.queries.at(-1)).toContain("pg_advisory_unlock");
  });
  it("makes no PUT when runtime identity changes before dispatch", async () => {
    const f = fixture();
    f.verify.mockResolvedValueOnce().mockRejectedValueOnce(new Error("changed"));
    await expect(captureExact({ ...f, approval: approval() })).rejects.toThrow();
    expect(f.storage.createOnly).not.toHaveBeenCalled();
  });
  it("never overwrites an existing attempt", async () => {
    const f = fixture(),
      a = approval();
    f.objects.set(a.objectKey, Buffer.from("old"));
    await expect(captureExact({ ...f, approval: a })).rejects.toThrow();
    expect(f.storage.createOnly).not.toHaveBeenCalled();
  });
  it("retains ambiguous write and never retries it", async () => {
    const f = fixture();
    f.storage.createOnly.mockImplementation(async (key, obj) => {
      f.objects.set(key, obj.body);
      throw new Error("lost reply");
    });
    await expect(captureExact({ ...f, approval: approval() })).rejects.toThrow();
    expect(f.storage.createOnly).toHaveBeenCalledTimes(1);
    expect(f.objects.size).toBe(1);
  });
  it("rejects changed same-length acknowledgment", async () => {
    const f = fixture();
    f.storage.createOnly.mockImplementation(async (key, obj) => {
      const changed = Buffer.from(obj.body);
      changed[0] ^= 1;
      f.objects.set(key, changed);
      return "created";
    });
    await expect(captureExact({ ...f, approval: approval() })).rejects.toThrow("hash");
  });
  it("rolls back capture read failure", async () => {
    const f = fixture();
    f.query.mockRejectedValueOnce(new Error("begin failed"));
    await expect(captureSnapshot(f.client, approval())).rejects.toThrow();
    const g = fixture();
    g.query.mockImplementation(async (sql) => {
      if (sql.startsWith("SELECT")) throw Error("read failed");
      return { rows: [] };
    });
    await expect(captureSnapshot(g.client, approval())).rejects.toThrow();
    expect(g.query).toHaveBeenLastCalledWith("ROLLBACK");
  });
  it("rejects wrong database identity under correct platform identity", async () => {
    const a = approval(),
      f = fixture();
    const env = {
      NODE_ENV: "production",
      DATABASE_URL: "postgres://x:x@host.railway.internal/db",
      RAILWAY_PROJECT_ID: a.sourceIdentity.railwayProjectId,
      RAILWAY_ENVIRONMENT_ID: a.sourceIdentity.railwayEnvironmentId,
      RAILWAY_SERVICE_ID: a.sourceIdentity.railwayServiceId,
      RAILWAY_DEPLOYMENT_ID: a.sourceIdentity.deploymentId,
      RAILWAY_GIT_COMMIT_SHA: a.sourceIdentity.gitCommitSha,
    };
    f.query.mockResolvedValue({ rows: [{ name: "wrong", read_only: "on" }] } as never);
    await expect(verifyIdentity(f.client, env, a)).rejects.toThrow();
  });
  it("resolves an ambiguous PUT using the retained planned receipt with GET only", async () => {
    const f = fixture(),
      a = approval();
    let planned: Awaited<ReturnType<typeof captureExact>> | undefined;
    f.persistIntent.mockImplementation(async (value) => {
      planned = value;
    });
    f.storage.createOnly.mockImplementation(async (key, object) => {
      f.objects.set(key, object.body);
      throw new Error("lost reply");
    });
    await expect(captureExact({ ...f, approval: a })).rejects.toThrow("lost reply");
    expect(await retrieveExact({ read: f.storage.read }, a, planned!)).toEqual(
      f.objects.get(a.objectKey),
    );
    expect(f.storage.createOnly).toHaveBeenCalledTimes(1);
  });
  it("keeps original failure when advisory unlock also fails", async () => {
    const f = fixture();
    const old = f.query.getMockImplementation()!;
    f.query.mockImplementation(async (sql) => {
      if (sql.includes("pg_advisory_unlock")) throw new Error("unlock");
      return old(sql);
    });
    f.persistIntent.mockRejectedValue(new Error("intent failure"));
    await expect(captureExact({ ...f, approval: approval() })).rejects.toThrow("intent failure");
  });
  it("checks approval expiry again after intent persistence", async () => {
    const f = fixture(),
      a = approval();
    f.persistIntent.mockImplementation(async () => {
      a.expiresAt = new Date(0).toISOString();
    });
    await expect(captureExact({ ...f, approval: a })).rejects.toThrow("expiry");
    expect(f.storage.createOnly).not.toHaveBeenCalled();
  });
});

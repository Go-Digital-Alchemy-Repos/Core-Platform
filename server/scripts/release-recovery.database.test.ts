import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { gunzipSync } from "node:zlib";
const url = process.env.RELEASE_RECOVERY_TEST_DATABASE_URL;
if (url) {
  const parsed = new URL(url);
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.pathname !== "/core_release_recovery_test" ||
    parsed.search ||
    parsed.hash
  )
    throw new Error("Only owned recovery fixture allowed");
}
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  return {
    pool: new Pool({
      connectionString: process.env.RELEASE_RECOVERY_TEST_DATABASE_URL,
      max: 4,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
    }),
  };
});
vi.mock("../services/backup-storage.service", () => ({}));
vi.mock("../storage/index", () => ({ storage: { settings: { invalidateAll: () => {} } } }));
import { pool } from "../db";
import { restoreBackupSnapshot } from "../services/system-backup.service";
import { captureExact, approvalSchema } from "./release-recovery-support";
const approval = approvalSchema.parse({
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
describe.skipIf(!url)("actual consistent recovery capture and production restore", () => {
  beforeAll(async () => {
    vi.stubEnv("CLIENT_STACK_ID", "core-platform");
    await pool.query(
      "CREATE TABLE parents(id serial PRIMARY KEY, value jsonb); CREATE TABLE children(id serial PRIMARY KEY, parent_id integer REFERENCES parents(id), quantity integer, enabled boolean); INSERT INTO parents(value) VALUES ('{\"accepted\":true}'); INSERT INTO children(parent_id,quantity,enabled) VALUES (1,0,false)",
    );
  });
  afterAll(async () => {
    await pool.end();
    vi.unstubAllEnvs();
  });
  it("captures one consistent view during concurrent write and restores through actual restore API", async () => {
    const client = await pool.connect();
    const objects = new Map<string, Buffer>();
    let inserted = false;
    const originalQuery = client.query.bind(client);
    // A committed writer between table reads must not enter the repeatable-read snapshot.
    const query = async (text: string, values?: unknown[]) => {
      const result = await originalQuery(text, values);
      if (text.startsWith('SELECT * FROM public."children"') && !inserted) {
        inserted = true;
        await pool.query(
          "INSERT INTO parents(value) VALUES ('{\"later\":true}'); INSERT INTO children(parent_id,quantity,enabled) VALUES (2,9,true)",
        );
      }
      return result;
    };
    try {
      const receipt = await captureExact({
        client: { query } as typeof client,
        approval,
        storage: {
          bucketName: "core-platform",
          read: async (key) => (objects.has(key) ? { body: objects.get(key)! } : null),
          createOnly: async (key, obj) => {
            objects.set(key, obj.body);
            return "created";
          },
        },
        verify: async () => {},
        persistIntent: async () => {},
      });
      expect(receipt.rowCount).toBe(2);
      expect(inserted).toBe(true);
      const snapshot = JSON.parse(gunzipSync(objects.get(approval.objectKey)!).toString());
      expect(snapshot.manifest.restoreOrder).toEqual(["parents", "children"]);
      await restoreBackupSnapshot(snapshot);
      expect((await pool.query("SELECT quantity,enabled FROM children")).rows).toEqual([
        { quantity: 0, enabled: false },
      ]);
      expect((await pool.query("SELECT value FROM parents")).rows).toEqual([
        { value: { accepted: true } },
      ]);
      const next = await pool.query("INSERT INTO parents(value) VALUES ('{}') RETURNING id");
      expect(next.rows[0].id).toBe(2);
    } finally {
      client.release(true);
    }
  });
  it("refuses an overlapping deployed backup advisory lock without object writes", async () => {
    const locker = await pool.connect(),
      other = await pool.connect();
    const createOnly = vi.fn();
    await locker.query("SELECT pg_advisory_lock(880120441)");
    try {
      await expect(
        captureExact({
          client: other,
          approval,
          storage: { bucketName: "core-platform", read: async () => null, createOnly },
          verify: async () => {},
          persistIntent: async () => {},
        }),
      ).rejects.toThrow("busy");
      expect(createOnly).not.toHaveBeenCalled();
    } finally {
      await locker.query("SELECT pg_advisory_unlock(880120441)");
      locker.release(true);
      other.release(true);
    }
  });
});

import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { z } from "zod";
import type { PoolClient } from "pg";
import type { LegacyUploadStorage } from "../services/legacy-upload-storage";
import { assertLegacyUploadRuntimeIdentity } from "../services/legacy-upload-source-verification";
import { databasePoolConfig } from "../config/database";

const identitySchema = z
  .object({
    railwayProjectId: z.string().uuid(),
    railwayEnvironmentId: z.string().uuid(),
    railwayServiceId: z.string().uuid(),
    deploymentId: z.string().uuid(),
    gitCommitSha: z.string().regex(/^[a-f0-9]{40}$/),
    databaseIdentityReference: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  })
  .strict();
export const approvalSchema = z
  .object({
    schemaVersion: z.literal(1),
    operation: z.literal("capture-release-recovery"),
    attemptId: z.string().uuid(),
    expiresAt: z.string().datetime(),
    sourceIdentity: identitySchema,
    bucketName: z.literal("core-platform"),
    clientStackId: z.literal("core-platform"),
    objectKey: z.string(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.objectKey !== `release-recovery/${value.attemptId}/database.json.gz`)
      ctx.addIssue({ code: "custom", message: "Invalid exact recovery key" });
  });
export type Approval = z.infer<typeof approvalSchema>;
export const sha256 = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");
export const MAX_COMPRESSED = 32 * 1024 * 1024;
const MAX_JSON = 256 * 1024 * 1024;
export function parseCanonicalInput(text: string): unknown {
  const value: unknown = JSON.parse(text);
  // Canonical minified JSON also rejects duplicate keys rather than silently taking the last.
  if (JSON.stringify(value) !== text.trim()) throw new Error("Noncanonical input");
  return value;
}
export function recoveryDatabaseConfig(env: NodeJS.ProcessEnv) {
  const url = new URL(env.DATABASE_URL!);
  if (
    [...url.searchParams.keys()].some((key) => key !== "sslmode") ||
    url.searchParams.getAll("sslmode").length > 1
  )
    throw new Error("Database URL options forbidden");
  return {
    ...databasePoolConfig(env),
    max: 1,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 30_000,
    query_timeout: 35_000,
    options: "-c default_transaction_read_only=on",
  };
}
export async function verifyIdentity(
  client: Pick<PoolClient, "query">,
  env: NodeJS.ProcessEnv,
  approval: Approval,
) {
  const host = assertLegacyUploadRuntimeIdentity(env, approval.sourceIdentity);
  if (
    (env.CLIENT_STACK_ID?.trim() || "core-platform") !== approval.clientStackId ||
    env.NODE_ENV !== "production"
  )
    throw new Error("Stack identity mismatch");
  const { rows } = await client.query(
    "SELECT current_database() AS name, current_setting('transaction_read_only') AS read_only",
  );
  if (
    rows[0]?.read_only !== "on" ||
    `sha256:${sha256(`${approval.sourceIdentity.railwayProjectId}|${host}|${rows[0]?.name}`)}` !==
      approval.sourceIdentity.databaseIdentityReference
  )
    throw new Error("Database identity mismatch");
}
export function assertFresh(approval: Approval, now = Date.now()) {
  const expiry = Date.parse(approval.expiresAt);
  if (expiry <= now || expiry > now + 24 * 60 * 60 * 1000)
    throw new Error("Approval expiry invalid");
}
const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
function orderTables(tables: string[], edges: { child_table: string; parent_table: string }[]) {
  const remaining = new Set(tables);
  const order: string[] = [];
  while (remaining.size) {
    const next = [...remaining]
      .filter(
        (table) =>
          !edges.some((edge) => edge.child_table === table && remaining.has(edge.parent_table)),
      )
      .sort();
    if (!next.length) {
      order.push(...[...remaining].sort());
      break;
    }
    for (const table of next) {
      order.push(table);
      remaining.delete(table);
    }
  }
  return order;
}
export async function captureSnapshot(
  client: Pick<PoolClient, "query">,
  approval: Approval,
  now = new Date(),
) {
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    const names = await client.query<{ table_name: string }>(
      "SELECT tablename AS table_name FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename ASC",
    );
    const tables = names.rows
      .map((row) => row.table_name)
      .filter((name) => !["session", "__drizzle_migrations"].includes(name));
    if (!tables.length || tables.length > 500) throw new Error("Table inventory bound exceeded");
    const edges = await client.query<{
      child_table: string;
      parent_table: string;
    }>(`SELECT tc.table_name AS child_table, ccu.table_name AS parent_table
      FROM information_schema.table_constraints tc JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name AND tc.constraint_schema = ccu.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND ccu.table_schema = 'public'`);
    const sequences =
      await client.query(`SELECT cols.table_name AS "tableName", cols.column_name AS "columnName",
      pg_get_serial_sequence(format('%I.%I', cols.table_schema, cols.table_name), cols.column_name) AS "sequenceName"
      FROM information_schema.columns cols WHERE cols.table_schema = 'public' AND cols.column_default LIKE 'nextval(%'`);
    const snapshots: { name: string; rowCount: number; rows: Record<string, unknown>[] }[] = [];
    let totalRowCount = 0,
      size = 0;
    for (const name of tables) {
      const result = await client.query(`SELECT * FROM public.${quote(name)} LIMIT 200001`);
      totalRowCount += result.rows.length;
      size += Buffer.byteLength(JSON.stringify(result.rows));
      if (totalRowCount > 200000 || size > MAX_JSON) throw new Error("Snapshot bound exceeded");
      snapshots.push({ name, rowCount: result.rows.length, rows: result.rows });
    }
    const snapshot = {
      manifest: {
        schemaVersion: 1,
        clientStackId: approval.clientStackId,
        createdAt: now.toISOString(),
        key: approval.objectKey.slice("release-recovery/".length),
        reason: "manual",
        appVersion: "operator-recovery-v1",
        gitCommitSha: approval.sourceIdentity.gitCommitSha,
        environment: "production",
        railwayEnvironment: "production",
        railwayProjectId: approval.sourceIdentity.railwayProjectId,
        railwayServiceId: approval.sourceIdentity.railwayServiceId,
        storageSource: "settings",
        bucketName: approval.bucketName,
        bucketPrefix: "release-recovery",
        tableCount: snapshots.length,
        totalRowCount,
        mediaAssetCount: snapshots.find((table) => table.name === "cms_media")?.rowCount ?? 0,
        restoreOrder: orderTables(tables, edges.rows),
      },
      sequences: sequences.rows.filter((row) => Boolean(row.sequenceName)),
      tables: snapshots,
    };
    const json = JSON.stringify(snapshot);
    if (Buffer.byteLength(json) > MAX_JSON) throw new Error("Snapshot byte bound exceeded");
    const bytes = gzipSync(Buffer.from(json));
    if (bytes.length > MAX_COMPRESSED) throw new Error("Compressed bound exceeded");
    await client.query("COMMIT");
    return { bytes, manifest: snapshot.manifest };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}
export const receiptSchema = z
  .object({
    schemaVersion: z.literal(1),
    status: z.literal("captured"),
    approvalSha256: z.string().regex(/^[a-f0-9]{64}$/),
    objectKey: z.string(),
    backupSha256: z.string().regex(/^[a-f0-9]{64}$/),
    compressedBytes: z.number().int().positive().max(MAX_COMPRESSED),
    tableCount: z.number().int().positive().max(500),
    rowCount: z.number().int().nonnegative().max(200000),
    createdAt: z.string().datetime(),
  })
  .strict();
export type CaptureReceipt = z.infer<typeof receiptSchema>;
export async function retrieveExact(
  reader: Pick<LegacyUploadStorage, "read">,
  approval: Approval,
  receipt: CaptureReceipt,
) {
  if (
    receipt.approvalSha256 !== sha256(JSON.stringify(approval)) ||
    receipt.objectKey !== approval.objectKey
  )
    throw new Error("Receipt binding mismatch");
  const object = await reader.read(approval.objectKey);
  if (
    !object ||
    object.body.length !== receipt.compressedBytes ||
    sha256(object.body) !== receipt.backupSha256
  )
    throw new Error("Exact backup hash mismatch");
  const snapshot = JSON.parse(
    gunzipSync(object.body, { maxOutputLength: MAX_JSON }).toString("utf8"),
  );
  const m = snapshot.manifest;
  if (
    m?.schemaVersion !== 1 ||
    m.key !== approval.objectKey.slice("release-recovery/".length) ||
    m.bucketPrefix !== "release-recovery" ||
    m.bucketName !== approval.bucketName ||
    m.clientStackId !== approval.clientStackId ||
    m.gitCommitSha !== approval.sourceIdentity.gitCommitSha ||
    m.railwayProjectId !== approval.sourceIdentity.railwayProjectId ||
    m.railwayServiceId !== approval.sourceIdentity.railwayServiceId ||
    m.environment !== "production" ||
    m.createdAt !== receipt.createdAt ||
    m.tableCount !== receipt.tableCount ||
    m.totalRowCount !== receipt.rowCount ||
    !Array.isArray(snapshot.tables) ||
    snapshot.tables.length !== receipt.tableCount ||
    snapshot.tables.reduce((sum: number, table: { rows: unknown[]; rowCount: number }) => {
      if (!Array.isArray(table.rows) || table.rows.length !== table.rowCount)
        throw new Error("Bad rows");
      return sum + table.rowCount;
    }, 0) !== receipt.rowCount
  )
    throw new Error("Snapshot binding mismatch");
  return object.body;
}
export async function captureExact(options: {
  client: Pick<PoolClient, "query">;
  approval: Approval;
  storage: LegacyUploadStorage;
  verify: () => Promise<void>;
  persistIntent: (receipt: CaptureReceipt) => Promise<void>;
}) {
  const { client, approval, storage } = options;
  assertFresh(approval);
  await options.verify();
  if (storage.bucketName !== approval.bucketName) throw new Error("Bucket mismatch");
  let locked = false;
  let failure: unknown;
  let completed: CaptureReceipt | undefined;
  try {
    const lock = await client.query("SELECT pg_try_advisory_lock($1) AS acquired", [880120441]);
    if (!lock.rows[0]?.acquired) throw new Error("Backup busy");
    locked = true;
    if (await storage.read(approval.objectKey)) throw new Error("Attempt already exists");
    const captured = await captureSnapshot(client, approval);
    const receipt: CaptureReceipt = {
      schemaVersion: 1,
      status: "captured",
      approvalSha256: sha256(JSON.stringify(approval)),
      objectKey: approval.objectKey,
      backupSha256: sha256(captured.bytes),
      compressedBytes: captured.bytes.length,
      tableCount: captured.manifest.tableCount,
      rowCount: captured.manifest.totalRowCount,
      createdAt: captured.manifest.createdAt,
    };
    await options.persistIntent(receipt);
    assertFresh(approval);
    await options.verify();
    if (
      (await storage.createOnly(approval.objectKey, {
        body: captured.bytes,
        contentType: "application/gzip",
      })) !== "created"
    )
      throw new Error("Create conflict");
    await retrieveExact({ read: storage.read.bind(storage) }, approval, receipt);
    completed = receipt;
  } catch (error) {
    failure = error;
  } finally {
    if (locked) {
      try {
        const unlock = await client.query("SELECT pg_advisory_unlock($1) AS released", [880120441]);
        if (!unlock.rows[0]?.released) failure ??= new Error("Backup unlock failed");
      } catch (error) {
        failure ??= error;
      }
      // The command destroys this dedicated connection in all outcomes, including uncertain unlock.
    }
  }
  if (failure) throw failure;
  return completed!;
}

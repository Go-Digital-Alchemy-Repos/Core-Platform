import { constants } from "node:fs";
import { open, type FileHandle } from "node:fs/promises";
import pg from "pg";
import { S3Client } from "@aws-sdk/client-s3";
import { createLegacyUploadStorage } from "../services/legacy-upload-storage";
import { readLegacyUploadR2Configuration } from "../services/legacy-upload-source-verification";
import {
  approvalSchema,
  captureExact,
  MAX_COMPRESSED,
  parseCanonicalInput,
  receiptSchema,
  recoveryDatabaseConfig,
  retrieveExact,
  verifyIdentity,
  assertFresh,
} from "./release-recovery-support";

async function readInput(path: string) {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > 16384) throw new Error("Invalid input");
    const bytes = Buffer.alloc(16385);
    const { bytesRead } = await file.read(bytes, 0, bytes.length, 0);
    if (bytesRead > 16384) throw new Error("Invalid input size");
    return parseCanonicalInput(bytes.subarray(0, bytesRead).toString("utf8"));
  } finally {
    await file.close();
  }
}
async function persist(file: FileHandle, value: unknown) {
  await file.writeFile(JSON.stringify(value) + "\n");
  await file.sync();
}
async function main() {
  const args = process.argv.slice(2),
    mode = args[0];
  const flags =
    mode === "capture"
      ? ["--approval", "--intent", "--receipt"]
      : mode === "retrieve"
        ? ["--approval", "--capture-receipt", "--output", "--receipt"]
        : [];
  if (
    !flags.length ||
    args.length !== 1 + 2 * flags.length ||
    flags.some((flag, i) => args[1 + 2 * i] !== flag || !args[2 + 2 * i])
  )
    throw new Error("Invalid arguments");
  const paths = Object.fromEntries(flags.map((flag, i) => [flag, args[2 + 2 * i]]));
  if (new Set(Object.values(paths)).size !== flags.length)
    throw new Error("Input/output collision");
  const approval = approvalSchema.parse(await readInput(paths["--approval"]));
  const captured =
    mode === "retrieve"
      ? receiptSchema.parse(await readInput(paths["--capture-receipt"]))
      : undefined;
  if (mode === "capture") assertFresh(approval);
  const config = recoveryDatabaseConfig(process.env);
  const outputs: FileHandle[] = [];
  let pool: pg.Pool | undefined, client: pg.PoolClient | undefined, s3: S3Client | undefined;
  let cleanupFailed = false;
  let receipt: FileHandle | undefined,
    failed = false;
  try {
    receipt = await open(paths["--receipt"], "wx", 0o600);
    outputs.push(receipt);
    const output = await open(paths[mode === "capture" ? "--intent" : "--output"], "wx", 0o600);
    outputs.push(output);
    pool = new pg.Pool(config);
    pool.on("error", () => {
      failed = true;
    });
    client = await pool.connect();
    client.on("error", () => {
      failed = true;
    });
    const verify = async () => {
      if (failed) throw new Error("Database failed");
      await verifyIdentity(client!, process.env, approval);
    };
    await verify();
    const r2 = await readLegacyUploadR2Configuration(
      client,
      process.env.SESSION_SECRET,
      approval.bucketName,
    );
    s3 = new S3Client({
      region: "auto",
      endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
      maxAttempts: 1,
    });
    const storage = createLegacyUploadStorage(s3, approval.bucketName, MAX_COMPRESSED, 30000);
    if (mode === "capture") {
      const result = await captureExact({
        client,
        approval,
        storage,
        verify,
        persistIntent: async (planned) => {
          await persist(output, {
            schemaVersion: 1,
            status: "dispatch-intent",
            plannedReceipt: planned,
          });
        },
      });
      await persist(receipt, result);
    } else {
      await verify();
      const bytes = await retrieveExact({ read: storage.read.bind(storage) }, approval, captured!);
      await verify();
      await output.writeFile(bytes);
      await output.sync();
      await persist(receipt, {
        schemaVersion: 1,
        status: "retrieved",
        backupSha256: captured!.backupSha256,
        compressedBytes: bytes.length,
        objectKey: approval.objectKey,
      });
    }
  } finally {
    // Preserve partial/successful receipts verbatim. A cleanup failure is reported separately.
    s3?.destroy();
    try {
      client?.release(true);
    } catch {
      cleanupFailed = true;
    }
    if (pool)
      await pool.end().catch(() => {
        cleanupFailed = true;
      });
    for (const file of outputs)
      await file.close().catch(() => {
        cleanupFailed = true;
      });
  }
  if (cleanupFailed) throw new Error("Recovery resource cleanup incomplete");
  process.stdout.write(JSON.stringify({ status: "complete", mode, resourcesClosed: true }) + "\n");
}
// Overall event-loop deadline; synchronous JSON/gzip may delay its callback.
// The dispatch wrapper must also enforce an independent process timeout.
// This is not rollback proof for an already dispatched object PUT.
const deadline = setTimeout(() => {
  process.exit(124);
}, 180_000);
deadline.unref();
process.on("SIGTERM", () => process.exit(143));
process.on("SIGINT", () => process.exit(130));
main()
  .finally(() => clearTimeout(deadline))
  .catch(() => {
    process.stdout.write(
      '{"status":"failed-or-uncertain","message":"Preserve the exact attempt and private evidence; no payload diagnostics emitted."}\n',
    );
    process.exitCode = 1;
  });

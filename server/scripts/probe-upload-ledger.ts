import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { S3Client } from "@aws-sdk/client-s3";
import { databasePoolConfig } from "../config/database";
import {
  createLegacyUploadSourceVerifier,
  readLegacyUploadR2Configuration,
} from "../services/legacy-upload-source-verification";
import { createLegacyUploadStorage } from "../services/legacy-upload-storage";
import { readApplyInput } from "./legacy-upload-apply-support";
import { runLedgerProbe, validateProbeApproval, verifyProbeReceipt } from "./upload-ledger-probe";
export async function main(args: string[], env: NodeJS.ProcessEnv): Promise<number> {
  let pool: pg.Pool | undefined;
  let client: S3Client | undefined;
  let databaseFailed = false;
  try {
    const verifying = args[0] === "--verify";
    if (
      (!verifying && args[0] !== "--probe") ||
      args.length !== (verifying ? 7 : 5) ||
      args[1] !== "--plan" ||
      args[3] !== "--approval" ||
      (verifying && args[5] !== "--receipt")
    )
      throw new Error("Explicit probe arguments required");
    if ([...new URL(env.DATABASE_URL || "").searchParams.keys()].some((key) => key !== "sslmode"))
      throw new Error("Database options forbidden");
    const inputs = await Promise.all([
      readApplyInput(args[2]),
      readApplyInput(args[4]),
      ...(verifying ? [readApplyInput(args[6])] : []),
    ]);
    if (new Set(inputs.map((input) => `${input.device}:${input.inode}`)).size !== inputs.length)
      throw new Error("Independent inputs required");
    const verified = validateProbeApproval(inputs[1].value, inputs[0].value, inputs[0].sha256);
    pool = new pg.Pool({
      ...databasePoolConfig(env),
      max: 1,
      connectionTimeoutMillis: 10_000,
      statement_timeout: 10_000,
      query_timeout: 15_000,
      options: "-c default_transaction_read_only=on",
    });
    pool.on("error", () => {
      databaseFailed = true;
    });
    const verifier = createLegacyUploadSourceVerifier({
      plan: verified.plan,
      approval: verified.approval,
      env,
      database: pool,
    });
    await verifier.verify();
    const config = await readLegacyUploadR2Configuration(
      pool,
      env.SESSION_SECRET,
      verified.approval.target.bucketName,
    );
    client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      maxAttempts: 1,
    });
    const storage = createLegacyUploadStorage(client, config.bucketName, 8192);
    const common = { verified, approvalSha256: inputs[1].sha256 };
    const receipt = verifying
      ? await verifyProbeReceipt({
          ...common,
          receipt: inputs[2].value,
          storage: { bucketName: storage.bucketName, read: (key) => storage.read(key) },
        })
      : await runLedgerProbe({
          ...common,
          storage,
          verifySource: async () => {
            if (databaseFailed) throw new Error("Database unavailable");
            await verifier.verify();
            if (databaseFailed) throw new Error("Database unavailable");
          },
        });
    process.stdout.write(
      JSON.stringify({
        ...receipt,
        ...(verifying ? { verification: "fresh-process-exact-GET" } : {}),
      }) + "\n",
    );
    return 0;
  } catch {
    process.stdout.write(
      JSON.stringify({
        schemaVersion: 1,
        mode: "audit-probe",
        complete: false,
        error:
          "Audit probe failed or was rejected; preserve the approved attempt locator. Audit records may exist; no media writes were requested.",
      }) + "\n",
    );
    return 1;
  } finally {
    client?.destroy();
    if (pool) await pool.end().catch(() => undefined);
  }
}
function isDirectInvocation() {
  try {
    return (
      Boolean(process.argv[1]) &&
      realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}
if (isDirectInvocation())
  void main(process.argv.slice(2), process.env).then((code) => {
    process.exitCode = code;
  });

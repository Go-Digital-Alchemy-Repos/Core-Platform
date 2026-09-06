# Non-pruning release recovery capture

This standalone operator tool is prepared for separate review before live execution. It is not part of normal application startup. It never starts workers, imports the application's database singleton, calls `runSystemBackup`, updates `latest.json`, lists objects or deletes backups. Build it separately with `node --import tsx script/build-release-recovery.ts`; validate packaging with `python3 script/verify-release-recovery-artifact.py`. Production dependencies `pg`, Zod and the AWS SDK remain external.

The only capture target is an independently retained approval's exact `core-platform` bucket key `release-recovery/<attempt UUID>/database.json.gz`. This prefix is outside ordinary `system-backups/db` retention scanning. The adapter uses `If-None-Match: *`, disables SDK retries, bounds each object request including response consumption to 30 seconds, and permits only GET and create-only PUT. A conflict or uncertain PUT stops the attempt; it is never overwritten or retried automatically. A fresh attempt requires a fresh UUID/approval. Keep the locator and artifact/approval digests outside the source runtime before invoking it.

The schema-1 snapshot uses the deployed capture's public-table rows, sequence-column metadata, foreign-key restore ordering and manifest format. One checked-out connection holds advisory lock `880120441` across capture/upload/readback. Inventory and rows share one `REPEATABLE READ READ ONLY` transaction. A dedicated read-only pool, database-identity digest and platform identity checks precede object access. URL parameters other than a single permitted `sslmode` are rejected. The connection is destroyed on command completion, including uncertain unlock. An unlock failure cannot hide the original capture error.

Capture includes all public tables except the deployed defaults `session` and `__drizzle_migrations`. It deliberately does **not** inherit `SYSTEM_BACKUP_EXCLUDED_TABLES`; this is a fixed recovery policy rather than a claim of identical environment behavior. Maximums are 500 tables, 200,000 total rows, 256 MiB serialized JSON and 32 MiB compressed data; exceeding a bound fails before PUT. SELECT results are buffered by pg before serialization checks, so these are acceptance bounds, not a strict process-memory ceiling. The format stores sequence-column mappings; restore resets sequences from restored rows, as in the application. This is a database snapshot, not a media-object backup or provider reconciliation checkpoint.

Inputs use canonical minified JSON (`JSON.stringify(value)` plus an optional final newline). This deliberately rejects duplicate keys and unknown fields. Use fresh private regular files and unique output paths; outputs are exclusive mode 0600. Capture approval has this shape (all identifiers below are synthetic):

```json
{
  "schemaVersion": 1,
  "operation": "capture-release-recovery",
  "attemptId": "11111111-1111-4111-8111-111111111111",
  "expiresAt": "2026-09-06T12:00:00.000Z",
  "sourceIdentity": {
    "railwayProjectId": "22222222-2222-4222-8222-222222222222",
    "railwayEnvironmentId": "33333333-3333-4333-8333-333333333333",
    "railwayServiceId": "44444444-4444-4444-8444-444444444444",
    "deploymentId": "55555555-5555-4555-8555-555555555555",
    "gitCommitSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "databaseIdentityReference": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  },
  "bucketName": "core-platform",
  "clientStackId": "core-platform",
  "objectKey": "release-recovery/11111111-1111-4111-8111-111111111111/database.json.gz"
}
```

The standalone command has a 180-second event-loop deadline, exiting 124 on deadline; SIGTERM exits 143 and SIGINT exits 130. Those exits close process sockets but do not prove a dispatched R2 PUT was rolled back or remote files were removed. They retain partial evidence and never print completion. A lost SSH connection likewise does not establish remote termination. Normal completion is printed only after resource closure. Synchronous JSON/gzip can delay the timer callback; it is not a strict CPU-time bound. The dispatch wrapper must enforce an independent process timeout and use a longer observation budget and directly verify the exact remote process/files before marking cleanup complete.

Capture requires an unexpired approval no more than 24 hours ahead. Runtime identity is compared with platform-injected values; it is an operator trust boundary, not cryptographic remote attestation. The database reference is SHA-256 of `projectId|DATABASE_URL hostname|current_database()`. R2 credentials are decrypted only in memory from that database's configured settings and never printed. The private snapshot may contain sensitive records and encrypted settings; it must not be attached to public reviews or logs.

```sh
node release-recovery.mjs capture --approval approval.json --intent capture-intent.json --receipt capture-receipt.json
node release-recovery.mjs retrieve --approval approval.json --capture-receipt capture-receipt.json --output database.json.gz --receipt retrieval-receipt.json
```

Before PUT, capture fsyncs `capture-intent.json` with `status: dispatch-intent` and `plannedReceipt`. The planned receipt contains schemaVersion 1, status `captured`, the canonical approval SHA-256, object key, compressed SHA-256/length, table/row counts and creation time. The `captured` field **inside intent is a plan, not a success assertion**. Only after exact GET/hash/manifest acknowledgment and advisory unlock does capture fsync the separate capture receipt. A successful command prints only `{status: complete, mode, resourcesClosed: true}`. Failure prints one generic `failed-or-uncertain` message; partial outputs are preserved verbatim. No snapshot bytes or credential-bearing exceptions reach stdout/stderr.

For an ambiguous PUT, retain the intent. An independently reviewed extraction of its `plannedReceipt` into a new canonical file allows the GET-only retrieval mode to resolve the exact planned key/hash without repeating capture. Retrieval does not require the original capture expiry still to be live, but continues to require the same runtime/database/source identity. Wrong bytes, missing objects or manifest mismatch fail; output remains empty unless verification succeeded. A source redeployment requires a newly reviewed identity/recovery procedure, not editing the receipt to bypass binding.

Local fsync is not deployment-lifecycle durability. The dispatch wrapper must retain the approval, exact key, artifact digest and attempt identity outside Railway **before** dispatch, retrieve intent/receipt privately even on ambiguous exit, and directly verify removal of its exact temporary files/process. The CLI makes no claim that those external wrapper steps occurred. If receipt delivery is lost, preserve the object and attempt for explicit recovery; never infer no write. Retrieval output is a private file, so transport must not print its payload into tool logs. The wrapper is separately owned and reviewed.

Local validation uses `RELEASE_RECOVERY_TEST_DATABASE_URL` only with `127.0.0.1/core_release_recovery_test` and no URL options. Run `npx vitest run server/scripts/release-recovery-support.test.ts server/scripts/release-recovery.database.test.ts`. Real PostgreSQL coverage proves a concurrent committed change does not enter the established snapshot, actual `restoreBackupSnapshot` restores JSON/zero/false and sequence behavior, and the shared advisory lock rejects overlapping capture. Synthetic object tests cover intent failure, changed identity, existing objects, uncertain PUT and mismatched readback. No live provider behavior is claimed by these tests.

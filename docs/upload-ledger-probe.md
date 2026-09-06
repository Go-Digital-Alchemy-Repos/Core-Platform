# Audit-only external ledger probe

Root-reviewed operator harness. Root executed and verified one separately approved
audit-only attempt; see `maintenance-operations-checkpoint.md` for evidence. Every
future attempt still requires fresh probe approval. This command writes audit
records only, never media. It does not change upload freeze, bucket settings or
database records and cannot list or delete objects. Run both modes against the
genuine source deployment environment; no fabricated Railway identity values.

The separate built artifact is `dist/operations/probe-upload-ledger.mjs`. Build with `npm run build`, or use the dedicated `buildUploadLedgerProbe()` helper. Normal application startup does not import it. Deliver the artifact and production dependencies through the reviewed path and retain its hash independently before use.

## Inputs and authorization

Use an existing validated v2 one-object source plan as the identity/record evidence. Approve a **fresh** UUID and derived audit prefix for this probe. This does not approve copying that media object. Retain exact input bytes, artifact hash, bucket, attempt UUID and all eight derived keys in operator-controlled durable storage before invoking the command.

Both files must be separate operator-owned regular files, mode0600, at most64KiB; final symlinks and inode aliases are rejected. Probe approval is strict:

```json
{
  "schemaVersion": 1,
  "action": "probe-immutable-upload-audit",
  "sourceApproval": {
    "schemaVersion": 1,
    "planId": "SYNTHETIC_PLAN_ID",
    "ownershipReference": "SYNTHETIC_INDEPENDENT_REVIEW",
    "sourceIdentity": {
      "railwayProjectId": "SYNTHETIC_PROJECT",
      "railwayEnvironmentId": "SYNTHETIC_ENVIRONMENT",
      "railwayServiceId": "SYNTHETIC_SERVICE",
      "deploymentId": "SYNTHETIC_DEPLOYMENT",
      "gitCommitSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "databaseIdentityReference": "sha256:SYNTHETIC_DATABASE_BINDING"
    },
    "target": {
      "stackId": "core-platform",
      "bucketName": "SYNTHETIC_BUCKET",
      "uploadPrefix": "clients/core-platform/uploads"
    }
  },
  "planSha256": "SHA256_OF_EXACT_PLAN_FILE_BYTES",
  "attemptId": "c727b6af-6ad8-499d-8dbe-896f7cc89b42",
  "bucketName": "SYNTHETIC_BUCKET",
  "prefix": "operations/legacy-upload-ledgers/SHA256_OF_PLAN_ID_STRING/c727b6af-6ad8-499d-8dbe-896f7cc89b42",
  "maxRecords": 8,
  "maxRecordBytes": 8192,
  "expectedRecords": 2
}
```

This is a synthetic shape, not executable approval. Source approval must bind the exact plan, genuine source deployment/database, authoritative record, and configured bucket. SHA256 values are lowercase64-hex; the planId-prefix hash uses UTF-8 bytes of the planId string. The probe approval cannot satisfy the actual apply approval parser. No writer-drain attestation is requested because no media dispatch occurs. Conversely, this probe establishes no writer barrier and changes none of the actual apply freeze/drain requirements.

## Root execution sequence

1. Retain the approvals/locator outside the deployment and verify the applicable bucket retention/access policy. A completed-object expiration or inaccessible evidence defeats the purpose even if the command succeeds. Existing root evidence about the actual bucket remains separate from this synthetic harness.
2. Invoke the probe in the actual source process environment, capturing its one JSON stdout record to a new operator-controlled durable receipt file with mode0600. A local remote-command client may capture stdout there; do not rely solely on a receipt in the application's ephemeral filesystem.

```sh
node dist/operations/probe-upload-ledger.mjs --probe --plan /secure/source-plan.json --approval /secure/probe-approval.json
```

3. Require exit0 and `complete:true`. Retain the receipt's two SHA256 values and its planId, attemptId, bucket, prefix and approval-file hash. No provider credentials are included. Upload the retained receipt as a separate owned0600 file for a **separate Node process** to read; verify its bytes match the independently retained receipt.

```sh
node dist/operations/probe-upload-ledger.mjs --verify --plan /secure/source-plan.json --approval /secure/probe-approval.json --receipt /secure/retained-probe-receipt.json
```

4. Require exit0, `complete:true` and `verification:"fresh-process-exact-GET"`. Retain this second result with the original receipt and independent invocation/process evidence. This path performs read-only database identity/credential checks and two exact R2 GETs; no PUT capability is passed to its verifier. It validates the retained hashes, record index, chain, invocation nonce, terminal marker and input approval binding.

The only written keys are `<approved-prefix>/000000.json` and `000001.json`. The first is the header; the second is the terminal result. They use the existing reviewed sink's event names but cannot contain a media dispatch intent. Each write requires bounded PUT plus exact GET acknowledgment, and source verification precedes each audit PUT. All other six possible keys remain unwritten by this probe. Keep the records; cleanup is not implemented or authorized.

If any stage times out, loses output or rejects, preserve the attempt locator and records. Do not reuse that attempt prefix. An existing header blocks further writes, even if it belongs to the same approved plan. An incomplete attempt may contain one or both records; an audit PUT can succeed despite a lost response. A future attempt needs fresh approval/UUID. Never infer media effects from this probe: it does not read source-media bytes or request media writes.

## Evidence limits

Separate-process read-back demonstrates that the acknowledged records are externally readable independently of the original process's memory/files. It does not simulate deployment removal, guarantee future retention, prove immutable bucket policy, or establish ongoing account access. Bucket lifecycle/access evidence and operator retention of the input/receipt locator remain required. Source-record changes while uploads are live may cause the probe to fail conservatively; do not freeze production merely to make this audit-only probe pass.

Local checks: focused probe/sink/apply tests and `python3 script/verify-upload-ledger-probe-artifact.py`. The latter exercises detached actual Node argument rejection only, without source/TSX or provider credentials.

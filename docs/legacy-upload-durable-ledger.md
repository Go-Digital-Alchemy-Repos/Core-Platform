# External durable upload ledger

Status: design accepted by Orchestrator for isolated operator implementation; runtime acceptance remains pending. No copy or audit-object writes are authorized by this document. Implement in the isolated operator branch; keep the maintenance candidate unchanged.

Use the configured R2 account and approved bucket for a separate immutable audit ledger. This removes dependence on the source deployment's filesystem lifetime. It does not provide retention against privileged deletion, bucket lifecycle rules, or account loss. Before use, approve the bucket's retention/access policy for these sanitized records and retain the input approvals and attempt locator independently of the deployment.

## Explicit authorization

Keep the existing v2 exact-one-media-object plan, apply-specific approval, source identity verification, and writer-drain attestation unchanged. Add a mutually exclusive R2 ledger mode to the apply command:

```
--apply --plan FILE --approval FILE --writer-drain FILE --r2-ledger-approval FILE
```

The existing `--ledger NEWFILE` mode remains valid only with a separately verified persistent mount. The new approval is a fourth independent owned0600, bounded regular input file. Reject duplicate inodes across all inputs. It authorizes **additional audit-object writes**, separately from the one media copy; dry-run authorization cannot satisfy it.

Proposed strict approval fields:

- `schemaVersion: 1`, `action: "create-immutable-upload-audit"`.
- `planId`, exact `sourceIdentity`, and exact media `target`, matching the existing approved plan.
- `mediaApprovalSha256` and `writerDrainSha256`, hashes of the actual input bytes, retained by the operator. Hash raw bytes to avoid ambiguous JSON canonicalization; changing formatting requires fresh approval.
- `attemptId`: operator-selected UUID, unique for this invocation and recorded outside the source deployment before starting.
- `bucketName`: must equal the already approved/configured media bucket; no extra account/bucket discovery.
- `prefix`: exactly `operations/legacy-upload-ledgers/<sha256-of-planId>/<attemptId>`. Validate the full derived value and reject overlap with source or destination objects/prefixes. This dedicated location is not a media namespace.
- `maxRecords: 8`, `maxRecordBytes: 8192`, and a bounded human `approvalReference`.

The operator retains the exact four inputs, their hashes, artifact hash, bucket and attempt prefix on operator-controlled durable storage **before invocation**. Knowing this locator is necessary to retrieve records after losing the remote shell/deployment. Neither separate files nor an approval reference certify independent human review.

## Record and acknowledgment contract

Keys are derived only from the approved prefix and sequential index: `000000.json` through `000007.json`. No arbitrary key supplied by a caller; no listing, deletion, or overwrite operation. Each append is serialized; concurrent append calls are rejected. Record zero is the binding/header record and must not preexist when a fresh attempt starts. Never reopen an old attempt for further media dispatch. Check header absence before creating it, and include a fresh process-generated invocation nonce in its bytes: two concurrent invocations sharing an approved attempt then conflict, while a matching GET can resolve only this invocation’s ambiguous header PUT.

Each record is UTF-8 JSON with stable field ordering and a strict bounded schema: version, attemptId, planId, index, previous-record SHA-256 (null for the first record), approval digest, event, and whitelisted event values. Hash the exact serialized bytes. The next record includes that hash; the terminal record is the immutable completion marker. There is no mutable index pointer. The operator can retrieve the eight known keys without a LIST permission. A hash chain detects substitution/gaps relative to retained approvals and acknowledgments; it is not a signature or protection against a privileged actor rewriting the entire bucket.

Whitelist events: start, dispatch-intent, object-result, finished, failed. Store generic outcome/status codes, complete/possibleRemoteWrite booleans and approved object digest/length where needed. Exclude raw provider errors, credentials, signed URLs, source filenames, full drain/operator-reference text and record payloads. Bind sensitive input details through retained-input hashes rather than copying them to a possibly public bucket. Set application/json and no-store metadata; those headers do not establish access control.

Reuse the existing injected create-only adapter with an 8192-byte bound, a finite operation deadline, and SDK maxAttempts1. For each append:

1. Serialize once, enforce index/event/byte bounds, derive exact key and expected hash.
2. Send conditional PUT with `If-None-Match: *`.
3. Whether PUT succeeds, conflicts, or fails ambiguously, perform bounded exact GET to resolve the current key. Accept append only when the returned length and complete bytes/hash match the intended record. A preexisting conflicting record is fatal. A matching record observed after a failed PUT is sufficient acknowledgment of persisted bytes for this attempt, not proof that this request created it.
4. Only after acknowledgment, advance index/hash and return. No unresolved append can unblock media dispatch.

The apply-start/header and dispatch-intent append calls are already awaited before media PUT. Once the R2 append acknowledges them, the intent survives loss of the application filesystem. If PUT times out and GET cannot verify, stop the attempt; a late audit write may still appear, but **no media PUT is permitted by that failed append**. Do not skip the index, rewrite, retry in a background task, or emit a later success marker. A terminally failed sink rejects subsequent appends. Current failure handling may therefore be unable to record an additional failure; the absence of a verified finish remains uncertain.

After media PUT, retain existing exact-object byte verification. Await the acknowledged object-result and finished records before reporting complete. A failed result append does not undo the media copy. Report generic failure/possible remote write and preserve everything. R2 unavailable after copy means incomplete audit, not failed media delivery.

## Restart and retry

Never use an old ledger marker to bypass source or destination checks. Every process restart/retry gets a newly approved attempt UUID/prefix and refreshed source/drain binding when deployment identity changed. The existing executor rereads the source identity/record and source/destination bytes. Matching destination bytes produce a verified-existing result without a second media PUT; conflicting bytes stop. Retain all previous attempt locators. Interrupted attempts and partial chains remain inspectable under their known eight exact keys.

No historical ledger continuation is needed in this slice. This deliberately avoids resurrecting a stale dispatch intent or relying on lost in-memory state. The operator can use exact-key GETs to inspect prior chains; automated evidence export/verification can be a bounded helper if required, without listing.

## Proposed implementation surface

- New `server/scripts/legacy-upload-r2-ledger.ts` and focused tests: strict approval/record validation, prefix derivation, serialized create-only append/GET acknowledgment, hash chain and fail-closed state.
- Existing operator-only apply CLI/support/tests in this isolated branch: retain input raw-byte hashes, validate fourth-file independence, select local or R2 sink, and expose a sanitized attempt locator. Keep source/media verification callbacks unchanged.
- Existing separate operator packaging helper/artifact smoke only if CLI contract needs updated rejection tests; normal application entrypoint stays unchanged.
- This document plus operator usage documentation with synthetic examples. No shared runtime, migration, database, provider configuration, dependency, or infrastructure changes.

## Required synthetic tests

Prove: wrong approval/source/target/hash/prefix/attempt/limits and inode collisions fail before audit/media writes; header and intent are acknowledged before media PUT; matching/conflicting conditional races; PUT timeout with matching GET versus missing/stalled GET; hash mismatch/truncated/oversized body; chain/index bounds and concurrent appends; no next-index progression after ambiguity; postcopy result failure reports uncertainty and preserves destination; restart with a new approved prefix verifies existing media without recopy; replaying an old attempt prefix fails before media dispatch; no credentials/raw errors enter audit bytes. Reuse storage deadline tests and add CLI ordering tests with injected synthetic adapters. Build the detached operator artifact and verify missing/invalid arguments with actual Node and no source/TSX.

A real external-storage durability acceptance probe and actual copy remain separately approved actions. Synthetic tests and observed PUT+GET acknowledgment cannot alone certify configured bucket retention or operator access after deployment replacement.

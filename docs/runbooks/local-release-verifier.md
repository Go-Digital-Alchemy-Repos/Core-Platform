# Offline local release receipt verifier, version 1

This is preparation for a separately approved source-bound release verifier. It does not publish a status, handle a signing key, change protection, use Actions, or authorize deployment. Run a reviewed, pinned copy of `script/verify-local-release-receipt.py`; never automatically trust the validator shipped by an unreviewed candidate.

```sh
python3 /trusted/pinned/verify-local-release-receipt.py \
  --evidence-dir /private/release-evidence \
  --manifest manifest.json \
  --checkout /designated/clean/candidate \
  --expected-candidate FULL_COMMIT_SHA \
  --expected-tree FULL_TREE_SHA \
  --expected-base FULL_BASE_COMMIT_SHA
```

The caller supplies expected identities independently of the manifest. All three must be lowercase, full 40-character Git SHAs. The fixed Git queries check candidate HEAD, tree, clean tracked/untracked state and base ancestry before and after verification. No receipt command is executed. Git environment overrides are removed and filesystem-monitor/hooks are disabled for these queries. This does not fetch or determine the latest remote main; the caller must establish the intended base independently. Ignored build outputs are checked through copied evidence hashes, not Git cleanliness.

## Strict manifest contract

The root object contains exactly these fields; unknown fields and duplicate JSON keys anywhere are rejected. NaN/Infinity and unsupported versions are rejected. There are no command, token, environment, URL, password or arbitrary justification fields.

| Field | Contract |
| --- | --- |
| `version` | Integer `1`; booleans and future versions fail. |
| `profile` | `core` or `crm`. CRM is mandatory when the checked candidate tracks `shared/schema/crm-custom-fields.ts`. A core profile on that candidate fails. New layouts or profiles require a reviewed validator update. |
| `candidate`, `tree`, `base` | Match the independently supplied expected SHAs. |
| `operator` | Bounded identifier, not a credential. |
| `observations` | Exactly `cleanBefore: true`, `cleanAfter: true`. These historical assertions accompany the independently checked current checkout. |
| `evidence` | 1–128 entries, each exactly `{path, sha256, sanitized: true}`; unique relative paths and lowercase SHA-256. |
| `gates` | Exactly the complete profile-specific set below. |
| `artifacts` | Exactly `application`, `deploymentConfig`, `uploadVerifier`, `uploadApply`, each referencing a distinct inventory path. Copy the actual built/config artifacts into the evidence directory. |
| `review` | Exactly `{reviewer, accepted: true, candidate, tree, base, bundleSha256}`. Reviewer differs from operator and accepts the same identities and whole bundle. |

Each gate contains exactly `{id, candidate, tree, base, status, exitCode, testsPassed, testsSkipped, optInGateExclusions, evidence, cleanup, inputs}`. Status must be `passed`, exit code integer zero, and identities must match. Counts are bounded nonnegative integers; database/browser/pilot/ordinary-test gates require positive passes. Evidence is a nonempty list of unique inventory references. Every inventory file must be referenced by a gate or artifact.

All gates require zero skipped tests except `ordinary-tests`. The ordinary full suite intentionally skips opt-in database files: retain its actual raw skipped count. If positive, its `optInGateExclusions` must equal the fixed database gate IDs present in the selected profile. All those separate gates must pass with positive counts and zero skips. Other gates require an empty exclusions list. This distinguishes command/gate completion from ordinary-suite raw skip totals; it does not infer which test cases were skipped by parsing logs. The trusted normalizer/reviewer must confirm those skips belong to the documented opt-in suites. No free-form reason or additional gate exemption is accepted.

Fixture-bearing gates require exactly `{containersRemoved: true, volumesRemoved: true, processesStopped: true}` in `cleanup`. Gates without fixtures require null. These assertions must be backed by their referenced cleanup evidence, including owned fixture identities; they are not independently discovered from a historical runtime by this offline program.

## Required gates and pinned inputs

Core requires all 19 gates:

- `locked-dependencies`, `types`, `lint`, `format`, `ordinary-tests`;
- `deployment-config-source`, `deployment-config-compiled`;
- `fresh-migrations-twice`, `historical-populated-upgrade`;
- `backup-form-reservation-ny`, `backup-form-reservation-utc`, `atomic-settings`;
- `build`, `bundle-budget`, `detached-upload-verifier`, `detached-upload-apply`;
- `production-runtime`, `application-browser`, `better-farms-pilot`.

CRM additionally requires `crm-persistence`, `crm-mapping`, `crm-profile-migration`, `crm-populated-upgrade`, and `crm-capture-restore` (24 total). Gate IDs remain separate even when one actual command executes several suites; its receipt may be referenced by each applicable gate.

`inputs` is exactly empty except:

- `better-farms-pilot`: `{"siteCommit":"7fd1298beb373ee447aa97f578fb11e575faf8f0"}`;
- `historical-populated-upgrade`: `{"baselineCommit":"a006f36a3c4f37566c71b278d561844b45fb3b81"}`;
- `crm-populated-upgrade`: `{"baselineCommit":"a99bb7efeb4c007789c20da91ff0e2d395452836"}`.

These pins come from the reviewed local validation runbook at the initial verifier baseline. Changing the approved pilot or historical baselines requires a reviewed verifier policy update. Target-production environment preflight, production reconciliation, operational barriers and deployment authorization remain separate; they cannot be inferred from this offline local gate.

## Evidence and review integrity

Files are opened relative to the evidence-directory descriptor with `O_NOFOLLOW`, including every intermediate directory. Absolute paths, traversal, symlinks, hard links, devices, directories and FIFOs are rejected. Manifest size is capped at 256 KiB; evidence is capped at 32 MiB per file and 256 MiB total. Size and timestamp observations detect changes during reads. The validator reports no file contents or supplied secret values. Evidence must remain stable and retained after verification; no filesystem hash can prevent subsequent deletion or replacement.

Compute the review binding over the manifest without its `review` key using Python's `json.dumps(body, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()` and SHA-256. This canonicalization is part of V1. Updating an evidence digest, gate, identity or observation invalidates the existing review binding. The reviewer must accept that exact digest; a normalizer must not silently regenerate an acceptance on the reviewer's behalf.

This verifies structure, declared identities, bounded files and hash consistency. It **does not prove** that commands ran, outputs are genuine, evidence contains no secret, counts are accurate, cleanup occurred, or the stated reviewer really accepted the bundle. The `sanitized` fields are required attestations, not a secret scanner. Preparing sanitized evidence and authenticating operator/reviewer approval remain responsibilities of the trusted process. Identity strings and a digest are not signatures or independent GitHub principals. Success deliberately reports `attestationTruth: "not-established"` and `releaseApproved: false`.

Existing private receipts use different schemas. A separately reviewed normalizer is still needed to inventory copied, sanitized evidence and express this contract without modifying the originals. No production receipt has been normalized or accepted by this implementation.

## Validation

Run standard-library tests without dependencies:

```sh
python3 -m unittest discover -s script -p test_verify_local_release_receipt.py -v
```

Tests use temporary synthetic Git checkouts and evidence. They exercise both gate profiles, actual CLI identity checks, failed/missing/duplicate gates, review binding, declared skips, fixed input pins, artifact changes, unknown fields, unsafe files, JSON duplicates and bounded reads. No provider, production fixture or remote GitHub operation is used.

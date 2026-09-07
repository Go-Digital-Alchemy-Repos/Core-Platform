# Offline local release receipt verifier, version 4

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

## Policy upgrade and historical receipts

V4 targets the category-integrity and CRM note-attribution runtime generation at `e2fda41fddc30bdde47f3b85d48d93aec28dee7f` (tree `b9a767f4c3fe6f8526b7d21a8a40bef95cefdddc`). It adds two mandatory gates and two suite pins, and updates only the two reviewed WooCommerce suite hashes for execution-version fixtures. The other ten V3 suite pins and counts remain unchanged. A changed candidate still requires its own complete execution evidence; the source generation pin is a reviewed coverage policy, not permission to reuse historical passes.

The trusted V3 artifact at `737919d6ca415fe1b95996d2d2265764c657e081` and all f485330 receipts remain unchanged. Earlier candidates use their original V3/V2/V1 verifier. Never relabel old evidence or regenerate its acceptance. This separate script accepts only V4 and requires a fresh independently reviewed bundle. In particular, the conservative CRM storage trigger below deliberately requires attribution coverage on this runtime generation even when presentation files are removed.

## Strict manifest contract

The root object contains exactly these fields; unknown fields and duplicate JSON keys anywhere are rejected. NaN/Infinity and unsupported versions are rejected. There are no command, token, environment, URL, password or arbitrary justification fields.

| Field | Contract |
| --- | --- |
| `version` | Integer `4`; V1/V2/V3, booleans and unknown versions fail. |
| `profile` | `core` or `crm`. CRM is mandatory when the checked candidate tracks `shared/schema/crm-custom-fields.ts` or `migrations/0062_crm_custom_fields.sql`. A core profile on that candidate fails. New layouts or profiles require a reviewed validator update. |
| `candidate`, `tree`, `base` | Match the independently supplied expected SHAs. |
| `operator` | Bounded identifier, not a credential. |
| `observations` | Exactly `cleanBefore: true`, `cleanAfter: true`. These historical assertions accompany the independently checked current checkout. |
| `evidence` | 1–128 entries, each exactly `{path, sha256, sanitized: true}`; unique relative paths and lowercase SHA-256. |
| `gates` | Exactly the complete profile-specific set plus obligations independently derived from tracked source below. |
| `artifacts` | Exactly `application`, `deploymentConfig`, `uploadVerifier`, `uploadApply`, each referencing a distinct inventory path. Copy the actual built/config artifacts into the evidence directory. |
| `review` | Exactly `{reviewer, accepted: true, candidate, tree, base, bundleSha256}`. Reviewer differs from operator and accepts the same identities and whole bundle. |

Each gate contains exactly `{id, candidate, tree, base, status, exitCode, testsPassed, testsSkipped, optInGateExclusions, evidence, cleanup, inputs, testSuites}`. Status must be `passed`, exit code integer zero, and identities must match. Counts are bounded nonnegative integers; database/browser/pilot/ordinary-test gates require positive passes. Evidence is a nonempty list of unique inventory references. Every inventory file must be referenced by a gate or artifact.

All gates require zero skipped tests except `ordinary-tests`. Every database gate requires `testSuites` equal to its sorted reviewed inventory of `{path, sourceSha256, testsPassed, testsSkipped: 0}`. Other gates require `testSuites: []`. The gate's aggregate passed count must equal the sum of its suite counts. A combined command receipt may support several gates, but each gate records only its own suite totals. Both timezone gates separately require the full backup/form/reservation inventory.

The ordinary skipped count must equal the sum of unique applicable suites' reviewed `ordinarySkipped` values; its exclusions must equal exactly the required database gate IDs. This is 118 skips and twelve exclusions for the full e2fda41 policy, not a universal future count. The same three suites run in NY and UTC are counted only once in ordinary exclusions. CRM persistence has 24 enabled tests but only 18 ordinary skips because six execute ordinarily. A source/count change requires a reviewed policy update with actual execution evidence; the checker does not infer TypeScript parameterized test totals.

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

V4 retains these additional obligations derived these obligations from the **tracked candidate tree**, not manifest claims or test-file names:

| Tracked migration | Required database gate | Actual suite to execute |
| --- | --- | --- |
| `migrations/0061_standalone_locations.sql` | `standalone-migration` | `server/migrate-standalone-locations.database.test.ts`: recreate the supported existing-schema/no-journal condition, verify nullable user reconciliation, retained users/profile media and standalone creation. |
| `migrations/0063_atomic_ecommerce_fulfillment.sql` | `atomic-fulfillment` | `server/storage/ecommerce-atomic-fulfillment.database.test.ts`: actual transaction/concurrency and idempotent fulfillment behavior against the explicitly owned fixture. |

Each additional gate requires positive `testsPassed`, zero `testsSkipped`, exit zero, bound evidence and all three cleanup attestations. They are also mandatory members of ordinary-suite opt-in exclusions when that suite reports skips. A combined CRM+0061+0063 candidate requires 26 gates; a core+0061+0063 candidate requires 21. The CLI computes this obligation before and after verification from Git's tracked tree. Tests or migrations merely existing do not prove execution: the trusted normalizer and independent reviewer must inspect actual suite outputs and cleanup receipts, while this verifier checks the declared structure and hashes only.

The `application-browser` gate means the complete candidate application suite, including the six added atomic-fulfillment browser cases (desktop/mobile), alongside existing checkout/account recovery, manual transaction, settings and CRM coverage where present. Do not report only the earlier settings or CRM subset as the full gate. The offline checker does not parse browser test titles to authenticate that coverage; the reviewer must establish it from the actual complete-run output and source inventory. Better Farms remains separately pinned and required.

### Additional runtime and suite obligations

- `crm-follow-ups`: required by `server/storage/crm-follow-ups.database.test.ts` or any of `server/storage/crm-follow-ups.storage.ts`, `server/services/crm-follow-ups.service.ts`, `server/routes/admin/crm-follow-ups.routes.ts`.
- `woo-catalog-rollback`: required by either `server/services/woocommerce-import-rollback.database.test.ts` or `server/services/woocommerce-import-merchant-race.database.test.ts`, or their shared runtime repository `server/services/woocommerce-import-drizzle.repository.ts`. Both test suites are required even when only one trigger is present.
- `category-parent-integrity`: required by `server/storage/ecommerce-category-parent.database.test.ts`, `server/services/ecommerce-category-graph.ts`, or `migrations/0064_woo_import_execution_version.sql`.
- `crm-note-attribution`: required by `server/storage/crm-note-attribution.database.test.ts`, `server/storage/crm.storage.ts`, `shared/crm-note-presentation.ts`, or `client/src/features/admin/crm-note-list.tsx`. The storage trigger prevents removing only the tests or presentation files from suppressing coverage.


Full CRM + standalone + fulfillment + follow-ups + Woo rollback + category integrity + note attribution requires 30 gates. A receipt profile cannot suppress these source obligations. Runtime presence with missing corresponding test files fails closed.

The `DB_SUITES` policy pins all fourteen suite source hashes matching candidate `e2fda41fddc30bdde47f3b85d48d93aec28dee7f`:

| Suite (under `server/`) | Enabled passes | Ordinary skips |
| --- | ---: | ---: |
| `services/system-backup.database.test.ts` | 7 | 7 |
| `storage/forms-effects.database.test.ts` | 8 | 8 |
| `storage/ecommerce-reservation-expiry.database.test.ts` | 4 | 4 |
| `__tests__/settings-atomic.db.test.ts` | 5 | 5 |
| `storage/crm-custom-fields.database.test.ts` | 24 | 18 |
| `storage/crm-form-mapping.database.test.ts` | 11 | 11 |
| `migrate-crm-profile.database.test.ts` | 4 | 4 |
| `migrate-standalone-locations.database.test.ts` | 1 | 1 |
| `storage/ecommerce-atomic-fulfillment.database.test.ts` | 14 | 14 |
| `storage/crm-follow-ups.database.test.ts` | 7 | 7 |
| `services/woocommerce-import-rollback.database.test.ts` | 4 | 4 |
| `services/woocommerce-import-merchant-race.database.test.ts` | 16 | 16 |
| `storage/ecommerce-category-parent.database.test.ts` | 17 | 17 |
| `storage/crm-note-attribution.database.test.ts` | 2 | 2 |

This yields 143 database executions across required gates, including 19 repeated timezone cases, and 118 unique ordinary skips. These are expected policy counts until actual candidate receipts prove the runs.

The category suite uses `CATEGORY_PARENT_TEST_DATABASE_URL` and exactly loopback `/core_category_parent_test`; it covers migration0064 replay, graph races and execution compatibility. The note suite uses `CRM_NOTE_TEST_DATABASE_URL` and exactly loopback `/core_crm_note_test`, parameterized once for lead notes and once for client notes. Both require positive exact passes, zero skips, source-bound suite inventory and explicit owned container, volume and process cleanup. Fixture credentials are never manifest fields.

V4 does not authorize creating Woo runs, changing production data, narrowing the version constraint on rollback, or continuing1.1 checkpoints in old binaries. Those operational and deployment decisions remain separate.


Before and after verification, required suite bytes must match policy hashes. Unknown tracked `.database.test.ts` / `.db.test.ts` files or test/spec files containing direct `describe`, `test`, or `it` `.skipIf`, `.runIf`, or `.skip` markers are rejected. Discovery is deliberately conservative and may reject comments containing those markers. It is **not a general TypeScript parser**: novel aliases, computed properties, wrappers or extensions can evade that marker scan. Independent source review remains required to establish that all opt-in suites are represented; unknown conventions require a reviewed detector/policy extension. Known pinned sources cover their existing aliases.

Synthetic tests substitute explicit synthetic suite pins into a temporary verifier copy to exercise the CLI without depending on private or external repositories. These fixture passes are not candidate execution receipts. Per-suite metadata and source hashing prove consistency, not that claimed tests executed or their implementation is adequate.

`inputs` is exactly empty except:

- `better-farms-pilot`: `{"siteCommit":"7fd1298beb373ee447aa97f578fb11e575faf8f0"}`;
- `historical-populated-upgrade`: `{"baselineCommit":"a006f36a3c4f37566c71b278d561844b45fb3b81"}`;
- `crm-populated-upgrade`: `{"baselineCommit":"a99bb7efeb4c007789c20da91ff0e2d395452836"}`.

These pins come from the reviewed local validation runbook at the initial verifier baseline. Changing the approved pilot or historical baselines requires a reviewed verifier policy update. Target-production environment preflight, production reconciliation, operational barriers and deployment authorization remain separate; they cannot be inferred from this offline local gate.

## Evidence and review integrity

Files are opened relative to the evidence-directory descriptor with `O_NOFOLLOW`, including every intermediate directory. Absolute paths, traversal, symlinks, hard links, devices, directories and FIFOs are rejected. Manifest size is capped at 256 KiB; evidence is capped at 32 MiB per file and 256 MiB total. Size and timestamp observations detect changes during reads. The validator reports no file contents or supplied secret values. Evidence must remain stable and retained after verification; no filesystem hash can prevent subsequent deletion or replacement.

Compute the review binding over the manifest without its `review` key using Python's `json.dumps(body, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()` and SHA-256. This canonicalization is unchanged from V1. Updating an evidence digest, gate, identity or observation invalidates the existing review binding. The reviewer must accept that exact digest; a normalizer must not silently regenerate an acceptance on the reviewer's behalf.

This verifies structure, declared identities, bounded files and hash consistency. It **does not prove** that commands ran, outputs are genuine, evidence contains no secret, counts are accurate, cleanup occurred, or the stated reviewer really accepted the bundle. The `sanitized` fields are required attestations, not a secret scanner. Preparing sanitized evidence and authenticating operator/reviewer approval remain responsibilities of the trusted process. Identity strings and a digest are not signatures or independent GitHub principals. Success deliberately reports `attestationTruth: "not-established"` and `releaseApproved: false`.

Existing private receipts use different schemas. A separately reviewed normalizer is still needed to inventory copied, sanitized evidence and express this contract without modifying the originals. This V4 implementation does not retroactively normalize or accept a production receipt. Historical V1 evidence remains bound to its pinned verifier and original policy.

## Validation

Run standard-library tests without dependencies:

```sh
python3 -m unittest discover -s script -p test_verify_local_release_receipt.py -v
```

Tests use temporary synthetic Git checkouts and evidence. They exercise both gate profiles, actual CLI identity checks, failed/missing/duplicate gates, review binding, declared skips, fixed input pins, artifact changes, unknown fields, unsafe files, JSON duplicates and bounded reads. No provider, production fixture or remote GitHub operation is used.

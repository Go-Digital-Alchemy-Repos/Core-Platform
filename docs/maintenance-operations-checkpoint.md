# Maintenance operations checkpoint — 2026-09-06

The application release candidate remains immutable at
`6ea326ae620b5fcd4b5c10ef1cd1f62724e0c230`. Root rechecked hosted run
[34006542042](https://github.com/Go-Digital-Alchemy-Repos/Core-Platform/actions/runs/34006542042):
completed successfully for that exact SHA. The candidate worktree was clean.
This supersedes the pending final-head CI statement in the earlier release-gates
document; its ordered live cutover obligations still apply.

Read-only Railway project inventory showed one production environment, the Core
Platform application service and its database service, with no additional service
or cron schedule in this project. The application had one active deployment,
`b620280d-6445-4ba8-bb23-b6e9226391d9`, status SUCCESS. The database had one active
deployment, `f7f939c7-c087-4f95-a46c-083b869cbca2`, status SUCCESS. Service-level
start-command overrides were null. This inventory does not yet prove replica count,
the actual process command, termination of future replaced writers, or absence of
writers outside this Railway project. No production configuration changed.

Follow-up deployment metadata and read-only SSH inspection confirmed the running
commit is `a006f36a3c4f37566c71b278d561844b45fb3b81`. Its adopted manifest has one
replica in `us-east4-eqdc4a`, zero volume mounts, `npm start`, readiness at
`/api/health/ready`, and no configured drainingSeconds. Actual process inspection
showed PID 1 `npm start` and a child Node process running `dist/index.cjs`.
The inspected replica was `76dd0019-32c0-4bc3-9c8b-9b3cffdd5633`; upload freeze was
false. The two preceding deployments were REMOVED. This confirms the current
single-replica topology and absence of a persistent application volume; it does
not prove termination of writers created during the future freeze transition.
The new transaction activation flag was not true in the environment, but the old
binary does not implement the candidate's flag guard, so this is not evidence of
provider transaction admission being disabled in the running application.

Authenticated Cloudflare inspection resolved the completed-object lifecycle
question as recorded in `legacy-upload-durable-ledger.md`. The application token
was not expanded. A separately authorized audit-only persistence probe is being
prepared; it must expose no media-copy operation and allow independent GET-only
verification. Actual upload freeze, refreshed copy approval and writer barrier
remain prerequisites for media migration, not for this audit-only probe.

CRM custom-field API work was accepted independently on its isolated branch at
`64b98ef`; it is not part of this maintenance candidate. Definition UI and atomic
manual creation/conversion remain in progress under separate ownership.

## External audit persistence accepted

Root reviewed the isolated audit-only probe and reran 22 probe/sink tests plus the
detached compiled entrypoint checks. Artifact SHA256:
`867b7d39cc1366fb612e009cced656eb8e3c075a7e7738f09403572c6fb2c25d`.
Under the user's autonomous maintenance authorization, root prepared a fresh
probe-only approval and retained exact inputs and artifact outside Railway in an
operator-owned directory. Two separate Railway SSH invocations delivered owned
temporary files, checked artifact/input hashes, executed distinct Node processes,
and removed their temporary runtime directories in finally blocks.

The first returned exit 0, complete true and two audit-record hashes. The second
returned exit 0, complete true and `fresh-process-exact-GET`, validating both exact
records against the independently retained receipt. Attempt UUID:
`2dda8b0c-a1e9-49ed-bd2e-ca05bf7ece04`. Inputs and both receipts are retained under
`/Users/mike/Documents/Core Platform Operations/ledger-probe-2dda8b0c-a1e9-49ed-bd2e-ca05bf7ece04`.
Only the two approved audit objects were written; no media copying, database
mutation, freeze change, listing, deletion or bucket configuration change occurred.

This accepts external persistence and separate-process retrieval for the operator
ledger together with the recorded lifecycle inspection. It does not claim a
deployment-removal simulation or protection against administrative deletion.
The later media apply requires its own fresh approval, writer barrier and ledger
attempt; this probe approval cannot authorize it.

## Production change and refreshed recovery

Production changed to `67e1c7ac431db2dab6064c943375009ff5979f1c` in deployment
`0ed9d052-b870-4c72-9e2d-cdc42bac2680`, merging PR12's MapLibre/directory fixes.
The previous deployment was REMOVED. Root merged this current main into the
maintenance branch at `1e86467a36ecf6eb5c08affe33546226143d4e99`, resolving the
documentation and lockfile conflicts while preserving both sets of changes.
Type checking and five map/directory tests passed; hosted runs 34008271905 and
34008274238 remain pending at this checkpoint. The prior source-bound media plan
must be regenerated; no stale plan may authorize copying.

Read-only retrieval under the new source binding retained the latest exact backup
with SHA256 `026352c8c60640ad762a4ae70ca0b01dbd8d48e8f1cb4caa521e858abc53ba2d`.
Strict runtime decryption passed without exporting the session secret. Root's
fresh restore rehearsal against candidate `1e86467` preserved 94 tables/404 rows,
passed post-restore migrations and removed its owned fixture. See
`release-evidence/core-recovery-latest-2026-09-06.json`. The backup is retained
mode0600 in the operator-controlled recovery-backups directory outside Railway.
This replaces the older 391-row snapshot as current recovery evidence.

Recovery branch `a9d21d207320a8462e0adad4fa83c8bf86c76eb6` passed hosted run
34008130360 after selecting the read-only entrypoint and 45-second drain in its
Railway configuration. Its compiled artifact hash remains unchanged. Actual
runtime adoption, writer barrier and live namespaced media verification remain
the ordered operational work after the refreshed candidate passes its gates.


## Live cutover checkpoint — 2026-09-06

The normal application is healthy in frozen deployment `a7218714-d94d-4dd5-b9d9-94bcbdbc7613`
at source `67e1c7ac431db2dab6064c943375009ff5979f1c`. The prior writer deployment was
REMOVED, with stop evidence at 03:25:25Z. Authenticated empty upload admission
returned 503 under the verified freeze. A fresh source-bound v2 media plan was
retained after this barrier.

Media migration attempt `03a556f5-4714-4ba3-a74a-670b994e1c04` completed. Separate
read-only verification confirmed the sole source and namespaced destination have
199,788 bytes and SHA256 `3c9b308d185aaed85f6aa6c14fd37b8122532c2e5aacb2597d9861f6851787dc`.
Four audit records form the bound start/intent/verified/complete chain; unused
slots are absent. Original media and database references remain unchanged.
Evidence is retained outside Railway under the private maintenance-cutover
`apply-96cbc3dc-5a1d-4021-8f92-d0bd09c98d85` directory. The earlier invalid-timestamp
attempt was independently reconciled as no-write before this fresh attempt.

Namespace variables are staged with uploads frozen and provider transactions
explicitly disabled. Recovery deployment `545a4b0b-a122-4ae3-ac7a-ddfbfa50ac37`
failed before build: Railway requires numeric `drainingSeconds`, not a string.
It did not replace the healthy frozen application. Recovery commit `f92d5bf`
and maintenance commit `35a1ef3` correct the type; fresh hosted checks are pending.
Recovery's local executable verification passed, including `/ready`, business 503,
read-only database behavior, clean shutdown and fixture cleanup. Remaining gates:
actual recovery deployment/media read, then maintenance deployment and runtime
checks, then reopening uploads. Do not treat the media copy as release completion.


Recovery `f92d5bf` passed hosted run 34009643877 and deployed successfully as
`c040f4f4-0651-4b58-a3de-d6384343b4ad`. Provider metadata adopted numeric 45-second
drain, `/ready` and the direct recovery Node command. Actual PID1 matches that
command. Runtime namespace, retained backup prefix, upload freeze and disabled
provider mutations were verified without disclosing secrets. Public readiness is
200; the exact namespaced image is 200 and matches the original hash. Business
API and webhook probes are 503 with Retry-After60. Old normal writer `a7218714`
is terminal REMOVED, with stop evidence at 03:46:40.925731377Z.

The accessible backup hash and candidate migration/runner hashes still match the
successful restore rehearsal. Current duplicate paid inventory groups are zero.
Pre-upgrade historical orders remain four, with zero Stripe-linked orders; the
notification table is absent before its additive migration. Normal candidate
`35a1ef3` remains pending its final hosted browser checks at this checkpoint.
Recovery HTTP and transaction aggregates are retained in the private cutover
directory. Business interruption ends only after normal runtime is verified.


## Normal maintenance accepted; uploads reopened

Final candidate `35a1ef3` passed hosted run 34009648410, including Verify and all
22 Better Farms pilot cases. Normal attempt `b25432a5` stopped at required-secret
startup validation: `SETUP_TOKEN` was absent. Root securely provisioned a random
value through Railway stdin, retained it only in the service secret store, and
retried the unchanged artifact. The setup endpoint cannot overwrite an existing
admin. Deployment `3a0b406a-7ffe-414f-a1c3-40517eb5f3ef` succeeded; migrations
completed at 03:55:55Z and public readiness was verified at 03:56:26Z.

Independent read-only post-upgrade evidence confirmed the exact compiled artifact
SHA256 `931935e8797837fe1f8cf53f0eeb784a96585a804d266a576e020705e7b081ea`, all four
historical order states, one manual processed refund, no provider-linked orders
or refunds, empty notification/form/webhook queues and expected new schema and
idempotency constraints. Actual direct Node PID1, namespace, retained backup
prefix and 45-second drain were verified. All five settings screens loaded in
the authenticated live admin without changing values. Media bytes matched.
Recovery deployment `c040f4f4` is REMOVED.

Uploads reopened in deployment `3c748492-7c61-4d5a-8eec-ce33a07d0aba`, using the
same exact artifact. Actual freeze=false and an authenticated empty upload's
400 missing-file response confirm admission reopened without creating an object.
Readiness was 200 at 04:00:44Z. Previous frozen normal `3a0b406a` is REMOVED.
Provider transactions remain disabled. The original object, copy audit chain,
backup and isolated recovery artifact remain retained. This accepts Core
maintenance, not Better Farms domain/content launch or provider activation.

Future preflight must validate all normal-entrypoint required secret names and
Railway configuration types before pausing business admission. Recovery success
alone does not establish that the normal application has all required settings.
PR11 was updated with this evidence and submitted for main-branch integration.


PR11 merged at 04:01:26Z as `a99bb7efeb4c007789c20da91ff0e2d395452836`.
Automatic main deployment `26d0c65b-0521-4aef-b146-86fb3d12a6ed` reached SUCCESS.
Actual runtime commit and exact compiled artifact matched; uploads remain open,
provider transactions disabled, namespace and backup prefix retained, and PID1
is direct Node. Readiness passed at 04:03:21Z. Prior `3c748492` and `3a0b406a`
are REMOVED. The maintenance cutover is complete. Broader client launch, CRM
custom-field release, provider acceptance and ecommerce completion goals remain
active.

CRM follow-up on the separate `codex/crm-custom-fields` branch: typed field and
mapping UI plus actual desktop/mobile journeys are accepted through `919b4f8`.
Backup rehearsal restored 109 tables exactly and exposed an inherited repeated
profile-backfill defect. Fix `ed3ee09` preserves existing preferences and nullable
fields, backfilling only newly added legacy columns atomically. Independent
review accepted it and root reran four PostgreSQL tests successfully; the owned
fixture was removed. Updated recovery evidence and release integration remain
pending. None of this later CRM work is claimed as deployed in the maintenance
release.


CRM recovery follow-up is accepted at `f1479fb`: root independently reran the
actual synthetic capture/restore/worker rehearsal against `ed3ee09`; all 109
tables/20 rows matched exactly both immediately after restore and after migration
reruns. Zero/false, archived choice history, pinned pending jobs and idempotent
replay passed; owned fixtures were removed. R2 transport remains explicitly mocked
in this CRM-specific rehearsal. The branch is clean and pushed. Next integration
step is bringing current main `a99bb7e` into this CRM candidate, running final
release checks and validating additive upgrade/compatibility against the now-live
maintenance baseline before any CRM deployment. The durable operator ledger
branch remains separate; do not accidentally bundle operator tools into that
release. Core maintenance is already live and upload admission remains open.

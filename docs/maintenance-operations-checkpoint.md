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


### CRM candidate and local release policy reconciliation — 2026-09-06

Draft PR14 reached candidate `2884093fe28f566dad7a9c10511703d2bef9da59` after
integrating live main a99bb7e. Root validation passed 1,075 ordinary tests
(57 specialized database tests excluded), plus 19 focused preflight tests,
types, lint, formatting, build and budgets. Independent populated upgrade
and actual synthetic capture/restore rehearsals passed; desktop/mobile CRM
and form-mapping journeys passed. These are local evidence, not hosted CI.
The detached preflight artifact also passed against the actual production
environment in deployment 26d0c65b, without mutations. It explicitly does
not claim to prove normal startup.

Repository Actions and its workflow were found manually disabled. The current
original-checkout AGENTS.md section 22 explicitly requires this and permits
local validation. Preserve that owner directive: no enabling or dispatching
Actions. Earlier attempted run 34011137500 was queued with no jobs; it provides
no validation evidence. Withdraw candidate-only workflow additions and retain
the checks through the local release process. Existing branch protection
requires the Actions-bound Verify check, so deployment remains gated pending
an approved replacement enforcement process. Do not impersonate Verify or
bypass protection.

Concurrent PR13 uses migration 0061_standalone_locations.sql. Reserve 0061
for that work; the undeployed CRM migration is being moved to 0062, with
actual upgrade/recovery checks repeated after the rename. CRM is not live.
Normal downgrade to the pre-mapping binary is unsafe after mapped submissions;
retain read-only recovery followed by roll-forward as the fallback.

The ecommerce settings incident remains resolved: all five authenticated live
settings destinations were rechecked after the maintenance deployment. The
active goal includes broader ecommerce defect correction and acceptance,
CRM improvements, client onboarding and subsequent website deployment planning.
Provider transactions remain disabled.


### Immutable CRM baseline local validation — 2026-09-06

Clean candidate `8126c8d5d1d0d034bfded61cd01fef834a839db0` now passes the
local gate matrix: 1,094 ordinary tests (57 opt-in exclusions exercised in
separate required database suites), 82 database test executions including
New York/UTC reliability, 40 desktop/mobile application browser tests, and
22 pinned Better Farms pilot tests at site7fd1298. Types, lint, format, build,
budgets, fresh migrations twice, a006 historical upgrade, a99 CRM upgrade,
CRM capture/restore, source/compiled preflight and detached upload artifacts
passed. Compiled Linux Node22.23.2 startup used verified TLS1.3 PostgreSQL,
reached ready, and drained on SIGTERM with exit0. Artifact SHA256
`8c82cbbc28f28b10c3bdcae9cace9b8b71b385af6d5cce4855489297cfae2e49`.
Owned fixtures were removed; checkout remained clean. External private summary
`Core Platform Operations/crm-8126c8d-validation-summary.json` binds six
per-run receipt hashes. This accepts local baseline validation, not production
release or later ecommerce changes.

Independent release-policy review rejected an unrestricted PAT status as
equivalent to the current Actions-app-bound check. Prepare a dedicated
GitHub App, running its verifier locally with no webhook infrastructure,
and require the actual app identity for a distinctly named local check.
Keep all other branch protections and Actions disabled. Registration access
is currently at GitHub's passkey/authenticator confirmation screen; the
owner was asked asynchronously to complete that authentication. No app,
status, protection, or production setting was changed. Offline receipt
validation implementation is proceeding independently.

Ecommerce frontend candidate9ed3eea/b825590 implements checkout load recovery
and account draft/error handling; root review identified a remaining
already-autofilled address identity-switch case, now assigned for correction.
Atomic shipping/fulfillment uses an approved order-locked, idempotent contract
and additive0063 receipt columns in a separate branch, with real concurrency
and partial-shipment tests in progress. Do not treat either as accepted/live.

Peer PR13 remains90882c2, migration0061. Owner-authorized calendar sample
seeding was separately reported by that task (238 new/239 total events);
the next fresh production backup must include the current post-seed state.
Root did not execute that seed and has not independently verified its rows.


Frontend recovery accepted as a candidate through `2738c15` on pushed
`codex/ecommerce-customer-recovery`: account draft/error recovery, checkout
settings gating, identity-scoped address cache, and authenticated user-switch/
logout reset of private checkout/payment state. Anonymous-to-login preserves
in-progress checkout by design. Root source review found and required the
already-autofilled identity case; root then independently reran all 15 new
recovery tests successfully. Worker reported 17 focused tests including two
existing cases, plus types/lint/format. Combined integration is still pending.

Offline receipt validator candidate `84d840f` is reviewed, committed and pushed
separately. Root independently reran its 13 standard-library tests. It checks
versioned gate coverage, source identity, bounded evidence hashes and review
binding; it explicitly does not authenticate attestation truth or approve a
release. No credentials/publishing/network features were added. A private
normalization of the actual8126 evidence is underway with review acceptance
left false. The policy must be extended for forthcoming0063 fulfillment gates
before applying it to that later combined candidate. GitHub app registration
remains at the owner's authentication prompt; no protection change occurred.


### Release integration and evidence review follow-up

Isolated `codex/client-release-integration` combined CRM8126, frontend2738c15
and peer90882c2; owner Actions-disabled directive is committed at9e0a307.
At that clean head, root types/build/budgets and 1,113 ordinary tests passed
(57 opt-in exclusions). No integration release has occurred.

Independent review reproduced a supported legacy migration defect: existing
public tables without a Drizzle journal return after reconciliation, so the
journal-only0061 location migration was skipped. Explicit0061 replay before
0062 is implemented with actual failing-then-passing PostgreSQL evidence,
preserving existing accounts/profile media and creating a standalone location.
The final synthetic location tests block public geocoder calls. An initial
worker test may have made synthetic geocoder requests; it is not claimed as
provider-isolated evidence. No credentials or production rows were used.

Atomic fulfillment candidatef87b338 corrects two additional review findings:
remaining quantities are refreshed authoritatively after replay, and results
are bound to the submitted order instead of resetting another order's draft.
Six desktop/mobile cases passed. A final canonical item-order fingerprint
regression is being completed before integration.

The private8126 normalized release receipt remains rejected/pending review.
Functional tests passed, but formal cleanup evidence is incomplete for some
rehearsals: container-removal reports do not uniformly prove anonymous-volume
absence or child-process exit. Earlier broad cleanup statements must not be
read as direct proof of every volume's absence. No pass status was published.
Rehearsal producers are being improved to capture exact owned resource IDs and
verify removal explicitly for the next integrated validation run. Historical
receipts remain unchanged. GitHub app creation still awaits owner authentication.

### Combined ecommerce candidate — 2026-09-06 follow-up

Root integrated atomic fulfillment 566aa22 and standalone migration fix e1040af
into 28c3080. At that exact clean head, types, lint, formatting, build and bundle
budget passed; ordinary tests passed 1,116 with 72 explicitly opt-in skipped.
Independent PostgreSQL execution passed 15 tests (14 atomic fulfillment plus
no-journal migration); captured container and anonymous volume absence were
verified directly after removal. Private receipts: combined-28c3080-checks and
combined-db-28c3080 under Core Platform Operations. Skipped database tests in
the ordinary suite are not represented as database acceptance.

Customer browser acceptance bd84711 is reviewed and fast-forward integrated:
six desktop/mobile cases verify real account persistence, failed-save recovery,
changed-server-data refresh preserving drafts, session identity isolation and
checkout settings retry. No payment intent calls occurred. This adds tests and
two synthetic fixture identities only; production remains unchanged.

Offline receipt validator b665fbd V2 passed 17 independent tests and source review.
It derives standalone migration and atomic fulfillment gates from candidate
source, requiring 26 gates for the combined candidate. This is structural receipt
validation only, not an authenticated release approval or published status.
GitHub Actions remains disabled by owner directive; dedicated App registration
still requires GitHub account authentication. No protection bypass is approved.

Improved rehearsal cleanup producers completed actual recovery, historical
upgrade and pilot-shutdown smoke checks and are under independent review.
Historical 8126 receipts remain unchanged and are not retrospectively approved.
The next production release still requires final candidate evidence and a fresh
backup/restore rehearsal including the peer-reported sample event additions.

Cleanup review disposition: do not accept the pending producer patch yet.
Independent reproduction found that pilot direct-child exit could leave an
owned descendant alive, and Python producers recorded process completion
before cleanup launched further commands. The implementation owner is fixing
process-group termination and a final post-cleanup check, with independent
re-review required. Customer browser tests are also being rerun with direct
persisted logs because the first worker evidence retained transcribed tool
output rather than original stdout. Functional results and source review are
recorded, but these are not substitutes for final durable release evidence.

### Follow-up evidence and shared producer correction

Root verified every retained log hash and candidate source hash for customer
account browser attempt customer-account-browser-20260906T050803Z-43987d44:
six cases passed on clean bd84711. Captured logs include actual test exit0,
container removal, anonymous-volume absence and server drain/port release.
The receipt explicitly does not claim a separately captured app exit code.
This replaces reliance on the earlier transcribed browser output.

The same incomplete cleanup reporting exists in CRM populated-upgrade and
backup-restore producers. Root owns the former adaptation; the CRM specialist
owns the latter. Both use the shared ownership helper and process checks before
and after cleanup, preserving restore invariants and input protections. The
independent reviewer retains acceptance responsibility for the combined patch.
A synthetic CRM populated-upgrade rehearsal is running; no result is claimed yet.
Production-runtime smoke cleanup also needs explicit resource evidence in the
next release run; its current removal return codes alone are insufficient.

The CRM populated-upgrade cleanup correction passed its actual synthetic
rehearsal: legacy rows survived two candidate starts, ecommerce history stayed
unchanged, and exact container/volume absence plus both process checks passed.
Independent source review found no additional issue. Root committed the single
producer file as 99e0540 on the rehearsal branch; it depends on the pending shared
helper and is not yet integrated or pushed. Receipt crm-populated-01.json records
dirty development provenance accurately; final candidate rehearsal remains due.

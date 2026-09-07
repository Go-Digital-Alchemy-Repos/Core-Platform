# Core next release checkpoint — 2026-09-06

This is the current release checkpoint. Earlier maintenance gate tables are
historical records; do not repeat completed upload migration or recovery actions
from those tables. The detailed operations history remains in
[maintenance operations](maintenance-operations-checkpoint.md) and the
[execution ledger](client-migration-execution-ledger.md).

## Candidate and production

The latest development candidate is **`f48834226197004f93f8e61aa786061a69b57986`**
on `codex/ecommerce-integrity-integration`, tree
`624bdb7183146aa5f88497aa4c110b5e0c091f2a`, in
[Draft PR17](https://github.com/Go-Digital-Alchemy-Repos/Core-Platform/pull/17).
It includes the reviewed category/import and CRM attribution increment plus the
three-class responsive category fix. All 30 local gates now have independently
accepted V4 evidence; this is not production release approval.
Earlier e2fda41 receipts remain bound to that prior commit.

The latest accepted local-evidence candidate is `f488342` (V4 details below).
The earlier accepted candidate remains frozen at
`f4853306e0d4dc086f5ab06352019858453a65b1`
on `codex/next-client-release`. It includes reviewed CRM follow-ups, checkout
and order lookup recovery, safe tracking links, onboarding evidence scoping,
Woo rollback/merchant preservation, and Security Center read recovery.
[Draft PR16](https://github.com/Go-Digital-Alchemy-Repos/Core-Platform/pull/16)
contains the combined increment. Frozen `8a6cdcc` and PR14 remain unchanged. The calendar seed is retained as a
previewable script; do not reapply the already executed production seed.

The last verified production application is `a99bb7e`, deployment
`26d0c65b-0521-4aef-b146-86fb3d12a6ed`. All five ecommerce settings pages were
verified live after the original routing fix. The new candidate has not been
deployed. Provider transaction activation remains disabled, and Better Farms
remains a no-import pilot. Revalidate actual deployment state before a cutover.

## Frozen f485330 evidence and deployment gates

- Exact candidate ordinary tests: 1,167 passed, 99 opt-in database tests skipped.
  Skips are not passes. Separate database evidence must account for every group.
- Types, build and bundle budgets passed at the current head. The predecessor
  passed lint and formatting; these also passed at the exact final head. Locked
  dependencies were reinstalled from the unchanged lockfile after fixture runs.
- The 16-case settings browser suite passed on `346359b`; the two new Security
  Center browser cases passed on its isolated patch. The complete browser run on
  the current combined candidate passed all 66 desktop/mobile cases, with clean
  before/after source and strict fixture cleanup. Evidence: private Operations/
  combined-full-app-20260906T231630Z-fe9c2e1b/receipt.json.
- All 20 Woo and seven CRM follow-up PostgreSQL cases passed on clean `f388911`.
  Their relevant sources are unchanged in the UI-only `f485330` increment.
- Root restored the existing identity-bound 105-table/671-row production snapshot
  against clean `f485330`. Every captured row matched, sequence checks passed,
  and two post-restore migration invocations preserved all compared values.
  This did not start the HTTP application or workers. Owned container, volume,
  process groups and temporary snapshot copy were removed. No capture or remote
  retrieval was repeated. Evidence: private Operations/
  next-recovery-verifier-f485330/receipt.json.
- The original capture's supervisor zombie and failed-or-uncertain wrapper receipt
  remain recorded; the successful separate retrieval did not erase that history.
- The old V2 evidence verifier requires 26 gates and lacks dedicated obligations
  for the 27 new CRM/Woo tests. Reviewed V3 `737919d` now requires 28 gates,
  pins 12 suite sources and reconciles 99 unique ordinary skips with exact
  per-suite enabled counts. Its 22 tests passed independently, including under
  Python optimization. V2 and its accepted bundle remain unchanged. V3 has no
  publisher, signing key or authority to establish the truth of attestations.
- Current-head compiled Linux runtime/TLS/readiness/shutdown, historical populated
  upgrade, CRM populated upgrade, synthetic CRM capture/restore, detached entrypoint
  rejection checks, and source/compiled TOML preflight passed. Initial preflight
  invocation named an absent railway.json and was correctly rejected; its failed
  evidence is retained separately from the passing railway.toml results.
- Fresh database groups passed 124 executions with zero skips, plus migrations
  twice, at exact `f485330`. Initial fixture startup failed before tests; its
  receipt remains separate with cleanup. A new query-ready fixture passed.
  Evidence: private Operations/combined-db-f485330-31e0af04/receipt.json.
- All 22 Better Farms pilot cases passed at exact Core `f485330` and site `7fd1298`.
  The original extra plain-bind check failed and is retained; passing launcher
  cleanup and a supplemental resource/process/reusable-port check establish
  cleanup. Root also observed no listening processes on the three pilot ports.
  Evidence: private Operations/combined-pilot-20260906T232147Z-5e40e69a.
- V3 local evidence normalization and factual review are accepted for frozen
  `f485330`: 28 gates and 32 evidence/artifact files, bundle digest
  `ffc8598ed1fa6269b99a63bf54bf0cf6a008cc510b3a976b737eceeb79a76f18`.
  Seven basic commands and both preflights were rerun with machine-recorded
  clean commit/tree, timestamps, exits and log/source hashes; all four rebuilt
  artifacts matched the retained runtime-tested copies. Original pending
  manifests, initial failures and their resolutions remain unchanged.
  Evidence: private Operations/normalized-v3-f485330-8108ec1d7b.
  This accepts the local evidence, not deployment or provider activation. The checker validates consistency; it cannot
  establish the truth of attestations or authorize release by itself.

GitHub Actions remains disabled under AGENTS section 22. The authenticated
GitHub App setup needed for the approved local verification check is still
pending at GitHub Confirm access. Do not bypass strict branch protection or
replace an App-bound check with a generic token status. Continue independent
engineering work while that dependency remains unresolved.

## Remaining product work

Ecommerce completion remains part of the active goal, including catalog and
inventory integrity, checkout/customer accounts, payments/refunds/fulfillment,
shipping/tax, recovery, and verified administrative settings. Source review also confirms that several
listed shipping/payment integrations are configurable scaffolds: EasyPost rate
and label transports are not connected, and non-Stripe refund adapters remain
unsupported. A configurable integration is not a delivered operational capability.
These remain product completion work, with provider selection and sandbox
acceptance required before activation. The separate category
parent integrity gap remains open. Normal sequential API requests already reject
missing, self and descendant parents. Validation currently occurs before the
storage write, however, so races and direct storage callers can bypass it;
existing cyclic ancestry can cause unbounded traversal. Backend transaction
validation and a consistent lock order shared with Woo, plus cycle-safe admin
repair visibility, are now authorized in isolated worktrees. Preserve inactive
parent eligibility, soft deletion and existing response semantics. Historical
category data will not be silently rewritten. The separate import execution
constraint migration is described below.

Better Farms content/assets/domain acceptance and final build/runtime origin
agreement remain open. The reusable website build/deployment playbook follows
completion of the system and pilot, as requested by the owner.


## Category integrity follow-up review

UI repair visibility is committed separately at `cae9edc` on
`codex/ecommerce-category-repair`. Closed cycles and self cycles render once;
iterative traversal preserves normal ordering and excludes invalid parent
choices. Three component tests pass; the old implementation fails visibility.
The mutation test captures a mocked root-repair request, not database persistence.
A root-authored follow-up `515824c` associates all six category editor labels
with their controls; the same three component cases, focused lint and formatting
pass. Both UI commits remain separate from the frozen candidate. Browser repair
and reload acceptance awaits the reviewed backend integration.

The isolated backend initially passed 30 PostgreSQL cases, but independent review
found an additional stale-ancestry race in Woo apply between batches. A merchant
can move A beneath B after A's batch, then a later B-under-A batch can form a
cycle even while holding the graph lock. That backend patch is not accepted;
reproduction and live ancestry validation consistent with import ordering are
required. Do not promote the existing passing cases into proof that this race
is fixed. Frozen f485330 and its accepted evidence remain unchanged.


### Approved import execution revision

The category follow-up now includes a bounded durable execution-contract revision.
New runs use execution version `1.1.0`, deterministic parent-first category
ordering and a persisted batch size before any batch commits. Source envelopes,
source plans, disposition contracts and their fingerprints remain `1.0.0`.
Existing `1.0.0` runs retain their exact legacy order, even with empty checkpoints;
there is no implicit upgrade or reordering of committed batch identities.

Every category batch must validate its projected graph against live ancestry
under the graph write lock. Valid child-first source input must work for new
runs across batch boundaries, without requiring the operator to rebuild input.
Legacy continuation that cannot satisfy live dependencies must stop explicitly
for review rather than rewrite its history. Unknown execution versions or
metadata and changed resume batch sizes must fail closed.

New begin validation must require execution `1.1.0`, while legacy resume is a
separate supported path. The CLI must select the recorded supported execution
version for resume while preserving all other identity checks. Regression proof
must show the old supported resume entrypoint rejects new-version runs before
resuming status or writing targets. This does not claim protection against an
operator directly invoking arbitrary old repository internals. Production import
remains unauthorized; implementation and review remain in progress on the
isolated category branch.

PostgreSQL testing corrected the initial no-migration assumption: migration 0047
creates a CHECK constraint accepting only execution `1.0.0`. The Orchestrator
authorized an additive migration widening that exact constraint to `1.0.0` and
`1.1.0`, with atomic replacement and existing runner registration. Original
migrations, rows and checkpoints remain unchanged. Acceptance requires populated
legacy preservation, new-version acceptance, unknown-version rejection, replay
and rollback verification. The original failed PostgreSQL attempt is retained.
This authorization is for implementation and local testing, not deployment.

## CRM note attribution increment

The CRM-4 proposal is approved for separate implementation from frozen f485330.
Existing lead/client detail responses gain nullable `authorName`, joined from
current profile first/last names with explicit projections. The UI states that
notes are visible to everyone with CRM access; unavailable attribution uses a
neutral fallback. This is current profile attribution, not historical identity.
Existing requester permissions and session-derived note authors remain intact.
No schema, write contract, private notes, notification or history expansion is
included. Acceptance requires permission, persistence and UI evidence. New or
changed opt-in suites need separate verifier inventory review; frozen V3 and
release evidence remain unchanged.


## Next integration increment — not a replacement release baseline

Separate `codex/ecommerce-integrity-integration` at `4e8854343b0c39d8f8599ae88997b24ca19ba5c6`
combines reviewed category UI repair/accessibility and CRM note attribution atop
frozen f485330. The checkout is Core Platform Ecommerce Integrity Integration.
Root installed its own locked dependencies, verified TypeScript and reran seven
focused tests successfully. Backend category/import changes remain excluded
pending final independent review and exact-source PostgreSQL evidence.

CRM source `289f0157414568ba4a8477a5e443a0a662984d6d` uses explicit
LEFT JOIN note projections, current names and existing session-derived actors.
Root reviewed source and real middleware tests, independently reran the four
new focused cases, and matched all 121 source hashes in the disposable database
receipt. Two actual PostgreSQL cases passed with owned resources cleaned up:
private Operations/crm-note-attribution-pg-20260906T235449Z-ecf45193.
These are source/fixture acceptance, not a real-browser or release approval.
Browser create/reload verification remains active in the isolated CRM branch.

Frozen f485330, PR16 and their accepted V3 bundle remain unchanged. This next
increment needs its own complete integration evidence and reviewed successor
opt-in suite inventory before promotion.


### Backend integrated and draft PR17 opened

The next increment is now clean/pushed `e2fda41fddc30bdde47f3b85d48d93aec28dee7f`,
tree `b9a767f4c3fe6f8526b7d21a8a40bef95cefdddc`, with accepted backend
`448f440d8116903fead95716988b8c316e11dbdd` integrated. Draft PR17,
“Protect category hierarchies and show CRM note authors,” is stacked on
`codex/next-client-release`: https://github.com/Go-Digital-Alchemy-Repos/Core-Platform/pull/17.

Root combined TypeScript and full ordinary suite passed: 1,181 tests and 118
expected opt-in skips. Independent backend review accepted live ancestry,
versioned ordering, legacy identities and migration behavior; root matched all
19 development source hashes and eight log hashes, including 37 passing actual
PostgreSQL cases. Private receipt category-parent-execution-14dc3f97d2/receipt-final.json
has SHA-256 `66299723d1261d6f0de19c797986c9f952abe18536b5821f2a3327dd3be1efba`.
Its runner exits and container/volume cleanup are established, but process-group
identities were not captured, so this is not full release cleanup evidence.

Fresh combined PostgreSQL verification with complete process ownership is now
authorized. The independently checked successor V4 inventory is authorized in
a separate worktree: 30 gates, 14 opt-in suites, 143 database executions and 118
unique ordinary skips. It adds category parent integrity (17) and CRM attribution
(2), updates only the two reviewed Woo source pins, and preserves truth and
cleanup requirements. Those are expected counts until the combined database
run and successor verifier tests actually establish them. Frozen V3 is unchanged.

The CRM browser harness has retained setup/teardown failures and their separate
cleanup evidence. These are not application failures or successful browser
acceptance; browser verification remains in progress.


### Accepted validation progress on e2fda41

Root reviewed and accepted the combined database subset: 143 actual executions,
zero skips, migrations twice, all 539 source hashes unchanged, all command log
hashes/counts matched, and strict owned process/container/volume cleanup. Receipt
Operations/combined-db-e2fda41-65872029/receipt.json SHA-256
`00e8610d2c072c8d4a589d87ffd95a34f9c4fd2b26ada8575dd983647c52fde6`.
The earlier 240ad263 attempt remains failed: a harness restriction incorrectly
blocked the existing standalone test's temporary loopback API. The corrected
run allowed only the required literal-loopback ephemeral fixture, recorded its
matching open/close lifecycle, and continued blocking external requests.

Root's six-command build recorder passed lint, formatting, build, budgets and
source/compiled configuration preflights with clean identity, unchanged sources
and owned group cleanup. Receipt Operations/build-gates-e2fda41-7307f49874/receipt.json
SHA-256 `d0805a7dff336734a64f275d5b866caa9aef4303e89db932616369a50456f26f`.
New compiled application SHA-256 is
`3308d782c744ee1b8d8dc1acaafa6a0ddb21d06b96e18b97ec2005b6854221f1`;
upload operation artifacts and deployment configuration remain byte-identical
to their retained prior versions. Configuration acceptance is not runtime proof.

V4 `9075d22b31911ce9b437ee7a4b2883fc0f9f668e` is accepted as the successor
verifier implementation after root source review, 24 independent optimized-mode
tests, and exact combined checkout inventory validation (30 gates/14 suites).
Frozen V3 remains unchanged. This does not accept a new release bundle.

CRM source browser acceptance passed on 289f015: four real create/reload journeys
for lead/client at desktop and 390px widths, editor access, denied customer API
access, and persisted authenticated author IDs. Root matched every source/log/
artifact hash and visually reviewed the narrow client screenshot. Receipt
Operations/crm-note-cli-796f46a208/receipt.json SHA-256
`9a9d39b66cd9795d2a8c94bc4b0946fc33b42ad19390f1e6919b16065aa1e6df`.
The six previous harness attempts and their cleanup limitations remain indexed
separately; none was relabeled. This is desktop Chromium resized for narrow
coverage, not mobile OS emulation. Combined category browser, complete app/pilot
gates and runtime/upgrade/recovery evidence are still pending.


### Runtime/recovery passed; narrow category layout follow-up open

The four exact-build rehearsals passed on e2fda41: compiled Linux runtime
(TLS1.3, readiness, PID1 and graceful shutdown), historical populated upgrade,
CRM populated upgrade, and CRM recovery (109 tables/20 rows). Root matched
all 1,139 source hashes and each producer report/direct-log hash. Outer receipt
Operations/release-rehearsals-e2fda41-2c82c5a5/receipt.json SHA-256
`224f455a0538a50aa0eafabf07d0f0788fee622f393b6df26383560776dc3b74`.

Root also restored the existing identity-bound production snapshot locally:
105 tables/671 rows and sequence semantics verified, with all snapshot rows
unchanged through two post-restore migration invocations. No app/workers or
production operations ran. Strict owned fixture/group/temp-directory cleanup
passed. Receipt Operations/recovery-verifier-e2fda41/receipt.json SHA-256
`d52bd33a3995e458264efb043e6313dd6fd9febd0c3d28eeade3d4f372e1cd50`.
The verifier differs from its reviewed f485 predecessor only in two checkout
paths and candidate pin. Original capture uncertainty and prior receipts remain
unchanged; this is supplemental restore proof, not a replacement capture.

Category browser functional checks passed on e2fda41 at 1440/390 widths:
cycle/self repairs persist after reload, normal creation/inactive reparenting
work, invalid API parents reject, and unrelated seed rows remain unchanged.
Root source/log hashes match receipt category-repair-cli-7272942c3e/receipt.json
SHA-256 `ec895d4bd61b86f251d22b4cd0312b6d09bc0a4c4c8ca54e3d273123df002702`.
However, root visual review found the narrow editor card and controls overflow
the viewport. Functional acceptance does not imply responsive acceptance.
A separate scoped layout fix from e2fda41 is authorized with real browser
geometry/screenshots, preserving the desktop editor and table-local scrolling.
The current full app/pilot runs continue on unchanged e2fda41; do not silently
relabel their evidence for a later layout commit.


### Remaining gate review progress

Root accepted the separately recorded dependency/type/ordinary subset on the
exact e2fda41 tree after comparing all source and command log hashes. Receipt
Operations/dependency-unit-e2fda41-provenance/receipt.json SHA-256
`d19f8b2bcce50d16eaf63af5491c188985d6aca291d40352da76067fd4ff7855`:
Node22.22.2/npm10.9.7, locked install, TypeScript, 1,181 passed/118 opt-in skips,
clean identity and owned group cleanup. Its detached checkout and dependencies
are retained independently of concurrent app fixtures.

The detached upload argument-rejection gates are accepted within that narrow
scope. Root verified all rejection logs and exact artifact hashes. Receipts
Operations/detached-artifacts-e2fda41-a1d3cafd/verify/receipt.json
(`da394f6b87d5132dc307c14201f32244adf545a8924a2f71b30b6d40acb2df16`)
and apply/receipt.json
(`d6031835840399b50b54aa68d36a4f437acf45180baf86c71d7cf4a67bf53d05`)
cover canonical/renamed entrypoints, source-free temp directories with dependency
symlinks, and cleanup. This is not filesystem sandboxing or provider acceptance.

The existing full application browser suite passed 66/66 on e2fda41; root matched
all source/log hashes. Receipt Operations/integrity-full-app-20260907T001304Z-1de47463/receipt.json
SHA-256 `80f249014ce044737e87a419fae9f16e113b49ae15ce843ffcbf7039b8eb0551`.
The known narrow category overflow remains a separate visual defect.

Pilot22 functional checks passed on e2fda41 with site7fd1298, but the original
strict cleanup gate failed for a child reported stopped=false despite exit0.
Operations/integrity-pilot-20260907T001704Z-1a6a2a21 retains the original failure.
Exact process/group/resource evidence is being investigated; no cleanup cause
or final pilot gate acceptance is established yet.


### Responsive category fix integrated

Root accepted source `90cec6a19aae4902f2e0812da79c4985f9dc00a0` after reviewing
its three class changes, measured geometry and corrected narrow screenshot.
It is integrated as f488342. The editor now fits at390px, retains420px atdesktop,
and the table scrolls locally with rightmost actions and keyboard editing
verified. Before/after receipt category-responsive-cli-cff0b4ed7b/receipt.json
SHA-256 `c5a622f85b66b0ec6ce04670cef8d1094bb76eac885f22994aa21f112d21dfc5`;
additional interaction receipt category-responsive-cli-3a346ef10b/receipt.json
SHA-256 `a048013269b6671bd60b16c2bbe282fb3839c2d44ea3f50a86cf3883e5317a0f`.
Both successful fixtures cleaned up. Prior parser failure remains preserved.

The e2fda41 pilot's supplemental checks establish later absence of all thirteen
recorded groups, the exact container/volume and reusable ports, with Core/site
identity and source unchanged. Supplement SHA-256
`0281abafd7bccb7525af48066864148a989b8662df9d2b5263f05bfce5992d55`.
The cause of the original stopped=false result remains unresolved; original
failed reports are unchanged. Do not call the original strict cleanup successful.

Fresh f488342 basic validation is running in
Operations/basic-gates-f488342-f9d98df567; locked installation has completed.
No production or release approval changes occurred.


### Final f488342 evidence ready for normalization review

All final-commit runs are complete. Root independently matched source/log/report
hashes for the 143 database executions, 66 application browser cases, 22 pilot
cases and four rehearsals. The final pilot's raw inner and outer strict cleanup
both passed; no supplement was needed. Every earlier failed receipt is retained.

- Basic nine-command receipt: Operations/basic-gates-f488342-f9d98df567/receipt.json,
  SHA-256 `4e28fd80b97120bc05960857c5fae3796e69f15a20f005a3076c046267d7bb69`.
- Database: combined-db-f488342-ebf41471/receipt.json,
  `bdc740fc1fe4565f1ce4fdbda09e05f81d33e1a553137e92e2d7bb0d7487f752`.
- Full app: final-integrity-full-app-20260907T002333Z-a813611c/receipt.json,
  `8d2291234474f0ee93d093a59089d0a39896339bebf7d35150d9b6d41ee98a80`.
- Pilot: final-integrity-pilot-20260907T002713Z-22099aee/receipt.json,
  `d2c55ea7428c5913047da18afee956a9e8a15ea80293dcc2f2dd2acca597a41a`.
- Runtime/upgrades/CRM recovery: release-rehearsals-f488342-0e113010/receipt.json,
  `1160d70951a90ddf43b1aee6632edbd233da2bc18cc19259ad5449455bca5945`.
- Supplemental retained-snapshot restore: recovery-verifier-f488342/receipt.json,
  `4f3b914aa4aa79c5e18d7f3c2f9547081730c72520d24fb99c0b8647b32b67f2`;
  all105 tables/671 rows and sequence semantics verified through migration replay.

The V4 bundle remains pending independent review. Its private packaging must fit
existing verifier limits while retaining lossless raw-log provenance; no policy
limits or original reports may be weakened or rewritten.

Read-only release-control revalidation still found strict main protection with
Verify bound to GitHub Actions App15368, admin enforcement, and Actions disabled.
The approved dedicated-App setup remains the release dependency; no bypass or
production change was performed.

A controlled real-child experiment reproduced a false-negative wait condition in
pilot cleanup: group absence can precede Node's published leader exit. This is
not proof of the earlier incident's cause. A narrow fix with regression coverage
is authorized on a separate future tooling branch, preserving fail-closed errors
and ownership. Frozen f488342 and its passing evidence remain unchanged.


## Final f488 local evidence accepted — 2026-09-07 UTC

Root independently reviewed the normalizer and gate mapping, verified 53 evidence
files, 126 provenance entries, all 108 losslessly packed original logs, gate input
hashes and retained failure-history hashes. Trusted V4 returned exit 0:
30 gates verified, structuralVerification passed, releaseApproved false.
Bundle: private Operations/normalized-v4-f488342-c2ed7f156c.
Binding: `7268ba0a1aae6102867f37118f96465512bc25edf9b2c1290d044e19818bcc87`.
Separate manifest.reviewed.json and orchestrator-review.json preserve the original
pending manifest. Counts: 1181 ordinary passes/118 opt-in skips; 143 enabled DB
executions; 66 application and 22 pilot cases. Final pilot raw inner and outer
cleanup passed directly. Historical failures remain unchanged. Production a99,
provider restrictions, Better Farms no-import and required release gates remain.

The separate cleanup-helper patch was independently reviewed and its 12 focused
cases passed at root. It waits for both group absence and published leader exit;
permission/unknown errors still fail closed. It remains a future tooling change,
not part of frozen f488. Controlled reproduction does not establish the cause of
any earlier failed cleanup report.

Shipping assessment at Operations/shipping-completion-assessment-f488342/proposal.md
identifies absent EasyPost rate/label transport, dropped additional parcels,
unit-conversion errors and missing durable provider shipment identity. Next scope:
admin-only persisted single-parcel quote comparison with strict units/currency,
operation-specific readiness, permissions and sanitized failure handling; durable
label purchase and unknown-outcome reconciliation follow separately. Account and
live-provider acceptance remain distinct from synthetic development. No shipping
provider was activated and no provider request was made for the assessment.

Cleanup follow-up committed and pushed separately: `32e8c5d02c3a995f0df240e7e8f86456aeec5113`,
tree `16f68fe1fc4b4cdc8f00f31c49fc186c3c16f239`, clean
`codex/pilot-cleanup-exit-race`. No integration into PR17 or deployment.


## Shipping implementation progress — 2026-09-07 UTC

Frozen f488 remains clean and unchanged. Independently reviewed future branches:

- Parcel adapter: `96da3c3e128e5e3d18adba1259f05ca1c64d6770`, tree
  `73c39543c2c92c50f15f3d45e06bf444c91ec0d0`, codex/shipping-parcel-adapter.
  Correct shipment reference, one parcel, explicit unit conversion to one-decimal
  inches/ounces, invalid/incomplete/overflow/round-zero rejection. Root reviewed
  current primary provider docs and independently ran all 46 focused tests.
  Agent own locked install, types, lint and formatting passed. No transport enabled.
- Quote contract: `56cfad23d2b19e16ee7670ef23cc01999aebb16e`, tree
  `b1ab1fd03a4792f211b9b13f9f6706e9f7027ac1`, codex/shipping-quote-contract.
  Strict shared request boundary and exact USD integer-cents conversion, seven
  tests passed by root and independent reviewer; types/lint/format passed.
  Focused checks reused a dependency symlink; no fresh install/build claim.
  Approved lifecycle contract explicitly separates replay hash from server snapshot,
  unknown outcomes from definitive rejection, and credential rotation from already
  dispatched I/O. Persistence/transport/routes/UI remain unfinished.

New verified bug: system_settings.key is globally unique but shipping credentials
save generic setup field names. A different provider can overwrite/move apiKey.
Infra owns isolated provider-namespaced storage mapping and atomic save correction,
with legacy values scoped only to their recorded category. No credentials inspected.
CRM agent owns additive quote persistence/migration tests from the contract branch;
no overlap with credential routes. Both require independent review before acceptance.
Production, Actions/protection policy, provider restrictions and Better Farms scope
remain unchanged.


### Shipping preparation and active ownership — 2026-09-07 UTC

Root implemented server-owned quote snapshot preparation on clean pushed
`codex/shipping-quote-preparation`, `d66e97edbe545cfa38caa529ea061fecf9537604`.
It contains the quote contract plus reviewed parcel correction. Reuses existing
paid/fraud/remaining quantity rules, requires shipping items/order and active
matching origin, normalizes bounded US-state/DC addresses and parcel values.
Seven new preparation tests plus 38 parcel tests passed, types/lint/format passed.
Initial control-regex lint failure was corrected; focused checks use existing
locked dependency symlink. Independent engineering review remains pending.
This pure helper requires caller-held transaction locks and is not HTTP/provider
integration or proof of address deliverability.

Active write ownership: CRM agent quote persistence/migration0065 from56cfad2;
infra agent provider credential isolation/routes fromf488; engineering agent
standalone bounded test quote transport from56cfad2. No overlapping source writes,
provider calls or release-policy changes. Transport and persistence acceptance
remain pending. Frozen f488 checkout rechecked clean at the same SHA.


### Credential isolation accepted; shipping assembly — 2026-09-07 UTC

Root accepted shipping credential isolation after source/docs review, independent
13 mounted/registry passes, and verification of all five source hashes, runner
and actual PostgreSQL log against receipt
Operations/shipping-credentials-pg-0cb2bace/receipt.json
(`8284ee81e598ebea20f814603338590a9ad14966212fa51641b1f4e0c5a8928f`).
Six enabled PostgreSQL cases passed with exact owned fixture cleanup. Full ordinary
suite passed1186/124opt-in skips; types/lint/format passed. Clean source commit
`7b523b87218ec478394b4f9584a873af24b4bb99` is pushed separately.

New development assembly codex/shipping-workflow-integration contains contract,
parcel, preparation and accepted credential isolation (HEAD8823b5b). Root own
locked install completed and57focused cases passed on that combined checkout.
Preparation also rejects C1 controls in ab399e9; its independent review is pending.
Frozen f488/PR17 and production remain unchanged; this assembly is not a release.

Storage initial17PG cases passed; root requested additional stable identity and
locale-independent hash corrections (included in17) and nullable delivery guarantee
alignment with transport (pending final receipt). Transport review found incompatible
company-only address, city bounds and rate field shapes; these are being aligned
before acceptance. No transport or quote route is active. Next: accept final storage/
transport revisions, generation-aware authorization, orchestration and admin UI.


### Storage and transport accepted — 2026-09-07 UTC

Root accepted storage8b436fe03f69e81d9099fff9c495cd3f1f5c275a after source,
schema/migration and18actualPGcase review plus final receipt5cfa8493d7c6798ae11af62de55211edafc759bcaaf66809730a9c0e4369ff74,
all log hashes and663source hashes. Final receipt lives in private
Operations/shipping-quote-pg-f47aab459f. Corrected deterministic sorting, immutable
verified identity, nullable guarantee, strict account IDs and named SQL constraint
are included. Strict owned container/volume/process cleanup passed.

Transport86bddcf36aaf68a2b79315dbb5a5fe187f533bf2 accepted after full source review,
field alignment and independent45tests. No real provider request. Preparation
safe400delta c028e0d independently accepted with8tests. All are assembled on
shipping-workflow-integration57205149dd85544c2706d43c338480f421b025bc;
58combinedfocusedtests andtypespassed. Originalf488 is unchanged.

Root's new explicit admin result projection (3files) has3tests/lint/typespassed
and is under independentreview, not yetcommitted. It strips private snapshots,
fencing/credential/account identifiers and raw provider fields. Next ownership:
infra generation-aware test credential authorization (including minimal strict
crypto helpers), engineering projectionreview, CRM order-drawer integrationplan.
Quote orchestration, adminroutes/UI, retention scheduling and fullnewtable recovery
remain unfinished. No quote capability/provider activation or deployment occurred.


### Admin result boundary and UI handoff — 2026-09-07 UTC

Independent review accepted root public projection62948fe after strengthening
observed/rate test-mode and shipment identity checks, duplicate IDs and status/error
consistency. Three tests, lint and typecheck passed. The private storage fields are
never spread into API responses. Exact parcel conversion/type was moved to a
browser-safe dependency-free shared module in9c03b4c, independently compared to the
previous implementation;46parcel/preparation tests andtypes/lintpassed.
Development assembly is clean/pushed9c03b4c1c75589cabd311ef196ad25b9b42b9ec1.

Approved UI implementation now owned by CRM agent in an isolated branch from9c03:
separate order drawer quote panel, per-user/order minimal session draft/request-key
recovery, explicit readiness, GET-only refresh for known unknown attempts, no label
purchase/fulfillment side effects. Engineering owns new orchestration/router files
from9c03 with injected transaction-aware authorization until infra's generation
service is integrated. Root retains final integration and review. Infra also guards
reserved EasyPost keys against generic settings write/delete bypass. None of these
unfinished service/UI changes authorizes provider activity or production deployment.


### New quote recovery regression — 2026-09-07 UTC

Root added actual application backup/restore coverage in shipping assembly511cd9d.
One enabled PostgreSQL case passes with zero skips: pending, unknown and quoted
rows are captured/compressed, deleted and restored; every quote column matches;
full migration replay preserves them; restored replay/fencing rejects wrong-owner
and terminal overwrite while allowing late original-owner completion. Object
transport is synthetic/in-memory, not production R2 or shipping-provider evidence.
Types and focused lint passed. Private receipt
Operations/shipping-quote-recovery-304c55ccc4/receipt.json SHA
`88be3bc4fb5a37786d622fafedb7da234530348f317177f3338b595e39927f38`
binds1165sourcefiles unchanged and strict owned container/volume/18captured group
cleanup. This extra opt-in case must join future candidate validation; frozenV4
andf488 evidence remain untouched.

Authorization review additionally requires unexpected DBread failures remain
sanitized503 errors instead of being reported as missing configuration. Dedicated
reserved-key guards and generation-lock code are still under implementation/tests.
Engineering orchestration and CRM UI remain independently owned works in progress;
no route/provider activation or production change occurred.


### Active shipping integration review — 2026-09-07 UTC

Root reviewed in-progress UI and identified StrictMode result suppression, payment/
fraud eligibility drift from server, logout cleanup after navigating away, and lost
unresolved-attempt recovery when starting another quote. CRM owns fixes: reset mount
state on effect setup; mirror existing eligibility; narrow auth-success callbacks
for session ownership/cleanup; bounded prior-attempt history without silent eviction;
reject invalid negative/fractional draft quantities instead of silently omitting.
These findings are not accepted UI implementation or browser proof.

Authorization source/test review confirms shared advisory lock across dedicated
rotation/approval/provider configuration and uncached claim reads;13authorization
plus6credential-isolation DB cases are executing under agent-owned handle8853.
Root additionally requested correct missing-provider readiness classification;
final stable evidence is still pending. Engineering's separate orchestration work
remains in progress with explicit injected authorization and bounded retention.
Frozenf488, production and provider restrictions remain unchanged.


### Shipping authorization and UI integration — 2026-09-07 UTC

Accepted authorization dcc06896e8907b55e703c050c56fdb7eb96d7ae6 is integrated
as 3e7e771 in the shipping workflow assembly. Final PostgreSQL evidence covers
19 cases (13 authorization and 6 credential isolation), zero skips. Receipt
Operations/shipping-authorization-pg-b01b9bd1/receipt.json SHA
`75a8210261638e57fc70bd6074a2340d5f2986ada50072be47c72df57774af58`
was independently checked against source, producer, logs and owned cleanup.
The final ordinary suite passed 1191 cases with 137 opt-in skips; focused checks
and types/lint/format passed. Unexpected authorization reads remain sanitized 503,
while known denials remain distinguishable. No real credential was approved.

Accepted UI 3c01c10a18d034e783b4ba59fc9b8a3e552d8f7c is integrated as
89ec46c. Root found and reviewed an additional late GET race correction: sequence
and request identity guard response/error/finally, and New quote/history changes
invalidate previous loads. Two deferred StrictMode cases cover late success/error
after another quote starts. Seven final source hashes matched the retained race
review evidence. Root combined verification on 89ec46c passed 90 focused tests
and TypeScript; logs are Operations/shipping-workflow-ui-auth-tests.log and
Operations/shipping-workflow-ui-auth-types.log. The preceding pre-UI command's
output was unavailable after compaction and is not counted as passing evidence.

Engineering reports 17 real PostgreSQL orchestration cases and 3 mounted synthetic
HTTP cases passing; independent infra review and final evidence are pending.
The real admin routes are not mounted yet. Maintenance scheduling, actual browser
acceptance and subsequent release gates remain required. No provider request,
production deployment or change to the frozen f488 acceptance occurred.


### Orchestration acceptance and maintenance — 2026-09-07 UTC

Independent review found internal persisted-snapshot Zod errors could escape as
client 400 errors and expose private values to logging. Engineering changed internal
decoding to safeParse with sanitized 503; a real PostgreSQL corruption test through
the mounted error handler checks response and logs for the private marker. Root
reviewed the correction and independently verified final source/log hashes and
absence of exact owned container, volume and every tracked process group. Receipt
Operations/shipping-orchestration-20260907/final-b2ca3bfc13/receipt.json SHA
`c86c4148d2970250f8902f42d1e0b6321fcd10f7cab96dc80933c74c14803fc4`
covers 69 passing tests (18 PostgreSQL service, 3 HTTP, 38 transport, 7 request,
3 projection), types, lint and formatting. The six-file slice is accepted for
commit/integration; actual admin mounting and runtime/browser validation remain.

Root implemented maintenance wrapper d86266b in shipping assembly using the
existing stoppable worker: immediate run, then 30 seconds after settlement, batch
100 per maintenance category, aggregate-only success logging and no raw errors.
Two tests pass for non-overlap, stop drainage and sanitized retry. Types and lint
pass; independent infra review found no blocker. The returned worker still needs
registration with runtime shutdown; its outer timeout bounds stalled database
drainage. No provider activity, scheduler startup or production change occurred.


### Admin quote runtime connected — 2026-09-07 UTC

Accepted orchestration 9f07637 is integrated as 2e57c0c. Shipping assembly
a67383c connects the real database, generation authorization and test-only
transport through a lazy runtime adapter; imports do not initiate provider work.
The real ecommerce router mounts quote create/read/readiness under admin and
feature gates, and index registers the bounded maintenance worker for drainage.
Independent infra review found no wiring blocker. Contracts describe the mount,
maintenance scheduling and remaining acceptance boundaries.

The real parent router tests now pass 16 cases, including all three quote endpoints:
anonymous401, nonadmin403, disabled ecommerce404, no denied service calls, correct
admin dispatch and private no-store responses. Root reviewed these tests. Root
ordinary suite on the assembled changes passed 1321 tests with174 opt-in skips
(178 passed test files,18 skipped), and types passed. Logs:
Operations/shipping-runtime-ordinary.log and shipping-runtime-types.log. Earlier
27 focused route/worker/UI cases also passed. These counts do not replace the new
opt-in DB or actual browser acceptance gates. All code remains development-only;
no approved real credential, provider request or deployment occurred.


### Shipping production artifact build — 2026-09-07 UTC

Root built clean shipping assembly a67383c successfully and ran bundle budgets:
all passed, including ecommerce-page165KiB/175KiB. Private
Operations/shipping-runtime-build-receipt.json records 446 artifact hashes and
raw build/budget log hashes. This is local build evidence, not deployment approval.
Engineering owns a synthetic local PostgreSQL/application fixture for root browser
verification; no real credentials or provider requests are authorized. Infra owns
a read-only inventory of the 174 skipped opt-in cases and next verifier generation
requirements. Frozen V4/f488 evidence remains immutable. Browser acceptance and
new candidate full release validation remain unfinished.


### First actual shipping browser acceptance — 2026-09-07 UTC

Root used Playwright CLI against the actual synthetic local app on a67383c. Actual
admin login, orders drawer and readiness API worked. No credentials were present:
GET returned200, private/no-store, configured=false, approved=false, enabled=false,
mode=test, reason=not_configured; the quote button was disabled. Location and16oz
package draft survived reload/reopening the order. At390px document scrollWidth
was390 and root visually inspected the rendered panel. No quote POST was made.
Private screenshots/snapshot/observations are in Operations/shipping-browser-a67383c/
root-observations. This is not proof of quote success/unknown/replay behavior.

Root independently verified1183source hashes, app log hashes and exact owned
container/volume/process-group absence after fixture shutdown. Receipt SHA
`66f98ecde6470cede9ec1a2295b46d143481b9717d1fa2a9d8c27e885bde132f`.
CLI browser was closed. A development-only CSP error blocks Vite's inline React
refresh preamble; the app remained functional. This fixture did not serve the
production build and does not establish a production CSP defect. Retain for triage.

Read-only release inventory identifies19opt-in suites174unique skips and199enabled
executions. Root reviewed V5 structural delta and independently passed29Python-O
regressions:35gates, five required shipping suite pins, and four shipping browser
journey labels with hashed producer/log references. Accepted for commit; truth of
those browser artifacts still requires independent review. Engineering is preparing
a separate private synthetic transport fixture with real authorization/storage
for remaining browser journeys; no production credentials or provider I/O.


### Integrated synthetic shipping browser journeys — 2026-09-07 UTC

Root reviewed the private launcher and exercised actual app a67383c with real
authorization/preparation/storage/projection and an explicit synthetic transport.
The UI showed Ground825 cents and Express1599 cents with delivery metadata.
A browser-authenticated same-key POST returned200 with the original attempt ID
and only one transport call. An owned local address edit caused GET/UI staleness.
A deliberate new quote returned unknown; refresh, reload/reopening and prior
quote review preserved both attempts with exactly two total synthetic calls.
At390px document width remained390; root visually inspected mobile unknown view.
Browser-origin API requests confirmed all3 endpoints deny disabled ecommerce404,
anonymous401 and editor403. Ecommerce was restored before logout.

Final database: one quoted, one unknown, zero fulfillments/notification jobs.
Private evidence Operations/shipping-browser-synthetic-a67383c includes immutable
producer, call log, browser snapshots/screenshots and gate/replay logs. Root
independently verified1183source hashes, logs, unchanged producer hashes and exact
container/volume/process cleanup. Receipt SHA
`600fe08dbef01ae7c69328f45617f0f1fd4651eca927983b4f6b97878bb24c71`;
call log SHA `17e069bb5dcc92b3c77e22a56faa41cb71cab432546d27162cf900d528fee6da`.
CLI browser closed. Synthetic transport has no network operation by reviewed
source; this is not packet-capture or actual EasyPost account acceptance.

Accepted verifier V5 is committed/pushed3f42ece66bb28fb45114b6483facc2d2d651b0a4,
treea16642dbde7d389e45ae4528964a3a2dfd262143. Prior V4 unchanged. Remaining:
integrate previously accepted pilot cleanup correction into next candidate, freeze
source, run all required V5 gates against that candidate and review complete
evidence. No provider activation, branch-policy bypass or production deployment.


### Shipping candidate frozen and validation dispatched — 2026-09-07 UTC

Accepted pilot cleanup correction32e8c5d is integrated as ece2544; root12focused
cases passed. Frozen shipping candidate ece25447741d7f2fe622aa6cdcb66a62337f68ef,
treec2011965f7bbb43ce80e8eda023fab786f36140d is clean/pushed. Root fresh basic
runner passed all9gates: locked install, types,1328ordinary/174opt-in skips, lint,
format, build, budgets and source/compiled deployment preflight. Raw receipt
Operations/basic-gates-ece2544-40665f1b33/receipt.json SHA
`c08056b92fbb17fc6ca1b34eb110a3ab45b67d9abda3645c6f91ca8301900895`.
Exact application artifact SHA
`c9c97aa7d327b4d4f113bfdceb85b3f7807e2bbfba1b18b46ad52a0e0a9d6794`.
Root verified command log hashes and terminal passing runner with strict process
cleanup. This is only the basic subset, not complete release acceptance.

Active isolated tasks: infra199DB executions in combined-db-ece2544-8df5bc85
handle82166; CRM full66 browser gate in frozen-ece2544-full-app-20260907T014718Z-88e2b4b7
handle69929, followed by Better Farms22; engineering prepares repeatable exact-source
shipping CLI browser producer in separate checkout, waiting for CRM port5201.
Root four runtime/historical-upgrade/CRM-upgrade/recovery gates launched handle61102,
Operations/release-rehearsals-ece2544-4735428e, bound to the artifact above. Every
checkout has its own dependencies. Results pending; no production/provider actions.


### Database and rehearsal gate results — 2026-09-07 UTC

Exact ece candidate DB matrix passed199executions/19suites with zero opt-in skips
and migrations twice. Receipt combined-db-ece2544-8df5bc85/receipt.json SHA
`c9a5fcc69ceb2b57868c7417931314c11b9293e16ff3dd2503771b60ffd06a12`.
Four rehearsals passed: production runtime, historical populated upgrade, CRM
populated upgrade and CRM backup recovery. Outer receipt
release-rehearsals-ece2544-4735428e/receipt.json SHA
`856b6497ff1991d0988e4560ed35748d3c3fdac35ca6e62077868cd1b215a574`.
Root verified source/log/inner receipt hashes and absence of11owned resource
identities and410processgroups across DB+rehearsals. LinuxNode22.23.2 PID1 used
the exact basic artifact, readiness200, all7DBconnectionsTLS1.3, SIGTERM0.057s
exit0. CRM restore preserved110tables/20synthetic rows before/after migrations.

Detached argument-rejection gates passed: verify receipt SHA
`39024a8ce750ac41a480001b2c0c42fbcab08fcd9f85694ab0f882d09fe54009`,
apply `58715f0ceca7a3a834a08d091f4742161acb28bbdc3b66421229b8487cf734b5`
in detached-artifacts-ece2544-7d34ddca. This is argument rejection, not provider
copy acceptance or filesystem sandboxing.

CRM reports full66 and BetterFarms22 passing with strict inner/outercleanup; root
receipt/artifact review remains pending. Exactcandidate shipping CLI producer is
prepared for root review, not run. Infra supplemental retained-local-backup restore
runs55736 in recovery-verifier-ece2544-781ab81b (no recapture/download). CRM prepares
a separate V5 normalizer with pending reviewfalse and no fabricated gate results.
Draft shipping PR prepared against ecommerce integrity branch; release still gated.


### Browser and retained recovery evidence review — 2026-09-07 UTC

Root independently verified source/site hashes, retained browser artifacts and
raw-log hashes for full66 and BetterFarms22 receipts; cleanup resources and groups
are absent. Full app receipt SHA
`51a6861059df7d77a2f9a60be081f6b2d15163cf44901674d232818cc95c7cd8`;
pilot SHA `c8195a1493bb2d7303d59c415e9407bce345cbb7a9cbe9f5dbeb65bcab394c57`.
Retained local backup restore receipt SHA
`9a956325c782485624a21f4e51b1409519afa7b99a76233efd55292f5b000ba1`
in recovery-verifier-ece2544-781ab81b verifies105tables/671rows, sequence semantics
and two subsequent migration invocations. Root verified source hashes and cleanup.
This preserves encrypted bytes; synthetic session secret does not establish live
credential decryption or provider use. No recapture/download occurred.

Root reviewed exactcandidate shipping CLI producer and requested explicit Python
require checks surviving-O, readiness private/no-store assertion, displayed prices
and delivery metadata, and preserved priorunknown/stale UI assertions. Corrected
producer is running once underpython-O handle28917 in
shipping-browser-ece2544-975b421393; final evidence still pending.

Read-only GitHub revalidation: PR18 open/draft at exactece, base ecommerce-integrity;
main strict Verify remains bound to App15368, admins enforced, force/deletefalse,
Actions disabled. This review does not bypass the pending approved release-control
setup or authorize production. V5 normalized evidence review remains unfinished.


### Final shipping journey and normalization review — 2026-09-07 UTC

Exact ece shipping journey passed all four required labels underpython-O. Root
verified1184appsource hashes, unchanged producer,137evidence files,2ownedresources
and76process groups absent; visually reviewed mobile history screenshot. Receipt
shipping-browser-ece2544-975b421393/journey-receipt.json SHA
`f409e3ab2f36fddaa00e1c2781d4d940f5977482f2723330fe01ae5018ea2a65`.
Exactly2synthetic calls/quoted+unknown attempts,0fulfillments/notifications.

Normalization preserved the initial incomplete draft and a failed hash check.
The nested ownerstdout hash precedes its final status print; root verified exact
pre-print prefix against nested hash and complete bytes against finaljourney hash.
Adapter records this narrow timing distinction; no original hash/receipt replaced.
Complete pending bundle75d8f05ddd has35gates66evidencefiles257provenance links/231
lossless packed logs, all checked by root and independent infra review. Infra
requested explicit fullLength metadata; CRM prepares final regeneration retaining
reviewfalse. App/pilot copied external runner source is retrospective provenance:
original receipts did not record a run-time hash of that runner. Actual app/site
source hashes, command results and retained artifacts are verified separately.

No independent acceptance flag changed yet. Finalnormalized review remains active.
Engineering starts a read-only label-purchase/reconciliation contract proposal for
remaining ecommerce scope; it cannot change frozen source or activate providers.

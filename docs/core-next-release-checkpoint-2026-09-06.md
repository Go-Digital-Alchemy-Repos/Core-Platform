# Core next release checkpoint — 2026-09-06

This is the current release checkpoint. Earlier maintenance gate tables are
historical records; do not repeat completed upload migration or recovery actions
from those tables. The detailed operations history remains in
[maintenance operations](maintenance-operations-checkpoint.md) and the
[execution ledger](client-migration-execution-ledger.md).

## Candidate and production

The clean, pushed candidate is `f4853306e0d4dc086f5ab06352019858453a65b1`
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

## Current evidence and outstanding gates

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

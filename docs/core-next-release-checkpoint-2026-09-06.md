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
Frozen `8a6cdcc` and PR14 remain unchanged. The calendar seed is retained as a
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
  passed lint and formatting; exact final-head evidence remains to be assembled.
- The 16-case settings browser suite passed on `346359b`; the two new Security
  Center browser cases passed on its isolated patch. A complete browser run on
  the current combined candidate is in progress; earlier results do not replace it.
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
  for the 27 new CRM/Woo tests. A separate V3 is under review. Do not normalize
  the new skips into unrelated old gates or relabel the old accepted bundle.
- Final compiled runtime, populated migration, database groups, detached artifacts,
  Better Farms pilot, and independent release acceptance still require a complete
  candidate-bound evidence package. The checker validates consistency; it cannot
  establish the truth of attestations or authorize release by itself.

GitHub Actions remains disabled under AGENTS section 22. The authenticated
GitHub App setup needed for the approved local verification check is still
pending at GitHub Confirm access. Do not bypass strict branch protection or
replace an App-bound check with a generic token status. Continue independent
engineering work while that dependency remains unresolved.

## Remaining product work

Ecommerce completion remains part of the active goal, including catalog and
inventory integrity, checkout/customer accounts, payments/refunds/fulfillment,
shipping/tax, recovery, and verified administrative settings. The separate category
parent validation gap remains open: dangling or cyclic parents require an explicit
service validation/concurrency contract; the Woo transaction lock alone does not
fix category API writes after a rollback commits.

Better Farms content/assets/domain acceptance and final build/runtime origin
agreement remain open. The reusable website build/deployment playbook follows
completion of the system and pilot, as requested by the owner.

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
- Final V3 evidence normalization and independent release acceptance remain
  pending. The draft package must retain both initial failures and their
  separately verified resolutions. The checker validates consistency; it cannot
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
parent validation gap remains open: dangling or cyclic parents require an explicit
service validation/concurrency contract; the Woo transaction lock alone does not
fix category API writes after a rollback commits.

Better Farms content/assets/domain acceptance and final build/runtime origin
agreement remain open. The reusable website build/deployment playbook follows
completion of the system and pilot, as requested by the owner.

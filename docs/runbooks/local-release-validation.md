# Local release validation with GitHub Actions disabled

The Project Owner's instruction in the original workspace `AGENTS.md`, section 22, requires GitHub Actions to remain disabled. Do not enable, dispatch, or introduce workflows. Required validation runs locally or through another approved process. Historical workflow runs are historical evidence only; this runbook translates the relevant gates into local requirements and does not authorize deployment or GitHub configuration changes.

## Current enforcement conflict

At the September 6 review, main protection still required strict `Verify` from GitHub Actions app ID `15368`, with administrator enforcement, PRs, stale-review dismissal and conversation resolution; approving review count was zero and force pushes/deletions were prohibited. That requirement cannot be satisfied truthfully by a local run while Actions is disabled. Replacement enforcement remains pending. Do not create a fake hosted `Verify`, reuse another commit's status, or bypass protection.

Recommended replacement is a distinctly named required check such as `Local release validation`, issued by an independently approved verifier identity that validates the exact-head receipt below. Bind protection to that verifier's actual app ID. Its implementation and permissions require explicit Orchestrator review before changing protection. If no verifier exists, an explicitly accepted interim policy may require one independent PR approval tied to the receipt, preserving the other protections; that is a policy change, not something this document activates. Re-enabling Actions requires the Project Owner to explicitly reverse section 22.

## Prepare an isolated candidate

Use a clean checkout at the exact proposed integration commit, with the current main baseline recorded. Preserve peer changes; validate the actual integrated tree, not just a feature branch tested before its merge. Use lockfile installs (`npm ci`), record Node/npm/Python/Playwright/Docker versions, and compare against the prior Node 20/PostgreSQL 16 gate environment. Record runtime differences explicitly rather than claiming identical hosted execution. Commands below assume repository root.

Use fresh, explicitly owned local PostgreSQL 16 fixtures with synthetic credentials, localhost-only published ports and no host data mounts. Never reuse application databases or source a production `.env`. Supply opt-in test URLs directly from the fixture configuration. Check each script's exact hostname/database guard before invocation. Fixture creation and test data writes are authorized only within those disposable databases. Retain cleanup evidence, including stopped app processes and removed containers/volumes.

## Required gate matrix

All applicable gates must pass; do not allow a failed pilot, skipped opt-in test or missing artifact to count as success.

| Gate | Local execution and evidence |
| --- | --- |
| Reviewed Better Farms pilot | Check out exact Better Farms `7fd1298beb373ee447aa97f578fb11e575faf8f0`, install its locked dependencies, set `PILOT_SITE_ROOT` to that clean checkout, and run `npx playwright test --config playwright.pilot.config.ts`. Install Chromium as needed. Retain `test-results/pilot/` and actual test totals. This is two-origin route/integration acceptance, not content approval, checkout activation or a WCAG certification. |
| Deployment configuration | Run `npx tsx server/scripts/check-deployment-preflight.ts --config railway.toml --profile normal`. After build run `node dist/operations/check-deployment-preflight.mjs --config railway.toml --profile normal`. These are static checks only; see the separate target-runtime gate in `deployment-preflight.md`. |
| Fresh migrations, twice | Against owned `core_platform_ci`, invoke `runMigrations()` twice sequentially and close the pool on completion. Both invocations must succeed; record reconciliation results, not merely a journal row count. |
| Types, lint, formatting and unit tests | `npm run check`, `npm run lint`, `npm run format`, `npm test`. Preserve individual exit statuses and test counts; opt-in database tests skipped here remain required below. |
| Historical populated upgrade | Ensure exact baseline `a006f36a3c4f37566c71b278d561844b45fb3b81` is available locally. Run `python3 script/verify-populated-upgrade.py --baseline a006f36a3c4f37566c71b278d561844b45fb3b81 --output test-results/populated-upgrade.json`. Preserve negative assertions, original row preservation and restart compatibility evidence. |
| Backup, form effects and reservation expiry | Set `BACKUP_TEST_DATABASE_URL`→`core_backup_test`, `FORM_EFFECT_TEST_DATABASE_URL`→`core_form_effect_test`, `RESERVATION_EXPIRY_TEST_DATABASE_URL`→`core_reservation_expiry_test`. Run `npx vitest run server/services/system-backup.database.test.ts server/storage/forms-effects.database.test.ts server/storage/ecommerce-reservation-expiry.database.test.ts` separately under `TZ=America/New_York` and `TZ=UTC`. |
| Atomic settings | Set `SETTINGS_TEST_DATABASE_URL`→`core_settings_test`; run `npx vitest run server/__tests__/settings-atomic.db.test.ts`. |
| CRM persistence, mapping and 0062 safety | Set `CRM_CUSTOM_FIELDS_TEST_DATABASE_URL`→`core_crm_custom_fields_test`, `CRM_FORM_MAPPING_TEST_DATABASE_URL`→`core_crm_mapping_test`, `CRM_PROFILE_MIGRATION_TEST_DATABASE_URL`→`core_crm_profile_test` using `127.0.0.1`. Run `npx vitest run server/storage/crm-custom-fields.database.test.ts server/storage/crm-form-mapping.database.test.ts server/migrate-crm-profile.database.test.ts`. Required on candidates containing the CRM slice. |
| Current Core→CRM populated upgrade | Make exact baseline `a99bb7efeb4c007789c20da91ff0e2d395452836` available; run `python3 script/verify-crm-populated-upgrade.py --output test-results/crm-populated-upgrade.json`. Inspect the pinned baseline and verify populated 0062 migration/replay evidence. Required on CRM candidates. |
| CRM capture/restore | Run `python3 script/verify-crm-backup-recovery.py --output test-results/crm-recovery.json`; retain actual pending-job/configuration/value preservation evidence and cleanup result. Required on CRM candidates. |
| Production artifacts and budget | `npm run build`, `python3 script/verify-upload-verifier-artifact.py`, `python3 script/verify-upload-apply-artifact.py`, `npm run budget`. Retain hashes of built app and operational artifacts. Detached checks must use the built artifacts, not silently resolve source dependencies. |
| Compiled startup and shutdown | `python3 script/verify-production-runtime.py --output test-results/production-runtime.json`. Verify actual normal startup, health, signal handling and drainage against its owned fixture. Recovery readiness alone is insufficient. |
| Real application browser | Set `BROWSER_TEST_DATABASE_URL`→`core_browser_test`; run `npx playwright test --config playwright.app.config.ts`. Retain desktop/mobile actual results covering included settings, manual transactions and CRM journeys. Do not substitute mocked responses for required persistence acceptance. |

On a candidate without a listed CRM/preflight implementation, report that gate as not applicable with the exact scope justification; do not silently omit a gate from a CRM release. The CRM additions above are explicitly preserved even though the main branch's historical workflow did not contain them.

## Immutable receipt and review

Create a uniquely named private operations directory and retain a machine-readable receipt plus sanitized output files. Record:

- Full candidate commit, tree hash, baseline commit, branch/PR, clean-tree observation and all pinned dependency repositories.
- Start/end UTC times, operator and independent reviewer identities, tool versions, platform and fixture isolation details.
- Every command, permitted nonsecret environment settings, exit code, test pass/fail/skip counts, and artifact/evidence file hashes. Never store credentials, submitted values, real database rows or raw provider responses.
- Explicit result per gate and limitations; a timeout, missing output, skipped database suite or unavailable fixture is not a pass.
- Production artifact/config hashes, fixture/process/container/volume cleanup results and independent review acceptance tied to the exact candidate.

Hash the completed receipt and retain it immutably outside the ephemeral checkout, alongside referenced artifacts. A digest detects changes; it is not operator attestation or a signature by itself. Do not overwrite a failed receipt with a successful rerun. Create a new attempt linked to the earlier evidence. Do not modify the candidate to insert its own receipt hash, which would change the commit being validated; reference the external receipt from reviewed release records.

A new commit invalidates exact-head acceptance. Determine which checks are affected, run those again, and explicitly carry forward only unchanged evidence with source/tree comparisons and reviewer reasoning. Changes to migrations, dependencies, build, environment assumptions or test fixtures require their dependent runtime/integration checks again. Any merge/rebase resolving peer changes requires validation of the resulting tree. Never label carried evidence as newly executed.

Before freeze, additionally obtain the separately bound normal-production runtime-environment preflight. After deployment verify the actual artifact, migrations/readiness, authenticated reads, media, historical transactions and queue/provider reconciliation before unfreeze. Local tests cannot prove production credentials, provider reconciliation, platform termination or live database compatibility without their separate operational evidence.

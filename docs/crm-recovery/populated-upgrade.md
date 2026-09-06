# Populated live-main to CRM upgrade rehearsal

Run from the CRM worktree:

```sh
python3 script/verify-crm-populated-upgrade.py --output /tmp/crm-populated-upgrade.json
```

The baseline is pinned to `a99bb7efeb4c007789c20da91ff0e2d395452836`, the live main revision identified by the Orchestrator. The script archives that exact Git revision, installs its exact package-lock dependency graph with `npm ci --ignore-scripts`, and imports its actual migration runner into a new uniquely named PostgreSQL 16 fixture. Docker must resolve to a local Unix socket; the database port is published only on loopback. Child Node environments contain synthetic local database/session settings and no inherited provider credentials. All created containers and their volumes are removed in `finally`; failed removal fails the rehearsal.

`populated-upgrade-result.json` records the candidate revision, source/SQL hashes and runtime outcome. The rehearsal seeds existing CRM lead/client records, notes, forms, an accepted submission and queued legacy CRM effect, plus a paid ecommerce order, inventory adjustment and shipment notification. An explicit `no_preference`, individual client type despite a legacy company name, and intentional null profile columns exercise the repaired startup behavior.

The candidate's real migration runner executes twice. Every baseline column of every row in the 14 selected tables must match exactly; new additive columns are allowed. This includes settings inserted by the baseline migration, not only explicitly seeded IDs. The narrow candidate usability fixture then creates a number definition, stores zero on a new lead and client, and saves an explicit form mapping through real storage APIs. Two further candidate migration runs preserve those values and mapping exactly. A final projection comparison verifies every original baseline row remains unchanged, including the queued legacy job and historical ecommerce rows.

The companion backup recovery rehearsal owns the larger archived-choice, pinned mapped-job processing and capture/restore matrix. This gate does not duplicate that matrix or execute workers/providers. It verifies migration compatibility and new storage usability; it does not prove production data prevalence, production HTTP readiness, object-storage connectivity, or old binary compatibility.

## Rollback boundary

Normal binary downgrade to the pinned baseline is prohibited after explicit CRM mapping is accepted. Its `server/services/form-effect-jobs.service.ts` CRM branch infers lead fields from submission data and does not apply the new mapped payload's pinned custom values. Its `server/services/forms.service.ts` likewise predates explicit mapping acceptance. Successful schema startup of that binary would not establish semantic safety.

The reserved recovery route is the separately retained read-only maintenance artifact with SHA-256 `4b0b5f1c28c584c7c0071afe17ef1459c2737747fbf3943f29610b61d71bdf09`: no business writes or workers, followed by roll-forward to a compatible CRM binary. Its prior independent evidence remains separate. This rehearsal does not launch that artifact or claim a new readiness/503 proof against the upgraded database; doing so requires its strict database TLS runtime fixture, which this local migration-only gate does not provide. Hosted CI does not depend on the operator's private artifact path.

Root independently reran this rehearsal at `548b600bf294ea45a8fe8f7f3c4c9c7b32c3ad63` after integrating the current main branch and the read-only preflight. All preservation and new-feature assertions passed, and the owned fixture was removed. The independent receipt is retained in Core Platform Operations.

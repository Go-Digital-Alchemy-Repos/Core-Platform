# Owned rehearsal cleanup evidence

The historical populated-upgrade, CRM populated-upgrade, CRM capture/restore, backup recovery and production runtime Python scripts, plus the Better Farms pilot launcher now record ownership before cleanup. These are local disposable-test producers; no production cleanup, standalone volume deletion or GitHub Actions operation is added.

## Receipt paths and ownership

Use a new output path for every attempt. Both Python `--output` paths and the pilot cleanup path are opened exclusively; an existing success or failure receipt is never overwritten. The pilot accepts `PILOT_CLEANUP_RECEIPT_PATH`, defaulting to a uniquely named `test-results/core-better-farms-pilot-<attempt>-cleanup.json` outside the Playwright output subdirectory. Callers must collect this receipt in addition to browser results. Receipts contain only synthetic resource identifiers, outcomes and source hashes, not database passwords.

After Docker returns a newly created container ID, the producer verifies its exact ID, generated name and attempt label. It rejects explicit bind/mount configuration and non-anonymous volume names. An adjacent `.ownership.json` file is exclusively created and fsynced before the long-running rehearsal begins. The final result is also fsynced. The directory/filesystem must remain available; fsync does not turn an ephemeral directory into retained storage. A crash before final receipt completion is incomplete evidence, never success.

Cleanup revalidates the same ID/name/label/volume inventory when the container is present, then invokes `docker rm --force --volumes` by its captured ID. It separately inventories containers and the exact captured anonymous volume names. `containersRemoved` and `volumesRemoved` are explicit observations. If the container has already disappeared but one of its captured volumes remains, cleanup fails and records the remaining name. It does not issue `docker volume rm`, delete an unrelated name, or infer volume absence from container absence. If creation/inspection failed before verified ownership was captured, cleanup fails closed and leaves the attempted resource for operator investigation.

## Process completion

Python subprocesses run in owned process groups. Interrupted/timed-out children are terminated, escalated to SIGKILL if necessary, and waited for before database cleanup. Remaining owned groups are checked both before and after Docker cleanup; cleanup command groups are included in the final `processesStopped` observation. Standard input remains piped for SQL commands. The pilot starts build/Core/site children in isolated owned process groups, gives the app leader a graceful TERM window, then kills and verifies any remaining owned group (including descendants whose direct parent has exited), and closes its HTTPS proxy before reporting success. Repeated pilot shutdown requests share the same cleanup promise.

The pilot no longer uses Docker auto-removal; explicit removal keeps the ownership inventory available through shutdown. Failed removals, remaining resources, incomplete child shutdown or receipt persistence failures prevent a successful cleanup outcome. External process termination that prevents the producer from finishing still requires operator follow-up; no final receipt means no cleanup proof.

## Validation and provenance

```sh
python3 -m unittest discover -s script -p test_rehearsal_cleanup.py -v
npx vitest run server/__tests__/pilot-cleanup.test.ts
python3 script/verify-crm-backup-recovery.py --output /private/new-attempt-recovery.json
python3 script/verify-populated-upgrade.py --baseline a006f36a3c4f37566c71b278d561844b45fb3b81 --output /private/new-attempt-upgrade.json
```

Focused tests exercise ownership mismatches, explicit external mounts, removal failures, already-absent containers with remaining volumes, exclusive output preservation, SQL stdin delivery, a real child that ignores SIGTERM, a parent that exits while an unref descendant remains, and cleanup-phase subprocess timeouts/orphans. Actual local smoke evidence is retained separately by the operator, including pilot readiness followed by SIGTERM and a successful cleanup receipt. It is producer validation, not a new full pilot browser acceptance run.

A receipt records pre-test HEAD plus `workingTreeClean` and producer source hashes. Development checks with uncommitted producer changes must not be represented as immutable evidence for that HEAD. Future integrated release validation must rerun the reviewed producers against the final clean candidate. This change does not repair or reinterpret earlier cleanup gaps or review their old receipts retrospectively.

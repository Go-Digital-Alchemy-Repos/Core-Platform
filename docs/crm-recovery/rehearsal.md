# CRM custom fields and mapping recovery rehearsal

Candidate: `ed3ee0985bb036fb0c2ba1df02e05da212e9728e`, with the migration correction and verification files recorded by SHA-256 in `rehearsal-result.json`. Executed locally on 2026-09-06 (UTC).

Run from this worktree:

```sh
python3 script/verify-crm-backup-recovery.py --output /tmp/core-crm-recovery-evidence.json
```

The launcher creates a uniquely named PostgreSQL 16 container through a local Unix Docker endpoint, publishes a random loopback port, supplies only synthetic credentials in a sanitized child environment, and verifies removal in `finally`. It does not use the app browser fixture, an existing database, production settings, backups, or provider credentials. Child command timeouts and database connection/query/statement timeouts bound execution. Raw child output is withheld; failures report only a verification stage.

## What passed

The verification uses the actual migration runner, CRM definition/value storage, form mapping/submission services, durable worker, and `runSystemBackup` / `restoreBackupSnapshot`. Only backup object transport is replaced by an in-memory adapter; capture, foreign-key ordering, gzip serialization, restore SQL, and subsequent worker processing are real.

- Three definitions (number, boolean, choice), populated lead and client custom values, and one accepted pending mapped submission were created through the real services/storage. Only a CRM intake effect was queued; notifications, contact-message creation, and Mailchimp were explicitly disabled in the synthetic form.
- A choice and its option were archived after acceptance. The form mapping remained persisted at revision 1, while the current definition moved to revision 2. The queued payload retained the accepted revision and scalar values.
- Capture included all 109 tables, including the four dedicated custom-field tables, with 20 synthetic rows. After truncation and actual restore, **every captured row matched exactly**, including JSON values, definition history, entity revisions, mapping, monotonic mapping revision, and job payload.
- After migrations reran, **all captured rows in all tables still matched exactly**, including intentional client-profile nulls and `no_preference`. There are no allowed overwrite exceptions.
- The restored pending job completed once. The resulting lead retained `0`, `false`, and the choice key, with the original accepted choice label and unarchived historical option; current metadata remained archived.
- Replaying the accepted idempotency key returned the same submission; a fresh submission referencing the archived mapping failed with 503. A second worker pass created no duplicate lead.
- The owned container was removed and its absence verified. TypeScript verification, scoped ESLint, Prettier, and Python syntax checks accompany the rehearsal.

## Migration finding corrected

The initial rehearsal exposed an inherited repeated backfill in `server/migrate.ts`: nullable profile columns caused later migration invocations to fill `primary_email` and `client_since` and change an explicit `preferred_contact_method = 'no_preference'` to `email`. This was a startup/migration overwrite, not a lossy backup restore.

The reviewed correction now takes an explicit table lock, records which of the six legacy profile columns exist, and atomically adds/backfills only newly introduced columns. Existing values—including intentional nulls, client type, and contact preference—remain unchanged. Historical `0023_crm_client_profile.sql` is unchanged. Separate actual PostgreSQL regression tests verify full legacy and partial legacy upgrades, two restarts, concurrent modern starts, and rollback/retry after an injected backfill failure.

This updated rehearsal removes the old overwrite expectation and demands exact all-table equality both immediately after restore and after migrations rerun. Its result records the corrected migration source hash.

## Limits

This verifies current-schema synthetic capture/restore and post-restore migration compatibility, not an older production backup, an older binary rollback, provider object-storage connectivity/retention, or a production disaster recovery operation. The transport adapter is intentionally in-memory; no R2 upload/download is exercised. No production or provider mutations occurred.

Root independently reran the four PostgreSQL profile migration regressions and this complete recovery rehearsal against `ed3ee0985bb036fb0c2ba1df02e05da212e9728e`. Both passed; all captured rows remained equal after migration reruns, and both owned fixtures were removed. The independent receipt is retained outside the repository under Core Platform Operations.

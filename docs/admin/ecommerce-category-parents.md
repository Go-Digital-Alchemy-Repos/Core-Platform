# Ecommerce category parent integrity

The category API already checked missing, self and descendant parents. Those
checks previously ran before the write transaction, so concurrent requests could
both pass using an outdated graph. Direct storage callers bypassed them, and a
preexisting cycle could cause unbounded route traversal.

Parent checks now run inside category storage transactions under the shared
category graph write lock. Create and update require a real parent and a finite,
acyclic ancestor chain. Self and descendant parents retain their existing HTTP
400 messages; a corrupt ancestor chain returns `Parent category hierarchy is
invalid` with HTTP 400. A missing update target still returns HTTP 404.

An omitted or undefined update parent preserves the current relationship. Null
and the empty-root representation clear it. Inactive categories remain eligible
parents. Deletion still deactivates the category and detaches its direct children;
it does not delete the category row. Concurrent operations follow a serial order:
an update completed before deletion is detached, while an update after deletion
may reference the retained inactive category.

Validation examines the affected ancestry only. Unrelated historical corruption
does not block valid root writes. Explicitly clearing an affected category's
parent can repair a cycle or dangling chain; no records are silently repaired.

The graph lock is acquired before category/mapping row locks in storage and Woo
category apply/rollback paths. Because `parent_id` has no foreign key, a parent row
lock cannot protect against incoming child inserts. The transaction-scoped table
lock serializes category writes while allowing ordinary reads. Direct SQL writers
remain responsible for parent validity. Parent validity itself needs no schema
change; the execution scheduling contract below requires additive migration 0064.

PostgreSQL acceptance includes opposite concurrent parent assignments, both
update/soft-delete orderings, and create/update versus Woo rollback in both
orders. Existing Woo merchant-preservation and rollback regressions remain
required. The category UI's handling of historical corrupt graphs is a separate
frontend task.

New Woo run execution uses version `1.1.0`; new `1.0.0` begin requests are rejected.
The source envelope, disposition contract and source fingerprint remain `1.0.0`.
Migration `0064_woo_import_execution_version.sql` atomically widens only the named
run-version CHECK to accept both versions, without changing historical rows or
checkpoints. This supersedes the initial no-migration assumption. It is replayable.

`parent-first-v1` uses iterative depth-first traversal of categories in source
operation order: visit a category's planned ancestors before emitting it, emit
each category once, then append products in their original order. For input
child-A, unrelated-root, child-B, parent (both children sharing parent), the order
is parent, child-A, unrelated-root, child-B. Operation content and fingerprints
do not change. Ordering version and batch size are persisted before any batch.
Omitted resume size reuses the persisted size; an explicitly different size or
unknown execution metadata/version is rejected. Each atomic batch overlays its
planned parent changes onto the locked live graph and validates the resulting
ancestry, including merchant changes made between batches. Valid atomic reversals
are allowed; stale cycles enter `manual_review` without partial batch writes.

Legacy `1.0.0` runs, including empty and partially committed runs, retain original
category input order and batch/audit identities. They are never upgraded. Omitted
legacy resume size retains the old default 100 behavior. A legacy batch depending
on a not-yet-existing future parent stops for manual review; recovery follows the
existing backup/manual-review contract rather than rewriting committed identities.
The pinned f485330 old supported resume implementation rejects `1.1.0` before
status writes. This is not a claim that arbitrary old direct repository methods
or raw SQL enforce the new execution contract.

Deployment must apply 0064 before creating 1.1 runs. An application rollback does
not authorize narrowing the CHECK, converting versions, or deleting 1.1 rows.
The old supported resume path cannot continue those runs: keep them paused for
manual recovery until a compatible runtime returns. This change grants no new
production import authorization.

Retire or drain every old category-writing application instance before claiming
this graph invariant across the deployment. Old runtimes validate before their
write transaction; their writes can still race with the new protocol during a
mixed-runtime rollout. Applying the migration alone does not close that window.

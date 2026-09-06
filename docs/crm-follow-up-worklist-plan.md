# CRM follow-up worklist: next implementation slice

Status: Orchestrator design checkpoint after the CRM-2 release candidate. This is part of the accepted CRM-3 backlog, not a claim of implementation or a change to the frozen release candidate.

## Existing behavior verified at 8a6cdcc

Lead and client tasks live in separate tables with title, dueAt, assignedToId, createdById, completed and timestamps. Current admin routes create or patch tasks under CRM permissions. They accept an arbitrary assignee string and rely on the user foreign key; there is no route-level eligibility check. Completion has no actor/time history. The existing create routes use nullish coalescing, so an explicit null assignee defaults to the acting user. The first worklist increment must preserve current callers while defining explicit unassignment consistently for the new workflow.

## First increment

Add a shared, paginated follow-up worklist across lead and client tasks, with record links, owner and completion filters, and overdue/upcoming/no-date views. Use existing CRM module and permission checks. Keep the two task tables and existing record-detail task UI; a new service can unify their read projection using a discriminated lead/client identity. Stable ordering and pagination must include resource kind and task ID, with undated tasks handled explicitly. Do not fetch the entire task collection into the browser.

Validate assignees server-side against users eligible for CRM access. Return an actionable validation error for nonexistent or ineligible users rather than exposing a database constraint failure. Define omission, null and explicit assignment semantics; test current callers before changing their defaults. Preserve assignment display for historical users whose permissions later change, while preventing new assignment to an ineligible account.

Current dueAt columns lack timezone metadata. Preserve their stored interpretation in this increment; do not silently reinterpret historical dates. Any new date/time contract must specify conversion and display rules before implementation. The worklist must use one documented clock for overdue filtering, with deterministic tests at boundaries.

## Later CRM-3 increments

Priority and completion actor/time need an additive schema contract and migration review. Reminders need durable claims, idempotent dispatch, recipient authorization and observable retry/terminal failure; no reminder sends are authorized by this design alone. Per-user profile layout preferences remain optional and must not delay pilot deployment.

## Acceptance

- Actual API tests cover CRM disabled, denied role, eligible and ineligible assignees, null/omission semantics and missing records.
- PostgreSQL tests cover stable pagination across both task kinds, equal due dates, no due date, concurrent completion and realistic synthetic volume.
- Browser tests cover record navigation, owner/due/completion filters, assignment, completion, reload persistence and recoverable failures.
- Preserve won-to-client conversion behavior and existing task APIs unless a documented compatibility change is required.

Keep this increment on a separate branch after the release candidate. The current release remains subject to its own recovery and deployment gates.

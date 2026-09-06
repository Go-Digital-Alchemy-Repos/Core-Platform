# CRM follow-up worklist

This increment unifies existing lead and client tasks at `/admin/crm/follow-ups`. It does not migrate task data or add reminders, priority, completion history, or notification sends. Record links open the existing detail sheets via `?record=<id>`.

## Read contract

`GET /api/admin/crm/follow-ups` remains behind the existing authenticated CRM module/permission mount. Queries are strict:

- `kind=all|lead|client` (all)
- `completion=open|completed|all` (open)
- `due=all|overdue|upcoming|undated` (all)
- `owner=all|mine|unassigned|user` (all); `assigneeId` is required only for user
- `limit=1..100` (25), optional bounded opaque `cursor`

Response: `{items,nextCursor,asOf}`. Each item contains the discriminated `kind`, `taskId`, `recordId`, `recordName`, title, dueAt, completed, assignedToId and nullable `{id,name,eligible}` assignee. Task IDs must always be paired with kind. No unrestricted task collection or total count is returned.

A SQL UNION ALL uses dueAt ascending, null dates last, then kind and task ID under deterministic C collation. It reads limit+1 to detect the next page. Cursor version 1 contains the last ordering tuple, normalized filters, acting user ID and original asOf. Unknown/unbounded/invalid fields and mismatched filters are rejected. Cursor data is navigation state, not authorization; each request still passes the current CRM permission gates.

Pagination reads current committed state, not a database snapshot spanning requests. Completing a previous open task does not shift later rows as offset paging would. Concurrent changes to due dates or filter membership can still change the visible set; Refresh worklist returns to the beginning with a fresh clock.

`GET /api/admin/crm/follow-ups/assignees` returns `{items:[{id,name}],nextCursor}` with optional `query` (up to120 characters), `limit` (1..100, default25) and cursor. Search and paging remain server-side. Eligible targets are unsuspended admins or unsuspended editors with CRM permission. Existing historical assignment names remain visible even after eligibility changes.

## Writes and date compatibility

Existing POST task routes and response shapes remain in use. Omitted and explicit-null assignees still default to the acting user. Existing PATCH routes preserve omitted fields, and explicit null unassigns. The worklist patches only fields edited by the operator. Completion remains a boolean; these writes do not introduce compare-and-swap semantics for competing edits to the same field.

Task updates lock the task; new assignments hold a share lock on the target user through the write and use the existing authorization predicate plus suspension check. A nonexistent/ineligible new target returns400 with instructions to choose an eligible account or unassign. Retaining the identical historical assignee is permitted. Missing parent records/tasks return404; no foreign-key details or raw database errors are intentionally exposed.

Historical dueAt columns remain timestamp without timezone. Existing Drizzle reads interpret them as UTC and writes serialize Date to UTC; the detail forms continue submitting their existing date strings. The new worklist explicitly labels displayed date/time UTC. Overdue is strictly dueAt < asOf; upcoming is dueAt >= asOf; undated is SQL NULL. The server creates asOf and pins it across pages. SQL parameters use UTC timestamp strings, preserving microsecond cursor precision without host-local pg Date serialization. No stored date reinterpretation occurs.

## Verification scope

Focused PostgreSQL acceptance uses an owned disposable local database: 2,000 tasks across both kinds, equal dates including microseconds, null ordering, UTC boundary comparisons, completion between pages, assignment eligibility/default/null/history and concurrent permission change. Mounted tests retain actual authentication/module middleware. Browser acceptance uses the actual app, synthetic identities and real API writes, with transport failures injected only to test retry behavior. There are no provider operations or sends.

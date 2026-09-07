# CRM note attribution

Lead and client detail GET responses add nullable `authorName` to existing note rows. It is the current trimmed first/last name from the author profile, not a historical snapshot. Blank names, absent actors and deleted authors render “Author unavailable”; these states do not prove a system action or deletion. Former/suspended authors retain attribution; the current requester must still pass authentication, suspension, CRM module and CRM permission checks.

Both note composers show “Visible to everyone with CRM access.” Note text and author names remain escaped text. No email, password, permissions or full user object enters the projection. The read uses one explicit LEFT JOIN per note list, preserving notes without authors. Existing newest-first ordering and unbounded detail lists are unchanged.

POST payloads/responses and storage writes are unchanged. The actor remains the authenticated user, and successful creation refreshes the detail read. No schema, migration, privacy/audience flag, new history, pagination, sends or won-conversion mutation is introduced.

Validation: mounted route tests use actual parent middleware with synthetic storage boundaries; component tests cover names, neutral fallback, older missing-field responses and escaped hostile text. Disposable PostgreSQL tests exercise both real note-table joins, partial/blank/current renamed authors, suspended former authors, deletion SET NULL, exact output field allowlist and note retention/order. These are not a full browser acceptance claim; real app create/reload checks remain for independent integration acceptance.

## New opt-in inventory obligation

Future release evidence must account for `server/storage/crm-note-attribution.database.test.ts`, environment `CRM_NOTE_TEST_DATABASE_URL`, exact loopback database `/core_crm_note_test`: **2 actual cases / 2 ordinary skips**. The frozen V3 verifier is intentionally unchanged; a separately reviewed successor inventory is required before this new candidate can satisfy release gates.

Suite SHA-256: `77c61c8ecb9f2d92a8108b1fbefb8480679129ecf6b0f3b18ae726a3c751a9fe`.

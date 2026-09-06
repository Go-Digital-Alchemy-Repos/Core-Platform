# CRM-2 form mapping backend contract

Root-accepted backend integration; no mapping UI or production enablement is claimed.

Independent review found no scoped blocker in transaction ordering, claim fencing,
accepted revisions, public omission or authorization. Root reran 25 focused
schema/service/mounted-route tests successfully; the implementation worker passed
79 focused tests and 19 PostgreSQL tests with fixture cleanup. Mapping UI, the
complete browser journey and mapped-job backup/restore remain release gates.

All mapping administration requires an authenticated administrator, CMS enabled and CRM enabled through the actual admin router. CRM/content editors cannot administer mappings.

- `GET /api/admin/forms/:id/crm-mapping` returns `{mapping, revision}`. Null mapping retains legacy heuristic intake.
- `PUT /api/admin/forms/:id/crm-mapping` accepts exactly `{expectedRevision, mapping}`; mapping is null or the accepted strict V1 mapping with `revision=expectedRevision+1`. Response is `{mapping,revision}`. Removal increments the form's monotonic revision; it never resets to zero. Stale writes return 409.
- `POST /api/admin/forms/:id/crm-mapping/preview` accepts exactly `{expectedRevision,mapping,sample}` for the next proposed revision. It runs the existing ordinary field validator followed by the same pure resolver and complete-envelope validation used by intake. Response is the resolver's `{ok,mode,...}` result or safe source-field errors. Preview does not persist data or create effects. Sample request maximum is 64 KiB.

Mapping saves validate actual field IDs, types/options and active lead/both definitions. Generic form updates preserve mapping columns and reject mapped source ID deletion, key/type changes or newly incompatible options/settings. Shared-definition lock then form-row lock serializes generic edits, mapping saves and acceptance.

Every public form representation omits `crmMapping` and `crmMappingRevision`. Submission uses an authoritative private form read within the acceptance transaction. Ordinary validation remains before replay lookup; an existing idempotency key returns its original accepted submission before new mapping checks. Concurrent first accepts retain one submission and one `crm_intake` effect. This preserves the existing key-reuse semantics; it does not introduce payload comparison.

Mapped payload is strict `{kind:"crm_intake",version:1,formId,formName,mappingRevision,normalizedBuiltins,customValues}` with a final serialized limit of 64 KiB. Each custom value pins its definition revision. Built-ins are explicit only, with the resolver's Website Lead fallback. Form name is display metadata; the worker verifies immutable form ID against the owning submission. Public input cannot supply lifecycle, owner or permission values.

Mapped public/proxy validation errors retain HTTP 400 and the message, with optional `errors:[{sourceFieldId,code}]`; codes are `invalid_value` or `required_value`. No submitted values, definition IDs, private configuration or raw database errors are included. Configuration unavailable returns a neutral 503 without mapped diagnostics. Existing ordinary form validation responses remain unchanged. Preview also returns its safe configuration error codes to authorized administrators.

The worker retains legacy unversioned jobs. Any versioned CRM job must pass the V1 parser; unknown versions/identity mismatches never fall back to heuristics. Lead upsert, pinned non-null value merge and job completion share the existing claim-fenced transaction. Blank values do not erase existing custom values; accepted jobs can apply after a definition/option is archived. Current defaults/mappings are not re-evaluated. Errors use the existing bounded retry/failed-job path and sanitized operational logs; external delivery semantics are unchanged.

Rollback still requires stopped intake/workers and drained mapped jobs, or a compatible consumer retained. Old worker binaries must not consume the new payload. Backup/restore of pending mapped jobs and complete browser acceptance remain separate release evidence gates.

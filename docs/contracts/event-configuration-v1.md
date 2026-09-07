# Event configuration v1

Events Settings owns reusable event types, categories, audiences, formats, delivery choices, tag suggestions, and one preset per active event type. The initial configuration exactly preserves the previous hardcoded choices and training default.

## Persistence and access

`system_settings.events_configuration_v1` stores one validated JSON document. GET/PUT `/api/admin/events/configuration` inherit the existing Events-enabled and content-administration authorization. PUT submits the current revision; a transaction-scoped advisory lock serializes initialization and updates. Stale writes return 409. Successful writes increment revision and insert `event_configuration_updated` in `activity_logs` in the same transaction. Generic settings writes/deletes cannot modify this key.

GET `/api/events/configuration` returns version, revision, and option IDs/labels/archive flags/canonical delivery behaviors only; preset and tag configuration is omitted. Public event consumers use configured labels and filter identities. An admin configuration fetch failure prevents creation, preset application, and saving until retry succeeds; an open draft is preserved.

## Compatibility

Option IDs remain stable across label and ordering changes. Existing IDs cannot be deleted. Archive hides options from new selections, while existing event selections remain editable. Active presets cannot reference archived choices, and the default type must remain active. Preset application asks before replacing fields edited in the current form and otherwise affects only preset-controlled fields.

`events.delivery_option_id` records the selected configurable choice separately from the existing canonical `delivery_mode`. Each choice maps to in-person, virtual, or hybrid behavior; the mapping is immutable after saving. Existing rows need no backfill: a null selected ID falls back to the canonical mode. New IDs do not introduce new registration, location, or virtual-access behavior. Event settings never rewrite existing events.

Tag suggestions and preset tags remain optional; event authors may enter additional comma-separated tags. Speaker management uses the existing organizer records and API, with event-specific speaker fields kept as snapshots.

## Rollout and recovery

Deploy the additive delivery-option column before starting this code. Missing configuration requires no seed migration; reads return validated defaults. Rollback to older application code leaves existing settings and nullable column intact, but older interfaces cannot reliably manage custom choices; prefer a forward fix once custom IDs are in use. No production deployment is performed by this change.

Validation includes pure schema/reference tests and the opt-in `EVENT_CONFIGURATION_TEST_DATABASE_URL` PostgreSQL suite, constrained to loopback database `core_event_configuration_test`. It exercises migration replay, roundtrip, concurrent saves, stale writes, audit rollback, and preservation constraints.

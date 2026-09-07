# Event improvements implementation checkpoint

Implemented on `codex/event-materials-settings`, based on frozen integration `ece25447741d7f2fe622aa6cdcb66a62337f68ef`. This branch does not modify the original dirty working tree or deploy production.

## Delivered

- Multiple event materials directly under Description, with progress/retry, editable labels, ordering, staged saves, private downloads and 24-hour orphan cleanup.
- Speakers management backed by existing organizer records, with event-specific snapshot preservation and validated profile input.
- Configurable event choices/presets/tags with stable IDs, archived-value compatibility, canonical delivery mapping, transactional revision checks and audit records.
- Explicit screen-color sampling across all 18 Branding fields, retaining manual/native controls and explicit Save, with cancellation and unsupported-browser guidance.

## Validation

The full ordinary suite passed 1,389 tests (190 opt-in tests skipped). 64 focused final checks plus 5 mounted speaker CRUD checks passed and cover upload failure/retry/removal, format and private-object validation, visibility-controlled downloads, option contracts, speaker input, and sampler cancellation/draft behavior. The separate local PostgreSQL suites passed 10 attachment lifecycle tests and 6 configuration transaction tests, including migration replay and concurrent writes. Type checking and a production build passed. Local browser checks at 390px and 1440px verified settings, the speaker dialog, and placement of the attachment uploader; browser checks used synthetic API fixtures, not a live private storage service.

## Release requirements and remaining verification

- Configure and verify a separate private R2 bucket and bucket-scoped credentials; public uploads and local disk are intentionally unsupported for event materials.
- Verify private upload/download and restricted-event behavior against deployed storage and include private objects in the recovery procedure.
- Actual operating-system EyeDropper sampling outside the browser remains unverified. Automated tests mock the API; unsupported browsers display Chrome/Edge guidance.
- Apply additive migration 0067 before starting the new application. Coordinate its number with independently developed migration branches before merging them together.
- Follow existing release gates. GitHub Actions remain disabled. Local implementation and tests do not constitute production release approval.

## Production integration — 2026-09-07

Prepared `codex/event-production-integration` from the current production/main commit `18e9a227aa4752b283aae511071c34fd82458673`, applying the event feature commit independently of the older shipping/CRM integration branch. Resolved migration/export/settings conflicts while preserving the current production features. This candidate contains only the 44-file event/materials/branding change relative to current main.

The integration passed 968 ordinary tests (40 opt-in skips), TypeScript, and the production build. Earlier totals above describe the older integration base, not this candidate. Deployment is pending private storage and live acceptance: Railway access works, but the locally authenticated Cloudflare account differs from the account owning Core's existing R2 bucket. The owner has been asked to sign in to the correct account; no bucket was created in the unrelated account and production was not modified.

# CRM-2 manual creation and conversion API

Root-accepted implementation; production release and UI integration remain separate gates.

Independent review found no blocking transaction, authorization or compatibility
issue. Root passed 47 focused service/API tests and all 24 PostgreSQL-suite tests
(18 database cases plus six schema/fixture guards). The owned disposable database
container was removed after verification. End-to-end browser and mapped form job
acceptance remain outstanding.

Both endpoints use existing `/api/admin/crm` authentication, CRM feature and CRM permission gates. Administrators and CRM-permitted editors may create records. These trusted endpoints are distinct from API-key inbound lead intake.

## Manual lead

`POST /api/admin/crm` accepts the existing lead input fields plus optional `customFields`:

```json
{
  "name": "Synthetic lead",
  "email": "synthetic@example.test",
  "customFields": [
    {
      "definitionId": "00000000-0000-4000-8000-000000000001",
      "definitionRevision": 1,
      "value": false
    }
  ]
}
```

Each entry uses the accepted scalar contract. Missing `customFields` defaults to an empty array. The server owns initial values revision; `expectedRevision`, `customValuesRevision`, transaction controls and unknown top-level fields are rejected. Existing permitted lead provenance fields remain supported; choosing a source string does not select the trusted path.

Response remains `{lead, duplicate}`: 201 for a new record, 200 for a duplicate without custom values. New records receive manual-create defaults and required checks atomically with their custom values. Explicit null does not request a default.

Email/phone duplicate matching is preserved. If a duplicate is found and `customFields` is nonempty, return 409: “Existing lead matched. Open that lead and edit custom fields using its current revision.” The entire attempted duplicate update and note are rolled back. Locate the existing lead through normal search, read its values/revision and use `PATCH /api/admin/crm/leads/:id/custom-fields`; do not repeat an unversioned create to overwrite values. Duplicate requests without custom values do not apply new defaults/required checks.

## Manual client

`POST /api/admin/crm/clients` accepts existing client profile update fields with required nonempty `name`, plus the same optional `customFields` array. Payload is strict; `id`, `sourceLeadId`, `source`, server revision and transaction controls cannot be supplied. The server sets `source="manual"` and no source lead.

Response is the created client record, HTTP 201, including its server-owned `customValuesRevision`. Read complete values through `/api/admin/crm/clients/:id/custom-fields`. Profile, defaults, required validation and custom values commit together; failure creates no client. Manual client creation does not add a new deduplication rule.

## Won conversion

Existing `PATCH /api/admin/crm/:id` with `stage="won"` preserves its response contract. New manual leads created directly as won also use the same atomic conversion path. The old internal `ensureClientForWonLead` helper now uses that path and checks the persisted stage instead of creating a client from a stale caller snapshot.

Conversion acquires the shared definition lock before the lead row lock. Creating the client, copying eligible values, changing stage and creating both notes are one transaction. Only active `both` definitions with `copyOnConversion=true` and present non-null lead values are copied; their accepting revisions are preserved, including options archived since acceptance. Archived definitions remain on the lead. Client-only defaults/required settings do not run during conversion.

An existing converted client is returned without copying again. Subsequent lead intake/edits and retries cannot overwrite client custom values. Failures roll back the conversion; no separate post-conversion job is introduced.

## External intake boundary

`POST /api/crm/leads` retains its API-key boundary and legacy normalization. A submitted `source="manual"` cannot select trusted manual defaults/required checks or accept custom values. Managed forms keep their existing durable intake path until explicit mapping integration is separately accepted.

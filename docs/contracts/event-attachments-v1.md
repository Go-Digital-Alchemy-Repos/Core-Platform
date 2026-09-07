# Event attachments v1

Admin events accept `attachments: [{id, displayName}]` in create/update bodies. This optional field preserves associations when omitted by older clients; an empty array removes them. Maximum 20 unique UUIDs and 200 characters per display name. The event row and association edits commit in one transaction. Staged objects belong to their uploading administrator; attached records may be edited by other authorized event administrators, but cannot move between events. A selected expired, pending, deleting, missing or foreign stage rejects the entire event save.

`POST /api/admin/events/attachments` accepts one multipart `file`, up to 25 MiB. It returns `{id, displayName, originalName, mimeType, size}`. Admin event lists/save responses and public event detail include ordered metadata in the same shape. No storage key or public object URL is serialized. A failed upload can leave pending metadata, deliberately retained to recover uncertain object PUT results.

`GET /api/events/:eventId/attachments/:attachmentId` uses the existing event-detail visibility policy on every request, rejects draft/archived events, and requires the attachment to remain attached to that event. It returns bytes with attachment disposition, UTF-8 filename, `nosniff`, and `private, no-store`. Registration/paid-recording entitlements are not a second materials gate. Requests from authenticated users must include the same authentication mechanism as event-detail requests.

## Private durable storage configuration

Set `EVENT_ATTACHMENTS_R2_ACCOUNT_ID`, `EVENT_ATTACHMENTS_R2_ACCESS_KEY_ID`, `EVENT_ATTACHMENTS_R2_SECRET_ACCESS_KEY`, and `EVENT_ATTACHMENTS_R2_BUCKET_NAME` using runtime secrets. The designated bucket must have R2 public access and public custom domains disabled; verify this operationally before release. Use credentials scoped to this bucket. The service refuses missing configuration and refuses the configured public uploads bucket. It never falls back to public media storage, backup settings, or local disk. Object names are client-scoped `event-materials/<uuid>` keys. Do not change the bucket/account/client namespace while records exist without migrating objects and retaining a rollback copy.

PUT, GET and DELETE requests have 30-second abort deadlines; GET additionally bounds declared and streamed content to 25 MiB. Objects preserve uploaded bytes. Backups/recovery must include both the `event_attachments` table and this separate bucket; existing public-upload inventory alone does not cover event materials. A database backup without the private objects is not a complete recovery artifact.

## Validation and limitations

Supported extensions: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, ODT/ODS/ODP, Pages/Numbers/Keynote, CSV, TXT, RTF, JPG/JPEG/PNG/WebP/GIF, ZIP. Empty and oversized files, mismatched MIME/signatures, executable/script/macro extensions, binary text, encrypted ZIPs, unsafe ZIP paths, and recognized macro package entries are rejected. ZIP central and local directory consistency is checked without decompressing or extracting files; office packages must contain their expected document family entries. Text uploads use UTF-8. Legacy Office requires its OLE signature and document stream and rejects recognized VBA/encryption streams.

This is format validation, not antivirus or complete document-content analysis. Arbitrary scripts embedded inside otherwise valid PDF/Office documents, disguised payloads inside ZIP members, and every legacy macro technique cannot be ruled out by signature validation. Downloads are forced rather than rendered in the application. Do not describe uploads as malware-scanned. No nested archive extraction occurs.

## Lifecycle and rollout

Migration `0067_event_attachments.sql` is additive/idempotent and also adds the event delivery option ID required by configurable event settings. Existing events have no attachments. Deploy migration before application code. To roll back, revert application code while retaining metadata and objects; do not drop the table or bucket as a routine rollback.

An hourly stoppable maintenance worker claims up to 50 unassociated records older than 24 hours using row locks, marks them deleting, deletes private objects, then removes metadata. Saves cannot attach deleting records. Failed cleanup remains retryable. Removing a file during editing does nothing until save. Saved removals reset the 24-hour retention timestamp. Event deletion sets associations null; the older timestamp may permit cleanup at the next hourly run. Event deletion is therefore not an attachment recovery mechanism.

Release requires a private-bucket configuration check, real private upload/download verification for public and restricted events, and a complete recovery procedure for the separate object bucket. None of these production checks are implied by local synthetic tests.

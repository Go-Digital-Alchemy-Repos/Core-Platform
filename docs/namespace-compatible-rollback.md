# Namespace-compatible rollback candidate

This candidate starts from deployed Core revision `a006f36` and ports only the current
integration R2 service and its shared client-storage-prefix helper. It preserves the
baseline upload mutation freeze guard. No migrations, business services, queue handlers,
provider behavior, dependency versions or deployment configuration are changed.

The purpose is narrow: the older application can resolve the same namespaced media as
the integration candidate while upload mutations remain frozen. It is not a declaration
that the older application can safely run against every new business/database state.

## Required storage configuration

The planned current-Core configuration is `CLIENT_STACK_ID=core-platform`, no
`PUBLIC_SITE_ORIGIN`, `BACKUP_R2_PREFIX=system-backups`, and
`UPLOAD_MUTATIONS_FROZEN=true`. This document does not set environment variables.
The copied helper preserves the integration algorithm: a configured public domain takes
precedence (lowercase, leading `www.` removed); otherwise the stable stack ID supplies the
namespace. Missing both identities uses the existing helper fallback and is not the
planned current-Core cutover. Do not change domain/identity during rollback.

R2 reads resolve logical `cms/...`, attachment and career-resume keys under
`clients/core-platform/uploads/`. Application URLs remain `/r2/<logical-key>`. Qualified
R2 public URLs are normalized by stripping the current prefix before generating the
application or configured-public URL. Existing career records with `r2:<logical-key>`
continue through the unchanged career loader into that same namespace. Candidate-written
CMS `r2_key` values remain logical keys; do not replace them with fully qualified object
keys and then pass them directly to `downloadFile` or `deleteFile`.

This port has no bucket-root fallback. The approved pre-cutover object copies must already
exist at their verified destinations. A missing namespaced object remains missing. Standard
GET and DELETE target that exact namespace; freeze guards reject upload/delete operations
before configuration or SDK calls while allowing reads. Direct custom-CDN URLs remain
public URLs as in the integration service. The backup service is unchanged; the explicit
legacy backup prefix remains an independent operational setting.

## Verification and limits

Focused tests cover the real app-served HTTP route while frozen, namespaced GET/DELETE,
qualified R2 URL normalization without a doubled prefix, retained logical app URLs, actual
career `r2:` loader compatibility, no root fallback, domain/stack helper policy and the
baseline freeze boundaries. Provider commands are mocked; the HTTP fixture is local and
synthetic. No production access, storage writes or migration was performed by this work.

Acceptance still requires:

- Full baseline checks and build/bundle evidence for this exact candidate.
- Independently reviewed database/new-queue/business compatibility with the integration
  release and a controlled rollback/reconciliation procedure.
- Actual deployment/readiness and live media-read acceptance under the intended namespace
  and frozen-write configuration, including retained post-cutover references.
- Deliberate decisions about unfreezing writes and handling work created by the newer
  application; this artifact does not process its new queues or reverse schema migrations.

Do not call this full rollback readiness merely because media namespace tests pass.

## Local candidate evidence

The exact integration R2 service and helper bytes were retained. Baseline dependencies
were supplied from the existing upload-freeze worktree's locked install; no dependency
manifest or lockfile changed. Validation passed: all 403 tests across 82 files, TypeScript,
repository ESLint, focused formatting, production build and bundle budgets. The focused
namespace/helper/freeze selection passed 23 tests. The generated artifact has not been
started against production or deployed; build success is not live rollback acceptance.

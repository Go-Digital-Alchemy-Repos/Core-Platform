# Better Farms two-origin acceptance

Run from Core Remediation with `npx playwright test --config playwright.pilot.config.ts`.
Requires npm ci in both the Core and pinned Better Farms checkouts, Chromium, OpenSSL, and local Docker
via a local Unix-socket Docker context (or `DOCKER_HOST`; an explicit
`DOCKER_CONTEXT` takes precedence). Remote Docker endpoints are rejected. No existing database URL is used.
`PILOT_SITE_ROOT` can locate the existing Better Farms checkout; its HEAD must be the
reviewed `12970e7462b74abd1e12a896587f8a99f5ccc3e5` candidate. The default is the
separate `Better Farms Foundation-form-reliability` checkout; the original site checkout is preserved.

The launcher creates an auto-removing, loopback-published Postgres 16 container with
synthetic credentials and database `core_pilot_test`. It migrates the empty database,
seeds synthetic administrator/content-editor users, and explicitly enables CMS/CRM.
The contact and newsletter forms use a fixed synthetic server-only proxy token/stack.
Mailchimp and administrator notifications are disabled. Contact queues one local
contact-message effect; newsletter queues one local CRM effect. No outbound provider
or email delivery is configured. A mode0600 temporary discovery file supplies only
the generated disposable database URL to read-only receipt checks; it is removed on
teardown and never uses the caller's DATABASE_URL.
It creates a temporary manifest with `https://site.localhost:5443` and
`https://dashboard.site.localhost:5443`, preserving the real dashboard-origin policy.
The real Core application runs behind a local TLS proxy; the real Better Farms
production server and frontend are built into a temporary directory with its own
installed dependencies. Better Farms source and build output remain untouched.

Child environments are allowlisted; ordinary database/provider/deployment values
and local dotenv discovery are excluded. A test-only preload forces app sockets to
loopback. The proxy forwards actual application security headers. Chromium ignores
only the generated self-signed certificate's trust failure; CSP remains enforced.
Core uses its development server; this is integration evidence, not verification of
Core's compiled production artifact. Better Farms uses production CSP and static
asset serving. Ports 5202, 5203 and 5443 are checked before setup and must be unused.
Docker/OpenSSL commands and HTTP readiness requests have time limits.
Unexpected app exits fail the fixture; existing apps cannot supply readiness.

The real browser test verifies content-editor access, live iframe preview, private
unsaved/saved drafts, UI publication visible to a fresh public page, stale revision
409, unrelated admin 403, actual sibling-origin/source postMessage rejection with
a delivery/render barrier, and actual CSP blocking of an unapproved iframe origin.
The form tests submit through actual React UI and site/Core proxy routes. They wait
for the real201 plus a durable database submission/effect row before deliberately
aborting the browser response. Unchanged retry returns200 with the same ID/key and
one effect set; changed payload after successful retry receives a new ID/key and
second effect set. Invalid input creates no receipt; failed-response input is retained.
This proves receipt/enqueue behavior, not external effect delivery or reload-spanning
idempotency. Per-form JSON evidence records receipt/effect IDs and counts without PII.
Screenshots, evidence JSON and failure traces are under ignored `test-results/pilot/`.

Teardown stops the apps/proxy, removes the disposable container and temporary TLS,
manifest and build files. Cleanup verifies container absence and fails if removal
cannot be confirmed. No production domains, DNS, imports, donation transactions,
client-approved content, or production release gates are exercised by this test.

`routes.spec.ts` adds desktop/mobile checks for all seven public routes, local image
decoding, internal route targets, header navigation/reload, all About board dialogs,
and donation-to-contact behavior. The mobile drawer regression checks both Tab
directions, Escape/trigger restoration, background inert restoration and desktop
resize. The previous 7fd1298 candidate passed all 22 cases. Fresh acceptance for the pin above is pending; see
`docs/pilots/better-farms/route-acceptance-status.md` for scope and remaining gates.

GitHub Actions remains disabled under AGENTS.md section 22. Run this acceptance
suite locally against exact reviewed Core and Better Farms revisions and retain
source identities, results and cleanup evidence. Historical workflow configuration
is not evidence that hosted checks ran and must not be enabled or dispatched.
The launcher pin changes only after source review; a new pin requires fresh pilot
acceptance and does not inherit the previous candidate's 22-case result.

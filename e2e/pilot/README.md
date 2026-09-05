# Better Farms two-origin acceptance

Run from Core Remediation with `npx playwright test --config playwright.pilot.config.ts`.
Requires the installed repository dependencies, Chromium, OpenSSL, and local Docker
via a local Unix-socket Docker context (or `DOCKER_HOST`; an explicit
`DOCKER_CONTEXT` takes precedence). Remote Docker endpoints are rejected. No existing database URL is used.
`PILOT_SITE_ROOT` can locate the existing Better Farms checkout; its HEAD must be the
reviewed `ee14d6746cc14cb4b441eecf6598aaaf0e18e975` candidate.

The launcher creates an auto-removing, loopback-published Postgres 16 container with
synthetic credentials and database `core_pilot_test`. It migrates the empty database,
seeds synthetic administrator/content-editor users, and explicitly enables CMS.
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
Screenshots/traces are under ignored `test-results/pilot/`.

Teardown stops the apps/proxy, removes the disposable container and temporary TLS,
manifest and build files. Cleanup verifies container absence and fails if removal
cannot be confirmed. No production domains, DNS, imports, donation transactions,
client-approved content, or production release gates are exercised by this test.

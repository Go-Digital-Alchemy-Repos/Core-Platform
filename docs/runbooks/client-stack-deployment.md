# Repeatable Single-Client Deployment Runbook

Use this runbook only after client intake and launch-gate approval. One “client stack” means one Core
Platform dashboard/API, one client database, and one separately built static React site, plus that
client's configuration and operations. It is not a tenant in a shared system. This blueprint does not
authorize provisioning.

## Boundary and Naming

Choose one immutable lowercase kebab-case `CLIENT_STACK_ID`, for example `acme-store`. Use it in the
Railway project/environment labels, backup prefix, monitoring labels, and operator records. Never reuse
another client's database, secrets, storage prefix, Stripe webhook secret, or release/rollback boundary.

Record the application service ID, PostgreSQL service ID, public domain, protected admin subdomain,
routing mode, DNS provider, Stripe account/mode, R2 bucket and prefix, email sender, owners, and incident
channel in the client operations record. Do not record secret values there.

## Recommended Domain Topology

- Serve the React public site from the client's normal HTTPS domain, with an explicit apex/`www`
  canonicalization rule.
- Serve the Core Platform dashboard from a protected admin subdomain such as `admin.example.com`.
- Route public browser requests from `/api` on the public domain to the Core Platform backend where the
  hosting/CDN topology supports it. Keep the dashboard's API same-origin on the admin subdomain.
- Keep authentication cookies host-only by default. Use a reviewed signed preview flow between admin and
  public origins. Edge access controls may supplement but never replace application authorization.
- Assign public links, admin links, webhooks, callbacks, CSP, CORS/CSRF, redirects, and email destinations
  to one named origin in the release manifest.

## Domain Setup Wizard Contract

The admin onboarding wizard is registrar-agnostic. It captures the public domain, apex/`www` preference,
admin subdomain, site/backend routing targets, same-origin `/api` mode, and DNS/launch owners. It produces
an exact record plan with record type, host, target/value, TTL, provider proxy mode when applicable,
purpose, and copyable manual instructions.

The operator enters the records at any registrar/DNS provider, then the wizard verifies ownership,
authoritative nameservers, propagation, certificate issuance, public and admin routing, `/api` proxy
behavior, readiness, canonical redirects, and origin policy. Pending propagation is reported separately
from invalid configuration. Record creation alone never marks the domain ready.

Core Platform never requests or stores registrar/DNS-provider credentials and never creates, updates, or
deletes DNS records in this workflow. The operator records the prior values before applying the generated
plan. Regeneration must produce the same instructions, avoid unrelated records, and include a rollback
plan using those prior values. Direct provider APIs, including Cloudflare automation, are outside the
near-term scope. Domain cutover remains blocked until ownership, DNS, certificate, routing, `/api`,
application health, redirect, and rollback gates all pass.

In Core Platform, administrators open **System → Client Stack Onboarding** to generate the manual plan.
The workflow is intentionally non-persistent and credential-free: it produces a deterministic record plan
from approved values and records the operator's read-only verification outcome. It does not provision a
domain, save registrar credentials, mutate DNS, or authorize a cutover. Preserve the generated plan and
observed evidence in the client operations record before a release review.

After the operator publishes a plan, **Verify published DNS** performs public DNS reads only. It checks A,
AAAA, and CNAME answers against the exact planned value. An absent answer is reported as pending propagation;
an answer that does not include the planned value is blocked as a mismatch. ALIAS and ANAME are
provider-specific, so the application leaves them pending for the operator's provider read-only evidence
rather than claiming they passed. This check never changes the overall release-readiness result on its own:
the operator must retain the observed evidence and complete the remaining ownership, certificate, routing,
health, redirect, and rollback checks.

## Railway Blueprint

1. Create a dedicated Railway project or an equivalently isolated project boundary for the client.
2. Add one application service connected to the approved Git repository and one dedicated PostgreSQL
   service. Do not reference another client's database variables.
3. Keep `railway.toml` health checking `/api/health/ready`; use Git-backed builds and immutable commit
   SHAs for release records.
4. Configure the public domain, protected admin subdomain, and same-origin `/api` routing from the approved
   integration contract and domain wizard record plan. For this topology, set `PUBLIC_SITE_ORIGIN` to the
   public site, `CORE_PLATFORM_ADMIN_ORIGIN` to the protected dashboard, and retain `APP_URL` as the exact
   admin origin for legacy Core Platform services. Both exact origins must appear once in `TRUSTED_ORIGINS`.
   The preflight rejects missing, non-canonical, identical, mismatched, or untrusted origins.
5. Set the variables below through Railway's secret/configuration controls. Never commit real values.
6. Before deployment, run the same candidate configuration through the preflight:

   ```bash
   npm run deploy:check -- --require-ecommerce --require-email --require-backups --require-observability --require-client-form-proxy --require-separate-origins
   ```

   The command reports only missing or invalid variable names and non-secret identity/origin values.

## Configuration Inventory

| Area              | Required variables or records                                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity          | `CLIENT_STACK_ID`                                                                                                                                                    |
| Database          | Dedicated `DATABASE_URL`                                                                                                                                             |
| Sessions/security | Unique 32+ character `SESSION_SECRET`, optional unique `CMS_PREVIEW_SECRET`, unique `SETUP_TOKEN` for first setup                                                    |
| Domain/origins    | Public domain, admin subdomain, same-origin `/api` routing, DNS provider and manual operator, exact `PUBLIC_SITE_ORIGIN`, `CORE_PLATFORM_ADMIN_ORIGIN`, legacy-compatible `APP_URL` equal to the admin origin, exact `TRUSTED_ORIGINS`, certificate/routing status |
| Stripe ecommerce  | Dedicated `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`; record account and test/live mode                                                  |
| Email             | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`; SPF/DKIM/DMARC ownership evidence                                                                   |
| Site form proxy   | Matching `CLIENT_FORM_PROXY_TOKEN` on Core Platform and `CORE_PLATFORM_FORM_PROXY_TOKEN` only in the client's site server environment; never expose either to browser code |
| Backups           | `SYSTEM_BACKUPS_ENABLED=true`, interval/retention settings, dedicated R2 credentials/bucket, `BACKUP_R2_PREFIX` containing `CLIENT_STACK_ID` as one path segment     |
| Observability     | `LOG_LEVEL`, `METRICS_ENABLED=true`, a unique 32+ character `METRICS_BEARER_TOKEN`, uptime/error/log destinations, and named responders                                |
| Railway metadata  | Git commit SHA, project/service/environment IDs are supplied by Railway and included in backup metadata                                                              |

Prefer environment-managed provider secrets for deterministic stacks. If an admin UI can persist a
provider secret in the database, document the precedence and verify that a restored database cannot
silently point to another client's provider account.

## Storage and Backups

- Use a dedicated media bucket or a client-specific namespace with credentials that cannot access other
  client prefixes.
- Use a dedicated backup bucket where practical. At minimum use a unique prefix containing the exact
  `CLIENT_STACK_ID` path segment and client-scoped credentials.
- Enable Railway-native PostgreSQL backups in addition to application-level R2 backups.
- Create a manual pre-cutover backup and retain it outside the normal short rolling window.
- Restore into a disposable duplicate environment. Confirm the manifest's `clientStackId`, Railway
  metadata, bucket/prefix, table counts, representative records, login, media references, and order
  totals before declaring restore readiness.

Never restore into production first. The restore command is destructive, requires `--yes`, and refuses a
snapshot whose `clientStackId` does not exactly match the target `CLIENT_STACK_ID`. A legacy snapshot without
stack provenance requires the separate `--allow-legacy-backup` acknowledgement after duplicate-environment
review; that acknowledgement cannot override a mismatched identified stack. See [System Backups](../system-backups.md).

## Stripe and Webhooks

1. Confirm the intended Stripe account and test/live mode with the client owner.
2. Configure only the ecommerce Stripe keys belonging to this stack.
3. Create the endpoint `https://<client-domain>/api/ecommerce/webhook/stripe` and store its unique
   signing secret in this stack.
4. Subscribe only to events supported by the approved release. Record the event list.
5. In test mode, verify signature rejection, successful payment, duplicate delivery, delayed delivery,
   refund, and failure/recovery behavior. Do not enable live mode until Phase 1 launch gates pass.

The platform's membership Stripe handler is separate. Do not confuse its webhook endpoint or settings
with ecommerce.

## Email

Verify sender-domain ownership, SPF, DKIM, DMARC, bounce handling, suppression behavior, and reply/support
routing. Exercise order lookup, confirmation, status, shipment, and refund messages in staging without
using real customer addresses. Confirm URLs resolve to the exact client domain.

## WooCommerce Import Rehearsal

1. Obtain a read-only source export/API credential and record source version, plugins, currency, time
   zone, tax, shipping, payment, subscription, gift-card, and custom-field behavior.
2. Take a source snapshot and run an import dry run; do not write production.
3. Review mapping/exclusion reports and resolve duplicate SKUs/slugs, variants, media failures, missing
   customers, order states, coupon rules, and personally sensitive history.
4. Reconcile products, variants, media, customers, orders by status, stock, coupon usage, and monetary
   totals. Document every accepted difference.
5. Crawl legacy URLs and approve redirects, canonical URLs, sitemap, product JSON-LD, and merchant feeds.
6. Repeat from a clean target. Re-running the importer must not duplicate data.
7. Rehearse source freeze, final delta, backup, release, DNS switch, smoke tests, rollback trigger, and
   support communication. Obtain owner sign-off before live cutover.

## Release Gate

Before each production release record the candidate commit and verify:

- deployment preflight succeeds with all applicable flags;
- lint, type checking, tests, migration tests, build, and bundle budgets pass;
- migrations are backward-compatible with the currently running release;
- a current backup exists and restore/rollback procedures are within their rehearsal window;
- Stripe/email/storage checks use non-production recipients or provider test mode until final approval;
- `/api/health`, `/api/health/ready`, storefront, login, catalog, cart, and checkout smoke checks pass;
- domain ownership, authoritative DNS, propagation, certificates, public/admin routing, same-origin
  `/api`, canonical redirects, and the reviewed DNS rollback plan pass;
- monitoring is receiving stack-labeled telemetry from the authenticated Prometheus scrape and responders are available.

## Rollback

Roll application code back through Railway to the last verified Git-backed deployment. Roll domain
instructions back only from the approved plan and its captured prior values; do not delete or overwrite
unrelated DNS records. The authorized operator applies the rollback manually. Account for DNS TTL and
certificate state in rollback timing. Do not assume a code rollback reverses a database migration. If
data recovery is required, stop writes, preserve the failed state for investigation, restore into a
duplicate environment first, reconcile, then execute the approved destructive restore. Revoke or rotate
non-DNS provider credentials if exposure or cross-client configuration is suspected.

## Required Better Farms Pilot Intake

- legal client/store name, owner, technical approver, finance approver, and support contacts;
- desired `CLIENT_STACK_ID`, public domain, apex/`www` policy, protected admin subdomain, registrar/DNS
  and hosting providers, manual DNS/launch owners, and launch window;
- WooCommerce URL/version, plugins, export/API access, data volumes, custom fields, and retention policy;
- catalog types, SKU/variant/media counts, digital/physical behavior, stock and oversell policy;
- currency, selling countries, tax nexus/exemptions/adviser approval;
- shipping origins, destinations, carriers, packaging, rate and return rules;
- Stripe account ownership/mode, refund/cancellation/dispute rules, expected volume and average order;
- guest/account requirements, privacy jurisdictions, consent, retention, export/erasure policy;
- email domain/provider, sender identity, deliverability records, templates, and support routing;
- brand/CMS content, legacy URLs, SEO/search/feed requirements, analytics and accessibility requirements;
- RPO/RTO, backup retention, monitoring/alert owners, incident contacts, release approvers, rollback limits;
- explicit exclusions for subscriptions, gift cards, multi-currency, marketplaces, complex promotions,
  live carrier rates, and any other deferred capability.

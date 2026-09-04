# Client Migration Execution Ledger

This ledger records verified execution against the [Client Migration Master Plan](core-project-plan.md).
Statuses describe repository evidence and do not imply production release approval.

## Current Program State

| Milestone                             | Status      | Evidence                                                                                                                                                                                 | Remaining gate                                                                                                                                                                            |
| ------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Governance and baseline            | In progress | Core baseline `e2ba048`; Better Farms baseline `6dd6335`; Woo prototypes `325188d` and `ffd11a6`; orchestrator review and fail-closed intake contract recorded                            | Confirm final Better Farms modules, import history/exclusions, approvers, domain/operator details, success measures, RPO/RTO, and rollback triggers before the dependent production gates |
| 1. Manifest and integration contracts | In progress | Manifest v1.0, compatibility validation, exact-origin preview, runtime publication ADR, Better Farms fixture, and WooCommerce import contract v1.0.0                                     | Freeze manual DNS, module registry, and remaining route/data ownership contracts                                                                                                          |
| 2. Better Farms adapter               | In progress | Better Farms branch `codex/site-shell-fund-a-farm` through `0f0ddde`; locked shell, theme adapter, bounded Fund a Farm registry/content, preview, runtime API fallback                   | Complete site inventory and expand page, form, SEO, accessibility, responsive, and asset coverage incrementally                                                                           |
| 3. Railway deployment foundation      | In progress | Client-stack preflight, stack identity, Railway/manual-domain runbook, backup provenance, runtime publishing rollback runbook                                                            | Implement the registrar-neutral onboarding wizard and read-only readiness verification; rehearse restore in a disposable environment before release                                       |
| 4. WooCommerce adapter                | In progress | Both prototype branches remain preserved; `core.woocommerce-import` v1.0.0 reconciles their catalog, port, mapping, run, checkpoint, audit, quarantine, authority, and rollback behavior | Implement contract tests and additive durable lifecycle models behind the accepted port; customer/order apply remains disabled and no client data may be used                             |
| 5. Transaction correctness            | In progress | Membership credentials preserve-on-blank policy, trusted Stripe return URLs, and token-owned webhook delivery lifecycle implemented                                                      | Close membership effect atomicity and then audit and close ecommerce inventory, coupon, refund, reconciliation, and operator-support blockers                                             |
| 6. Integrated pilot                   | Blocked     | Depends on Milestones 2–5 and approved infrastructure intake                                                                                                                             | Production-like integration and acceptance suite                                                                                                                                          |
| 7. Launch and hypercare               | Blocked     | Production release requires all prior gates and current backup/rollback evidence                                                                                                         | Explicit go/no-go evidence, approved domains/operators, and successful post-deploy verification                                                                                           |
| 8. Reusable playbook                  | Planned     | Existing manifest, deployment, and integration documents provide the initial source material                                                                                             | Complete after pilot evidence identifies reusable versus Better Farms-specific work                                                                                                       |

## Orchestrator Decision Policy

Routine, reversible implementation choices inside the approved architecture proceed autonomously. Escalation is
reserved for material product or architecture choices, unavailable credentials or external authority, destructive or
irreversible operations, paid services, legal or compliance decisions, and production actions without a controlled
rollback path. No real client data, live DNS, or production deployment is used during repository implementation.

## Module Portfolio Priorities

The 2026-09-03 source review covered CMS/editor, design and theme settings, provider directory, events, careers,
portfolio, CRM, ecommerce, memberships, forms, and notifications. Focused evidence suites passed 208 tests, but the
portfolio is not release-ready. Work is ordered by boundary risk and dependency:

1. Authorization and privacy: settings key ownership, provider moderation fields, public directory DTOs, event
   access URLs, initial administrator setup, and private resume delivery.
2. Transaction correctness: membership and ecommerce webhook claims, inventory and coupon effects, refunds,
   event capacity/payment states, and CRM conversion/deduplication.
3. Content safety and delivery: shared rich-content policy, form side-effect idempotency, career integrations,
   durable notifications, and audit trails.
4. Migration and operations: durable WooCommerce mappings/runs, pagination and retention, object backup/restore,
   CI/E2E/accessibility gates, and module observability.

Notifications are currently a UI/storage scaffold without production event producers. CRM is suitable only for a
controlled low-volume pilot after atomic conversion. Ecommerce and memberships must not process live transactions
until their webhook and transaction gates are closed.

## Security Baseline

Codex Security scan `18959473-19cb-409a-acde-2838a0474ff0` is sealed against Core commit `887f2c0` with nine
validated findings: four high, four medium, and one low. The first remediation checkpoint covers production
bootstrap authentication, branding-setting authorization, provider self-moderation, directory response privacy,
provider biography sanitization, event access-link authorization, private resume namespaces, and server-approved
legacy membership prices. Online dependency advisories and live ingress, bucket, volume, provider, and cross-client
configuration remain explicitly deferred.

## Accepted Checkpoints

### 2026-09-03 — Public CMS HTML boundary hardening

- **Implemented:** Better Farms' newsletter fixture now targets the existing managed-form submission route;
  public CMS pages and previews, public sidebars, and public managed-form HTML pass through the established
  allowlist sanitizer at the response boundary.
- **Content compatibility:** the policy retains the CMS editor's headings, lists, links, and approved image
  markup while removing scripts, event handlers, unsafe URL schemes, and arbitrary embeds. No stored content
  was modified.
- **Validation:** manifest and sanitization regression coverage added; no database, client data, deployment,
  DNS, or external-service action performed.

### 2026-09-03 — WooCommerce phase-one catalog planner

- **Implemented:** strict `core.woocommerce-import` v1.0.0 envelope parsing; stable source fingerprints and
  operation hashes; deterministic category, simple-product, default-variant, media, and relationship plans;
  exact currency precision; conservative HTML transforms; parent-cycle, product-type, status, tax, URL,
  money, slug, SKU, and disabled-data validation; and a read-only sanitized dry-run CLI.
- **Target safety:** inspection uses durable mappings as ownership evidence, blocks unowned deterministic
  target IDs and slug/SKU conflicts, detects missing or edited mapped targets, and identifies unchanged
  same-source operations as idempotent matches.
- **Validation:** 432 tests in 91 files, type check, lint, production build, a ready synthetic offline dry
  run, Better Farms manifest validation, bundle budgets, formatting, and diff whitespace checks passed.
- **Production impact:** none. The CLI is offline-only, no target adapter is wired, no client export is
  present, and any undispositioned warning blocks apply.
- **Next gate:** implement the durable phase-one target adapter so catalog rows, mappings, audit evidence,
  and checkpoints share one transaction; then prove resume and concurrency against PostgreSQL.

### 2026-09-03 — WooCommerce durable lifecycle foundation

- **Core:** `codex/uncommitted-work-audit`; additive migration `0047_woocommerce_import_lifecycle.sql`
  remains unapplied until an approved release.
- **Implemented:** schema-backed import runs, source/target ownership mappings, audit entries, quarantine
  records, active-run serialization, contract/mode/phase validation, explicit resumable state transitions,
  safe hashed record references, sanitized failure codes, and completion reconciliation gates.
- **Validation:** 423 tests in 90 files, type check, lint, production build, Better Farms manifest validation,
  bundle budgets, formatting, migration reconciliation coverage, and diff whitespace checks passed.
- **Safety boundary:** durable apply accepts phase 1 only. The migration does not import data, and customer,
  order, delta, or production cutover requests fail closed.
- **Next gate:** canonical catalog planner and target inspection behind the accepted port, followed by atomic
  phase-one batch apply and database-backed concurrency/resume tests.

### 2026-09-03 — WooCommerce import contract freeze

- **Contract:** `core.woocommerce-import` v1.0.0 accepted by the Project Orchestrator for implementation.
- **Decision:** preserve both prototype branches; adopt the catalog parser and collision protections from
  `325188d`, and the repository-port/run/checkpoint/rollback model from `ffd11a6`, behind one versioned
  target contract.
- **Safety boundary:** phase 1 permits only categories and simple physical catalog records in synthetic or
  isolated rehearsal. Customer and historical order apply remain disabled until the Project Owner approves
  privacy, identity, retention, finance, and side-effect isolation rules. No client export is authorized.
- **Next gate:** contract tests, additive mapping/run/audit/quarantine persistence, durable atomic batches,
  target-edit conflict behavior, and database-backed resume/concurrency evidence.

### 2026-09-03 — Ecommerce refund serialization

- **Core:** `codex/uncommitted-work-audit`; milestone commit recorded in Git history and pushed after validation.
- **Implemented:** order-locked refundable-balance reservation; one pending provider refund per order; immediate local `refund_pending` visibility; Stripe idempotency derived from the durable local refund ID; and webhook recovery by local refund metadata after an ambiguous provider response.
- **Validation:** focused refund, ecommerce service, and webhook tests; project type check, lint, formatting, full test suite, production build, client-site manifest validation, bundle budgets, and diff whitespace checks.
- **Production impact:** none. No provider calls, live refunds, database mutation, or deployment.
- **Risk carried forward:** pending-refund operator tooling and automatic reconciliation are not yet implemented; checkout request idempotency, durable email/jobs/replay, database-backed concurrency evidence, and Stripe sandbox evidence remain release blockers.

### 2026-09-03 — Ecommerce paid-order atomicity

- **Core:** `codex/uncommitted-work-audit`; milestone commit recorded in Git history and pushed after validation.
- **Implemented:** order-row serialization and one database transaction for Stripe paid-state transition, coupon redemption/counter mutation, guarded stock deduction, and inventory adjustment evidence. Admin re-save of paid state now retries the existing idempotent coupon and stock paths to recover partial legacy/manual work.
- **Validation:** 61 focused ecommerce service and webhook tests; project type check, lint, formatting, full test suite, production build, client-site manifest validation, bundle budgets, and diff whitespace checks.
- **Production impact:** none. No live payment, client data, database mutation, or deployment.
- **Risk carried forward:** manual-order creation still reaches paid effects through recoverable separate calls; database-enforced effect keys, checkout request idempotency, serialized refundable balance, durable email/jobs/replay, and Stripe sandbox concurrency evidence remain release blockers.

### 2026-09-03 — Ecommerce webhook delivery hardening

- **Core:** `codex/uncommitted-work-audit`; milestone commit recorded in Git history and pushed after validation.
- **Implemented:** atomic pre-effect claims for ecommerce Stripe events; retryable failure state; stale-claim recovery; per-attempt ownership tokens; and explicit completion only after payment-request, paid-order, or refund reconciliation returns successfully.
- **Validation:** focused concurrent-delivery lifecycle and migration tests; project type check, lint, production build, full test suite, client-site manifest validation, bundle budgets, formatting, and diff whitespace checks.
- **Production impact:** none. The additive `0046_ecommerce_webhook_delivery.sql` migration remains unapplied until an approved release.
- **Risk carried forward:** paid-order state, coupon redemption, and inventory deduction still cross transaction boundaries; checkout idempotency, serialized refundable balance, durable jobs/replay, and Stripe sandbox evidence remain release blockers.

### 2026-09-03 — Membership payment delivery hardening

- **Core:** `codex/uncommitted-work-audit`; milestone commit recorded in Git history and pushed after validation.
- **Implemented:** preserve-on-blank membership Stripe credentials with explicit clear semantics; admin form hydration from masked status; trusted-origin checkout and portal return URLs; additive webhook delivery status, attempts, failure evidence, stale-claim recovery, and per-attempt ownership tokens.
- **Validation:** focused credential, return-URL, webhook lifecycle, and migration tests; project type check, lint, production build, full test suite, client-site manifest validation, bundle budgets, and diff whitespace checks.
- **Production impact:** none. The additive `0045_membership_webhook_delivery.sql` migration remains unapplied until an approved release.
- **Risk carried forward:** subscription effects and audit writes are individually idempotent where supported but do not share one database transaction; ecommerce transaction correctness and live Stripe sandbox evidence remain release blockers.

### 2026-09-03 — Security boundary remediation

- **Core:** `codex/uncommitted-work-audit`; milestone commit recorded in Git history and pushed after
  validation.
- **Implemented:** production bootstrap token requirement; strict branding-setting ownership; provider
  self-service field restrictions and rich-text sanitization; visibility-aware public directory DTOs; event
  audience, registration, and recording-entitlement enforcement; private resume storage namespaces; and
  server-approved legacy membership prices.
- **Evidence:** sealed Codex Security scan `18959473-19cb-409a-acde-2838a0474ff0` reported nine findings
  against baseline `887f2c0`.
- **Validation:** 406 tests in 86 files, type check, lint, production build, client-site manifest validation,
  bundle budgets, and diff whitespace checks passed.
- **Production impact:** none. Production now requires `SETUP_TOKEN`; configure it before a future release.
- **Risk carried forward:** ecommerce and membership transaction atomicity, event capacity/payment lifecycle,
  shared rich-content policy, and the deferred dependency/live-infrastructure checks remain release blockers.

### 2026-09-03 — Runtime content publishing

- **Core:** `codex/uncommitted-work-audit` at `887f2c0`, pushed to origin.
- **Better Farms:** `codex/site-shell-fund-a-farm` at `0f0ddde`, pushed to origin.
- **Implemented:** manifest-generated content controls, exact-origin preview, draft/published snapshots,
  immutable revisions, optimistic conflict checks, public ETag endpoint, same-origin Better Farms proxy,
  and validated built-in fallback.
- **Validation:** Core 398 tests in 85 files, type check, lint, build, manifest validator, and bundle budgets;
  Better Farms 11 contract/security tests, type check, build, and dependency audit with zero findings.
- **Production impact:** none. No deployment, migration execution, DNS mutation, or client-data import.
- **Risk carried forward:** production origins and operators are not yet recorded; the runtime content tables
  remain unapplied until an approved release.

### 2026-09-03 — WooCommerce durable catalog repository

- **Implemented:** a versioned repository port and Drizzle adapter for Phase 1 catalog rehearsal. The adapter
  creates lifecycle runs, supports durable batch replay, checks source ownership and target baselines, applies categories
  before products, atomically writes target records, mappings, audits, and checkpoints, and preserves
  post-import target edits for manual review during rollback.
- **Validation:** 17 focused planner, lifecycle, and repository tests; TypeScript check; changed-file lint and
  formatting; and diff whitespace checks passed. No database-backed integration run was performed because no
  client or rehearsal export is authorized in this workspace.
- **Production impact:** none. No migration execution, client-data import, deployment, or external service call.
- **Risk carried forward:** database-backed interrupted/resumed/concurrent batch evidence, approved protected
  rehearsal input, and restoration of pre-existing mapped records remain acceptance gates before any client use.

### 2026-09-03 — WooCommerce rehearsal command guard

- **Implemented:** an explicit durable-apply command that accepts only `rehearsal` mode, requires an exact
  dry-run fingerprint and `--apply` acknowledgement, bounds batch size, and emits only sanitized aggregate
  evidence. It dynamically loads the database adapter only after all local input guards pass.
- **Safety boundary:** the command does not authorize cutover, production targets, client exports, migrations,
  or deployments. Its usage is recorded in the accepted import contract.

## Active Sprint

**Objective:** Implement the accepted WooCommerce import contract behind stable planner and repository ports,
starting with contract tests and additive durable lifecycle persistence. Transaction hardening remains a release
gate; the next payment checkpoint is a durable checkout-request model rather than a superficial client token.

**Write ownership:** the Project Orchestrator owns the WooCommerce contract, import services, additive lifecycle
migrations, tests, operational documentation, and this ledger. The two prototype branches remain read-only inputs.

**Acceptance gate:** no real client data; every record is applied, matched, excluded-approved, or quarantined;
resume and replay are idempotent; target edits fail to manual review; lifecycle and checkpoint writes are atomic;
database evolution is additive; existing Core tests, lint, types, build, migration checks, manifest validation,
and budgets remain green.

### 2026-09-04 — Durable ecommerce checkout requests

- **Implemented:** an additive checkout-request lifecycle that atomically claims a browser-generated UUID
  before account, customer, order, or payment writes. A repeated request for the same customer returns the
  existing Stripe PaymentIntent client secret after the order link is durable; a request for another email is
  rejected without exposing the order.
- **Safety boundary:** an in-progress or failed request cannot create another order. The browser keeps the key
  for an unchanged checkout payload and changes it when the payload changes. The migration remains unapplied;
  this does not authorize a production deployment.

### 2026-09-04 — Better Farms client-migration intake contract

- **Implemented:** a versioned, secret-free intake contract and validator capture source-access mode,
  pilot route scope, excluded capabilities, data entity dispositions, reconciliation owner, recovery targets,
  operational owners, release roles, and blockers. The validator permits a transparent draft but refuses an
  approved intake until each required decision is resolved and all three release roles are present.
- **Evidence:** the Better Farms draft references the same stack ID as the client-site manifest, explicitly
  excludes live ecommerce, customer/order history, and production DNS cutover, and validates through the
  new CLI. It contains no client credentials, exports, endpoint URLs, or registrar access.
- **Risk carried forward:** the draft is not a substitute for client decisions. Protected source access,
  approved scope and exclusions, RPO/RTO, DNS and release owners, and sandbox/production-like evidence
  remain required before approval or deployment.

### 2026-09-04 — Better Farms cross-repository site contract verification

- **Implemented:** a site-contract verifier loads the fail-closed manifest and checks its route components,
  source assets, theme token source, and Puck renderers against a supplied site checkout. References that
  escape the checkout or point to a missing file fail the verification.
- **Evidence:** the verifier passed against Better Farms revision `0f0ddde`, checking 12 unique declared
  source references with no missing or unsafe paths. It makes no network request, site change, build, or
  deployment.
- **Risk carried forward:** source-file presence does not replace visual, responsive, accessibility, SEO,
  form, API, or production-like acceptance evidence for the full pilot.

### 2026-09-04 — Better Farms combined pilot contract verification

- **Implemented:** a combined pilot verifier validates the migration intake, client-site manifest, and site
  checkout together. It requires matching stack IDs, requires every scoped intake route to be manifest
  declared, carries forward source-reference verification, and prevents an approved intake from pairing
  with a draft manifest.
- **Evidence:** the Better Farms draft intake, manifest, and source revision `0f0ddde` passed as one
  contract with no mismatch or missing reference.
- **Risk carried forward:** both records intentionally remain draft/blocked until the client provides the
  operational and migration decisions captured by the intake. The verifier does not authorize deployment.

### 2026-09-04 — Better Farms pinned-source build evidence

- **Evidence:** the clean Better Farms checkout at `0f0ddde40ed91f2cfa2182eb3627b51c85ec0c9c` passed its
  TypeScript check, all 11 site-contract tests, and its production build. The build emitted the expected
  static client artifact and server bundle without production credentials.
- **Coverage:** the source suite verifies the Fund a Farm editable-content contract and behavior locks,
  trusted preview origin/component checks, published-content fallback behavior, and safe Core API origin
  parsing. This confirms the source revision used by the combined pilot verifier remains buildable.
- **Risk carried forward:** this is source-build evidence only. It does not constitute a visual/
  accessibility/SEO acceptance review, live API integration, client content approval, or deployment.

### 2026-09-04 — Better Farms local production-route smoke check

- **Evidence:** the built Better Farms server ran locally in production mode. Each seven manifest-declared
  public route returned the static application shell with HTTP 200. Responses carried the expected production
  Content Security Policy and `X-Frame-Options: DENY` when no trusted Core admin origin was configured.
- **Content fallback:** the Fund a Farm runtime-content endpoint returned its intentional HTTP 503
  `Published content is temporarily unavailable` response because no Core API origin was configured locally.
  The pinned source's contract suite separately verifies the client fallback for that outcome.
- **Risk carried forward:** this does not test a configured Core API, authenticated preview, live browser
  rendering, or a deployed origin. No external request, client data, DNS, or Railway service was used.

### 2026-09-04 — Better Farms public-form proxy slice

- **Implemented:** Better Farms source revision `f14318e` replaces contact and newsletter success placeholders
  with the public same-origin API routes declared in its manifest. The server accepts only the managed Core
  contact (`name`, `email`, `subject`, `message`) and newsletter (`email`) payload contracts, forwards them
  to the credential-free configured Core origin, applies a five-second upstream limit, and returns a clear
  unavailable response when no origin is configured. Browser code remains same-origin under the existing CSP.
- **Evidence:** Better Farms TypeScript check, 14 site-contract/security tests, and the production build
  passed. A local production server returned HTTP 200 for `/contact` with its CSP and returned the intended
  HTTP 503 JSON response for a form attempt without an upstream Core origin. No upstream service or visitor
  data was contacted.
- **Risk carried forward:** enabling `CORE_PLATFORM_API_ORIGIN` requires client-specific Core form routing,
  data-handling approval, and a configured-environment rehearsal. The current generic Core system forms must
  not be assumed to establish client-scoped mailing-list or contact-message ownership.

### 2026-09-04 — Better Farms crawler-facing route metadata

- **Implemented:** Better Farms source revision `3fbe1bb` now emits server-rendered title, description,
  robots, Open Graph, Twitter, and canonical metadata for each declared public route. Browser navigation
  synchronizes the same tags. Canonicals require an explicit credential-free `PUBLIC_SITE_ORIGIN`, never
  derive from request headers, and are omitted for unknown noindex routes.
- **Evidence:** TypeScript check, all 17 Better Farms contract/security tests, and production build passed.
  A local production server configured with a test origin returned Fund a Farm metadata and its expected
  canonical URL; an unknown route returned `noindex, nofollow` with no canonical URL.
- **Risk carried forward:** a real public origin and content/SEO review remain client decisions. This is
  implementation and local evidence only; it makes no DNS, hosting, or deployment change.

### 2026-09-04 — Better Farms configured-form handoff verification

- **Implemented:** Better Farms source revision `46dfc54` makes the form proxy's Core origin and fetch
  dependency injectable for deterministic verification while preserving production configuration behavior.
  The proxy continues to validate the credential-free origin, accepts only strict managed-form payloads,
  and enforces the same five-second upstream boundary.
- **Evidence:** the Better Farms contract suite now includes direct proxy tests for a successful Core handoff,
  rejection of unexpected form fields before an upstream call, and the unavailable response on transport
  failure. TypeScript and all 20 contract/security tests passed without a Core request or visitor data.
- **Risk carried forward:** this proves the adapter handoff contract, not the client-specific Core form
  configuration. Data ownership approval and a configured-environment rehearsal remain required before
  enabling the upstream origin.

### 2026-09-04 — Ecommerce stock-boundary review

- **Verified:** cart pricing aggregates duplicate product/variant lines before order creation. Paid-order
  settlement runs in one database transaction: it serializes on the order row, transitions payment state,
  records any coupon redemption, conditionally decrements tracked non-backorder stock only when the available
  quantity covers the full line, and writes the inventory adjustment. A failed guarded decrement rolls back
  the paid transition and all accompanying effects.
- **Concurrency boundary:** competing paid orders use the conditional stock update, so only one can consume a
  limited final unit. Backorder-enabled variants are deliberately excluded from that nonnegative-stock guard.
  Focused inventory, ecommerce-service, and Stripe-webhook suites passed 66 tests.
- **Risk carried forward:** the database boundary is covered by code review and focused suites, but live
  checkout remains blocked pending Stripe sandbox concurrency and production-like end-to-end evidence,
  reconciliation procedures, and the client release approval.

### 2026-09-04 — Ecommerce refund outcome and reconciliation hardening

- **Implemented:** a Stripe refund returned immediately as `failed` or `canceled` now records as failed
  instead of remaining falsely pending. The admin refund API now provides a reconciliation action that lists
  refunds for the original PaymentIntent and matches only the durable local refund ID recorded in Stripe
  metadata. It never reissues a provider refund; a pending local reservation remains in place when no match
  is found.
- **Concurrency boundary:** the existing refundable-balance reservation locks the order and prohibits a
  second pending refund. Reconciliation updates the same durable refund record and recalculates the order
  payment status from current refund records. The provider request uses no user-controlled identifier.
- **Validation:** focused ecommerce suites passed 66 tests. The full Core gate passed: 98 test files/458
  tests, TypeScript, lint, formatting, production build, and bundle budgets. No Stripe API request, migration,
  or production data change was made.
- **Risk carried forward:** this needs Stripe sandbox evidence for delayed/failed/listed refunds and operator
  runbook/reconciliation acceptance before live refunds are enabled.

### 2026-09-04 — Membership webhook-effect atomicity

- **Implemented:** each accepted Stripe membership checkout or subscription event now applies its subscription
  write and audit record in one database transaction. Invoice paid and failed events likewise lock the linked
  subscription and commit its status, payment-failure timestamp, and audit event together. Webhook delivery
  claim and completion remain separate durable lifecycle operations so failed effects stay retryable.
- **Concurrency boundary:** the checkout/subscription path locks the user row before finding or creating the
  target subscription. Existing Stripe subscription metadata remains the fallback when a later provider event
  omits it. Focused lifecycle tests cover checkout, invoice, duplicate, and retry behavior.
- **Risk carried forward:** this does not establish Stripe sandbox concurrency or production-like end-to-end
  evidence. The external Stripe session-creation flow still needs sandbox reconciliation and retry evidence
  before live transactions are enabled.

### 2026-09-04 — Membership operator-effect atomicity

- **Implemented:** manual membership assignment, manual status changes, direct admin edits, and free-plan
  activation now each write their subscription change and audit event in one transaction. User-scoped writes
  serialize on the user row; direct subscription edits lock the subscription row before changing it.
- **Validation:** focused membership service and webhook lifecycle suites pass. The project type check, lint,
  and formatting checks remain green.
- **Risk carried forward:** no live Stripe session, customer, or subscription was created. Stripe sandbox
  reconciliation, concurrency, and the client release approval remain required gates.

### 2026-09-04 — Registrar-neutral client stack onboarding

- **Implemented:** an admin-only, credential-free domain onboarding workflow that validates client stack and
  domain topology, generates deterministic manual apex, `www`, and admin record instructions, and records
  rollback preparation. Its readiness evaluator distinguishes failed gates from DNS/certificate propagation
  that is still pending.
- **Safety boundary:** the workflow does not persist registrar credentials, call provider APIs, change DNS,
  create Railway infrastructure, or authorize cutover. The generated plan and observed verification evidence
  must be preserved in the client operations record before release review.

### 2026-09-04 — Separate public/admin origin preflight

- **Implemented:** the deployment preflight can now enforce the approved two-origin topology. When selected,
  it requires distinct canonical `PUBLIC_SITE_ORIGIN` and `CORE_PLATFORM_ADMIN_ORIGIN` values, requires the
  legacy `APP_URL` to match the admin origin, and requires both exact origins in `TRUSTED_ORIGINS`. The
  checked flag is `--require-separate-origins`; the deployment runbook defines each variable's role.
- **Evidence:** valid split topology, mismatched/identical/untrusted origins, and existing bootstrap policy
  are covered by 15 focused tests. The CLI passed with a complete synthetic isolated-stack fixture using
  ecommerce, email, backups, and the split-origin gate. TypeScript, lint, formatting, and whitespace checks
  passed. No Railway variable, DNS record, client service, or credential was read or changed.
- **Risk carried forward:** runtime login, proxy, preview, cookie, generated-link, and CORS/CSRF behavior
  still require a client-approved staging configuration and browser evidence. This preflight rejects unsafe
  configuration; it does not provision or validate a live topology.

### 2026-09-04 — Public/customer and admin link ownership

- **Implemented:** the client-stack origin helper resolves canonical public and admin origins independently,
  with safe fallback to the legacy application origin for existing stacks. Ecommerce checkout success and
  customer order-status email links now use `PUBLIC_SITE_ORIGIN`; an admin-created payment request uses
  `CORE_PLATFORM_ADMIN_ORIGIN` for its cancellation path.
- **Evidence:** helper tests reject credential-bearing or path-bearing overrides and preserve the legacy
  fallback. Ecommerce service tests verify the exact Stripe success/cancel origins; ecommerce email tests
  verify the customer status URL. Focused suites passed 66 tests, along with TypeScript and formatting.
- **Risk carried forward:** a client-approved staging browser exercise must still prove routing, session
  cookies, proxy behavior, emails, Stripe redirects, preview, and CORS/CSRF work at the real origins.

### 2026-09-04 — WooCommerce isolated PostgreSQL rehearsal

- **Environment:** disposable local PostgreSQL 16 container, created only for this rehearsal. Core's complete
  migration sequence and the additive WooCommerce lifecycle migration completed against an empty database.
  The source was a synthetic category and simple-product envelope; no client export, Railway service, or
  production credential was used.
- **Evidence:** the Drizzle repository completed a two-operation catalog run with two durable audit records;
  exact replay of the category batch returned its existing result without another target write; concurrent
  active-run claims for the same source/target produced exactly one success and one database rejection. A
  second fresh PostgreSQL 16 target was migrated and rehearsed with the same completed-run, audit-count,
  replay, and concurrency results.
- **Risk carried forward:** this proves the durable Phase 1 behavior on an isolated database, but does not
  authorize a client import, cutover, customer/order history, or a production migration. A protected source
  export, two full clean-target rehearsals, reconciliation approval, and restore/rollback evidence remain
  required release gates.

### 2026-09-04 — Client-stack restore identity and release record

- **Implemented:** every application-level restore now requires a target `CLIENT_STACK_ID` and accepts an
  identified backup only when its manifest stack ID is an exact match. A snapshot created before provenance
  was recorded is rejected by default and requires the CLI-only `--allow-legacy-backup` acknowledgement
  after duplicate-environment review. That acknowledgement cannot override an identified mismatch.
- **Release control:** added a versioned, secret-free client release manifest and validator that bind the
  Core and site revisions, distinct public/admin origins, backup provenance, complete standard gate set, and
  business/technical/operations evidence. The Better Farms record is deliberately a draft with pending
  database, backup, restore, health, security, and import gates.
- **Evidence:** exact match, missing target, mismatch, and legacy restore-policy tests pass; release-manifest
  schema tests and Better Farms draft validation pass. No restore, deployment, Railway configuration, DNS
  mutation, provider call, or client-data access occurred.
- **Risk carried forward:** a client-approved duplicate-environment restore drill, actual stack origins,
  browser/routing evidence, backup provenance, remaining operational gates, and named approvals are still
  required before the manifest can be approved or a release considered.

### 2026-09-04 — Better Farms authenticated form handoff

- **Implemented:** Better Farms public forms retain same-origin browser endpoints, but its site server now
  forwards only to an explicit `better-farms-foundation` Core Platform client-form route using a server-only
  token. Core verifies the requested stack ID and token in constant time before submitting its managed
  contact or newsletter form. The existing generic public form routes are unchanged.
- **Fail-closed behavior:** an absent site token prevents any upstream request; an absent Core configuration
  returns unavailable; an incorrect stack ID or token is rejected without revealing which value failed.
  The client-site contract records the proxy token as a required server secret reference without its value.
- **Risk carried forward:** no token has been generated or configured, and no server-to-server request has
  been made outside tests. The release still requires isolated-stack configuration, deployed-origin browser
  evidence, and approval before the route may be enabled.
- **Preflight:** client-form releases must include `--require-client-form-proxy`; it verifies that the Core
  stack has its server-side proxy token without printing its value. The paired Better Farms server token is
  recorded only as a required contract reference and must be configured separately during an approved setup.

### 2026-09-04 — Atomic manual ecommerce payment settlement

- **Implemented:** manual paid-order creation, an administrator marking an order paid, and an administrator
  changing an order to paid now all use the same order-locked settlement transaction as Stripe payment
  completion. The transaction writes paid status and manual payment evidence together with coupon redemption
  and guarded inventory adjustment. A failure leaves a newly created manual order pending and unpaid.
- **Evidence:** focused ecommerce tests cover each admin/manual route and the failure-safe pending state. A
  fresh disposable local PostgreSQL 16 instance ran the full migration sequence: one manual settlement wrote
  paid status and a single stock adjustment, while an insufficient-stock settlement left its order pending
  and wrote no adjustment. No client, Railway, Stripe, or production database was contacted.
- **Risk carried forward:** provider-backed payment, email/jobs/replay, customer reconciliation, and Stripe
  sandbox concurrency evidence remain required before enabling a live ecommerce release.

### 2026-09-04 — Atomic payment-link settlement

- **Implemented:** Stripe Checkout payment-link reconciliation now locks the payment request and settles its
  linked order in one transaction. The request changes to paid only after guarded inventory, coupon, and
  order-payment effects succeed. A linked request without a PaymentIntent, an intent mismatch, or a missing
  linked order is rejected so the provider webhook can retry rather than acknowledge an inconsistent state.
- **Evidence:** focused service and webhook tests cover first settlement and idempotent replay. A fresh
  disposable local PostgreSQL 16 rehearsal settled one linked request and order with one inventory
  adjustment, then attempted a second request after stock was exhausted. The second order remained
  `pending/unpaid` and its request remained `open`, with no PaymentIntent recorded. No client, Railway,
  Stripe, or production database was contacted.
- **Risk carried forward:** live provider retries, durable confirmation-email delivery, customer
  reconciliation, and Stripe sandbox concurrency evidence remain release gates.

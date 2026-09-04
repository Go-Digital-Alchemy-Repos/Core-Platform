# Client Migration Execution Ledger

This ledger records verified execution against the [Client Migration Master Plan](core-project-plan.md).
Statuses describe repository evidence and do not imply production release approval.

## Current Program State

| Milestone                             | Status      | Evidence                                                                                                                                                                                 | Remaining gate                                                                                                                                                                            |
| ------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Governance and baseline            | In progress | Core baseline `e2ba048`; Better Farms baseline `6dd6335`; Woo prototypes `325188d` and `ffd11a6`; orchestrator review recorded                                                           | Confirm final Better Farms modules, import history/exclusions, approvers, domain/operator details, success measures, RPO/RTO, and rollback triggers before the dependent production gates |
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

### 2026-09-04 — Membership webhook-effect atomicity

- **Implemented:** each accepted Stripe membership checkout or subscription event now applies its subscription
  write and audit record in one database transaction. Invoice paid and failed events likewise lock the linked
  subscription and commit its status, payment-failure timestamp, and audit event together. Webhook delivery
  claim and completion remain separate durable lifecycle operations so failed effects stay retryable.
- **Concurrency boundary:** the checkout/subscription path locks the user row before finding or creating the
  target subscription. Existing Stripe subscription metadata remains the fallback when a later provider event
  omits it. Focused lifecycle tests cover checkout, invoice, duplicate, and retry behavior.
- **Risk carried forward:** this does not establish Stripe sandbox concurrency or production-like end-to-end
  evidence. Manual membership changes and free-membership provisioning remain separate operator/application
  flows and require their own transaction review before live transactions are enabled.

### 2026-09-04 — Registrar-neutral client stack onboarding

- **Implemented:** an admin-only, credential-free domain onboarding workflow that validates client stack and
  domain topology, generates deterministic manual apex, `www`, and admin record instructions, and records
  rollback preparation. Its readiness evaluator distinguishes failed gates from DNS/certificate propagation
  that is still pending.
- **Safety boundary:** the workflow does not persist registrar credentials, call provider APIs, change DNS,
  create Railway infrastructure, or authorize cutover. The generated plan and observed verification evidence
  must be preserved in the client operations record before release review.

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

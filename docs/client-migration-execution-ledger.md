# Client Migration Execution Ledger

This ledger records verified execution against the [Client Migration Master Plan](core-project-plan.md).
Statuses describe repository evidence and do not imply production release approval.

## Current Program State

| Milestone                             | Status      | Evidence                                                                                                                                                                       | Remaining gate                                                                                                                                                                            |
| ------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Governance and baseline            | In progress | Core baseline `e2ba048`; Better Farms baseline `6dd6335`; Woo prototypes `325188d` and `ffd11a6`; orchestrator review recorded                                                 | Confirm final Better Farms modules, import history/exclusions, approvers, domain/operator details, success measures, RPO/RTO, and rollback triggers before the dependent production gates |
| 1. Manifest and integration contracts | In progress | Core branch `codex/uncommitted-work-audit` through `887f2c0`; manifest v1.0, compatibility validation, exact-origin preview, runtime publication ADR, and Better Farms fixture | Freeze manual DNS, module registry, route/data ownership, and Woo target-port/mapping contracts                                                                                           |
| 2. Better Farms adapter               | In progress | Better Farms branch `codex/site-shell-fund-a-farm` through `0f0ddde`; locked shell, theme adapter, bounded Fund a Farm registry/content, preview, runtime API fallback         | Complete site inventory and expand page, form, SEO, accessibility, responsive, and asset coverage incrementally                                                                           |
| 3. Railway deployment foundation      | In progress | Client-stack preflight, stack identity, Railway/manual-domain runbook, backup provenance, runtime publishing rollback runbook                                                  | Implement the registrar-neutral onboarding wizard and read-only readiness verification; rehearse restore in a disposable environment before release                                       |
| 4. WooCommerce adapter                | Planned     | Both prototype branches preserved and independently testable                                                                                                                   | Freeze import contract and mapping/run persistence before reconciling implementation; no client data import                                                                               |
| 5. Transaction correctness            | In progress | Membership credentials preserve-on-blank policy, trusted Stripe return URLs, and token-owned webhook delivery lifecycle implemented                                            | Close membership effect atomicity and then audit and close ecommerce inventory, coupon, refund, reconciliation, and operator-support blockers                                             |
| 6. Integrated pilot                   | Blocked     | Depends on Milestones 2–5 and approved infrastructure intake                                                                                                                   | Production-like integration and acceptance suite                                                                                                                                          |
| 7. Launch and hypercare               | Blocked     | Production release requires all prior gates and current backup/rollback evidence                                                                                               | Explicit go/no-go evidence, approved domains/operators, and successful post-deploy verification                                                                                           |
| 8. Reusable playbook                  | Planned     | Existing manifest, deployment, and integration documents provide the initial source material                                                                                   | Complete after pilot evidence identifies reusable versus Better Farms-specific work                                                                                                       |

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

## Active Sprint

**Objective:** Close the highest-risk transaction correctness gaps in membership and ecommerce before expanding
the Better Farms pilot surface. Membership credential and webhook delivery safety is the first checkpoint;
ecommerce payment, inventory, coupon, and refund atomicity follows.

**Write ownership:** the Project Orchestrator owns Core transaction services, storage, schema migrations, tests,
operational documentation, and this ledger. Delegated agents are read-only investigators until explicit
non-overlapping write ownership is assigned.

**Acceptance gate:** no live provider credentials or client transactions; webhook claims are atomic and retryable;
payment redirects use approved origins; database evolution is additive; existing Core tests, lint, types, build,
migration checks, manifest validation, and budgets remain green.

# Stabilization QA Branch Inventory

Date: 2026-06-12

## Active Branch

- `codex/event-participation-main`
- Working tree had uncommitted stabilization/frontend-edit changes during this audit and was not deleted.

## Safe Local Cleanup

- Ran `git fetch --prune`; Git removed stale remote-tracking ref `origin/codex/social-media-branding`.
- `git branch --merged origin/main` showed the local Codex feature branches, `main`, and `main-merge-lookup-input-limits` are already merged into `origin/main`.
- Safe deletion rule: delete only local branches proven merged into `origin/main`, excluding `main` and the active branch.
- Deleted merged local branches that were not checked out by another worktree: `codex/ecommerce-category-editor`, `codex/ecommerce-delete-safety`, and `codex/ecommerce-module-stripe-checkout`.
- Git refused deletion for merged branches currently used by separate worktrees under `/private/tmp/core-platform-*`; those branches were left intact.

## Duplicate-Commit Branches

- `codex/fulfillment-quantity-guards` and `codex/shipment-route-preflight`
- `codex/admin-order-transition-guards` and `codex/payment-lifecycle-scan`
- `codex/ecommerce-category-editor` and `codex/ecommerce-next-slice`
- `codex/ecommerce-next-hardening-scan` and `codex/public-product-active-categories`

## Needs Human Review

- `codex/collapsible-admin-nav` is not merged into `origin/main`.
- `codex/live-sync-main` is not merged into `origin/main`.
- `codex/main-production-rollout` has no upstream, though its tip is merged into `origin/main`.
- `main-merge-lookup-input-limits` has no upstream, though its tip is merged into `origin/main`.

## Organization Guardrails

- Public pages live under `client/src/features/public`.
- Admin app surfaces live under `client/src/features/admin/<app>` when a feature has meaningful size, such as `cms` and `ecommerce`.
- Storefront ecommerce lives under `client/src/features/ecommerce`.
- Feature-local helpers should stay in the owning feature folder; shared UI belongs in `client/src/components/shared`, and design primitives stay in `client/src/components/ui`.
- Optional installable apps should be gated at route mount boundaries on the server and at route/nav boundaries on the client.

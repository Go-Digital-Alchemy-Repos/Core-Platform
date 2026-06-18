# QA Status - June 2026

Current as of June 18, 2026 after the production reconciliation, branch cleanup, and lint cleanup passes.

## Release State

- Production Railway deployment is healthy after the latest `main` deployment.
- `main`, `origin/main`, and the local checkout are expected to stay aligned after each release push.
- Latest release gates passed before deployment:
  - `npm run check`
  - `npm run lint -- --quiet`
  - `npm test` with 359 passing tests
  - `npm run build`
  - `npm run budget`

## Branch State

- Remote branches are reduced to `main` plus two unmerged review branches:
  - `codex/collapsible-admin-nav`
  - `codex/live-sync-main`
- Eighty-nine merged `codex/*` remote branches were deleted after they were proven merged into `origin/main`.
- The two remaining branches both conflict with current `main` and should not be merged directly.

## Remaining Review Branches

### `codex/collapsible-admin-nav`

- Scope: `client/src/features/admin/admin-sidebar.tsx`
- Intent: make sidebar groups collapsible.
- Status: conflicts with current admin sidebar.
- Recommendation: manually re-implement the useful behavior against current `main` if the product still wants collapsible groups. Do not merge the branch directly.

### `codex/live-sync-main`

- Scope: `client/src/features/public/event-detail-page.tsx`
- Intent: combine event participation sections.
- Status: conflicts with current event detail page.
- Recommendation: review visually and port only the useful layout/flow improvements with focused tests. Do not merge the branch directly.

## Code Health Snapshot

- Full ESLint currently reports 0 errors and 0 warnings.
- Warning categories:
  - 0 `@typescript-eslint/no-explicit-any`
  - 0 `@typescript-eslint/no-unused-vars`
  - 0 miscellaneous JavaScript cleanup warnings
- Highest-maintenance files by line count:
  - `client/src/features/admin/settings-page.tsx` - 5,348 lines
  - `client/src/features/admin/ecommerce/ecommerce-page.tsx` - 4,129 lines
  - `client/src/features/admin/events-page.tsx` - 3,417 lines
  - `client/src/features/admin/cms/builder/block-renderer.tsx` - 2,747 lines
  - `client/src/features/admin/therapists-page.tsx` - 2,439 lines

## Legacy Naming Policy

Visible product copy should continue to use neutral platform language. Internal compatibility names remain preserved until aliases and migrations exist.

Preserve for now:

- Database names such as `therapist_profiles`
- API paths such as `/api/therapists`
- Role values such as `therapist`
- Stored CMS block keys such as `therapist-map` and `featured-counselors`
- Event visibility values such as `counselors_only`

Candidate cleanup still worth doing:

- Rename public asset filenames such as `hero-therapy-session-*` after confirming all references.
- Replace therapist-specific demo seed content when the therapist preset is not the active demo focus.
- Add neutral API aliases such as `/api/providers` before any internal route/type rename.

## Recommended Next Sprint

1. Keep lint at zero warnings by tightening types as new workflows are added.
2. Split `settings-page.tsx` by route-backed settings sections.
3. Classify remaining legacy naming hits into compatibility allowlist vs visible cleanup.
4. Review and selectively port the two stale branches.
5. Plan security/ops work: JWT revocation, CSRF token hardening, and background jobs.

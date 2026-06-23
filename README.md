# Core Platform

Reusable full-stack platform for CMS-managed public pages, admin operations, directory/provider workflows, events, memberships, forms, CRM, portfolio content, ecommerce, and operational tooling.

## Quick Start

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

3. Set `DATABASE_URL` in `.env`, then start the app:

   ```bash
   npm run dev
   ```

The dev server defaults to `http://localhost:5001`.

## Carolina Public Site

The public routes are now powered by the Carolina Exterior Landscapes CMS seed. On startup, the platform ensures the Carolina pages, reusable CMS sections, public assets, and quote forms exist while keeping `/admin`, auth, settings, CRM, media, SEO, and deployment workflows in the Core Platform shell.

The Carolina seed is conservative after first creation: existing Carolina CMS pages are preserved unless `REFRESH_CAROLINA_CMS=true` is set for a one-time refresh from the source JSON.

## Project Shape

- `client/src` contains the React frontend.
- `server` contains the Express API, middleware, services, jobs, and scripts.
- `shared` contains database schema, shared types, and cross-runtime helpers.
- `migrations` contains Drizzle SQL migrations and journal metadata.
- `docs` contains architecture notes, admin guides, deployment runbooks, and QA status.

## Handoff Checklist

Before wiring this platform into another frontend, confirm:

- Environment variables are copied from `.env.example` and scoped to the target deployment.
- `APP_URL` and `TRUSTED_ORIGINS` match all production, staging, and preview origins.
- Payment, email, backup, and analytics integrations are either configured or intentionally disabled.
- Product-specific visible copy and seeded CMS content have been reviewed for the target brand.
- Legacy compatibility names documented in `docs/qa-status-2026-06.md` are acceptable for the consuming app.

## Quality Gates

Run these before handing off or merging:

```bash
npm run check
npm run lint
npm test
npm run build
npm run budget
```

`npm run format` is available as a Prettier check. The repository now keeps generated QA output, local env files, builds, and CMS SQL exports out of git.

## Useful Docs

- `docs/runbooks/deployment.md` for deployment and environment setup.
- `docs/operations.md` for health checks, logging, metrics, and troubleshooting.
- `docs/quality-gates.md` for local and CI verification.
- `docs/qa-status-2026-06.md` for current release state and known follow-ups.
- `docs/architecture/overview.md` for the system architecture.

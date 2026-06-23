# Deployment & Environment Setup Runbook

## Prerequisites

- Node.js (LTS recommended)
- PostgreSQL database (Neon serverless recommended)
- Stripe account (optional, for payments/subscriptions)
- SMTP email account (optional, for outbound email)
- Cloudflare R2 bucket (optional, for system backups)

## Environment Variables

### Required for Production

| Variable         | Description                                                              |
| ---------------- | ------------------------------------------------------------------------ |
| `SESSION_SECRET` | Strong random string for JWT signing. Must not be "dev-secret-change-me" |
| `DATABASE_URL`   | PostgreSQL connection string                                             |

### Required for Features

| Variable                      | Feature  | Description                                      |
| ----------------------------- | -------- | ------------------------------------------------ |
| `STRIPE_SECRET_KEY`           | Payments | Stripe secret API key                            |
| `STRIPE_PUBLISHABLE_KEY`      | Payments | Stripe publishable key                           |
| `STRIPE_WEBHOOK_SECRET`       | Payments | Stripe webhook endpoint secret                   |
| `SMTP_HOST`                   | Email    | SMTP host                                        |
| `SMTP_PORT`                   | Email    | SMTP port, defaults to 587                       |
| `SMTP_USER`                   | Email    | SMTP username                                    |
| `SMTP_PASS`                   | Email    | SMTP password                                    |
| `SMTP_FROM`                   | Email    | Default sender address                           |
| `APP_URL`                     | Security | Base URL of the application                      |
| `TRUSTED_ORIGINS`             | Security | Comma-separated list of trusted origins          |
| `REFRESH_CAROLINA_CMS`        | CMS      | Optional one-time refresh of Carolina CMS seed   |
| `SETUP_TOKEN`                 | Security | Optional token required for first admin setup    |
| `CMS_PREVIEW_SECRET`          | CMS      | Optional signing secret for CMS preview links    |
| `METRICS_ENABLED`             | Metrics  | Set to "true" to enable metrics endpoint         |
| `LOG_LEVEL`                   | Logging  | Pino log level (default: "info")                 |
| `SYSTEM_BACKUPS_ENABLED`      | Backups  | Set to "true" to enable scheduled system backups |
| `BACKUP_R2_ACCOUNT_ID`        | Backups  | Cloudflare R2 account ID for backup storage      |
| `BACKUP_R2_ACCESS_KEY_ID`     | Backups  | Cloudflare R2 access key for backup storage      |
| `BACKUP_R2_SECRET_ACCESS_KEY` | Backups  | Cloudflare R2 secret key for backup storage      |
| `BACKUP_R2_BUCKET_NAME`       | Backups  | Cloudflare R2 backup bucket                      |
| `BACKUP_R2_PREFIX`            | Backups  | Optional path prefix for stored backup snapshots |

## Build & Deploy

### Development

```bash
npm run dev
```

Loads `.env` when present and starts Express + Vite dev server on port 5001 by default.
Set `PORT=...` to override. `DATABASE_URL` must be set in `.env` or the shell.

### Production Build

```bash
npm run build
```

Builds the Vite frontend to `dist/public/` and compiles the server.

### Production Start

```bash
npm start
```

Runs the compiled server. On startup:

1. `enforceRequiredSecrets()` checks for required environment variables
2. Database migrations run automatically via `server/migrate.ts`
3. System bootstrap ensures default CMS sections, forms, and Carolina public CMS pages exist
4. Express server starts on port 5000 in production unless `PORT` is set
5. Scheduled publish service starts for CMS timed publishing

### Railway + Neon

Use Neon for `DATABASE_URL` and set Railway variables for `SESSION_SECRET`, `DATABASE_URL`, `APP_URL`, and `TRUSTED_ORIGINS`. Railway supplies `PORT`; do not hardcode it.

For the Carolina deployment, keep `REFRESH_CAROLINA_CMS` unset during normal deploys so admin CMS edits are preserved. Set it only for a controlled seed refresh, then remove it after the deployment succeeds.

## Database Management

### Push Schema Changes (Development)

```bash
npm run db:push
```

### Run Type Check

```bash
npm run check
```

### Run Linter

```bash
npm run lint
```

### Run Tests

```bash
npm test
```

## Initial Setup

On first deployment, navigate to `/setup` to create the initial admin account. The setup route is only available when no admin users exist in the database.

## Post-Deployment Verification

1. Check `/api/health` returns `{ status: "ok" }`
2. Check `/api/health/ready` returns `{ status: "ready", database: "connected" }`
3. Navigate to the home page to verify CMS rendering
4. Test login with the admin account
5. Verify Stripe webhook endpoint is reachable
6. Check `/robots.txt` and `/sitemap.xml` are generated correctly

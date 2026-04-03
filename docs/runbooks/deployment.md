# Deployment & Environment Setup Runbook

## Prerequisites

- Node.js (LTS recommended)
- PostgreSQL database (Neon serverless recommended)
- Cloudflare R2 bucket (for file storage)
- Stripe account (for payments)
- SendGrid account (for email)

## Environment Variables

### Required for Production

| Variable | Description |
|----------|-------------|
| `SESSION_SECRET` | Strong random string for JWT signing. Must not be "dev-secret-change-me" |
| `DATABASE_URL` | PostgreSQL connection string |

### Required for Features

| Variable | Feature | Description |
|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | Payments | Stripe secret API key |
| `STRIPE_WEBHOOK_SECRET` | Payments | Stripe webhook endpoint secret |
| `R2_ACCESS_KEY_ID` | Uploads | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Uploads | Cloudflare R2 secret key |
| `R2_BUCKET_NAME` | Uploads | R2 bucket name |
| `R2_ENDPOINT` | Uploads | R2 endpoint URL |
| `SENDGRID_API_KEY` | Email | SendGrid API key |
| `APP_URL` | Security | Base URL of the application |
| `TRUSTED_ORIGINS` | Security | Comma-separated list of trusted origins |
| `METRICS_ENABLED` | Metrics | Set to "true" to enable metrics endpoint |
| `LOG_LEVEL` | Logging | Pino log level (default: "info") |

## Build & Deploy

### Development

```bash
npm run dev
```

Starts Express + Vite dev server on port 5000.

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
3. Express server starts on port 5000 (or `PORT` env var)
4. Scheduled publish service starts for CMS timed publishing

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

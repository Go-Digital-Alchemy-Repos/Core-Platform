# Security Hardening & Environment Requirements

## Authentication

- **JWT tokens** stored in HTTP-only cookies (`corePlatform_token`)
- Token expiry: 7 days
- Password hashing: `bcryptjs` with 12 salt rounds
- Cookie settings: `httpOnly: true`, `secure: true` (production), `sameSite: lax`

## Secret Management

### Required Environment Variables

| Variable | Required In | Description |
|----------|------------|-------------|
| `SESSION_SECRET` | Production | JWT signing key; must not be the dev default |
| `DATABASE_URL` | Production | PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | Stripe features | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks | Webhook signature verification |
| `R2_ACCESS_KEY_ID` | File uploads | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | File uploads | Cloudflare R2 secret |
| `R2_BUCKET_NAME` | File uploads | R2 bucket name |
| `R2_ENDPOINT` | File uploads | R2 endpoint URL |
| `SENDGRID_API_KEY` | Email | SendGrid API key |
| `APP_URL` | Production | Base URL for origin validation |
| `TRUSTED_ORIGINS` | Production | Comma-separated trusted origins |

### Enforcement

- `enforceRequiredSecrets()` in `server/middleware/security.ts` runs at startup
- In production, missing `SESSION_SECRET` or `DATABASE_URL` causes immediate process exit
- Dev default `SESSION_SECRET` ("dev-secret-change-me") is rejected in production

## Request Security

### Helmet CSP

Content Security Policy directives are configured in `securityHeaders()`:
- Scripts: self + Stripe JS
- Styles: self + unsafe-inline + Google Fonts
- Images: self + R2 + OpenStreetMap tiles
- Connections: self + Stripe API + R2 + OpenStreetMap
- Frames: self + Stripe
- Objects: none

### Rate Limiting

| Limiter | Window | Max Requests | Scope |
|---------|--------|-------------|-------|
| `apiLimiter` | 15 min | 300 | All `/api/*` |
| `loginLimiter` | 15 min | 10 | Login endpoint |
| `registerLimiter` | 60 min | 5 | Registration |
| `forgotPasswordLimiter` | 15 min | 5 | Password reset request |
| `resetPasswordLimiter` | 15 min | 10 | Password reset execution |
| `guestMessageLimiter` | 15 min | 5 | Guest messages |

All rate limiters are skipped in development mode.

### Origin Checking

- `originCheck` middleware validates `Origin` or `Referer` headers for state-changing requests (POST, PUT, PATCH, DELETE)
- GET, HEAD, OPTIONS requests are exempt
- Stripe webhook endpoint is exempt
- Trusted origins are derived from `APP_URL`, `TRUSTED_ORIGINS`, and the request `Host` header
- Skipped in development mode

### Request Body Limits

- JSON body: 1 MB limit
- URL-encoded body: 1 MB limit
- Stripe webhook: raw body parser (separate from JSON parser)

## Role-Based Access Control

Three roles: `user`, `therapist`, `admin`

- `authenticateToken` — Requires valid JWT; attaches user to `req.user`
- `optionalAuth` — Attaches user if token present, continues regardless
- `requireRole(...roles)` — Checks `req.user.role` against allowed roles
- Admin routes enforce `requireRole("admin")` via the admin router middleware

## Logging Security

- Sensitive fields are redacted in request logs: passwords, tokens, emails, phone, address, SSN, DOB
- Long text fields (bio, content, body, description) are truncated to 100 chars
- Response bodies are truncated to 500 chars in logs
- Error stack traces limited to 5 lines

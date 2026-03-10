# TCK Wellness — Counselor Directory & Subscription Platform

## Overview
A BetterHelp-style counselor directory and subscription platform where TCK-informed counselors subscribe to appear in a searchable public directory. Features custom JWT authentication, OpenStreetMap/Leaflet maps, Stripe subscriptions, and a full admin dashboard.

## UI Terminology
- All visible text uses "Counselor"/"Counselors" throughout the UI (navbar, footer, home, directory, admin, auth pages)
- Code identifiers, API routes (`/api/therapist/*`, `/api/therapists`), DB columns, and role values (`"therapist"`) remain unchanged

## Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, Wouter, TanStack Query v5
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom JWT with bcryptjs, HTTP-only cookies
- **Payments**: Stripe subscriptions (via Replit integration)
- **Maps**: OpenStreetMap + Leaflet (react-leaflet v4.2.1 for React 18)
- **Fonts**: EB Garamond (headings), Nunito (body)

## Architecture

### File Structure
```
shared/schema/        — Modular Drizzle table definitions
shared/types/         — Shared TypeScript enums/constants
server/middleware/     — auth (JWT), validation (Zod), error handling
server/storage/       — Modular data access layer (one file per entity)
server/routes/        — Modular Express route handlers
server/config/        — Stripe configuration
server/webhooks/      — Stripe webhook handler
server/scripts/       — Database seed scripts
server/services/      — R2 (Cloudflare), email services
uploads/avatars/      — Local avatar storage fallback (when R2 not configured)
client/src/components/ — Shared UI (layout, directory, shared)
client/src/features/  — Feature pages (auth, public, directory, therapist, admin)
client/src/hooks/     — Custom hooks (useAuth, useToast)
client/src/lib/       — Utilities (queryClient, constants)
```

### Database Tables
- `users` — User accounts (admin/therapist/client roles)
- `therapist_profiles` — Therapist profile data with location, specializations, `isFeatured` flag
- `membership_tiers` — Subscription pricing tiers (Basic/Professional/Premium)
- `therapist_subscriptions` — Active subscriptions linked to Stripe
- `events` — Platform events (virtual/in-person)
- `contact_messages` — Contact form submissions
- `docs` — Admin documentation library (markdown)
- `password_reset_tokens` — Password reset tokens with 24hr expiry
- `system_settings` — Key-value config (AES-256 encrypted secrets)
- `email_templates` — System email templates with {{variable}} placeholders
- `activity_logs` — User activity tracking (login, profile_update, etc.)
- `conversations` / `direct_messages` — Internal messaging system with rich text (contentHtml) and attachments (attachmentUrl/Name/Type)
- `notifications` — In-app notification records (type, title, body, isRead, linkUrl)
- `notification_preferences` — Per-user settings (emailNewMessage, inAppNewMessage)
- `specializations` — Dynamic specialization list managed via Admin > Settings > Specializations tab; replaces hardcoded constant

### Authentication
- Custom JWT (not Replit Auth, not Better Auth)
- HTTP-only cookie named `tck_token`
- Uses `SESSION_SECRET` env var for signing
- Three roles: admin, therapist, client

### UI Patterns
- All form/detail popups use **Sheet** (slide-out drawer from right), not Dialog modals
- Sheet component supports size variants: sm, default (md), md (lg), lg (2xl), xl (4xl), full (90vw)
- SheetBody component handles scrollable content between header and footer
- AlertDialog still used for confirmation prompts (approve, delete)
- Large forms (therapist add/edit) use `size="full"` (90vw), content editors (docs, email templates) use `size="xl"`
- EditTherapistSheet has 3 tabs: Overview (profile + user fields + avatar), Membership (subscription), Activity (stats + log)

## Responsive Design
- Custom breakpoints: xs=480px, sm=640px, md=768px, lg=1024px, xl=1280px
- Directory page uses `h-[100dvh]` for proper mobile viewport height
- Global CSS: overflow-x hidden on body, touch-action manipulation, text-size-adjust
- Filter grid: 1 column on phones, 2 columns on xs+
- TherapistRow: inline badges on mobile, side column on md+
- Profile header: centered stack on mobile, flex-row on sm+
- Hero CTAs: full-width stacked on phones, row on xs+

## Brand Colors (HSL)
- Navy (primary): 222 38% 19%
- Sage (secondary): 153 20% 71%
- Copper: 22 48% 44%
- Teal: 175 37% 36%

### Test Accounts
- Admin: admin@tckwellness.com / Admin123!
- Therapist: therapist@test.com / Therapist123!
- Client: client@test.com / Client123!

## Key Routes
- `/` — Landing page
- `/directory` — Therapist directory (split-pane: scrollable list + sticky map; filters for specialization, language, country, session format; supports `?specialization=` URL param)
- `/directory/:id` — Therapist profile
- `/events` — Public events
- `/auth/login`, `/auth/register` — Authentication
- `/therapist` — Therapist dashboard (protected)
- `/admin` — Admin dashboard (protected)
- `/admin/settings` — System settings (integrations + email templates)

## API Endpoints
- `POST /api/auth/register|login|logout`, `GET /api/auth/me`, `PUT /api/auth/profile`, `PUT /api/auth/change-password`
- `POST /api/uploads/avatar` — Avatar upload (R2 → local fallback); updates user.profileImageUrl
- `GET /api/therapists`, `GET /api/therapists/:id`
- `GET/PUT /api/therapist/profile`, `GET /api/therapist/subscription`
- `POST /api/stripe/create-checkout-session|create-portal-session`
- `GET /api/admin/dashboard-stats|therapists|users|membership-tiers|events|messages`
- `POST /api/admin/therapists` — Create therapist (user + profile, auto-approved)
- `PUT /api/admin/therapists/:id` — Update profile fields (Zod-validated: includes isFeatured, isApproved)
- `GET /api/admin/therapists/:id/activity` — Activity logs + stats for a counselor
- `GET /api/admin/therapists/:id/subscription` — Subscription + tier data for a counselor
- `PUT /api/admin/therapists/:id/approve` — Approve + send email
- `PUT /api/admin/therapists/:id/reject` — Reject with reason + send email
- `DELETE /api/admin/therapists/:id` — Soft-delete (isActive=false)
- `POST /api/admin/users` — Create user (any role, optional welcome email)
- `PUT /api/admin/users/:id` — Update user (Zod-validated: name, email, role)
- `DELETE /api/admin/users/:id` — Hard-delete user (cannot delete self)
- `POST /api/admin/users/:id/reset-password` — Reset password directly (with newPassword) or send reset link (without)
- `POST /api/auth/forgot-password` — Public: request password reset email
- `POST /api/auth/reset-password` — Public: complete password reset with token
- `CRUD /api/admin/docs`
- `GET/PUT/DELETE /api/admin/settings` — System settings CRUD
- `POST /api/admin/settings/test-connection` — Test integration connectivity
- `GET /api/admin/email-templates` — List all email templates
- `PUT /api/admin/email-templates/:slug` — Update template
- `POST /api/admin/email-templates/:slug/preview` — Preview rendered template
- `POST /api/admin/email-templates/:slug/test` — Send test email
- `POST /api/uploads/avatar` — Upload avatar image to R2
- `GET /api/events`, `GET /api/membership-tiers`, `POST /api/contact`

## Email Service
- `server/services/email.service.ts` — Supports Mailgun (primary) and SMTP/nodemailer (fallback)
- Reads Mailgun credentials from `system_settings` DB table; falls back to SMTP env vars
- All email templates stored in `email_templates` DB table with `{{variable}}` placeholders
- 7 templates: therapist-approval, therapist-rejection, password-reset, welcome-new-user, new-therapist-registration, new-client-registration, contact-form-submission
- Gracefully logs to console if no email provider configured

## System Settings
- `system_settings` table: key-value config store with AES-256-CBC encryption for secrets
- Categories: stripe, mailgun, cloudflare_r2
- `server/storage/settings.storage.ts` — CRUD with encryption/decryption using SESSION_SECRET
- `server/routes/settings.routes.ts` — Admin API: GET/PUT/DELETE settings, test connections, email template CRUD

## File Storage (Cloudflare R2)
- `server/services/r2.service.ts` — S3-compatible client for Cloudflare R2
- Reads credentials from `system_settings` DB table
- `server/routes/upload.routes.ts` — Avatar upload via multer → R2
- Gracefully degrades when R2 not configured

## Password Reset Flow
- `password_reset_tokens` table stores tokens with 24hr expiry
- Admin can reset passwords directly or send reset link emails
- Public reset flow: `/auth/reset-password?token=...` page validates and completes reset

## Seed Data
- 40 diverse therapist profiles with AI-generated avatar images (in `client/public/avatars/`)
- 3 membership tiers (Basic $29/mo, Professional $49/mo, Premium $79/mo)
- 4 upcoming events (mix of virtual/in-person, public/members-only)
- 8 admin documentation articles
- Re-running `npx tsx server/scripts/seed.ts` clears and re-seeds all data

## Dynamic Home Page
- Featured Therapists section shows 6 therapists from the directory API
- Upcoming Events section shows 3 events from the events API
- Both sections link to their full pages (/directory and /events)

## Running
- `npm run dev` — Development (Express + Vite)
- `npm run db:push` — Push schema to PostgreSQL
- `npx tsx server/scripts/seed.ts` — Seed test data (40 therapists)

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (required in production)
- `SESSION_SECRET` — JWT signing secret (required in production, must not be the dev default)
- `APP_URL` — (optional) Trusted origin URL for CSRF origin checks
- `TRUSTED_ORIGINS` — (optional) Comma-separated list of additional trusted origins
- Stripe credentials via Replit integration

## Security Hardening (Phase 2)

### Packages Added
- `helmet` — Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- `express-rate-limit` — Rate limiting middleware

### Protections
1. **Secret enforcement**: `SESSION_SECRET` and `DATABASE_URL` are required in non-dev environments; server fails fast if missing or using dev defaults
2. **Security headers**: Helmet middleware applied globally (CSP disabled to avoid breaking the SPA)
3. **Rate limiting** (production only, skipped in dev):
   - Login: 10 attempts / 15 min
   - Forgot password: 5 requests / 15 min
   - Reset password: 10 attempts / 15 min
   - Registration: 5 attempts / 1 hour
   - General API: 300 requests / 15 min
4. **Origin validation**: State-changing requests (POST/PUT/PATCH/DELETE) validated against trusted origins; Stripe webhook exempt
5. **Body size limits**: JSON and URL-encoded bodies limited to 1MB
6. **Log redaction**: Passwords, tokens, secrets redacted from response logs; message content fully redacted; long text fields truncated
7. **Cookie security**: httpOnly, secure (production), sameSite=lax already configured

### Files
- `server/middleware/security.ts` — All security middleware (helmet, rate limiters, origin check, secret enforcement)
- `server/index.ts` — Security middleware integration, log redaction
- `server/middleware/auth.ts` — JWT secret no longer falls back to dev default in production
- `server/routes/auth.routes.ts` — Rate limiters applied to login, register, forgot-password, reset-password

## TypeScript Integrity Pass (March 2026)

### What was fixed
- **Express v5 route param typing**: Express v5 types `req.params` values as `string | string[]` instead of `string`. Created `server/utils/params.ts` with a `paramString()` utility that safely extracts the first string value. Applied across all route files that pass params to storage/service calls.
- **Missing type package**: Installed `@types/sanitize-html` (devDependency) to resolve the declaration file error in `server/routes/messages.routes.ts`.

### Files changed
- `server/utils/params.ts` — NEW: route param extraction utility
- `server/routes/admin.routes.ts` — 14 param fixes
- `server/routes/directory.routes.ts` — 1 param fix
- `server/routes/docs.routes.ts` — 3 param fixes
- `server/routes/messages.routes.ts` — 6 param fixes
- `server/routes/settings.routes.ts` — 4 param fixes

### Conventions
- All new route handlers should use `paramString(req.params.xxx)` when passing Express route params to functions that expect `string`
- The `check` script (`tsc`) must pass with zero errors before merging changes

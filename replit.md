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
shared/schema/            — Modular Drizzle table definitions
shared/types/             — Shared TypeScript enums/constants
server/middleware/        — auth (JWT), validation (Zod), error handling
server/storage/           — Modular data access layer (one file per entity)
server/routes/            — Top-level route modules + registration index
server/routes/admin/      — Admin route modules (split by domain)
  index.ts                — Admin router hub (auth + sub-router mounting)
  dashboard.routes.ts     — GET /dashboard-stats
  therapists.routes.ts    — Therapist CRUD, approve/reject, activity, subscription
  users.routes.ts         — User CRUD, password reset
  tiers.routes.ts         — Membership tier CRUD
  events.routes.ts        — Event CRUD
  messages.routes.ts      — Contact message management
server/config/            — Stripe configuration
server/webhooks/          — Stripe webhook handler
server/scripts/           — Database seed scripts
server/services/          — R2 (Cloudflare), email services
server/utils/             — Shared utilities (params, route-helpers)
uploads/avatars/          — Local avatar storage fallback (when R2 not configured)
client/src/components/    — Shared UI (layout, directory, shared)
client/src/features/      — Feature pages (auth, public, directory, therapist, admin)
client/src/hooks/         — Custom hooks (useAuth, useToast)
client/src/lib/           — Utilities (queryClient, constants)
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
- `GET /api/therapists` — Paginated directory with server-side filtering (returns `{items, total, page, pageSize}`)
- `GET /api/therapists/filters` — Available filter options (languages, countries)
- `GET /api/therapists/featured` — Featured therapists (array, max 6)
- `GET /api/therapists/:id` — Single therapist profile
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

## Directory API (Phase 3)

### `GET /api/therapists` — Paginated directory listing
Query params: `search`, `specialization`, `practiceMode`, `language`, `country`, `acceptingClients`, `page`, `pageSize`
Response: `{ items: TherapistWithUser[], total: number, page: number, pageSize: number }`
- All filters applied server-side in PostgreSQL (including array column search via `ANY()`)
- Text search matches against: name (concat), title, city, country, specializations (unnest+ILIKE), languages (unnest+ILIKE)
- Default pageSize: 200 (fits current map view needs)
- Results ordered alphabetically by first name, last name

### `GET /api/therapists/filters` — Filter option values
Response: `{ languages: string[], countries: string[] }`
- Returns distinct values from approved/active therapists only
- Specialization options come from the separate `/api/specializations` endpoint

### Client integration
- Frontend debounces search input (300ms) before sending to API
- Filter changes reset to page 1
- Query key includes serialized params for proper cache invalidation: `["/api/therapists", queryParams]`
- Pagination controls appear when totalPages > 1
- Map receives all items from current page (pageSize=200 ensures all fit in one page for typical datasets)

### Follow-up recommendations
- Consider reducing default pageSize and using cursor-based pagination when dataset exceeds ~500 therapists
- Add `Cache-Control` headers for the `/filters` endpoint (data changes infrequently)

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

## DB Indexing & Relational Integrity (Phase 4)

### Indexes Added (21 total: 19 B-tree + 2 GIN)

**therapist_profiles (7 indexes):**
- `idx_tp_user_id` — B-tree on `user_id` (JOIN to users)
- `idx_tp_visibility` — Composite B-tree on `(is_approved, is_active)` (directory listing filter)
- `idx_tp_country` — B-tree on `country` (country filter)
- `idx_tp_practice_mode` — B-tree on `practice_mode` (session format filter)
- `idx_tp_featured` — B-tree on `is_featured` (featured listings)
- `idx_tp_specializations_gin` — GIN on `specializations` (array containment search)
- `idx_tp_languages_gin` — GIN on `languages` (array containment search)

**notifications (2 indexes):**
- `idx_notif_user_date` — Composite B-tree on `(user_id, created_at)` (user inbox listing sorted by date)
- `idx_notif_user_unread` — Composite B-tree on `(user_id, is_read)` (unread notification filtering)

**conversations (4 indexes):**
- `idx_conv_client_id` — B-tree on `client_id` (find user conversations)
- `idx_conv_counselor_id` — B-tree on `counselor_id` (find user conversations)
- `idx_conv_updated_at` — B-tree on `updated_at` (conversation ordering)
- `idx_conv_participants` — Composite B-tree on `(client_id, counselor_id)` (getOrCreateConversation lookup)

**direct_messages (2 indexes):**
- `idx_dm_conv_date` — Composite B-tree on `(conversation_id, created_at)` (message listing)
- `idx_dm_conv_read_sender` — Composite B-tree on `(conversation_id, is_read, sender_id)` (unread count)

**activity_logs (1 index):**
- `idx_activity_user_date` — Composite B-tree on `(user_id, created_at)` (admin activity view)

**therapist_subscriptions (3 indexes):**
- `idx_sub_therapist_id` — B-tree on `therapist_id` (subscription lookup)
- `idx_sub_stripe_sub_id` — B-tree on `stripe_subscription_id` (Stripe webhook lookups)
- `idx_sub_status` — B-tree on `status` (active subscription queries)

**events (1 index):**
- `idx_events_date` — B-tree on `date` (upcoming events ordering)

**users (1 index):**
- `idx_users_role` — B-tree on `role` (role-based listing)

### FK Constraints Added
- `notifications.user_id` → `users.id` (was missing, 0 orphaned records found)
- `notification_preferences.user_id` → `users.id` (was missing, 0 orphaned records found)

### GIN Index Note
The two GIN indexes on `specializations` and `languages` arrays were created via direct SQL (`CREATE INDEX ... USING GIN`) since Drizzle's `index()` helper doesn't natively support GIN. They are not reflected in the Drizzle schema files but exist in the database. If `db:push` is run again, they will persist (Drizzle doesn't drop unmanaged indexes).

### Migration Notes
- All changes applied via `npm run db:push` (nondestructive)
- No tables dropped, no data deleted, no columns altered
- Orphaned record check performed before adding FKs: 0 orphans in notifications, notification_preferences, activity_logs, subscriptions
- GIN indexes added via `executeSql` after schema push
- All existing primary keys and unique constraints preserved

### Files Changed
- `shared/schema/users.ts` — Added `idx_users_role` index
- `shared/schema/therapist-profiles.ts` — Added 5 B-tree indexes
- `shared/schema/notifications.ts` — Added FK references to `users.id`, composite index
- `shared/schema/direct-messages.ts` — Added indexes on conversations and direct_messages
- `shared/schema/activity-logs.ts` — Added composite index
- `shared/schema/subscriptions.ts` — Added 3 indexes
- `shared/schema/events.ts` — Added date index
- `server/storage/therapist.storage.ts` — Updated array filter queries to use `@>` operator for GIN index compatibility

### Query Pattern Updates
- Array filter queries in `server/storage/therapist.storage.ts` updated from `value = ANY(array_col)` to `array_col @> ARRAY[value]::text[]` to properly leverage GIN indexes

### Performance Rationale
- **Directory queries** are the highest-frequency read path; the composite `(is_approved, is_active)` index + individual filter indexes + GIN array indexes (with `@>` operator) cover all predicates in `listProfilesPaginated()`
- **Notification queries**: `(user_id, created_at)` index covers the main inbox listing (all notifications sorted by date); separate `(user_id, is_read)` covers unread count/filtering
- **Direct message queries** always scope to a conversation; composite `(conversation_id, created_at)` covers listing, and `(conversation_id, is_read, sender_id)` covers unread count without hitting the main table
- **Conversation lookups**: `(client_id, counselor_id)` composite covers `getOrCreateConversation()` exact-match queries
- **Stripe webhook lookups** by `stripe_subscription_id` were doing full table scans; now indexed

## Route & Service Cleanup (Phase 5)

### What Changed
- **Split monolithic `admin.routes.ts`** (479 lines, 23 routes) into 6 focused domain modules under `server/routes/admin/`
- **Created shared route helpers** (`server/utils/route-helpers.ts`) with `getBaseUrl()`, `notFound()`, `conflict()` to standardize response patterns
- **Centralized admin auth** in `server/routes/admin/index.ts` — `authenticateToken` + `requireRole("admin")` applied once at the hub level

### New Files
- `server/routes/admin/index.ts` — Hub: mounts all admin sub-routers with shared auth middleware
- `server/routes/admin/dashboard.routes.ts` — `GET /dashboard-stats` (aggregated counts)
- `server/routes/admin/therapists.routes.ts` — 9 routes: list, create, update, delete, approve, reject, activity, subscription
- `server/routes/admin/users.routes.ts` — 5 routes: list, create, update, delete, reset-password
- `server/routes/admin/tiers.routes.ts` — 3 routes: list, create, update
- `server/routes/admin/events.routes.ts` — 4 routes: list, create, update, delete
- `server/routes/admin/messages.routes.ts` — 2 routes: list, mark-read
- `server/utils/route-helpers.ts` — Shared helpers: `getBaseUrl(req)`, `notFound(res, entity)`, `conflict(res, msg)`

### Files Removed
- `server/routes/admin.routes.ts` — Replaced by `server/routes/admin/` directory

### Files Modified
- `server/routes/index.ts` — Updated import from `./admin.routes` to `./admin/index`

### Route Registration
All admin routes still mount at `/api/admin/*`. The hub router applies auth once, then delegates to domain-specific sub-routers:
- `/api/admin/dashboard-stats` → `dashboard.routes.ts`
- `/api/admin/therapists/*` → `therapists.routes.ts`
- `/api/admin/users/*` → `users.routes.ts`
- `/api/admin/membership-tiers/*` → `tiers.routes.ts`
- `/api/admin/events/*` → `events.routes.ts`
- `/api/admin/messages/*` → `messages.routes.ts`
- `/api/admin/settings/*`, `/api/admin/email-templates/*` → `settings.routes.ts` (unchanged, already separate)
- `/api/admin/docs/*` → `docs.routes.ts` (unchanged, already separate)

### Remaining Bloat Areas
- `settings.routes.ts` (224 lines) — Handles both system settings and email template CRUD; could split if it grows further
- `auth.routes.ts` (≈200 lines) — Contains register, login, forgot/reset password, profile update; reasonably cohesive
- `messages.routes.ts` (≈150 lines) — Direct messaging with sanitization; single-domain, acceptable size

### Follow-up Recommendations
- Consider extracting therapist creation workflow (user + profile + email) into an `admin.service.ts` if more orchestration logic is added
- Consider splitting `settings.routes.ts` into `settings.routes.ts` + `email-templates.routes.ts` if either grows

## Observability & Operational Readiness (Phase 6)

### Structured Logger
- `server/utils/logger.ts` — Lightweight structured logger with named sources
- Format: `ISO_TIMESTAMP [LEVEL] [source] message {context}`
- Sources: `http`, `email`, `r2`, `stripe`, `auth`, `app`, `db`
- Levels: `info`, `warn`, `error`
- Error entries include truncated stack traces (first 3 frames)

### Request/Correlation IDs
- Every request gets an 8-char UUID prefix via `requestIdMiddleware`
- Request ID attached as `req.requestId` and included in all HTTP log entries
- Error handler includes `reqId` in log output for trace correlation

### Health Endpoints
- `GET /api/health` — Liveness check: returns `{ status, uptime, timestamp }`
- `GET /api/health/ready` — Readiness check: verifies DB connectivity, returns 503 if DB is down
- Both registered before rate limiter middleware — never throttled by API rate limits

### Logging Improvements
- **HTTP request logs**: Now structured with reqId, truncated response bodies (max 500 chars)
- **Email service**: All send attempts/failures use structured logger; silent `catch {}` blocks in `getMailgunConfig()` and `getTemplateHtml()` now log warnings with context; admin notification `.catch(() => {})` calls now log warnings
- **R2 service**: Silent `catch {}` in `getR2Config()` now logs warning with error message
- **Stripe webhooks**: Logs every event type received with event ID; warns on missing `STRIPE_WEBHOOK_SECRET`; logs unhandled event types instead of silently ignoring; success logging for subscription state changes
- **Error handler**: Uses structured logger with request ID instead of raw `console.error`

### Sensitive Data Protection
- Existing redaction preserved: passwords, tokens, secrets, authorization headers → `[REDACTED]`
- Message content paths → `[message content redacted]`
- Long text fields (bio, content, body, description) truncated to 100 chars
- Full response bodies truncated to 500 chars in logs

### Files Changed
- `server/utils/logger.ts` — NEW: structured logger with named sources + request ID middleware
- `server/index.ts` — Request ID middleware, health endpoints, structured logger, body truncation
- `server/services/email.service.ts` — Structured logger, fixed silent catches
- `server/services/r2.service.ts` — Structured logger, fixed silent catch in config loading
- `server/webhooks/stripe.handler.ts` — Structured logger, event logging, unhandled event type logging
- `server/middleware/error-handler.ts` — Structured logger with request ID

### Follow-up Recommendations
- Consider adding log aggregation/export for production (e.g., structured JSON to stdout for log collectors)
- Consider adding request duration percentile tracking for performance monitoring
- Add alerting on repeated email send failures or DB readiness check failures

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

## Frontend Performance Pass (Phase 7)

### Route-Level Lazy Loading
- 14 pages converted from eager to lazy imports via `React.lazy()` + `Suspense`
- **Eagerly loaded** (critical path): HomePage, AboutPage, ContactPage, EventsPage, LoginPage, RegisterPage, ResetPasswordPage, NotFound
- **Lazy loaded**: All admin pages (8), therapist pages (3), directory pages (2), messages page (1)
- Suspense fallback: centered `Loader2` spinner via `<PageLoader />`
- Build output confirms separate chunks: admin therapists (36KB), messages (385KB), map-view (157KB), settings (18KB), etc.
- Main bundle reduced from ~1.2MB to ~602KB

### React Query Cache Strategy
- **Global default**: `staleTime: 5min` (SESSION), `gcTime: 10min`, `retry: false`, `refetchOnWindowFocus: false`
- **Auth query** (`/api/auth/me`): `staleTime: Infinity` (STATIC) — only changes on login/logout via cache invalidation
- **Specializations**: `staleTime: Infinity` (STATIC) — reference data, rarely changes
- **Admin dashboard stats**: `staleTime: 60s` (LIVE) — aggregate counters that update frequently
- **Notification unread count**: `refetchInterval: 30s` — already had polling, unchanged
- **All other queries**: inherit SESSION default (5min); mutations invalidate relevant caches
- Exported `STALE_TIMES` constants from `queryClient.ts`: `STATIC` (Infinity), `SESSION` (5min), `LIVE` (60s)

### Files Changed
- `client/src/App.tsx` — Lazy imports, Suspense wrapper, PageLoader component
- `client/src/lib/queryClient.ts` — STALE_TIMES constants, staleTime SESSION default, gcTime 10min
- `client/src/hooks/use-auth.ts` — STATIC staleTime for auth query
- `client/src/hooks/use-specializations.ts` — STATIC staleTime for reference data
- `client/src/features/admin/dashboard-page.tsx` — LIVE staleTime for dashboard stats

### Follow-up Recommendations
- Consider `manualChunks` in Vite rollup config to split the messages-page rich-text-editor (~385KB) into a shared vendor chunk
- Consider lazy loading the map-view component inside directory-page (already chunked at 157KB but loaded as part of directory bundle)
- Add route prefetching for likely navigation targets (e.g., prefetch admin chunks after admin login detected)

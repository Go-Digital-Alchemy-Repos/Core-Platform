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
  dashboard.routes.ts     — GET /dashboard-stats, GET /dashboard-analytics
  therapists.routes.ts    — Therapist CRUD, approve/reject, activity, subscription
  users.routes.ts         — User CRUD, password reset
  tiers.routes.ts         — Membership tier CRUD
  events.routes.ts        — Event CRUD
  messages.routes.ts      — Contact message management
  blog.routes.ts          — Blog post CRUD (admin)
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
- `events` — Platform events with expanded fields: status (draft/published/canceled/completed), visibility (public/members_only/counselors_only/admins_only), registration (enabled/type/fee/currency/capacity/waitlist/opens/closes), speaker metadata (name/bio/image), virtual info (joinUrl/dialIn/recording), location geo (name/address/lat/lng), timezone
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
- `blog_posts` — Blog/insights articles with title, slug, content, category, tags, author, publish state

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
- `/join` — Join the Network (counselor application page with modal registration + login)
- `/auth/login`, `/auth/register` — Authentication (legacy full-page forms; navbar Register button now opens client registration modal)
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

## Public Event Rendering (Phase 2)

### Event Display Logic
- **Event list** (`/events`): Shows only published, public-visibility events via `getUpcomingEvents()` (status=published + date >= now)
- **Event detail** (`/events/:id`): Returns any event by direct ID except drafts (blocked server-side)
- Event cards show badges for: Virtual/In-Person/Hybrid, Free/Paid (with price), Registration Open/Closed, Past, Recording Available

### Virtual / In-Person / Hybrid
- **Virtual**: `isVirtual=true` with no location data → shows "Virtual" badge, join URL, dial-in info
- **In-Person**: `isVirtual=false` → shows "In-Person" badge, location info, map
- **Hybrid**: `isVirtual=true` AND location data exists → shows "Hybrid" badge, both join URL and map

### Location Map
- Uses `EventLocationMap` component (`client/src/components/shared/event-location-map.tsx`)
- Renders only when `latitude` + `longitude` exist AND event is not virtual-only
- Lightweight Leaflet MapContainer with single pin, same tile server and pin SVG as directory map
- Aspect ratio 16:9, max-height 300px, scroll/drag disabled, rounded corners
- Reuses the same OpenStreetMap tile layer and pin icon style from `map-view.tsx`

### Recording Availability
- Past events with `recordingUrl` show a "Recording Available" badge in cards and a dedicated card on detail page
- Recording card text mentions event archives for forward-compatibility with archive feature
- Recording URL only shown to users who pass visibility checks (role-based)

### Registration State
- Derived from `registrationEnabled` + `registrationOpensAt` + `registrationClosesAt` vs current time
- States: "open" (within window), "closed" (past closes date), "upcoming" (before opens date), "none" (not enabled)
- Registration section shows: free/paid badge, open/closed/upcoming status, dates, capacity, waitlist note

### Role/Visibility Rendering
- `canUserAccessEvent()` checks event.visibility against user.role:
  - `public`: visible to all
  - `members_only`: requires therapist or client role
  - `counselors_only`: requires therapist role
  - `admins_only`: requires admin role
  - Admin role has access to all visibility levels
- Unauthorized users see "Log in to access event details" instead of join URLs / recording links
- Event content (title, date, description) still shown — only restricted links are hidden

### Files
- `client/src/components/shared/event-location-map.tsx` — Lightweight single-pin Leaflet map
- `client/src/features/public/events-page.tsx` — Event cards with enhanced badges and info
- `client/src/features/public/event-detail-page.tsx` — Full detail page with map, speaker, recording, registration, visibility checks
- `server/storage/event.storage.ts` — `getPublishedEvents()` filters by status=published + visibility=public
- `server/routes/events.routes.ts` — Public routes; `/all` uses published filter; `/:id` blocks drafts

## Event Registration System (Phase 3)

### Data Model
- **Table**: `event_registrations` (`shared/schema/event-registrations.ts`)
- **Fields**: id, eventId (FK→events), userId (FK→users), fullName, email, phone, status, paymentStatus, paymentIntentId, amountPaid, notes, registeredAt, canceledAt
- **Status values**: 'confirmed', 'waitlisted', 'canceled'
- **Payment status values**: 'not_required', 'pending', 'paid', 'refunded' (forward-compatible for paid phase)
- **Unique constraint**: (eventId, userId) prevents duplicate registrations
- **Indexes**: eventId, userId, composite (eventId, userId)

### Registration Rules & Validation
1. Event must be published (`status = 'published'`)
2. `registrationEnabled` must be true
3. `registrationType` must be 'free' (paid not yet implemented)
4. Registration window must be open (between `registrationOpensAt` and `registrationClosesAt`)
5. Event must not have already occurred
6. User must be authenticated
7. Duplicate registrations prevented (409 if already registered)
8. Capacity enforced: if at capacity with `waitlistEnabled`, user is waitlisted; if no waitlist, returns 400

### Waitlist Promotion
When a confirmed registration is canceled:
- System automatically promotes the first waitlisted registrant (by registeredAt) to confirmed
- Promoted user receives a registration confirmation email

### Public API Routes (`server/routes/registration.routes.ts`)
- `POST /api/events/:id/register` — Register authenticated user (validates all rules)
- `GET /api/events/:id/registration` — Get current user's registration (404 if none/canceled)
- `DELETE /api/events/:id/registration` — Cancel current user's registration

### Admin API Routes (`server/routes/admin/registrations.routes.ts`)
- `GET /api/admin/events/:id/registrations` — List all registrations for event
- `GET /api/admin/events/:id/registrations/csv` — Download CSV export
- `PUT /api/admin/registrations/:id/status` — Update status (confirmed/waitlisted/canceled)
- `DELETE /api/admin/registrations/:id` — Remove registration entirely

### CSV Export
- Server-side generation via admin endpoint
- Columns: Name, Email, Phone, Status, Payment Status, Registered At, Canceled At, Notes
- Filename: `registrations-{event-title}-{date}.csv`
- Proper CSV escaping for commas, quotes, newlines

### Admin Registrant Management
- Accessed from event card's Users icon button in admin events page
- Shows registrant count summary (confirmed / waitlisted / canceled)
- Per-registrant actions via dropdown: Confirm, Waitlist, Cancel, Remove
- CSV export button in sheet header

### Email Templates
- `event-registration-confirmation` — Sent on successful registration (vars: firstName, eventTitle, eventDate, eventLocation)
- `event-registration-waitlisted` — Sent when added to waitlist (vars: firstName, eventTitle, eventDate)
- `event-registration-canceled` — Sent on cancellation (vars: firstName, eventTitle)
- All templates seeded in `server/scripts/seed-email-templates.ts`
- Fallback content in `server/services/email.service.ts`
- Emails sent fire-and-forget (don't block API response)

### Public Event Detail Registration UI
- Shows contextual registration card based on state:
  - "Log in to Register" (unauthenticated)
  - "Register for This Event" (eligible, open)
  - "You're Registered" with cancel option (confirmed)
  - "You're on the Waitlist" with leave option (waitlisted)
  - "Registration Closed" (window passed)
  - "Registration Opens Soon" with date (future window)
  - "You're Registered" (no cancel, if window closed but user confirmed)

### Paid Event Registration
- Implemented in Phase 4 (see below)
- Free registration route (`POST /api/events/:id/register`) still rejects `registrationType !== 'free'` as a safety net

## Event Registration System (Phase 4 — Paid Events)

### Overview
Phase 4 extends the Phase 3 free-registration system with Stripe-backed paid event registration. Free and paid registration flows coexist cleanly using separate paths.

### Paid Registration Flow (End-to-End)
1. User opens event detail page for a `registrationType='paid'` event
2. User clicks "Register & Pay" → calls `POST /api/stripe/create-event-checkout-session`
3. Server validates event, access, registration window, capacity, duplicate prevention
4. Server creates a **pending** registration: `status='confirmed'`, `paymentStatus='pending'`
5. Server creates a Stripe Checkout Session (`mode: 'payment'`) with `metadata: { registrationId, eventId }`
6. Server stores `stripeCheckoutSessionId` on the registration record; returns `{ url }`
7. Frontend redirects user to Stripe Checkout
8. Stripe fires `checkout.session.completed` webhook on success
9. Webhook updates registration: `paymentStatus='paid'`, `amountPaid`, `paymentIntentId`; sends payment confirmation email
10. User lands on `/events/:id?checkout=success` → toast + registration shown as confirmed
11. If user abandons checkout → `checkout.session.expired` webhook → pending registration deleted

### Free vs Paid Registration Routing
- **Free events** (`registrationType='free'`): `POST /api/events/:id/register` → immediate confirmed registration (unchanged from Phase 3)
- **Paid events** (`registrationType='paid'`): `POST /api/stripe/create-event-checkout-session` → Stripe Checkout → webhook confirmation

### New Schema Field
- `stripeCheckoutSessionId: text` — added to `event_registrations` table; links the registration to its Stripe Checkout Session for webhook reconciliation

### Stripe Integration Notes
- **New endpoint**: `POST /api/stripe/create-event-checkout-session` (in `server/routes/stripe.routes.ts`)
- Uses `mode: 'payment'` (not `mode: 'subscription'` — no customer object required, uses `customer_email` pre-fill)
- `line_items` use `price_data` (inline pricing) since event fees are dynamic, not pre-created Stripe products
- `metadata` contains `registrationId` and `eventId` for webhook reconciliation
- Reuses `getUncachableStripeClient()` consistent with existing billing patterns
- Success URL: `${host}/events/${eventId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`
- Cancel URL: `${host}/events/${eventId}?checkout=canceled`
- **No separate Stripe Customer created** for event registrations (unlike therapist subscriptions)

### New Webhook Events Handled (`server/webhooks/stripe.handler.ts`)
| Event | Action |
|---|---|
| `checkout.session.completed` | Sets `paymentStatus='paid'`, `amountPaid`, `paymentIntentId`; sends payment confirmation email |
| `checkout.session.expired` | Deletes pending registration (clean up orphan) |

### Payment Status Values (`event_registrations.payment_status`)
| Value | Meaning |
|---|---|
| `not_required` | Free event registration (default) |
| `pending` | Checkout session created, payment not yet confirmed |
| `paid` | Stripe confirmed payment received |
| `refunded` | Reserved for future admin-managed refund flow |

### Duplicate Prevention
- If existing registration has `paymentStatus='pending'`, server retrieves the Stripe Checkout Session and returns its URL (user resumes same session)
- If registration is confirmed/waitlisted: 409 returned
- If registration is canceled: new checkout flow created

### Edge Cases Handled
- **User abandons checkout**: `checkout.session.expired` cleans up pending registration
- **Capacity during checkout**: Webhook confirms if capacity still available (best-effort; race condition acceptable in first phase)
- **Registration window closes during checkout**: Webhook still honors payment (user already committed)
- **Duplicate checkout attempts**: Server returns existing session URL rather than creating a second session

### Admin Payment Visibility
- Registrants sheet shows Payment Status badge (color-coded: yellow=pending, green=paid, red=failed, blue=refunded, gray=not_required)
- Amount Paid column shows formatted dollar amount from `amountPaid` (stored as cents)
- CSV export includes Payment Status and Amount Paid columns
- Admin can see full payment lifecycle without accessing Stripe dashboard

### Email: Payment Confirmation
- Template slug: `event-payment-confirmation`
- Subject: "Payment Confirmed: {{eventTitle}}"
- Variables: `firstName`, `eventTitle`, `eventDate`, `eventLocation`, `amountPaid` (formatted)
- Send function: `sendPaymentConfirmationEmail()` in `server/services/email.service.ts`
- Fired from webhook handler on `checkout.session.completed`

### Future Refund/Cancellation Groundwork
- `payment_status = 'refunded'` value already defined in schema
- `paymentIntentId` stored on registration for Stripe refund API calls
- `amountPaid` available for partial vs full refund logic
- No admin refund UI built yet — next phase should: call `stripe.refunds.create({ payment_intent: reg.paymentIntentId })`, update `paymentStatus='refunded'`
- Recommend adding `refundedAt` timestamp and `refundedBy` (admin userId) when building the refund portal

## Recording Archives (Phase 5)

### Overview
A browseable archive of past events that have a `recordingUrl`. Access is role-aware: only events the user can access appear in the archive (no URL leakage for restricted events). Available at `/recordings` in the nav under Resources → Recording Archives.

### Archive Eligibility Rules
An event appears in the archive if ALL of the following are true:
1. `status = 'published'`
2. `date < now()` (event is in the past)
3. `recordingUrl IS NOT NULL`
4. The requesting user passes `canAccessEvent()` for that event's visibility setting

### Visibility / Access Behavior
| Event Visibility | Who sees it in the archive |
|---|---|
| `public` | Everyone, including unauthenticated users |
| `members_only` | `therapist` and `client` roles only |
| `counselors_only` | `therapist` role only |
| `admins_only` | `admin` role only |

Server-side filtering at `GET /api/events/recordings` — ineligible events are excluded entirely (not redacted).

### Archive Browsing Behavior
- **Page**: `/recordings` — `client/src/features/public/recording-archives-page.tsx`
- **Layout**: responsive 3-col grid (3 desktop, 2 tablet, 1 mobile)
- **Card contents**: event title (links to event detail), date, speaker, description excerpt, "Watch Recording" button, thumbnail (event image or video placeholder icon)
- **Search**: client-side keyword filter across title, speaker name, description
- **Year filter**: dynamically populated from available event dates
- **Loading state**: skeleton cards
- **Empty state**: "No recordings found" with clear-filters button

### Playback / Modal Behavior
- **YouTube** (`youtube.com`, `youtu.be`): video ID extracted → embedded `<iframe>` in Dialog (`mode: payment`)
- **Vimeo** (`vimeo.com`, `player.vimeo.com`): video ID extracted → embedded Vimeo player `<iframe>`
- **All other URLs**: "Open Recording" button → opens in new tab with `rel="noopener noreferrer"` (no iframe for unknown sources — security boundary)
- Dialog is a full-width modal with aspect-video container

### Event-to-Archive Relationship
- Each archive entry IS an event record — no separate archive table needed
- Event detail page (`/events/:id`) recording section has a "Browse all recordings →" link pointing to `/recordings`
- Admin sets `recordingUrl` on an event via the admin events editor; once the event date passes, it automatically becomes eligible for the archive

### API Endpoint
- `GET /api/events/recordings` — uses `optionalAuth`; returns filtered list of recording-eligible events the user can access
- Defined in `server/routes/events.routes.ts` (before the `/:id` route to avoid capture)
- Storage method: `EventStorage.getRecordingEvents()` in `server/storage/event.storage.ts`

### Follow-up Recommendations
- Add a "Recording Available" email to registered attendees when admin sets a `recordingUrl` on a past event
- Consider adding archive tags/topics for filtering in Phase 7+
- Add download count or view count tracking if analytics become a priority

## Admin Workflow Tools (Phase 6)

### Attendance Tracking
- **Schema**: `attended boolean` (default false) + `checkedInAt timestamp` (nullable) added to `event_registrations` table
- **Admin UI**: Registrants sheet has per-row check-in toggle button (Square/CheckSquare icon)
- **API**: `PUT /api/admin/registrations/:id/checkin` — body `{ attended: boolean }` — updates attended + checkedInAt
- **Summary**: Registrants sheet summary line includes "X attended" count
- **CSV export**: Includes "Attended" (Yes/No) and "Checked In At" columns

### Duplicate Event
- **API**: `POST /api/admin/events/:id/duplicate`
  - Copies all fields from source event
  - Sets title to "Copy of {original title}"
  - Sets status = 'draft' (safe — doesn't publish automatically)
  - Clears: `date` (set to tomorrow as placeholder), `endDate`, `registrationOpensAt`, `registrationClosesAt`, `recordingUrl`
- **Admin UI**: "Duplicate" button (Copy icon) on each event card — shows success toast, refreshes event list

### Event Analytics Panel
- **API**: `GET /api/admin/events/:id/analytics` — returns `{ confirmed, waitlisted, canceled, attended, totalRevenueCents }`
- **Admin UI**: "Analytics" button (BarChart icon) on each event card → popover showing confirmed/waitlisted/attended counts + revenue (paid events only)
- **Capacity display**: When event has `capacity` set, event card shows "X / Y seats" badge using confirmed count

### Bulk Notifications
- **API**: `POST /api/admin/events/:id/notify` — body `{ type: 'reminder' | 'recording' }`
  - `reminder`: sends event-reminder email to all confirmed registrants (fire-and-forget)
  - `recording`: sends event-recording-available email to all confirmed registrants (requires `recordingUrl` to be set)
  - Returns `{ sent: number, message: string }`
- **Admin UI**: 
  - "Send Reminder" button (Bell icon) — shown on upcoming events (date > now)
  - "Notify Recording" button — shown on past events that have `recordingUrl` set

### Event Cancellation Cascade
- When admin updates event status to 'canceled' via `PUT /api/admin/events/:id`:
  - All active registrations (confirmed + waitlisted) are updated to canceled via `cancelAllActiveRegistrations(eventId)`
  - `sendEventCanceledEmail` is sent to each previously confirmed registrant (fire-and-forget)
  - Count of affected registrations is logged

### New Email Templates (Phase 6)
| Template Slug | Trigger | Variables |
|---|---|---|
| `event-reminder` | Admin bulk notify (type=reminder) | firstName, eventTitle, eventDate, eventLocation |
| `event-recording-available` | Admin bulk notify (type=recording) | firstName, eventTitle, recordingUrl |
| `event-canceled` | Event status set to canceled | firstName, eventTitle |

All templates seeded in `server/scripts/seed-email-templates.ts` with fallback content in `server/services/email.service.ts`.

### New Storage Methods (Phase 6)
- `checkInRegistration(id, attended)` — toggles attended + checkedInAt
- `getEventAnalytics(eventId)` — aggregates counts and revenue
- `cancelAllActiveRegistrations(eventId)` — bulk cancel for event cancellation cascade
- `getConfirmedRegistrations(eventId)` — fetch confirmed registrants for bulk notify

### New Admin API Routes (Phase 6)
| Route | Purpose |
|---|---|
| `PUT /api/admin/registrations/:id/checkin` | Check-in a registrant |
| `GET /api/admin/events/:id/analytics` | Per-event analytics summary |
| `POST /api/admin/events/:id/duplicate` | Create draft copy of event |
| `POST /api/admin/events/:id/notify` | Send bulk notification to confirmed registrants |

### Future Recommendations
- Add scheduled reminder sending (cron job N days before event)
- Add self-service refund portal for paid event cancellations
- Add "no-show" tracking separate from "not checked in"
- Add a check-in QR code / link for in-person events
- Consider attendance analytics chart on admin dashboard

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

## Growth Readiness Foundations (Phase 8)

### New Tables
- **`profile_views`** — Tracks therapist profile view events (profileId, viewerId nullable for anonymous, source, createdAt). Indexes: profile_id, profile_date composite, viewer_id.
- **`saved_counselors`** — Favorites/bookmarks join table (userId, profileId, createdAt). Unique constraint on (userId, profileId). Indexes: user_id, profile_id.

### New Columns
- **`therapist_profiles.featuredUntil`** (timestamp, nullable) — Time-limited promoted listings. Enables expiring featured status without manual admin intervention.
- **`conversations.lastMessageAt`** (timestamp, nullable) — Denormalized timestamp for efficient conversation sorting without joining to messages table. Index: idx_conv_last_message.

### New Storage Classes
- **`ProfileViewStorage`** (`server/storage/profile-view.storage.ts`) — `record()`, `countByProfile()`, `getRecentByProfile()`, `getViewCountsByProfile()` (total/7d/30d aggregates using SQL FILTER).
- **`SavedCounselorStorage`** (`server/storage/saved-counselor.storage.ts`) — `save()` (with ON CONFLICT DO NOTHING), `unsave()`, `listByUser()`, `isSaved()`.
- Both registered in `server/storage/index.ts` as `storage.profileViews` and `storage.savedCounselors`.

### Schema Index Updated
- `shared/schema/index.ts` exports `profileViews`, `savedCounselors`, `ProfileView`, `SavedCounselor` types.

### Files Changed
- `shared/schema/profile-views.ts` — NEW: profile views table
- `shared/schema/saved-counselors.ts` — NEW: saved counselors table
- `shared/schema/therapist-profiles.ts` — Added `featuredUntil` column
- `shared/schema/direct-messages.ts` — Added `lastMessageAt` column + index
- `shared/schema/index.ts` — New exports
- `server/storage/profile-view.storage.ts` — NEW: profile view storage
- `server/storage/saved-counselor.storage.ts` — NEW: saved counselor storage
- `server/storage/index.ts` — Registered new storage classes

### Recommended Next Product Builds
1. **Therapist Analytics Dashboard** — Wire `storage.profileViews.record()` into the directory profile view route, build a therapist-facing analytics view using `getViewCountsByProfile()`.
2. **Save/Favorite Counselors** — Add REST endpoints for save/unsave/list, add heart icon to therapist cards and profile page.
3. **Time-Limited Promotions** — Admin UI to set `featuredUntil` on profiles, update directory query to check `featuredUntil > now()` alongside `isFeatured`.
4. **Conversation Sorting** — Update message send logic to set `lastMessageAt`, sort conversation list by it instead of `updatedAt`.
5. **Geo-Aware Ranking** — Latitude/longitude already exist on profiles; add a Haversine distance query to directory search, allow "sort by distance" when user provides location.
6. **Onboarding Funnel** — Track profile completeness via existing fields (bio, specializations, credentials, photo) and surface a progress indicator on the therapist dashboard.

## End-of-Day Quality Pass (Phase 9)

### Validation Results
- TypeScript typecheck: **0 errors**
- Vite production build: **passes** (14 lazy-loaded chunks + main bundle)
- All public API endpoints: **200 OK** (directory, events, specializations, featured, filters)
- Auth flow: **working** (401 unauthenticated, 200 login)
- Contact form validation: **working** (400 on invalid data)
- Health endpoints: **ready** (DB connected)
- No browser console errors

### Bugs Fixed
- **9 silent `.catch(() => {})` calls replaced with structured logger warnings** across:
  - `server/routes/admin/therapists.routes.ts` (3 catches: approval email on create, approval email, rejection email)
  - `server/routes/admin/users.routes.ts` (2 catches: welcome email, password reset email)
  - `server/routes/auth.routes.ts` (3 catches: therapist registration notification, client registration notification, password reset email)
  - `server/routes/contact.routes.ts` (1 catch: contact form notification)
- These were leftover from the Phase 5 route split — Phase 6 added structured logging to email.service.ts but missed the route-level catch handlers

### Code Debt Cleaned
- All email send failures across the entire codebase now log warnings with error context via `logger.email.warn()`
- Zero silent `.catch(() => {})` calls remain in the server codebase

### Remaining Risks
- `tiers.routes.ts` and `events.routes.ts` admin POST/PUT routes do not use Zod schema validation on request bodies (pre-existing, not from recent phases)
- Messages page chunk is 385KB (rich text editor); could benefit from vendor chunk splitting
- No automated test suite configured

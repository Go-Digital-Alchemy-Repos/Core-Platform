# TCK Wellness — Therapist Directory & Subscription Platform

## Overview
A BetterHelp-style therapist directory and subscription platform where TCK-informed therapists subscribe to appear in a searchable public directory. Features custom JWT authentication, OpenStreetMap/Leaflet maps, Stripe subscriptions, and a full admin dashboard.

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
client/src/components/ — Shared UI (layout, directory, shared)
client/src/features/  — Feature pages (auth, public, directory, therapist, admin)
client/src/hooks/     — Custom hooks (useAuth, useToast)
client/src/lib/       — Utilities (queryClient, constants)
```

### Database Tables
- `users` — User accounts (admin/therapist/client roles)
- `therapist_profiles` — Therapist profile data with location, specializations
- `membership_tiers` — Subscription pricing tiers (Basic/Professional/Premium)
- `therapist_subscriptions` — Active subscriptions linked to Stripe
- `events` — Platform events (virtual/in-person)
- `contact_messages` — Contact form submissions
- `docs` — Admin documentation library (markdown)

### Authentication
- Custom JWT (not Replit Auth, not Better Auth)
- HTTP-only cookie named `tck_token`
- Uses `SESSION_SECRET` env var for signing
- Three roles: admin, therapist, client

### Brand Colors (HSL)
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
- `/directory` — Therapist directory (list + map)
- `/directory/:id` — Therapist profile
- `/events` — Public events
- `/auth/login`, `/auth/register` — Authentication
- `/therapist` — Therapist dashboard (protected)
- `/admin` — Admin dashboard (protected)

## API Endpoints
- `POST /api/auth/register|login|logout`, `GET /api/auth/me`
- `GET /api/therapists`, `GET /api/therapists/:id`
- `GET/PUT /api/therapist/profile`, `GET /api/therapist/subscription`
- `POST /api/stripe/create-checkout-session|create-portal-session`
- `GET /api/admin/dashboard-stats|therapists|users|membership-tiers|events|messages`
- `CRUD /api/admin/docs`
- `GET /api/events`, `GET /api/membership-tiers`, `POST /api/contact`

## Running
- `npm run dev` — Development (Express + Vite)
- `npm run db:push` — Push schema to PostgreSQL
- `npx tsx server/scripts/seed.ts` — Seed test data

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — JWT signing secret
- Stripe credentials via Replit integration

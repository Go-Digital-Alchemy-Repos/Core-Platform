# Core Platform — Architecture Overview

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + TypeScript | Vite bundler, SPA with route-level code splitting via `React.lazy()` |
| Routing (client) | wouter | Lightweight alternative to React Router |
| State / Data | TanStack Query v5 | Global defaults: `staleTime: 5min`, `gcTime: 10min` |
| UI Framework | shadcn/ui + Tailwind CSS | Dark mode via class strategy, theme presets system |
| Backend | Express 5 (TypeScript) | Runs on Node.js with HTTP server |
| ORM | Drizzle ORM | PostgreSQL driver via `@neondatabase/serverless` |
| Database | PostgreSQL | Hosted on Neon (serverless), 45+ B-tree indexes |
| Auth | JWT (HTTP-only cookies) | `bcryptjs` for password hashing, 7-day token expiry |
| Payments | Stripe | Subscriptions, webhook handling, recording purchases |
| File Storage | Cloudflare R2 | For media uploads (images, recordings) |
| Email | Custom email service | Template-based with `email.service.ts` |
| Logging | Pino | Structured logging with named sources and request IDs |
| Security | Helmet, rate limiting, origin checking | CSP headers, per-endpoint rate limits |

## Folder Structure

```
├── client/
│   └── src/
│       ├── App.tsx                  # Main router with lazy-loaded pages
│       ├── components/
│       │   ├── auth/                # Login/register dialogs
│       │   ├── directory/           # Directory-specific components
│       │   ├── layout/              # Site layout components
│       │   ├── shared/              # Shared components (editors, SEO, theme)
│       │   └── ui/                  # shadcn/ui primitives
│       ├── features/
│       │   ├── admin/               # Admin dashboard, CMS, blog, applications
│       │   ├── auth/                # Auth pages (login, register, reset)
│       │   ├── directory/           # Therapist directory and profile pages
│       │   ├── public/              # Public pages (home, about, events, insights)
│       │   └── therapist/           # Therapist dashboard, profile edit, subscription
│       ├── hooks/                   # Custom React hooks
│       └── lib/                     # Utilities, query client, theme presets
├── server/
│   ├── index.ts                     # Express app bootstrap, middleware pipeline
│   ├── db.ts                        # Drizzle database connection
│   ├── migrate.ts                   # Production migration runner
│   ├── middleware/
│   │   ├── auth.ts                  # JWT auth, role-based access
│   │   ├── security.ts              # Helmet, rate limiters, origin check
│   │   ├── error-handler.ts         # Error handling, async wrapper
│   │   └── validation.ts            # Request body validation middleware
│   ├── routes/
│   │   ├── index.ts                 # Route registration hub
│   │   ├── admin/                   # Admin-only routes (18 files)
│   │   ├── directory.routes.ts      # Public therapist directory
│   │   ├── auth.routes.ts           # Login, register, password reset
│   │   ├── stripe.routes.ts         # Stripe checkout/portal/webhooks
│   │   ├── application.routes.ts    # Therapist application flow
│   │   └── ...                      # Events, blog, CMS, contacts, etc.
│   ├── services/
│   │   ├── email.service.ts         # Email template rendering and sending
│   │   ├── r2.service.ts            # Cloudflare R2 file operations
│   │   ├── background-check.service.ts
│   │   └── scheduled-publish.service.ts
│   ├── storage/                     # Data access layer (28 storage files)
│   │   ├── index.ts                 # Storage facade aggregating all stores
│   │   ├── therapist.storage.ts     # Therapist profiles with pagination/filtering
│   │   ├── application.storage.ts   # Provider application workflow
│   │   └── ...
│   ├── utils/
│   │   ├── logger.ts                # Pino-based structured logger
│   │   ├── metrics.ts               # In-memory request metrics
│   │   └── params.ts                # Express param helpers
│   └── webhooks/
│       └── stripe.handler.ts        # Stripe webhook event processing
├── shared/
│   ├── schema/                      # Drizzle table definitions (30 files)
│   │   ├── index.ts                 # Re-exports all schemas
│   │   ├── users.ts
│   │   ├── therapist-profiles.ts
│   │   ├── provider-applications.ts # Multi-step application workflow
│   │   └── ...
│   └── types/
│       ├── index.ts                 # Shared TypeScript types and enums
│       └── directory.ts             # Directory search params schema
└── docs/                            # Developer documentation (this folder)
```

## Data Flow

1. **Client → Server**: React components use TanStack Query to make HTTP requests to `/api/*` endpoints. Mutations use `apiRequest()` from `queryClient.ts`.

2. **Server → Storage**: Express route handlers call methods on the `storage` facade (`server/storage/index.ts`), which delegates to domain-specific storage classes.

3. **Storage → Database**: Storage classes use Drizzle ORM query builders to interact with PostgreSQL. All table definitions live in `shared/schema/`.

4. **Auth Flow**: JWT tokens are stored in HTTP-only cookies (`corePlatform_token`). The `authenticateToken` middleware verifies tokens and attaches the user to `req.user`. Role-based access is enforced via `requireRole()`.

5. **File Uploads**: Files are uploaded to Cloudflare R2 via `r2.service.ts`. The upload route handles multipart form data and returns the R2 URL.

6. **Payments**: Stripe handles subscriptions and one-time purchases. Webhook events are processed by `stripe.handler.ts` to update local subscription records.

7. **CMS**: A hybrid rendering system allows pages to be served from the CMS block builder or fall back to hardcoded React components. The `CmsHybridPage` component checks for CMS content first.

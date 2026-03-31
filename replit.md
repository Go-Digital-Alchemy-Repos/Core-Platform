# TCK Wellness — Counselor Directory & Subscription Platform

## Overview
TCK Wellness is a platform designed to connect Third Culture Kids (TCKs) with specialized mental health counselors. It aims to provide essential mental health support to the TCK community through features such as a searchable counselor directory, custom authentication, map integration, subscription management, and a comprehensive admin dashboard.

## User Preferences
- All visible text uses "Counselor"/"Counselors" throughout the UI (navbar, footer, home, directory, admin, auth pages).
- Code identifiers, API routes (`/api/therapist/*`, `/api/therapists`), DB columns, and role values (`"therapist"`) remain unchanged.

## System Architecture

### UI/UX Decisions
- **Consistent Terminology**: "Counselor"/"Counselors" is used across all UI.
- **Component Library**: `shadcn/ui` with Tailwind CSS for a responsive design.
- **Responsive Design**: Custom breakpoints (xs=480px, sm=640px, md=768px, lg=1024px, xl=1280px).
- **Form/Detail Popups**: `Sheet` components for forms and details; `AlertDialog` for confirmations.
- **Branding**: Defined color palette (Navy, Sage, Copper, Teal).
- **Fonts**: EB Garamond for headings, Nunito for body text.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, Wouter, TanStack Query v5.
- **Backend**: Express.js, TypeScript.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Custom JWT with `bcryptjs` and HTTP-only cookies, supporting admin, therapist, and client roles.
- **Core Features**:
    - **Counselor Directory**: Searchable profiles with multi-select specialization filtering, map integration, and toggle filters for "Accepting Clients" and "Willing to Travel".
    - **Subscription Management**: Stripe integration for counselor memberships.
    - **Event Management**: Creation, management, and display of virtual, in-person, and hybrid events with registration and notifications. Admin event editor uses a full-page tabbed drawer with tabs for Details, Registrants, Video Archive, and Recurring Events. Recurring event fields: `isRecurring`, `recurrencePattern` (daily/weekly/biweekly/monthly/quarterly/yearly/custom), `recurrenceInterval`, `recurrenceDaysOfWeek`, `recurrenceEndDate`, `recurrenceCount`, `parentEventId`.
    - **Recording Archives**: Role-aware video archives for past event recordings. Admins toggle `showInArchives` per event, set access as `free` or `paid` (one-time Stripe purchase), and set a price in cents. Paid recording URLs are server-redacted for non-purchasers. Purchases tracked in `recording_purchases` table with permanent access. Hidden from client-role users.
    - **Admin Dashboard**: Comprehensive management for users, memberships, events, content, and system settings.
    - **Contact Professional**: Visitors can email counselors directly from their profile page via an inline form (name, email, message). No account required. Emails are sent to the professional's account email via the configured email provider (Mailgun/SMTP). Rate-limited endpoint at `POST /api/contact-professional`.
    - **Registration Consent**: Registration form includes two required acknowledgment checkboxes: age verification (18+) and PHI/HIPAA disclaimer. Registration page supports `redirectTo` query param for post-registration redirect.
    - **Notifications**: In-app notification system with user preferences.
    - **CMS**: Nondestructive, block-based page builder for public-facing pages, with revision history and SEO fields. Includes 16 block types and media management via Cloudflare R2.
    - **Reusable CMS Sections**: A library of saved block groups for efficient page building.
    - **Blog Integration**: Blog management is integrated into the CMS admin, with enhanced editor and SEO fields. Supports three post types: Article (traditional), Podcast (with podcast URL and player), and External Article (opens in new tab from blog grid). Schema fields: `postType` ("article"|"podcast"|"external"), `podcastUrl`, `externalUrl`.
    - **Provider Application System**: Comprehensive 7-step wizard for counselor membership applications with autosave and resume capability. Steps: Before You Begin, Contact Info, Professional Info (with credential management), TCK Questions, References (exactly 3), Accessibility & Pricing, Terms & Conditions (with e-signature). Uses `formData` (JSONB) and `currentStep` columns on `provider_applications` for draft persistence. Credentials and references stored in dedicated tables with add/delete support. Autosave triggers 1s after field changes. Server validates: draft-only modification, credential/reference counts, terms acceptance, and e-signature before submission. Admin application management with status workflow (draft → submitted → background check → references → interview → approved/denied). Timeline tracking, credential verification, reference management, background checks, and interview scheduling. Dashboard banner dynamically reflects application status.
    - **Hybrid Page Rendering**: Public routes can render either hardcoded React components or published CMS content, with fallback mechanisms.
    - **CMS SEO Foundation**: Global SEO settings stored in a dedicated `seo_settings` table. Admin UI for configuration with R2-backed image upload.
    - **Per-Page & Per-Post SEO Controls**: CMS pages and blog posts have full SEO editing with fields like `seoTitle`, `seoDescription`, `ogImageUrl`, `canonicalUrl`, and `noindex` toggle. Includes live `SeoPreview` card.
    - **Structured Data / JSON-LD**: Modular JSON-LD generation engine supporting various schema types (Organization, WebSite, BreadcrumbList, Article, Event, VideoObject, FAQPage), injected client-side.
    - **Technical SEO Tools**: Admin tabs for SEO Audit, Redirects Manager (301/302 redirects applied server-side), and Sitemap (`/sitemap.xml`) with a generated `robots.txt` endpoint.
    - **SEO Polish / Editorial UX**: Enhanced `SeoPreview` with live character counters (`TitleMeter`, `DescMeter`) and a `StructuredDataStatus` component showing schema checklist and completeness.

### System Design Choices
- **Modular File Structure**: Backend organized by concern, frontend by feature.
- **Separation of Concerns**: Clear distinction between frontend and backend via API endpoints.
- **Structured Logging**: Implements a structured logger with named sources and request IDs.
- **Performance Optimization**: Frontend route-level lazy loading and strategic React Query cache configuration.
- **Database Indexing & FK Constraints**: Extensive B-tree and GIN indexes, and foreign key constraints.
- **CMS Content Structure**: Block content stored as JSON, supporting typed block definitions.
- **CMS Publishing Workflow**: Admin control over publishing/unpublishing CMS pages and blog posts, with revision history and restore functionality.
- **SEO Integration**: Dynamic setting of meta tags for public CMS pages and blog posts.

### Deployment (Railway)
- **railway.toml**: Configures build command (`npm run build`), start command (`npm start`), healthcheck (`/api/health`), and restart policy.
- **Trust Proxy**: Express configured with `trust proxy: 1` for correct client IP detection behind Railway's reverse proxy (needed for rate limiting).
- **Database SSL**: Production database connections automatically enable SSL unless the `DATABASE_URL` already includes `sslmode=`.
- **Vite Plugins**: Replit-specific Vite plugins are conditionally loaded only when `REPL_ID` is present, so builds work cleanly on Railway.
- **Server Bundle**: esbuild bundles all server dependencies into a single `dist/index.cjs` for a self-contained production artifact.
- **Auto-Migrations**: On production startup, the server automatically runs Drizzle ORM migrations from `dist/migrations/` before accepting requests. The build script copies the `migrations/` folder into `dist/`. Use `npx drizzle-kit generate` locally after schema changes to create new migration files.
- **First-Visit Admin Setup**: When no admin user exists (fresh database), all routes redirect to `/setup` where the initial admin account can be created. Optionally secured with a `SETUP_TOKEN` env var.
- **Required Environment Variables on Railway**: `DATABASE_URL`, `SESSION_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, plus any other service-specific keys (Mailgun, R2, etc.). Optionally set `APP_URL` and `TRUSTED_ORIGINS` for origin checking, and `SETUP_TOKEN` for securing initial admin setup.

## External Dependencies
- **Stripe**: Subscription processing and paid event registrations.
- **OpenStreetMap & Leaflet**: Geographical mapping.
- **Mailgun / Nodemailer**: Transactional email services.
- **Cloudflare R2**: S3-compatible object storage for media assets.
- **Zod**: Schema validation.
- **bcryptjs**: Password hashing.
- **JWT (JSON Web Tokens)**: Custom authentication.
- **Helmet**: Security middleware.
- **express-rate-limit**: API rate limiting.
- **Wouter**: Lightweight React router.
- **TanStack Query**: Data fetching and caching for React.
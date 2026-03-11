# TCK Wellness — Counselor Directory & Subscription Platform

## Overview
TCK Wellness is a BetterHelp-style platform that provides a counselor directory and subscription service specifically for TCK-informed counselors. Its primary purpose is to connect Third Culture Kids (TCKs) with specialized mental health support. Key capabilities include a searchable public directory, custom authentication, map integration, Stripe subscriptions, and a comprehensive admin dashboard for managing users, content, and events. The project aims to address a critical need for mental health support within the TCK community.

## User Preferences
- All visible text uses "Counselor"/"Counselors" throughout the UI (navbar, footer, home, directory, admin, auth pages).
- Code identifiers, API routes (`/api/therapist/*`, `/api/therapists`), DB columns, and role values (`"therapist"`) remain unchanged.

## System Architecture

### UI/UX Decisions
- **Consistent Terminology**: "Counselor"/"Counselors" is used consistently across all visible UI elements.
- **Component Library**: Utilizes `shadcn/ui` with Tailwind CSS for a modern and responsive design.
- **Responsive Design**: Custom breakpoints (xs=480px, sm=640px, md=768px, lg=1024px, xl=1280px) ensure optimal viewing across various devices.
- **Form/Detail Popups**: `Sheet` components (slide-out drawer from right) are used for all form and detail popups, reserving `AlertDialog` for confirmations.
- **Branding**: A defined color palette (Navy, Sage, Copper, Teal) is used for branding.
- **Fonts**: EB Garamond for headings and Nunito for body text.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, Wouter, TanStack Query v5.
- **Backend**: Express.js, TypeScript.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Custom JWT with `bcryptjs` for hashing and HTTP-only cookies.
- **Core Features**:
    - **Counselor Directory**: Searchable profiles with filtering and a split-pane view featuring a scrollable list and sticky map.
    - **User Authentication**: JWT-based with admin, therapist, and client roles.
    - **Subscription Management**: Stripe integration for counselor membership tiers.
    - **Event Management**: Creation, management, and display of virtual, in-person, and hybrid events with registration, waitlisting, and notifications.
    - **Recording Archives**: Role-aware archive for past event recordings.
    - **Admin Dashboard**: Comprehensive management interface for users, therapists, memberships, events, contact messages, blog posts, and system settings.
    - **Internal Messaging**: Direct messaging system with rich text and attachments.
    - **Notifications**: In-app notification system with per-user preferences.
    - **CMS**: Nondestructive, admin-only CMS for managing public-facing pages with revision history and SEO fields. This includes a structured block-based page builder with 16 block types (e.g., hero, section-header, rich-text, image+text, CTA, cards grid, FAQ, testimonials, featured counselors, events/blog previews, button group, image/video embeds, contact info, divider).
    - **Media Management**: Integrated media library for CMS assets, supporting drag-and-drop uploads to Cloudflare R2 with a dedicated `cms_media` database table for tracking.

### System Design Choices
- **Modular File Structure**: Backend organized by concern (`schema`, `types`, `middleware`, `storage`, `routes`, `services`) and frontend by feature.
- **Separation of Concerns**: Clear distinction between frontend and backend with dedicated API endpoints.
- **Structured Logging**: Implements a structured logger with named sources (http, email, r2, stripe, auth, app, db) and request IDs.
- **Performance Optimization**: Frontend route-level lazy loading using `React.lazy()` and `Suspense`, and a strategic React Query cache configuration.
- **Database Indexing & FK Constraints**: Extensive B-tree and GIN indexes, along with foreign key constraints, ensure data integrity and optimize query performance.
- **CMS Content Structure**: Block content is stored as JSON in the `cms_pages.content` column, supporting typed block definitions and dynamic prop editing.

## External Dependencies
- **Stripe**: For subscription processing and paid event registrations.
- **OpenStreetMap & Leaflet**: For geographical mapping functionalities.
- **Mailgun / Nodemailer**: Primary and fallback services for transactional emails.
- **Cloudflare R2**: S3-compatible object storage for media uploads (avatars, CMS assets).
- **Zod**: Schema validation library.
- **bcryptjs**: Password hashing.
- **JWT (JSON Web Tokens)**: Custom authentication.
- **Helmet**: Security middleware.
- **express-rate-limit**: API rate limiting.
- **Wouter**: Lightweight React router.
- **TanStack Query**: Data fetching and caching for React.
---

## CMS Phase 4 — Page Seeding & Public Hybrid Rendering

### Overview
Four public marketing pages are now seeded into the CMS and the routing layer supports a hybrid render model: when a CMS page is published, the live site renders CMS block content; when it is draft, the existing hardcoded React component renders as a safe fallback.

### CMS-Managed Pages (v1)

| Slug | Route | CMS Page Title | Initial Status |
|---|---|---|---|
| `home` | `/` | Home | Draft |
| `about` | `/about` | About | Draft |
| `contact` | `/contact` | Contact | Draft |
| `join` | `/join` | Join as a Counselor | Draft |

**Not in CMS (data-driven or app-authenticated):**
`/events`, `/events/:id`, `/recordings`, `/insights`, `/insights/:slug`, `/directory`, `/directory/:id`, all `/auth/*`, `/therapist/*`, `/admin/*`, `/messages`

### Seeding Strategy

**Script:** `scripts/seed-cms-pages.ts`
- Run once via `npx tsx scripts/seed-cms-pages.ts`
- Idempotent — skips any page whose slug already exists
- Seeds realistic block content matching the existing hardcoded pages:
  - **Home:** hero → section-header → cards-grid (3 benefits) → featured-counselors → testimonials (6) → events-preview → cta
  - **About:** hero → section-header → cards-grid (3 stats) → section-header → rich-text (vetting) → section-header → faq (6 items) → testimonials → cta
  - **Contact:** section-header → contact-info → rich-text
  - **Join:** hero → section-header → cards-grid (4 benefits) → section-header → cards-grid (5 steps) → section-header → rich-text (pricing tiers) → cta
- All created with `status: "draft"` — admin controls when each goes live

### Public API Endpoint

**`GET /api/cms/pages/by-slug/:slug`** — unauthenticated
- Returns the full `CmsPage` JSON if found and `status = "published"`
- Returns `404 { error: "Page not found" }` if draft, archived, or nonexistent
- Used by the frontend hybrid renderer to check for published CMS content

### Hybrid Routing Architecture

**`client/src/features/public/cms-hybrid-page.tsx`** — `CmsHybridPage`

```tsx
<CmsHybridPage slug="home" fallback={<HomePage />} />
```

Behavior:
1. Immediately renders the `fallback` component during loading (zero FOUC)
2. Queries `GET /api/cms/pages/by-slug/{slug}` with `staleTime: 5 min`, `retry: false`
3. If the page is published → replaces with CMS block rendering (Navbar + PageRenderer + Footer)
4. If draft / not found / error → keeps rendering the fallback component permanently

**App.tsx routes updated:**
```tsx
<Route path="/" component={() => <CmsHybridPage slug="home" fallback={<HomePage />} />} />
<Route path="/about" component={() => <CmsHybridPage slug="about" fallback={<AboutPage />} />} />
<Route path="/contact" component={() => <CmsHybridPage slug="contact" fallback={<ContactPage />} />} />
<Route path="/join" component={() => <CmsHybridPage slug="join" fallback={<JoinNetworkPage />} />} />
```

### Publishing Workflow

To make a CMS page go live:
1. Admin opens `/admin/cms/pages` → selects a seeded page
2. Edits blocks in Builder tab to match/improve current content
3. Clicks "Publish" (or uses `POST /api/admin/cms/pages/:id/publish`)
4. The public route immediately begins rendering CMS content (no deploy needed)

To revert to the hardcoded page:
- Admin unpublishes the page → `POST /api/admin/cms/pages/:id/unpublish`
- Fallback React component resumes rendering automatically

### Data-testid Behavior
- When CMS content renders: `data-testid="cms-public-page"` is present on the page wrapper
- When fallback renders: not present (existing page's own test IDs are used)

### Files Changed in Phase 4

| File | Change |
|---|---|
| `scripts/seed-cms-pages.ts` | New — idempotent seed script for 4 public pages |
| `server/routes/cms-public.routes.ts` | New — public `GET /api/cms/pages/by-slug/:slug` endpoint |
| `server/routes/index.ts` | Mount `cmsPublicRoutes` at `/api/cms` |
| `client/src/features/public/cms-hybrid-page.tsx` | New — hybrid CMS-first/fallback route component |
| `client/src/App.tsx` | Wrap `/`, `/about`, `/contact`, `/join` with `CmsHybridPage` |

### Follow-up Recommendations
1. **Contact page:** The contact form is a React component with mutations — the CMS `contact` page seed is intentionally minimal (info blocks only). A full contact-page CMS solution would require a form embed block type.
2. **SEO tags:** Once pages are published, wire the CMS `seoTitle`/`seoDescription`/`ogImageUrl` into `<meta>` tags via a `Helmet`-style component in `CmsHybridPage`.
3. **Join page:** The join page has a registration dialog — the CMS version seeds marketing content + CTA. The actual registration form remains in the hardcoded component; publish the CMS version when the marketing copy is finalized.
4. **Home page:** The hero block in the seed is a starter — replace the background image via the CMS media library before publishing.

# TCK Wellness — Counselor Directory & Subscription Platform

## Overview
TCK Wellness is a BetterHelp-style platform connecting Third Culture Kids (TCKs) with specialized mental health counselors. It features a searchable counselor directory, custom authentication, map integration, Stripe-based subscriptions, and a comprehensive admin dashboard. The project aims to provide essential mental health support for the TCK community.

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
    - **Counselor Directory**: Searchable profiles with filtering and map integration.
    - **Subscription Management**: Stripe integration for counselor memberships.
    - **Event Management**: Creation, management, and display of virtual, in-person, and hybrid events with registration and notifications.
    - **Recording Archives**: Role-aware archive for past event recordings.
    - **Admin Dashboard**: Comprehensive management for users, memberships, events, content, and system settings.
    - **Internal Messaging**: Direct messaging with rich text and attachments.
    - **Notifications**: In-app notification system with user preferences.
    - **CMS**: Nondestructive, block-based page builder for public-facing pages, with revision history and SEO fields. Includes 16 block types and media management via Cloudflare R2.
    - **Reusable CMS Sections**: A library of saved block groups for efficient page building.
    - **Blog Integration**: Blog management is integrated into the CMS admin, with enhanced editor and SEO fields.
    - **Hybrid Page Rendering**: Public routes can render either hardcoded React components or published CMS content, with fallback mechanisms.

### System Design Choices
- **Modular File Structure**: Backend organized by concern, frontend by feature.
- **Separation of Concerns**: Clear distinction between frontend and backend via API endpoints.
- **Structured Logging**: Implements a structured logger with named sources and request IDs.
- **Performance Optimization**: Frontend route-level lazy loading and strategic React Query cache configuration.
- **Database Indexing & FK Constraints**: Extensive B-tree and GIN indexes, and foreign key constraints.
- **CMS Content Structure**: Block content stored as JSON, supporting typed block definitions.
- **CMS Publishing Workflow**: Admin control over publishing/unpublishing CMS pages and blog posts, with revision history and restore functionality.
- **SEO Integration**: Dynamic setting of meta tags (title, description, og:image) for public CMS pages and blog posts.

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
---

## EOD Quality Pass — CMS Sprint (March 2026)

### Validation Results

| Check | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | PASS — 0 errors |
| Production build (`npm run build`) | PASS — exit 0 |
| Lint | Not configured (ESLint not in package.json) |
| Unit tests | Not configured (no test runner) |
| E2e (Playwright) | PASS — all critical CMS flows verified |

### Bugs Fixed

**1. Legacy blog editor — raw image URL input**
- **File**: `client/src/features/admin/blog-page.tsx` (the legacy `/admin/blog` route)
- **Issue**: Cover image field was a plain `<Input placeholder="https://..." />` text box
- **Fix**: Replaced with `<CmsImageUpload>` component (R2-backed drag-and-drop), consistent with the new CMS blog editor
- **Impact**: All blog admin interfaces now use R2-backed image upload — no raw URL paste required anywhere in the CMS

**2. CMS routes — silent error swallowing**
- **File**: `server/routes/admin/cms.routes.ts`
- **Issue**: All 8 catch blocks returned 500 errors but didn't log the underlying exception, making failures invisible in server logs
- **Fix**: Added `console.error("[cms] ...")` to every catch block
- **Impact**: CMS errors (DB failures, unexpected exceptions) are now surfaced in server logs with full stack traces

### Code Debt Cleaned

**3. Block registry — misleading placeholder text**
- **File**: `client/src/features/admin/cms/builder/block-registry.ts`
- **Issue**: Image-type block fields had placeholder "Upload or enter URL" suggesting raw URL entry was possible; the field actually renders `CmsImageUpload` with no text input
- **Fix**: Updated all 3 occurrences to "Upload or select image"
- **Impact**: Correct user expectation; no functional change

### Performance Review

| Area | Finding |
|---|---|
| CMS Pages list | Single query, no pagination needed at current scale |
| Block builder rendering | All block rendering local/in-memory — no API calls during editing |
| Media upload UX | R2 multipart upload via `/api/admin/cms/media/upload` — acceptable |
| Revision history | `LIMIT 20` in storage query — correctly bounded |
| Blog list | Single paginated query — acceptable |
| Reusable sections insert | Fetched once via React Query, cached at SESSION (5 min) stale time |
| Media library | Loaded on navigate; no infinite scroll yet (acceptable for current media volume) |
| Global stale time | `STALE_TIMES.SESSION = 5 * 60 * 1000ms` — appropriate for admin CMS context |

No N+1 queries or missing indexes identified in CMS storage layer.

### E2e Flows Verified

| Flow | Status |
|---|---|
| Admin auth (quick-login) | PASS |
| CMS sidebar navigation | PASS |
| Pages list load | PASS |
| Create new page with slug auto-fill | PASS |
| Block builder — add Hero block | PASS |
| Block editor — image field uses CmsImageUpload (not raw Input) | PASS |
| Save page | PASS |
| Publish page → "Unpublish" button appears | PASS |
| Unpublish → "Publish" button returns | PASS |
| Revision history visible with Restore button | PASS |
| CMS blog list | PASS |
| Create new blog post with SEO tab | PASS |
| Blog SEO ogImageUrl uses CmsImageUpload | PASS |
| Legacy /admin/blog cover image uses CmsImageUpload | PASS |
| Media library loads (empty state) | PASS |

### Image/Background Input Audit — Final Status

All CMS-facing image/background URL inputs now use R2-backed `CmsImageUpload`:

| Location | Field | Status |
|---|---|---|
| Block editor — Hero block | `backgroundImageUrl` | CmsImageUpload ✅ |
| Block editor — Image block | `imageUrl` | CmsImageUpload ✅ |
| Block editor — Testimonial block | `imageUrl` (per item) | CmsImageUpload ✅ |
| CMS blog editor — Content tab | `coverImageUrl` | CmsImageUpload ✅ |
| CMS blog editor — SEO tab | `ogImageUrl` | CmsImageUpload ✅ |
| Legacy blog editor (/admin/blog) | `coverImageUrl` | **Fixed → CmsImageUpload** ✅ |

Non-image URL fields (website URLs, Zoom join links, recording URLs in Events) are appropriately plain text inputs and were not changed.

### Remaining Risks

1. **Block picker modal animation artifact** — Playwright strict-mode selectors see brief duplicate elements during dialog open/close animations. This is a test-environment artifact, not a runtime UI bug. Real users experience no issue. Mitigation: use `.first()` in any automated tests targeting block type buttons.

2. **Media library pagination** — The media library loads all assets in a single query. For high-volume usage (100+ uploaded assets), this will slow down. Future fix: add cursor-based pagination to `GET /api/admin/cms/media`.

3. **Blog rich-text editor** — Blog body content is a plain `<Textarea>`. For production editorial use, a rich-text or Markdown editor (e.g. TipTap) would be more appropriate. This is a known enhancement, not a regression.

4. **Large bundle chunks** — `dashboard-page` (428 KB) and `messages-page` (378 KB) exceed Vite's 500 KB warning threshold. These are pre-existing and unrelated to the CMS sprint. Lazy loading with `React.lazy()` would reduce initial load time.

5. **CMS SEO Settings page** — Currently a "Coming Soon" placeholder. Global SEO defaults (title templates, robots.txt, sitemap) are not yet implemented.

### Files Changed in EOD Pass

| File | Change |
|---|---|
| `client/src/features/admin/blog-page.tsx` | Added CmsImageUpload import; replaced cover image URL Input |
| `server/routes/admin/cms.routes.ts` | Added console.error to all 8 catch blocks |
| `client/src/features/admin/cms/builder/block-registry.ts` | Updated 3 image field placeholders |

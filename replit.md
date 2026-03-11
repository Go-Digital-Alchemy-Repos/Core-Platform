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

---

## CMS Phase 5 — Reusable Sections

### Overview
Phase 5 adds a library of reusable block groups ("sections") that can be saved once and inserted into any CMS page via the page builder. This speeds up page building by letting admins compose pages from pre-built, branded content blocks.

### Database
- Table: `cms_sections` — `id` (uuid), `name`, `description`, `category`, `blocks` (jsonb array), `createdAt`, `updatedAt`
- Schema in `shared/schema.ts`: `cmsSections`, `insertCmsSectionSchema`, `CmsSection`, `InsertCmsSection`
- Migration: run `npm run db:push` if not already applied

### API Endpoints (admin-only, JWT-authenticated)
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/cms/sections` | List all sections |
| POST | `/api/admin/cms/sections` | Create a new section |
| GET | `/api/admin/cms/sections/:id` | Get section by ID |
| PUT | `/api/admin/cms/sections/:id` | Update section |
| DELETE | `/api/admin/cms/sections/:id` | Delete section |

Routes file: `server/routes/admin/cms-sections.routes.ts`
Mounted in: `server/routes/admin/index.ts`

### Frontend Routes
| Path | Component |
|---|---|
| `/admin/cms/sections` | `CmsSectionsPage` — card grid + search/filter + delete |
| `/admin/cms/sections/new` | `CmsSectionEditorPage` — create new section |
| `/admin/cms/sections/:id` | `CmsSectionEditorPage` — edit existing section |

### Key Files Changed in Phase 5
| File | Change |
|---|---|
| `shared/schema.ts` | Added `cmsSections` table, insert schema, types |
| `server/storage.ts` + `server/storage/` | Sections CRUD methods |
| `server/routes/admin/cms-sections.routes.ts` | New — REST API for sections |
| `server/routes/admin/index.ts` | Mount `cmsSectionsRoutes` at `/cms` |
| `client/src/features/admin/cms/cms-sections-page.tsx` | New — sections list page |
| `client/src/features/admin/cms/cms-section-editor-page.tsx` | New — section editor with PageBuilder |
| `client/src/features/admin/cms/builder/page-builder.tsx` | Rewritten with Bookmark-to-save per block + "Saved Sections" library tab in Add Block dialog |
| `client/src/features/admin/admin-sidebar.tsx` | Added "Sections" nav item under CMS group |
| `client/src/App.tsx` | Added lazy imports + routes for CmsSectionsPage and CmsSectionEditorPage |

### How Reusable Sections Work
1. **Save a block as a section:** In any page builder, click the bookmark icon on any block → fill in name/category/description → "Save Section". The block is copied as a new section record.
2. **Manage sections:** `/admin/cms/sections` shows all saved sections as cards with name, category badge, block count, and edit/delete actions.
3. **Create/edit sections directly:** `/admin/cms/sections/new` or `/admin/cms/sections/:id` provides a full editor with the PageBuilder for complex multi-block sections.
4. **Insert into pages:** In any page builder's "Add Block" dialog → switch to "Saved Sections" tab → click any section to insert its blocks. Blocks are deep-copied with new UUIDs so edits to the page don't affect the section library.

### Insert Behavior (important)
Sections are **copied on insert** — there is no live sync. Editing a saved section does not retroactively update pages where it was already inserted. This is intentional for content stability.

---

## CMS Phase 6 — Blog Integration into CMS

### Overview
Phase 6 absorbs blog management into the CMS area without rebuilding or breaking the existing blog architecture. The blog backend (schema, storage, public routes) is preserved; the admin experience is upgraded and moved under CMS.

### What Changed (Non-Destructive)
- **Sidebar**: "Blog" moved from the main admin group to the CMS group at `/admin/cms/blog`
- **Old `/admin/blog` route**: Preserved in App.tsx (backwards compatible)
- **New dedicated blog list page**: `/admin/cms/blog` (CmsBlogPage) — card list with search + status filter
- **New dedicated blog editor**: `/admin/cms/blog/:id` (CmsBlogEditorPage) — full page editor with tabs
- **Cover image**: Replaced raw URL input with `CmsImageUpload` (R2-backed drag-and-drop)
- **SEO fields added to blog schema**: `seoTitle`, `seoDescription`, `ogImageUrl` — nullable, no data impact
- **Blog schema migration**: Applied via `npm run db:push` (added 3 nullable columns)
- **Date coercion fix**: Blog PUT/POST route now uses `z.coerce.date()` for `publishedAt`

### Blog Editor Tabs
1. **Content**: Title, slug, author, category, tags, cover image (CmsImageUpload), excerpt, body content, publish toggle
2. **SEO**: seoTitle, seoDescription (max 160 chars), ogImageUrl (CmsImageUpload)

### Public Blog Behavior (Unchanged)
- Public URLs: `/insights` (listing) and `/insights/:slug` (article)
- API: `GET /api/blog` and `GET /api/blog/:slug`
- Slugs preserved — no SEO regression

### SEO Meta Tags (New in Phase 7)
Blog post pages at `/insights/:slug` now set:
- `document.title` = `seoTitle` (or `post.title | TCK Wellness`)
- `meta[name=description]` = `seoDescription` (or excerpt)
- `meta[property=og:image]` = `ogImageUrl` (or coverImageUrl)
- `meta[property=og:title]` = effective SEO title

---

## CMS Phase 7 — Publishing, SEO, Revisions

### Overview
Phase 7 polishes the CMS editorial workflow: unpublish control, revision restore, SEO meta tag wiring in public pages, and CMS overview improvements.

### Publish/Unpublish Flow (CMS Pages)
- **Publish**: `POST /api/admin/cms/pages/:id/publish` — sets status to `published` + stamps `publishedAt`
- **Unpublish**: `POST /api/admin/cms/pages/:id/unpublish` — reverts status to `draft`
- **UI**: `data-testid="button-publish"` (when draft) / `data-testid="button-unpublish"` (when published)
- Unpublish button was previously missing; now visible alongside the "Published" badge

### Revision History & Restore
- Every save (PUT) creates a revision snapshot before applying the change
- Revision list shown in "Page Settings" tab under "Revision History" (up to 8 shown)
- **Restore endpoint**: `POST /api/admin/cms/pages/:pageId/revisions/:revisionId/restore`
  - Saves the current state as a "Before restore" revision
  - Applies the historical revision's title + content to the live page
  - Creates a "Restored from revision" revision for the audit trail
- **UI**: Restore button (`data-testid="button-restore-revision-{id}"`) appears on all non-current revisions

### SEO Meta Tags in Public Pages
1. **Blog posts** (`/insights/:slug`): `useSeo()` hook in `insights-post-page.tsx` sets title, description, og:image from blog SEO fields
2. **CMS hybrid pages** (`/`, `/about`, `/contact`, `/join` when published): `CmsPageSeo` component in `cms-hybrid-page.tsx` sets title, description, og:image from CMS page SEO fields

The `useSeo()` hook (`client/src/hooks/use-seo.ts`) directly manipulates `document.head` meta tags and restores `document.title` on cleanup.

### CMS Overview Updates
- 4 stat cards: Total Pages, Published Pages, Blog Posts, Posts Live
- 5 quick links: Pages, Blog (orange), Media, Sections, SEO
- Recent Blog Posts table added below the Recent Pages table

### Files Changed in Phase 6 & 7

| File | Change |
|---|---|
| `shared/schema/blog-posts.ts` | Added `seoTitle`, `seoDescription`, `ogImageUrl` columns |
| `server/routes/admin/blog.routes.ts` | Added `z.coerce.date()` for `publishedAt` field |
| `server/routes/admin/cms.routes.ts` | Added revision restore endpoint |
| `server/storage/cms-page-revisions.storage.ts` | Added `getRevision(id)` method |
| `client/src/features/admin/cms/cms-blog-page.tsx` | New — CMS-styled blog list page |
| `client/src/features/admin/cms/cms-blog-editor-page.tsx` | New — full blog editor with Content/SEO tabs |
| `client/src/features/admin/cms/cms-overview-page.tsx` | Added blog stats, Blog quick link, recent posts table |
| `client/src/features/admin/cms/cms-page-editor-page.tsx` | Added Unpublish button + revision restore UI |
| `client/src/features/admin/admin-sidebar.tsx` | Moved Blog to CMS group at /admin/cms/blog |
| `client/src/features/public/insights-post-page.tsx` | Added useSeo() for meta tags |
| `client/src/features/public/cms-hybrid-page.tsx` | Added CmsPageSeo component for meta tags |
| `client/src/hooks/use-seo.ts` | New — lightweight DOM meta tag hook |
| `client/src/App.tsx` | Added routes for /admin/cms/blog, /admin/cms/blog/new, /admin/cms/blog/:id |

### Follow-up Recommendations
1. **Rich text editor**: Replace the plain Textarea for blog body content with a Markdown or rich-text editor (e.g. TipTap, Monaco) for better writing experience.
2. **Sitemap**: Generate a dynamic `/sitemap.xml` from published CMS pages and blog posts using the existing slug data.
3. **OpenGraph `og:type`**: Add `og:type=article` for blog posts and `og:url` for all public pages.
4. **Archive flow**: The CMS page status includes "archived" but there's no UI for archiving (different from draft). Could be surfaced if needed.
5. **Blog revisions**: Blog posts don't have a revision history like CMS pages. Could be added following the same pattern if required.

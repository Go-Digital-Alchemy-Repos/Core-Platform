# TCK Wellness — Counselor Directory & Subscription Platform

## Overview
TCK Wellness is a BetterHelp-style platform featuring a counselor directory and subscription service for TCK-informed counselors. It provides a searchable public directory, custom JWT authentication, OpenStreetMap/Leaflet maps, Stripe subscriptions, and a comprehensive admin dashboard. The project aims to connect Third Culture Kids (TCKs) with specialized mental health support, addressing a critical need in a niche market.

## User Preferences
- All visible text uses "Counselor"/"Counselors" throughout the UI (navbar, footer, home, directory, admin, auth pages).
- Code identifiers, API routes (`/api/therapist/*`, `/api/therapists`), DB columns, and role values (`"therapist"`) remain unchanged.

## System Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, Wouter, TanStack Query v5
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom JWT with bcryptjs, HTTP-only cookies
- **Payments**: Stripe subscriptions
- **Maps**: OpenStreetMap + Leaflet (react-leaflet v4.2.1)
- **Fonts**: EB Garamond (headings), Nunito (body)

### Core Features
- **Counselor Directory**: Searchable profiles with filtering by specialization, language, country, and session format. Features a split-pane view with a scrollable list and sticky map.
- **User Authentication**: Custom JWT-based authentication with three roles: admin, therapist, and client.
- **Subscription Management**: Stripe integration for managing counselor membership tiers (Basic, Professional, Premium).
- **Event Management**: Platform for creating, managing, and displaying events (virtual, in-person, hybrid). Includes registration (free and paid via Stripe Checkout), waitlisting, attendance tracking, and bulk notifications.
- **Recording Archives**: Role-aware archive of past events with recordings, accessible at `/recordings`. Supports YouTube and Vimeo embeds.
- **Admin Dashboard**: Comprehensive interface for managing users, therapists (CRUD, approval, rejection, activity logs), membership tiers, events, contact messages, blog posts, and system settings.
- **Internal Messaging**: System for direct messages and conversations with rich text and attachments.
- **Notifications**: In-app notification system with per-user preferences.
- **CMS (Content Management System)**: Nondestructive admin-only CMS for managing public-facing pages with revision history and SEO fields.

### Data Model Highlights
- **Users**: Core user accounts with roles.
- **Therapist Profiles**: Detailed profiles including location, specializations, and `isFeatured` status.
- **Membership Tiers & Subscriptions**: Defines pricing and links to Stripe subscriptions.
- **Events**: Stores event details, visibility, registration options, and speaker metadata.
- **Contact Messages**: Manages contact form submissions.
- **System Settings**: Key-value store for configuration, including encrypted secrets.
- **Email Templates**: Customizable system email templates with placeholders.
- **Activity Logs**: Tracks user actions.
- **Conversations & Direct Messages**: Supports internal messaging.
- **Notifications & Preferences**: Manages in-app notifications.
- **Specializations**: Dynamic list of counselor specializations.
- **Blog Posts**: Manages blog content.
- **Event Registrations**: Tracks user registrations for events, including status, payment status, and attendance.
- **Profile Views**: Tracks views on therapist profiles.
- **Saved Counselors**: Junction table for users to save/favorite counselors.
- **CMS Pages & Revisions**: Stores content for static pages and their version history.

### UI/UX Design
- **Consistent Terminology**: "Counselor"/"Counselors" used across all visible UI elements.
- **Component Library**: Utilizes shadcn/ui with Tailwind CSS for a modern, responsive design.
- **Responsive Design**: Custom breakpoints for optimal viewing across devices (xs=480px, sm=640px, md=768px, lg=1024px, xl=1280px).
- **Sheet Component**: All form/detail popups use `Sheet` (slide-out drawer from right) with various size variants, reserving `AlertDialog` for confirmations.
- **Branding**: Uses a defined color palette (Navy, Sage, Copper, Teal).

### Architecture Patterns
- **Modular File Structure**: Organizes backend by concern (`schema`, `types`, `middleware`, `storage`, `routes`, `services`) and frontend by feature.
- **Separation of Concerns**: Clear distinction between frontend and backend, with dedicated API endpoints for data interaction.
- **Structured Logging**: Implements a structured logger with named sources (http, email, r2, stripe, auth, app, db) and request IDs for enhanced observability.
- **Performance Optimization**: Route-level lazy loading for frontend pages using `React.lazy()` and `Suspense`, and a strategic React Query cache strategy with `staleTime`, `gcTime`, and `refetchOnWindowFocus` configurations.
- **Database Indexing & FK Constraints**: Extensive B-tree and GIN indexes, along with foreign key constraints, to ensure data integrity and optimize query performance, especially for directory and notification features.

## External Dependencies
- **Stripe**: For processing subscriptions and paid event registrations.
- **OpenStreetMap & Leaflet**: For geographical mapping functionalities in the directory and event details.
- **Mailgun / Nodemailer**: Primary and fallback email service providers for transactional emails.
- **Cloudflare R2**: S3-compatible object storage for avatar uploads and other media (with local fallback).
- **Zod**: Schema validation library used for request validation.
- **bcryptjs**: Password hashing.
- **JWT (JSON Web Tokens)**: For custom authentication.
- **Helmet**: Security middleware for setting HTTP headers.
- **express-rate-limit**: Middleware for API rate limiting.
- **Wouter**: Lightweight React router.
- **TanStack Query**: Data fetching and caching library for React.
---

## CMS Phase 2 — Visual Page Builder

### Overview
A structured block-based page builder was added to the CMS admin. Admins can add, edit, reorder, and remove content blocks on any CMS page. Block content is stored as JSON in the `cms_pages.content` column and is future-ready for public page rendering.

### Builder Architecture

**Files:**
- `client/src/features/admin/cms/builder/block-registry.ts` — Typed block definitions (propDefs, defaultProps, label, icon, description)
- `client/src/features/admin/cms/builder/block-renderer.tsx` — React renderers for every block type (used in preview + future public output)
- `client/src/features/admin/cms/builder/block-editor.tsx` — Dynamic prop editor panel (renders form fields based on PropDef types)
- `client/src/features/admin/cms/builder/page-builder.tsx` — Main builder UI (block list, add dialog, reorder, select, preview mode)
- `client/src/features/admin/cms/cms-page-editor-page.tsx` — Updated to 3-tab layout: Builder | Page Settings | SEO

### Content JSON Structure
The `cms_pages.content` jsonb column stores:
```json
{
  "blocks": [
    {
      "id": "uuid-v4",
      "type": "hero",
      "props": {
        "heading": "Welcome to TCK Wellness",
        "subheading": "...",
        "ctaText": "Find a Counselor",
        "ctaLink": "/directory",
        "backgroundImageUrl": "",
        "overlayOpacity": 50
      }
    }
  ]
}
```

### Block Registry (16 Block Types)

| Type | Label | Description |
|---|---|---|
| `hero` | Hero | Full-width hero with heading, subheading, CTA buttons, optional background image |
| `section-header` | Section Header | Eyebrow label, title, subtitle with alignment |
| `rich-text` | Rich Text | HTML content with left/center/right alignment |
| `text-image` | Text + Image | Side-by-side layout with configurable image position |
| `cta` | Call to Action | Bold CTA with two buttons and light/dark/accent variants |
| `cards-grid` | Cards Grid | Icon + text cards in 2/3/4 column grid |
| `faq` | FAQ | Accordion-style Q&A list |
| `testimonials` | Testimonials | Quote cards with name, role, location |
| `featured-counselors` | Featured Counselors | Live grid from `/api/therapists/featured` |
| `events-preview` | Events Preview | Live upcoming events from `/api/events` |
| `blog-preview` | Blog Preview | Live published blog posts from `/api/blog` |
| `button-group` | Button Group | Multiple buttons with variant and alignment control |
| `image-block` | Image Block | Standalone image with caption and width control |
| `video-embed` | Video Embed | YouTube/Vimeo embed with aspect ratio control |
| `contact-info` | Contact Info | Icon + label + value items |
| `divider` | Divider / Spacer | Line, dots, or invisible spacer with configurable spacing |

### PropDef Types
Each block prop is typed as one of: `text`, `textarea`, `richtext`, `image-url`, `url`, `select`, `boolean`, `number`, `array-items`. The `array-items` type renders an inline item editor for complex repeating data (FAQ Q&As, testimonials, cards, buttons, etc.).

### Image Upload Handling
All `image-url` props show:
1. A text input for direct URL entry
2. An upload button that calls `POST /api/uploads/attachment` (R2 or local fallback)
3. A visible notice: "R2 media picker coming in next phase — direct upload active now"

### Editor UX — 3-Tab Layout
- **Builder tab** (default): Full page builder with add/reorder/delete/edit workflow
- **Page Settings tab**: Title, slug, page type, status + revision history sidebar
- **SEO tab**: SEO title, meta description (with character counter), keywords, OG image upload

### Builder Interactions
- **Add Block**: Opens dialog showing all 16 block types as clickable cards
- **Edit Block**: Click pencil icon → right-side panel opens with dynamic form matching the block's propDefs
- **Reorder**: Up/Down chevron buttons on each block row
- **Delete Block**: Trash icon with immediate removal (no confirm dialog — undo is via revision history)
- **Preview**: Renders all blocks in a scrollable preview panel using the same BlockRenderer components

### Public Rendering Compatibility
`BlockRenderer` and `PageRenderer` components in `block-renderer.tsx` are designed to be imported by future public page routes. No public routes currently use CMS content — the existing hardcoded public pages remain unchanged.

### Known Limitations & Next Phase Recommendations
1. **No drag-and-drop reorder** — uses up/down buttons; drag-and-drop is deferred
2. **Image fields use direct upload** — R2 media library picker is the next phase
3. **Rich text** is a plain textarea — a Tiptap integration upgrade is planned
4. **No public page rendering** — public routes still use hardcoded pages; CMS page output routing is next
5. **Testimonials/Cards arrays** have no inline reorder — items can be deleted and re-added

---

## CMS Phase 3 — Media Upload & R2 Media Library

### Overview
All image fields across the CMS (page builder blocks and SEO OG image) now use a fully functional drag-and-drop upload workflow backed by Cloudflare R2. A `cms_media` catalog table tracks every CMS-uploaded asset. A real Media Library admin page replaces the previous placeholder.

### New Database Table

**`cms_media`** — tracks uploaded CMS assets:
| Column | Type | Notes |
|---|---|---|
| `id` | varchar (UUID) | Auto-generated |
| `filename` | text | Server-generated `{timestamp}-{safeName}` |
| `originalName` | text | Original user filename |
| `url` | text | Public URL (R2 or local fallback) |
| `mimeType` | text | e.g. `image/webp` |
| `fileSize` | integer | Bytes |
| `r2Key` | text | R2 object key (e.g. `cms/media/…`), null if local fallback |
| `alt` | text | Optional alt text |
| `uploadedBy` | varchar | FK → users.id |
| `createdAt` | timestamp | Auto set |

### Upload API

**`POST /api/admin/cms/upload`** (admin-only)
- Accepts: `multipart/form-data` with `file` field
- Accepted types: `image/png`, `image/jpeg`, `image/webp`, `image/gif`
- Max size: 10 MB
- R2 key path: `cms/media/{timestamp}-{safeName}`
- Local fallback: `/uploads/cms/` (when R2 is not configured)
- Returns: Full `CmsMediaAsset` JSON (id, url, filename, mimeType, fileSize, etc.)

**`GET /api/admin/cms/media`** — list all CMS media (ordered by newest first)

**`PATCH /api/admin/cms/media/:id/alt`** — update alt text for an asset

**`DELETE /api/admin/cms/media/:id`** — delete asset from DB and R2/local storage

### Frontend Components

**`client/src/features/admin/cms/components/cms-image-upload.tsx`** — `CmsImageUpload`
- Primary reusable upload component for all CMS image fields
- Drag-and-drop zone with `onDrop`/`onDragOver` handlers (no external library)
- Click-to-browse file input fallback
- Real-time upload progress via `XMLHttpRequest` (supports `onprogress`)
- Preview state: shows uploaded image with hover-revealed Replace / Library / Remove buttons
- "Pick from library" button opens `MediaPickerDialog`
- Error display: toasts for type errors, size errors, network errors
- `data-testid` props for all interactive elements

**`client/src/features/admin/cms/components/media-picker-dialog.tsx`** — `MediaPickerDialog`
- Grid picker for browsing already-uploaded CMS media
- Search filter (by filename and alt text)
- Fetches from `GET /api/admin/cms/media`
- Click to select → fires `onSelect(url, asset)` callback

### Integration Points

**Block editor (`builder/block-editor.tsx`)**
- All `image-url` propDef fields replaced with `CmsImageUpload`
- This covers every block type that has image props: hero (backgroundImageUrl), text-image, cards-grid items, testimonials items, image-block, etc.
- Works inside `ArrayItemsField` for repeating items that include image-url sub-props

**Page editor SEO tab (`cms-page-editor-page.tsx`)**
- Open Graph image field replaced with `CmsImageUpload`
- Help text: "Recommended: 1200 × 630 px"
- No longer uses the old `/api/uploads/attachment` endpoint

**Media Library page (`cms-media-page.tsx`)**
- Full gallery view of all CMS uploaded assets (5-column grid)
- Thumbnail hover reveals filename + file size
- Click thumbnail → detail dialog with image preview, URL copy, delete button
- Delete triggers AlertDialog confirmation, then calls `DELETE /api/admin/cms/media/:id`
- Upload dialog inline on the page (uses `CmsImageUpload`)
- Search by filename/alt text

### R2 Storage Behavior for CMS Assets

- R2 key prefix: `cms/media/` (separate from `avatars/` and `attachments/`)
- Public URL format: `{R2_PUBLIC_URL}/cms/media/{filename}` or `https://{bucket}.r2.dev/cms/media/{filename}`
- Local fallback: `/uploads/cms/{filename}` (served as static files in development)
- On delete: if `r2Key` is set, calls `r2Service.deleteFile(r2Key)` before deleting DB record

### Supported File Rules

| Rule | Value |
|---|---|
| Accepted types | PNG, JPEG, WebP, GIF |
| Max file size | 10 MB |
| Rejected types | PDF, video, SVG (CMS image-only context) |

### Reuse Strategy for Future CMS Modules

`CmsImageUpload` is a self-contained component that accepts `value: string` (current URL) + `onChange: (url: string) => void`. Drop it anywhere another CMS module needs an image field:
- Blog post feature images
- Reusable Section thumbnail
- Counselor directory banner
- Event cover images

`MediaPickerDialog` can be opened independently with `open`/`onOpenChange`/`onSelect` props, so any future module can offer "Pick from library" without coupling to `CmsImageUpload`.

### Files Changed in Phase 3

| File | Change |
|---|---|
| `shared/schema/cms-media.ts` | New — `cms_media` table + types |
| `shared/schema/index.ts` | Export `cmsMedia` |
| `server/storage/cms-media.storage.ts` | New — CRUD storage class |
| `server/storage/index.ts` | Register `CmsMediaStorage` |
| `server/routes/admin/cms-media.routes.ts` | New — upload + media CRUD API |
| `server/routes/admin/index.ts` | Mount `cmsMediaRoutes` at `/cms` |
| `client/src/features/admin/cms/components/cms-image-upload.tsx` | New — dropzone upload component |
| `client/src/features/admin/cms/components/media-picker-dialog.tsx` | New — library picker dialog |
| `client/src/features/admin/cms/builder/block-editor.tsx` | Replace `ImageUrlField` with `CmsImageUpload` |
| `client/src/features/admin/cms/cms-page-editor-page.tsx` | Replace OG image URL input with `CmsImageUpload` |
| `client/src/features/admin/cms/cms-media-page.tsx` | Full rewrite — real gallery with upload/delete |

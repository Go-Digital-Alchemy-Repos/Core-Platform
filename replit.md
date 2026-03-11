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

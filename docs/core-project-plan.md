# Core Platform Project Plan

This plan captures the current strategic direction for Core Platform based on planning conversations around feature refinement, reusable themes, Neon, multi-tenancy, Next.js, and a future built-in agent panel. Treat it as the working guide for sequencing decisions. Revisit it when product, tenant-isolation, hosting, billing, or client-workflow requirements change.

> **Infrastructure decision — September 3, 2026:** Production was moved from Neon back to Railway Postgres. The Neon phase and sequencing statements in this plan are superseded and require explicit reconsideration before implementation.

## Guiding Product Direction

Core Platform should become a reusable multi-tenant website and operations platform where each tenant can launch from a polished design foundation, manage content and business workflows through the CMS/admin dashboard, and eventually use an integrated agent panel to safely design, operate, and improve their site.

The platform should avoid one-off site assumptions inherited from the original TCK Wellness build. Public pages, reusable sections, theme tokens, admin workflows, and future agent actions should be standardized enough to support many tenants without making live sites fragile.

## Sequencing Principles

- Stabilize the existing product before major architectural rewrites.
- Build the theme and reusable section contract before full tenancy so tenants inherit a clean design foundation.
- Move to Neon before Next.js because the app already uses Postgres and Drizzle.
- Design tenancy before a full Next.js migration so single-tenant assumptions are not copied into a new framework.
- Build the future agent panel on top of tenant-aware, permission-checked platform actions rather than giving the agent direct database freedom.
- Treat Next.js as an eventual rendering and routing upgrade, not the mechanism that creates tenancy.

## Recommended Roadmap

### Phase 1: Stabilize Existing Features

Refine current CMS, admin, directory, ecommerce, events, membership, CRM, uploads, Stripe, email, settings, backups, and public-site workflows while the current Vite/React + Express architecture is familiar.

Key outcomes:

- Known product flows are reliable enough to become tenant-ready later.
- Tests cover high-risk flows such as auth, CMS publishing, checkout/webhooks, uploads, settings, and admin permissions.
- Legacy assumptions and TCK-specific copy/design decisions are identified.
- Existing technical debt is categorized into must-fix, defer, or replace-later.

### Phase 2: Theme And Section Architecture

Build the design-template system as a cornerstone Core Platform feature before full tenancy.

Key outcomes:

- A formal theme contract exists with versioned tokens, supported page templates, supported sections, typography, color, spacing, radius, shadows, component variants, header/footer variants, and responsive rules.
- Reusable sections have stable schemas and can adapt across themes.
- CMS content is separated from structure and presentation.
- Themes cannot introduce arbitrary fragile markup or required content fields that would break existing sites.
- Theme compatibility validation exists before publishing a theme change.

Initial reusable section standards should cover:

- Hero
- Split content
- Feature grid
- Testimonial band
- CTA band
- Directory preview
- Event list
- Blog/article list
- Product grid
- Form embed
- FAQ
- Stats
- Team/profile grid
- Logo strip
- Rich content
- Contact/location
- Membership/pricing

Initial page template standards should cover:

- Homepage
- Standard content page
- Landing page
- Directory page
- Event detail
- Blog index
- Blog post
- Product listing
- Product detail
- Contact page
- Membership page

Theme management should support:

- Preview without publishing
- Current vs proposed comparison
- Unsupported-section detection
- Atomic publish
- Rollback
- Theme versioning
- Future theme manifests, screenshots, seed pages, validation checks, and visual regression tests

### Phase 3: Starter Themes

Create a small set of strong starter themes rather than many thin designs.

Recommended first themes:

- Professional Services: polished, trust-focused, operationally clear.
- Wellness Directory: human-centered, softer, editorial, directory-friendly.
- Commerce/Event Hybrid: conversion-focused for shops, events, memberships, and campaigns.

Key outcomes:

- The same section and page contracts produce meaningfully different sites.
- Theme switching does not break published content.
- Tenant admins and super admins have a credible starting point for new sites.

### Phase 4: Neon Migration

Move the existing Postgres/Drizzle setup to Neon before changing the application framework.

Key outcomes:

- Runtime and migration connection strings are clearly separated where needed.
- Connection pooling strategy is documented for the chosen hosting model.
- Drizzle migrations run intentionally, not casually during request handling.
- Preview/staging database branching strategy is defined.
- Backup, restore, and rollback procedures are validated.

### Phase 5: Tenancy Model Design

Design the tenant model before implementing large-scale tenant changes or converting to Next.js.

Key decisions:

- Shared schema with `tenant_id`, schema-per-tenant, or database-per-tenant.
- Domain model for tenant subdomains and custom domains.
- Tenant-scoped users, roles, permissions, settings, feature flags, integrations, uploads, billing, analytics, and public site content.
- Super-admin vs tenant-admin boundaries.
- Tenant lifecycle: create, configure, preview, publish, suspend, archive, export.

Likely core tables:

- `tenants`
- `tenant_domains`
- `tenant_members`
- tenant-scoped settings tables
- tenant-scoped feature flag tables
- tenant-scoped theme assignment/version tables

Existing global assumptions to revisit:

- Globally unique user emails
- Globally unique system settings keys
- Global site features
- Global SEO settings
- Global uploads
- Global Stripe/email/R2/analytics configuration
- Auth tokens without tenant context

### Phase 6: Tenant-Aware Backend And Admin UX

Implement tenancy in the current architecture or in a focused migration branch before the full Next.js conversion.

Key outcomes:

- Every service/storage call receives tenant context where relevant.
- Every tenant-owned table is scoped consistently.
- Admin permissions are tenant-aware.
- Settings, CMS content, themes, media, forms, products, events, CRM, memberships, and integrations are tenant-scoped.
- Super admins can manage tenants without leaking tenant data.
- Tenant admins can configure their site, select themes, preview changes, and manage modules.

### Phase 7: Built-In Agent Panel Foundation

Build a Core Platform-native agent panel after tenant boundaries and safe action patterns exist.

The agent should operate through typed, permission-checked platform actions rather than raw database access.

Core foundations:

- Action registry with Zod schemas
- Tenant-aware execution context
- Role and permission checks
- Human approval for high-consequence actions
- Audit log of suggestions, drafts, approvals, and executions
- Draft/preview workflow for public content and design changes
- Prompt templates per module
- Tenant brand/context memory
- Tool permissions by role and plan

Early use cases:

- Draft homepage, landing page, event, blog, and product copy.
- Suggest SEO improvements.
- Generate page drafts from approved section types.
- Explain theme compatibility issues.
- Recommend section replacements within the active theme contract.
- Summarize form leads, orders, directory activity, or event registrations.
- Help tenant admins work within brand voice and compliance constraints.

Client-configurable prompt engineering options may include:

- Brand voice
- Target audience
- Prohibited claims
- Preferred terminology
- SEO preferences
- Approval rules
- Default page structure
- Module-specific instructions
- Publishing restrictions

### Phase 8: Next.js Migration

Migrate to Next.js after the theme contract and tenancy model are explicit.

Recommended approach:

- Start with public, SEO-heavy pages.
- Preserve or bridge existing API behavior while migrating gradually.
- Move route/API handlers only where the benefit is clear.
- Keep background jobs out of request lifecycle assumptions.
- Preserve tenant-aware routing, metadata, caching boundaries, and preview behavior.

Watch carefully:

- Stripe webhook raw-body handling
- Auth/session behavior
- Upload durability
- Next.js caching and stale tenant data
- Background jobs and scheduled services
- Domain/subdomain routing
- Route parity and redirects

### Phase 9: Expanded Agent And Automation Layer

Once tenant isolation, themes, admin flows, and core actions are reliable, expand the agent panel into a broader client-facing automation layer.

Possible later capabilities:

- Guided site onboarding
- Theme selection assistant
- Agent-assisted content migration
- Agent-generated but validated section layouts
- Analytics-driven site recommendations
- Tenant-specific playbooks
- Cross-module campaign creation
- Agent-assisted support and admin training

## Near-Term Next Steps

1. Keep feature refinement moving while documenting rough edges.
2. Audit CMS blocks, public pages, reusable sections, and TCK-specific assumptions.
3. Draft the theme contract and section schema standards.
4. Define the first three starter themes and their intended use cases.
5. Add compatibility and preview requirements for theme switching.
6. After the theme foundation is clear, resume Neon and tenancy planning with the theme model included.

## Decisions To Make Before Implementation

- What is the minimum viable starter theme set?
- Which current sections are deprecated versus upgraded?
- What customization should tenant admins control directly?
- What customization should only super admins or developers control?
- Should tenant theme selection be module-aware, industry-aware, or both?
- Which tenant isolation model best fits expected scale and compliance needs?
- Which hosting target is preferred for the current app, Next.js, background jobs, and previews?
- Which agent actions should be allowed, draft-only, approval-gated, or forbidden?

## Current Recommendation

The next strategic move should be the theme and reusable section architecture. This is the foundation that makes Core Platform feel like a reusable platform rather than a cloned single-site CMS. Neon, tenancy, Next.js, and the agent panel should build on that foundation instead of forcing it to fit later.

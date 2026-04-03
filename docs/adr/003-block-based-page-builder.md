# ADR-003: Block-Based Page Builder

## Status

Accepted

## Context

The CMS needed a content editing model. Options considered:

1. Rich text editor (WYSIWYG) with HTML output
2. Markdown-based content
3. Block-based builder (structured JSON blocks)

## Decision

We chose a **block-based page builder** where pages are composed of typed content blocks stored as JSON. Each block has a type identifier and structured properties. The admin CMS provides a visual editor for creating and arranging blocks.

Key components:
- `block-registry.ts` — Defines available block types and their property schemas
- `block-renderer.tsx` — Renders block JSON into React components
- `block-editor.tsx` — Admin-side block editing interface
- `cms_pages` table stores block content as JSON

## Consequences

- **Positive**: Structured content is easier to validate, migrate, and render consistently
- **Positive**: New block types can be added without changing the database schema
- **Positive**: Content is portable (JSON) and can be versioned (via `cms_page_revisions`)
- **Negative**: Block renderer is large (1481 lines) and tightly coupled to block types
- **Negative**: More complex than a simple rich text editor for basic content
- **Trade-off**: Content flexibility vs. implementation complexity

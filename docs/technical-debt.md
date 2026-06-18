# Technical Debt Catalog

Organized by priority tier based on risk, impact, and effort.

---

## Tier 1: Immediate Follow-Up

Items that should be addressed in the next development cycle.

### TD-001: Eliminate `any` Types

- **Impact**: Type safety, maintainability
- **Scope**: Full-lint warning backlog, primarily `@typescript-eslint/no-explicit-any`
- **Files**: Across client components, server routes, storage classes, webhook handler
- **Effort**: Medium (systematic but straightforward replacement with proper types)
- **Recommendation**: Replace `any` with proper types, starting with server-side code where type safety matters most

### TD-002: Clean Up Unused Imports and Variables

- **Impact**: Code cleanliness
- **Scope**: Remaining unused import and variable warnings in full lint output
- **Files**: Various client and server files
- **Effort**: Small (can be auto-fixed with `eslint --fix` for some cases)

### TD-003: Token Revocation Strategy

- **Impact**: Security
- **Current**: JWT tokens cannot be revoked before expiry (7 days)
- **Risk**: Compromised tokens remain valid until expiration
- **Recommendation**: Add a token deny-list (in-memory or Redis) for critical revocation cases (password change, account lockout)

### TD-004: CSRF Protection Enhancement

- **Impact**: Security
- **Current**: Origin checking via `Origin`/`Referer` headers, `sameSite: lax` cookies
- **Risk**: Some edge cases not covered by origin check alone
- **Recommendation**: Add double-submit cookie pattern or synchronizer token for critical state-changing endpoints

---

## Tier 2: Near-Term (Next 1–3 Months)

Items that should be scheduled but are not urgent.

### TD-005: Block Renderer / Registry Size

- **Impact**: Maintainability
- **Current**: `block-renderer.tsx` (~2,747 lines), `block-registry.ts` (~2,608 lines)
- **Recommendation**: Split into individual block component files, create a plugin-style block registration system

### TD-006: Application Routes Size

- **Impact**: Maintainability
- **Current**: `application.routes.ts` (551 lines), `applications.routes.ts` (479 lines)
- **Recommendation**: Extract into sub-routers or move business logic to dedicated service classes

### TD-007: Service Layer Extraction

- **Impact**: Architecture, testability
- **Current**: Some business logic lives in route handlers (e.g., application workflow coordinating emails, user updates, status changes)
- **Recommendation**: Extract cross-domain logic into service classes (e.g., `application.service.ts`, `stripe.service.ts`)

### TD-008: Query Freshness Differentiation

- **Impact**: Performance, UX
- **Current**: Client queries now use named `STALE_TIMES` tiers, but new query code should keep using those constants instead of raw millisecond literals.
- **Recommendation**: Continue applying `STALE_TIMES.STATIC`, `SESSION`, `LIVE`, and `OPERATIONAL` consistently. Add optimistic updates for common mutations.

### TD-009: Server-Side Caching

- **Impact**: Performance
- **Current**: Basic in-memory TTL caching exists in `server/lib/cache.ts` and is used by selected settings/service paths.
- **Recommendation**: Expand caching deliberately for frequently-read, rarely-changed data and add explicit invalidation where admin writes can stale public reads.

### TD-010: Test Coverage Expansion

- **Impact**: Reliability
- **Current**: 359 tests across server and client stabilization coverage
- **Gaps**: More coverage still needed for CMS routes, Stripe integration, email service, admin routes, and storage classes
- **Recommendation**: Add integration tests for critical paths (application workflow, subscription management, CMS page publishing)

---

## Tier 3: Long-Term (3–6+ Months)

Strategic improvements for scale and maintainability.

### TD-011: Full-Text Search

- **Impact**: Scalability
- **Current**: Text search uses `ilike('%term%')` — adequate for <5k profiles
- **Recommendation**: Add PostgreSQL `tsvector` column with GIN index, or integrate external search service (e.g., Typesense, Meilisearch)

### TD-012: Cursor-Based Pagination

- **Impact**: Scalability, reliability
- **Current**: Offset-based pagination (`LIMIT`/`OFFSET`)
- **Risk**: Performance degrades with large offsets; inconsistent results during concurrent writes
- **Recommendation**: Add cursor-based pagination option for directory API

### TD-013: Background Job Queue

- **Impact**: Reliability, UX
- **Current**: Email sending, background checks, and scheduled publishing run synchronously or via simple intervals
- **Recommendation**: Adopt a job queue (e.g., BullMQ, pg-boss) for async processing with retry logic, dead-letter queues, and job monitoring

### TD-014: Database Migration Cleanup

- **Impact**: Maintainability
- **Location**: `migrations/` directory (journal in `migrations/meta/`)
- **Current**: Duplicate migration prefixes exist (`0003_*`, `0004_*`)
- **Recommendation**: Use unique sequential numbers for all new migrations going forward; do not renumber existing migrations as this would break the journal in `migrations/meta/`

### TD-015: API Documentation

- **Impact**: Developer experience
- **Current**: No auto-generated API documentation
- **Recommendation**: Add OpenAPI/Swagger spec generation from route definitions, or maintain a hand-written API reference

### TD-016: E2E Testing

- **Impact**: Reliability
- **Current**: No end-to-end tests
- **Recommendation**: Add Playwright or Cypress tests for critical user flows (registration, directory search, application submission, payment)

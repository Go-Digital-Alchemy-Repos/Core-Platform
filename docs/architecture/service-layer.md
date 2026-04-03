# Service Layer & Caching Strategy

## Service Layer Architecture

The application uses a storage-facade pattern rather than traditional service classes. Business logic flows as:

```
Route Handler → Storage Facade → Domain Storage → Drizzle ORM → PostgreSQL
```

### Storage Facade

`server/storage/index.ts` exports a single `storage` object that aggregates all domain-specific storage classes:

```typescript
export const storage = {
  users: new UserStorage(),
  therapists: new TherapistStorage(),
  applications: new ApplicationStorage(),
  events: new EventStorage(),
  blog: new BlogStorage(),
  cmsPages: new CmsPagesStorage(),
  // ... 28 storage classes total
};
```

### Standalone Services

For cross-cutting concerns that don't map to a single storage domain:

| Service | File | Responsibility |
|---------|------|---------------|
| `EmailService` | `server/services/email.service.ts` | Template rendering, email dispatch via SendGrid |
| `R2Service` | `server/services/r2.service.ts` | Cloudflare R2 file upload/delete/signed URLs |
| `BackgroundCheckService` | `server/services/background-check.service.ts` | Provider background check workflow |
| `ScheduledPublishService` | `server/services/scheduled-publish.service.ts` | Periodic check for CMS pages scheduled to publish |

### Route Handler Responsibility

Route handlers are intentionally thin. They:
1. Validate request input (via Zod schemas or middleware)
2. Call storage methods
3. Return JSON responses

Business logic that spans multiple storage domains is currently in route handlers (e.g., `application.routes.ts` coordinates applications, email, and user updates). This is a known area for future refactoring.

## Caching Strategy

### Server-Side Caching

Currently no explicit server-side caching layer (no Redis, no in-memory cache). All requests hit the database directly.

**Static responses with HTTP cache headers:**
- `robots.txt` — `Cache-Control: public, max-age=3600`
- `sitemap.xml` — `Cache-Control: public, max-age=3600`

### Client-Side Caching

TanStack Query provides the primary caching layer:
- 5-minute stale time means repeated navigation doesn't trigger redundant API calls
- Cache is keyed by query parameters, so paginated/filtered results are cached independently
- Mutations invalidate relevant cache entries

### Future Caching Considerations

1. **Redis/in-memory cache** for frequently-read, rarely-changed data (specializations list, theme settings, membership tiers)
2. **ETags or conditional requests** for CMS pages and blog posts
3. **CDN caching** for public API responses (directory listings with short TTL)

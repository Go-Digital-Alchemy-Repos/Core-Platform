import type { BlogPost, CmsPage, Event } from "@shared/schema";
import type { PublicSearchResult } from "@shared/types/public-search";
import { storage } from "../storage";

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength = 180): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function collectContentText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(collectContentText).filter(Boolean).join(" ");
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).map(collectContentText).filter(Boolean).join(" ");
  }
  return "";
}

function normalizeQuery(query: string) {
  const trimmed = query.trim().toLowerCase();
  return {
    raw: trimmed,
    terms: trimmed.split(/\s+/).filter(Boolean),
  };
}

function scoreSearchMatch(query: string, terms: string[], title: string, body: string) {
  if (!query) return 0;
  const lowerTitle = title.toLowerCase();
  const lowerBody = body.toLowerCase();

  let score = 0;

  if (lowerTitle.includes(query)) score += 100;
  if (lowerBody.includes(query)) score += 35;

  const matchedTitleTerms = terms.filter((term) => lowerTitle.includes(term)).length;
  const matchedBodyTerms = terms.filter((term) => lowerBody.includes(term)).length;

  if (matchedTitleTerms === terms.length) score += 50;
  else score += matchedTitleTerms * 12;

  if (matchedBodyTerms === terms.length) score += 20;
  else score += matchedBodyTerms * 5;

  return score;
}

function pageUrlForSlug(slug: string) {
  return slug === "home" ? "/" : `/${slug}`;
}

function buildPageText(page: CmsPage) {
  return [
    page.title,
    page.slug,
    page.seoTitle,
    page.seoDescription,
    collectContentText(page.content),
  ]
    .filter(Boolean)
    .join(" ");
}

function buildPostText(post: BlogPost) {
  return [
    post.title,
    post.excerpt,
    post.content,
    post.authorName,
    post.category,
    ...(post.categories ?? []),
    ...(post.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

function buildEventText(event: Event) {
  return [
    event.title,
    event.description,
    event.speakerName,
    event.location,
    event.locationName,
    event.locationAddress,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function searchPublicSite(query: string): Promise<PublicSearchResult[]> {
  const normalized = normalizeQuery(query);
  if (!normalized.raw) return [];

  const [pages, posts, events] = await Promise.all([
    storage.cmsPages.getAllPages(),
    storage.blog.getPublishedPosts(),
    storage.events.getPublishedEvents(),
  ]);

  const pageResults = pages
    .filter((page) => page.status === "published")
    .map((page) => {
      const searchText = buildPageText(page);
      const score = scoreSearchMatch(normalized.raw, normalized.terms, page.title, searchText);
      return score > 0
        ? ({
            score,
            result: {
              type: "page",
              id: page.id,
              title: page.title,
              url: pageUrlForSlug(page.slug),
              excerpt: truncate(stripHtml(page.seoDescription || collectContentText(page.content) || "")),
              metadata: "Page",
            } satisfies PublicSearchResult,
          })
        : null;
    })
    .filter((entry): entry is { score: number; result: PublicSearchResult } => Boolean(entry));

  const postResults = posts
    .map((post) => {
      const searchText = buildPostText(post);
      const score = scoreSearchMatch(normalized.raw, normalized.terms, post.title, searchText);
      return score > 0
        ? ({
            score,
            result: {
              type: "post",
              id: post.id,
              title: post.title,
              url: `/insights/${post.slug}`,
              excerpt: truncate(stripHtml(post.excerpt || post.content || "")),
              metadata: post.category || post.authorName || "Article",
            } satisfies PublicSearchResult,
          })
        : null;
    })
    .filter((entry): entry is { score: number; result: PublicSearchResult } => Boolean(entry));

  const eventResults = events
    .map((event) => {
      const searchText = buildEventText(event);
      const score = scoreSearchMatch(normalized.raw, normalized.terms, event.title, searchText);
      return score > 0
        ? ({
            score,
            result: {
              type: "event",
              id: event.id,
              title: event.title,
              url: `/events/${event.id}`,
              excerpt: truncate(stripHtml(event.description || "")),
              metadata: event.locationName || event.location || "Event",
            } satisfies PublicSearchResult,
          })
        : null;
    })
    .filter((entry): entry is { score: number; result: PublicSearchResult } => Boolean(entry));

  return [...pageResults, ...postResults, ...eventResults]
    .sort((a, b) => b.score - a.score || a.result.title.localeCompare(b.result.title))
    .map((entry) => entry.result);
}

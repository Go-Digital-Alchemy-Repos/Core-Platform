import type { BlogPost, CmsPage, Event } from "@shared/schema";
import type { PublicSearchResult } from "@shared/types/public-search";
import { getEventPath } from "@shared/event-url";
import { storage } from "../storage";

interface SearchDocument {
  type: PublicSearchResult["type"];
  id: string;
  title: string;
  url: string;
  metadata?: string | null;
  searchableText: string;
  excerptSource: string;
}

interface FallbackPageDocument extends Omit<SearchDocument, "id"> {
  slug: string;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength = 180): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function collectContentText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return stripHtml(value);
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

function scoreSearchMatch(query: string, terms: string[], title: string, body: string, path = "") {
  if (!query) return 0;
  const lowerTitle = title.toLowerCase();
  const lowerBody = body.toLowerCase();
  const lowerPath = path.toLowerCase();

  let score = 0;

  if (lowerTitle === query) score += 180;
  if (lowerTitle.includes(query)) score += 120;
  if (lowerPath.includes(query)) score += 45;
  if (lowerBody.includes(query)) score += 55;

  const matchedTitleTerms = terms.filter((term) => lowerTitle.includes(term)).length;
  const matchedBodyTerms = terms.filter((term) => lowerBody.includes(term)).length;
  const matchedPathTerms = terms.filter((term) => lowerPath.includes(term)).length;

  if (matchedTitleTerms === terms.length) score += 70;
  else score += matchedTitleTerms * 18;

  if (matchedBodyTerms === terms.length) score += 35;
  else score += matchedBodyTerms * 8;

  score += matchedPathTerms * 8;

  return score;
}

function pageUrlForSlug(slug: string) {
  return slug === "home" ? "/" : `/${slug}`;
}

function buildExcerpt(source: string, query: string, terms: string[], maxLength = 180) {
  const plainText = stripHtml(source);
  if (!plainText) return "";

  const lower = plainText.toLowerCase();
  const matchIndex = [query, ...terms]
    .filter(Boolean)
    .map((term) => lower.indexOf(term.toLowerCase()))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  if (matchIndex === undefined) {
    return truncate(plainText, maxLength);
  }

  const start = Math.max(0, matchIndex - 60);
  const end = Math.min(plainText.length, matchIndex + maxLength - 20);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < plainText.length ? "..." : "";
  return `${prefix}${plainText.slice(start, end).trim()}${suffix}`;
}

function joinFragments(values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const FALLBACK_PAGE_DOCUMENTS: FallbackPageDocument[] = [
  {
    slug: "home",
    type: "page",
    title: "Home",
    url: "/",
    metadata: "Page",
    searchableText: [
      "Core Platform",
      "Find a Mental Health Professional",
      "Applications open in June",
      "Why Core Platform Informed",
      "Culturally Informed Care",
      "Specialized Support",
      "Global Community",
      "Featured Articles",
      "Upcoming Events",
    ].join(" "),
    excerptSource: "Explore Core Platform-informed mental health support, featured articles, and upcoming events.",
  },
  {
    slug: "about",
    type: "page",
    title: "About",
    url: "/about",
    metadata: "Page",
    searchableText: [
      "About Core Platform",
      "What is a Third Culture Kid",
      "What does it mean to be vetted",
      "Every mental health professional completes a detailed application process",
      "Credentials and licensure are verified",
      "Training or lived experience with Core Platform cross-cultural populations is required",
    ].join(" "),
    excerptSource: "Learn what it means for a provider to be vetted and how Core Platform supports cross-cultural mental health care.",
  },
  {
    slug: "contact",
    type: "page",
    title: "Contact Us",
    url: "/contact",
    metadata: "Page",
    searchableText: [
      "Contact Us",
      "Send a Message",
      "Have a question or feedback",
      "Company Information",
    ].join(" "),
    excerptSource: "Get in touch with Core Platform through the contact form and company information.",
  },
  {
    slug: "join",
    type: "page",
    title: "Join the Network",
    url: "/join",
    metadata: "Page",
    searchableText: [
      "Are you a Core Platform-Informed Mental Health Professional Join the Network",
      "What Does Membership Include",
      "Directory Listing",
      "Client Connections",
      "Profile Analytics",
      "Community Access",
      "The Application Process",
      "Submit Your Application",
      "Credential Verification",
      "Core Platform Competency Review",
      "Profile Setup",
      "Go Live in the Directory",
      "Interested in Training but Not a Member",
      "Applications open in June",
    ].join(" "),
    excerptSource:
      "The Application Process includes Submit Your Application, Credential Verification, Core Platform Competency Review, Profile Setup, and Go Live in the Directory.",
  },
  {
    slug: "directory",
    type: "page",
    title: "Find a Mental Health Professional",
    url: "/directory",
    metadata: "Page",
    searchableText: [
      "Find a Mental Health Professional",
      "Search by specialty location language or session format",
      "Why Core Platform Informed",
      "What does it mean to be vetted",
      "Every mental health professional completes a detailed application process",
    ].join(" "),
    excerptSource: "Search for Core Platform-informed care by specialty, location, language, or session format.",
  },
  {
    slug: "privacy-policy",
    type: "page",
    title: "Privacy Policy",
    url: "/privacy-policy",
    metadata: "Page",
    searchableText: [
      "Privacy Policy",
      "how Core Platform collects uses stores and protects information",
    ].join(" "),
    excerptSource: "Review how Core Platform collects, uses, stores, and protects information across the website and related services.",
  },
  {
    slug: "terms-of-service",
    type: "page",
    title: "Terms of Service",
    url: "/terms-of-service",
    metadata: "Page",
    searchableText: [
      "Terms of Service",
      "terms governing use of the Core Platform website directory events and services",
    ].join(" "),
    excerptSource: "Review the terms governing use of the Core Platform website, directory, events, and related services.",
  },
  {
    slug: "disclaimer",
    type: "page",
    title: "Disclaimer",
    url: "/disclaimer",
    metadata: "Page",
    searchableText: [
      "Disclaimer",
      "mental health emergency",
      "suicide and crisis lifeline",
      "Core Platform conducts a vetting process",
    ].join(" "),
    excerptSource: "Review emergency guidance, directory vetting limitations, and important information about using the Core Platform directory and related services.",
  },
];

const FALLBACK_PAGE_DOCUMENTS_BY_SLUG = new Map(
  FALLBACK_PAGE_DOCUMENTS.map((document) => [document.slug, document] as const),
);

function buildPageText(page: CmsPage) {
  const fallbackDocument = FALLBACK_PAGE_DOCUMENTS_BY_SLUG.get(page.slug);
  return [
    page.title,
    page.slug,
    page.seoTitle,
    page.seoDescription,
    page.seoKeywords,
    collectContentText(page.content),
    fallbackDocument?.searchableText,
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

function buildFallbackPageDocuments(publishedPageSlugs: Set<string>): SearchDocument[] {
  return FALLBACK_PAGE_DOCUMENTS
    .filter((doc) => !publishedPageSlugs.has(doc.slug))
    .map((doc) => ({
      id: `fallback:${doc.slug}`,
      type: doc.type,
      title: doc.title,
      url: doc.url,
      metadata: doc.metadata,
      searchableText: doc.searchableText,
      excerptSource: doc.excerptSource,
    }));
}

export async function searchPublicSite(query: string): Promise<PublicSearchResult[]> {
  const normalized = normalizeQuery(query);
  if (!normalized.raw) return [];

  const [pages, posts, events] = await Promise.all([
    storage.cmsPages.getAllPages(),
    storage.blog.getPublishedPosts(),
    storage.events.getPublishedEvents(),
  ]);

  const publishedPages = pages.filter((page) => page.status === "published" && !page.noindex);
  const publishedPageSlugs = new Set(publishedPages.map((page) => page.slug));

  const documents: SearchDocument[] = [
    ...publishedPages.map((page) => ({
      type: "page" as const,
      id: page.id,
      title: page.title,
      url: pageUrlForSlug(page.slug),
      metadata: "Page",
      searchableText: buildPageText(page),
      excerptSource: joinFragments([
        page.seoDescription,
        collectContentText(page.content),
        FALLBACK_PAGE_DOCUMENTS_BY_SLUG.get(page.slug)?.excerptSource,
      ]),
    })),
    ...buildFallbackPageDocuments(publishedPageSlugs),
    ...posts
      .filter((post) => !post.noindex)
      .map((post) => ({
      type: "post" as const,
      id: post.id,
      title: post.title,
      url: `/insights/${post.slug}`,
      metadata: post.category || post.authorName || "Article",
      searchableText: buildPostText(post),
      excerptSource: post.excerpt || post.content,
      })),
    ...events.map((event) => ({
      type: "event" as const,
      id: event.id,
      title: event.title,
      url: getEventPath(event),
      metadata: event.locationName || event.location || "Event",
      searchableText: buildEventText(event),
      excerptSource: event.description || buildEventText(event),
    })),
  ];

  return documents
    .map((document) => {
      const score = scoreSearchMatch(
        normalized.raw,
        normalized.terms,
        document.title,
        document.searchableText,
        document.url,
      );

      return score > 0
        ? {
            score,
            result: {
              type: document.type,
              id: document.id,
              title: document.title,
              url: document.url,
              excerpt: buildExcerpt(document.excerptSource || document.searchableText, normalized.raw, normalized.terms),
              metadata: document.metadata,
            } satisfies PublicSearchResult,
          }
        : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => b.score - a.score || a.result.title.localeCompare(b.result.title))
    .map((entry) => entry.result);
}

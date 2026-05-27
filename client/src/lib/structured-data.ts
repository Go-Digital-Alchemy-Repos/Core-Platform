import type { SeoSettings, BlogPost, CmsPage, Event } from "@shared/schema";
import { stripHtml } from "@/lib/html";
import { getEventPath } from "@shared/event-url";

export type JsonLdObject = Record<string, unknown>;

function compactObject(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== "")
  );
}

function absoluteUrl(path: string, base?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const origin = base || (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function buildOrganizationLd(globalSeo: SeoSettings): JsonLdObject | null {
  if (!globalSeo.organizationName && !globalSeo.siteName) return null;

  const name = globalSeo.organizationName || globalSeo.siteName || "Core Platform";
  const siteUrl = globalSeo.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");

  const sameAs: string[] = [
    globalSeo.facebookUrl,
    globalSeo.linkedinUrl,
    globalSeo.instagramUrl,
    globalSeo.twitterHandle
      ? `https://x.com/${globalSeo.twitterHandle.replace(/^@/, "")}`
      : null,
  ].filter((url): url is string => !!url);

  return compactObject({
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: siteUrl || undefined,
    logo: globalSeo.organizationLogoUrl
      ? {
          "@type": "ImageObject",
          url: absoluteUrl(globalSeo.organizationLogoUrl, siteUrl),
        }
      : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  });
}

export function buildWebSiteLd(globalSeo: SeoSettings): JsonLdObject | null {
  const siteUrl = globalSeo.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  if (!siteUrl) return null;

  return compactObject({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: globalSeo.siteName || "Core Platform",
    url: siteUrl,
  });
}

export function buildBreadcrumbLd(
  items: Array<{ name: string; url: string }>
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildArticleLd(
  post: BlogPost,
  globalSeo?: SeoSettings | null
): JsonLdObject | null {
  if (!post.title) return null;

  const siteUrl = globalSeo?.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const orgName = globalSeo?.organizationName || globalSeo?.siteName || "Core Platform";
  const postUrl = `${siteUrl}/insights/${post.slug}`;

  const image = post.ogImageUrl || post.coverImageUrl;

  return compactObject({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || undefined,
    url: postUrl,
    image: image ? absoluteUrl(image, siteUrl) : undefined,
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    dateModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
    author: compactObject({
      "@type": "Person",
      name: post.authorName,
    }),
    publisher: compactObject({
      "@type": "Organization",
      name: orgName,
      logo: globalSeo?.organizationLogoUrl
        ? {
            "@type": "ImageObject",
            url: absoluteUrl(globalSeo.organizationLogoUrl, siteUrl),
          }
        : undefined,
    }),
    mainEntityOfPage: postUrl,
  });
}

export type EventMode = "Online" | "Offline" | "Mixed";

export function buildEventLd(
  event: Event,
  globalSeo?: SeoSettings | null
): JsonLdObject | null {
  if (!event.title || !event.date) return null;

  const siteUrl = globalSeo?.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const orgName = globalSeo?.organizationName || globalSeo?.siteName || "Core Platform";
  const eventUrl = `${siteUrl}${getEventPath(event)}`;

  const isHybrid =
    event.isVirtual &&
    !!(event.latitude || event.location || event.locationName || event.locationAddress);
  const isVirtualOnly = event.isVirtual && !isHybrid;

  let eventAttendanceMode: string;
  if (isVirtualOnly) {
    eventAttendanceMode = "https://schema.org/OnlineEventAttendanceMode";
  } else if (isHybrid) {
    eventAttendanceMode = "https://schema.org/MixedEventAttendanceMode";
  } else {
    eventAttendanceMode = "https://schema.org/OfflineEventAttendanceMode";
  }

  const location: JsonLdObject[] = [];
  if (event.isVirtual) {
    const joinUrl = event.virtualJoinUrl || event.zoomLink;
    location.push(
      compactObject({
        "@type": "VirtualLocation",
        url: joinUrl || undefined,
      })
    );
  }
  if (!isVirtualOnly) {
    const displayAddress =
      event.locationAddress || event.locationName || event.location;
    if (displayAddress) {
      location.push(
        compactObject({
          "@type": "Place",
          name: event.locationName || event.location || undefined,
          address: displayAddress,
        })
      );
    }
  }

  const isPast = new Date(event.date) < new Date();
  let eventStatus: string;
  if (event.status === "canceled") {
    eventStatus = "https://schema.org/EventCancelled";
  } else if (isPast || event.status === "completed") {
    eventStatus = "https://schema.org/EventScheduled";
  } else {
    eventStatus = "https://schema.org/EventScheduled";
  }

  const offers: JsonLdObject | undefined =
    event.registrationEnabled
      ? compactObject({
          "@type": "Offer",
          price:
            event.registrationType === "paid" && event.registrationFee != null
              ? (event.registrationFee / 100).toFixed(2)
              : "0",
          priceCurrency: (event.registrationCurrency || "usd").toUpperCase(),
          url: eventUrl,
          availability:
            event.status === "canceled"
              ? "https://schema.org/Discontinued"
              : "https://schema.org/InStock",
          validFrom: event.registrationOpensAt
            ? new Date(event.registrationOpensAt).toISOString()
            : undefined,
        })
      : undefined;

  const performer: JsonLdObject | undefined = event.speakerName
    ? compactObject({
        "@type": "Person",
        name: event.speakerName,
        description: event.speakerBio || undefined,
        image: event.speakerImageUrl
          ? absoluteUrl(event.speakerImageUrl, siteUrl)
          : undefined,
      })
    : undefined;

  return compactObject({
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description || undefined,
    url: eventUrl,
    image: event.imageUrl ? absoluteUrl(event.imageUrl, siteUrl) : undefined,
    startDate: new Date(event.date).toISOString(),
    endDate: event.endDate ? new Date(event.endDate).toISOString() : undefined,
    eventAttendanceMode,
    eventStatus,
    location: location.length > 0 ? (location.length === 1 ? location[0] : location) : undefined,
    organizer: compactObject({
      "@type": "Organization",
      name: orgName,
      url: siteUrl || undefined,
    }),
    offers,
    performer,
  });
}

export function buildVideoObjectLd(
  event: Event,
  globalSeo?: SeoSettings | null
): JsonLdObject | null {
  if (!event.recordingUrl) return null;
  if (!event.title) return null;

  const siteUrl = globalSeo?.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");

  return compactObject({
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: event.title,
    description: event.description || undefined,
    contentUrl: event.recordingUrl,
    thumbnailUrl: event.imageUrl ? absoluteUrl(event.imageUrl, siteUrl) : undefined,
    uploadDate: event.endDate
      ? new Date(event.endDate).toISOString()
      : new Date(event.date).toISOString(),
  });
}

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqBlock {
  type: string;
  props: {
    items?: FaqItem[];
    title?: string;
  };
}

interface BuilderContent {
  blocks?: FaqBlock[];
}

export function extractFaqItems(pageContent: unknown): FaqItem[] {
  if (!pageContent || typeof pageContent !== "object") return [];
  const content = pageContent as BuilderContent;
  if (!Array.isArray(content.blocks)) return [];

  const items: FaqItem[] = [];
  for (const block of content.blocks) {
    if (block.type === "faq" && Array.isArray(block.props?.items)) {
      for (const item of block.props.items) {
        if (item.question && item.answer) {
          items.push({ question: stripHtml(item.question), answer: stripHtml(item.answer) });
        }
      }
    }
  }
  return items;
}

export function buildFaqPageLd(faqItems: FaqItem[]): JsonLdObject | null {
  if (faqItems.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

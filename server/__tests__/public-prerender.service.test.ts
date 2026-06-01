import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlogPost, CmsPage, EcommerceProduct, Event, SeoSettings } from "@shared/schema";

const mockGetSeo = vi.fn();
const mockGetSetting = vi.fn();
const mockGetPageBySlug = vi.fn();
const mockGetPostBySlug = vi.fn();
const mockGetEventByIdentifier = vi.fn();
const mockGetProfileWithUser = vi.fn();
const mockGetProductBySlug = vi.fn();

vi.mock("../storage", () => ({
  storage: {
    seoSettings: {
      get: mockGetSeo,
    },
    settings: {
      getSetting: mockGetSetting,
    },
    cmsPages: {
      getPageBySlug: mockGetPageBySlug,
    },
    blog: {
      getPostBySlug: mockGetPostBySlug,
    },
    events: {
      getEventByIdentifier: mockGetEventByIdentifier,
    },
    therapists: {
      getProfileWithUser: mockGetProfileWithUser,
    },
    ecommerce: {
      getProductBySlug: mockGetProductBySlug,
    },
  },
}));

const seoSettings: SeoSettings = {
  id: "seo-1",
  siteName: "Core Platform",
  siteUrl: "https://coreplatform.com",
  titleSuffix: " | Core Platform",
  defaultMetaDescription: "Default description",
  defaultOgImageUrl: "https://coreplatform.com/og.jpg",
  defaultRobotsNoindex: false,
  organizationName: "Core Platform",
  organizationLogoUrl: null,
  facebookUrl: null,
  instagramUrl: null,
  linkedinUrl: null,
  twitterHandle: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const cmsPage: CmsPage = {
  id: "page-1",
  title: "Join the Network",
  slug: "join",
  status: "published",
  pageType: "system",
  template: "full-width",
  sidebarId: null,
  content: {
    blocks: [
      { id: "b1", type: "hero", props: { title: "The Application Process", subtitle: "Submit your application and complete credential verification." } },
    ],
  },
  seoTitle: null,
  seoDescription: "Learn about the application process.",
  seoKeywords: null,
  ogImageUrl: null,
  canonicalUrl: null,
  noindex: false,
  createdBy: null,
  updatedBy: null,
  scheduledAt: null,
  publishedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const blogPost: BlogPost = {
  id: "post-1",
  title: "Understanding the Application Process",
  slug: "understanding-application-process",
  excerpt: "Everything you need to know before you apply.",
  content: "<p>This article explains the application process in detail.</p>",
  coverImageUrl: null,
  coverImagePositionX: 50,
  coverImagePositionY: 50,
  authorName: "Team",
  category: "Guides",
  categories: ["Guides"],
  tags: ["Application"],
  postType: "article",
  podcastUrl: null,
  externalUrl: null,
  sidebarId: null,
  isPublished: true,
  scheduledAt: null,
  publishedAt: new Date(),
  seoTitle: null,
  seoDescription: null,
  ogImageUrl: null,
  noindex: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const event: Event = {
  id: "event-1",
  title: "Application Process Webinar",
  slug: "application-process-webinar",
  description: "Join us for a walk-through of the application process.",
  date: new Date("2026-06-01T15:00:00.000Z"),
  endDate: null,
  location: "Online",
  isVirtual: true,
  zoomLink: null,
  memberOnly: false,
  imageUrl: null,
  imagePositionX: 50,
  imagePositionY: 50,
  createdAt: new Date(),
  virtualJoinUrl: null,
  virtualDialInInfo: null,
  recordingUrl: null,
  showInArchives: false,
  recordingAccess: "free",
  recordingPrice: null,
  registrationEnabled: false,
  registrationType: "free",
  registrationFee: null,
  registrationCurrency: "usd",
  registrationOpensAt: null,
  registrationClosesAt: null,
  capacity: null,
  waitlistEnabled: false,
  status: "published",
  visibility: "public",
  timezone: null,
  locationName: null,
  locationAddress: null,
  latitude: null,
  longitude: null,
  speakerName: "Guide Team",
  speakerBio: null,
  speakerImageUrl: null,
  isRecurring: false,
  recurrencePattern: null,
  recurrenceInterval: null,
  recurrenceDaysOfWeek: null,
  recurrenceEndDate: null,
  recurrenceCount: null,
  parentEventId: null,
};

const product: EcommerceProduct = {
  id: "product-1",
  name: "Core Commerce Workbook",
  tagline: "A focused digital resource for store setup.",
  description: "Plan your product catalog, checkout flow, and post-purchase operations.",
  price: 4900,
  primaryImage: "/uploads/products/workbook.jpg",
  secondaryImages: ["/uploads/products/workbook-preview.jpg"],
  features: ["Catalog planning", "Checkout checklist"],
  included: ["PDF workbook"],
  active: true,
  status: "published",
  sku: "CORE-WORKBOOK",
  tags: ["Digital", "Planning"],
  salePrice: 3900,
  discountType: "NONE",
  discountValue: null,
  saleStartAt: null,
  saleEndAt: null,
  metaTitle: "Core Commerce Workbook",
  metaDescription: "A practical workbook for planning ecommerce launches.",
  metaKeywords: "ecommerce workbook",
  urlSlug: "core-commerce-workbook",
  canonicalUrl: null,
  robotsIndex: true,
  robotsFollow: true,
  ogTitle: null,
  ogDescription: null,
  ogImage: null,
  mediaId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("public-prerender.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSeo.mockResolvedValue(seoSettings);
    mockGetSetting.mockResolvedValue(null);
    mockGetPageBySlug.mockResolvedValue(undefined);
    mockGetPostBySlug.mockResolvedValue(undefined);
    mockGetEventByIdentifier.mockResolvedValue(undefined);
    mockGetProfileWithUser.mockResolvedValue(undefined);
    mockGetProductBySlug.mockResolvedValue(undefined);
  });

  it("returns a prerender snapshot for published CMS pages", async () => {
    mockGetPageBySlug.mockResolvedValue(cmsPage);
    const { getPublicHtmlSnapshot } = await import("../services/public-prerender.service");

    const snapshot = await getPublicHtmlSnapshot("/join");

    expect(snapshot?.title).toContain("Join the Network");
    expect(snapshot?.bodyHtml).toContain("The Application Process");
    expect(snapshot?.canonicalUrl).toBe("https://coreplatform.com/join");
  });

  it("skips prerender snapshots for private app routes", async () => {
    const { getPublicHtmlSnapshot, isPublicPrerenderPath } = await import(
      "../services/public-prerender.service"
    );

    await expect(getPublicHtmlSnapshot("/admin/settings")).resolves.toBeNull();
    await expect(getPublicHtmlSnapshot("/auth/login")).resolves.toBeNull();
    expect(isPublicPrerenderPath("/admin/settings")).toBe(false);
    expect(isPublicPrerenderPath("/shop")).toBe(true);
    expect(mockGetPageBySlug).not.toHaveBeenCalled();
  });

  it("returns a prerender snapshot for blog posts and event detail pages", async () => {
    mockGetPostBySlug.mockResolvedValue(blogPost);
    mockGetEventByIdentifier.mockResolvedValue(event);
    const { getPublicHtmlSnapshot } = await import("../services/public-prerender.service");

    const postSnapshot = await getPublicHtmlSnapshot("/insights/understanding-application-process");
    const eventSnapshot = await getPublicHtmlSnapshot("/events/event-1");

    expect(postSnapshot?.bodyHtml).toContain("This article explains the application process");
    expect(eventSnapshot?.bodyHtml).toContain("Application Process Webinar");
    expect(eventSnapshot?.canonicalUrl).toBe("https://coreplatform.com/events/application-process-webinar");
  });

  it("returns ecommerce product metadata and Product structured data for published products", async () => {
    mockGetProductBySlug.mockResolvedValue(product);
    const { getPublicHtmlSnapshot } = await import("../services/public-prerender.service");

    const snapshot = await getPublicHtmlSnapshot("/products/core-commerce-workbook");

    expect(snapshot?.title).toContain("Core Commerce Workbook");
    expect(snapshot?.canonicalUrl).toBe("https://coreplatform.com/products/core-commerce-workbook");
    expect(snapshot?.ogImageUrl).toBe("https://coreplatform.com/uploads/products/workbook.jpg");
    expect(JSON.stringify(snapshot?.jsonLd)).toContain('"@type":"Product"');
    expect(JSON.stringify(snapshot?.jsonLd)).toContain('"sku":"CORE-WORKBOOK"');
    expect(JSON.stringify(snapshot?.jsonLd)).toContain('"price":"39.00"');
  });

  it("skips ecommerce product prerender snapshots for archived products", async () => {
    mockGetProductBySlug.mockResolvedValue({ ...product, archivedAt: new Date() });
    const { getPublicHtmlSnapshot } = await import("../services/public-prerender.service");

    await expect(getPublicHtmlSnapshot("/products/core-commerce-workbook")).resolves.toBeNull();
  });

  it("marks search result pages as noindex in the injected head", async () => {
    const { getPublicHtmlSnapshot, injectPublicHtmlSnapshot } = await import("../services/public-prerender.service");
    const template = "<html><head><title>Default</title><!--APP_DYNAMIC_HEAD--></head><body><!--APP_PRERENDER_CONTENT--><div id=\"root\"></div></body></html>";

    const snapshot = await getPublicHtmlSnapshot("/search", "?query=application+process");
    const html = injectPublicHtmlSnapshot(template, snapshot);

    expect(html).toContain('meta name="robots" content="noindex,follow"');
    expect(html).toContain("Search Results for &quot;application process&quot;");
    expect(html).not.toContain("seo-prerender");
  });

  it("retrieves and injects custom public head additions", async () => {
    mockGetSetting.mockResolvedValue('<meta name="custom-test" content="enabled" />');
    const { getPublicHeadAdditions, injectPublicHtmlSnapshot } = await import(
      "../services/public-prerender.service"
    );
    const template =
      "<html><head><title>Default</title><!--APP_DYNAMIC_HEAD--></head><body><!--APP_PRERENDER_CONTENT--><div id=\"root\"></div></body></html>";

    const headHtml = await getPublicHeadAdditions();
    const html = injectPublicHtmlSnapshot(template, null, headHtml);

    expect(headHtml).toBe('<meta name="custom-test" content="enabled" />');
    expect(html).toContain('<meta name="custom-test" content="enabled" />');
  });

  it("repairs malformed closing script tags in custom head additions", async () => {
    mockGetSetting.mockResolvedValue(
      [
        '<script async src="https://www.googletagmanager.com/gtag/js?id=G-TEST"></script',
        '<script>window.dataLayer = window.dataLayer || [];</script',
      ].join("\n"),
    );
    const { getPublicHeadAdditions } = await import("../services/public-prerender.service");

    const headHtml = await getPublicHeadAdditions();

    expect(headHtml).toContain('</script>');
    expect(headHtml).not.toContain('</script\n');
    expect(headHtml).not.toContain('</script<');
  });
});

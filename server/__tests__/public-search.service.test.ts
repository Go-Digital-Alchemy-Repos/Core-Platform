import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlogPost, CmsPage, Event } from "@shared/schema";

const mockGetAllPages = vi.fn();
const mockGetPublishedPosts = vi.fn();
const mockGetPublishedEvents = vi.fn();

vi.mock("../storage", () => ({
  storage: {
    cmsPages: {
      getAllPages: mockGetAllPages,
    },
    blog: {
      getPublishedPosts: mockGetPublishedPosts,
    },
    events: {
      getPublishedEvents: mockGetPublishedEvents,
    },
  },
}));

const samplePage: CmsPage = {
  id: "page-1",
  title: "Application Process",
  slug: "application-process",
  status: "published",
  pageType: "custom",
  template: "full-width",
  sidebarId: null,
  content: [{ title: "The Application Process", body: "Learn how to apply with step-by-step guidance." }],
  seoTitle: null,
  seoDescription: "A guide to the Core Platform application process.",
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

const draftPage: CmsPage = {
  ...samplePage,
  id: "page-2",
  title: "Draft Only",
  slug: "draft-only",
  status: "draft",
};

const joinCmsPage: CmsPage = {
  ...samplePage,
  id: "page-join",
  title: "Join the Network",
  slug: "join",
  seoDescription: null,
  content: [{ title: "Membership", body: "Grow your practice with Core Platform." }],
};

const samplePost: BlogPost = {
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

const sampleEvent: Event = {
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

describe("public-search.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllPages.mockResolvedValue([samplePage, draftPage]);
    mockGetPublishedPosts.mockResolvedValue([samplePost]);
    mockGetPublishedEvents.mockResolvedValue([sampleEvent]);
  });

  it("returns mixed public results for matching content", async () => {
    const { searchPublicSite } = await import("../services/public-search.service");
    const results = await searchPublicSite("application process");

    expect(results.map((result) => result.type)).toEqual(expect.arrayContaining(["page", "post", "event"]));
    expect(results.map((result) => result.url)).toContain("/application-process");
    expect(results.map((result) => result.url)).toContain("/insights/understanding-application-process");
    expect(results.map((result) => result.url)).toContain("/events/application-process-webinar");
  });

  it("does not return non-public or draft content", async () => {
    const { searchPublicSite } = await import("../services/public-search.service");
    const results = await searchPublicSite("draft");

    expect(results).toHaveLength(0);
  });

  it("prefers title matches over body-only matches", async () => {
    const { searchPublicSite } = await import("../services/public-search.service");
    const results = await searchPublicSite("application process");

    expect(results[0]?.title).toBe("Application Process");
  });

  it("includes fallback public pages when no published CMS page exists for that route", async () => {
    mockGetAllPages.mockResolvedValue([]);

    const { searchPublicSite } = await import("../services/public-search.service");
    const results = await searchPublicSite("application process");

    expect(results.some((result) => result.url === "/join")).toBe(true);
    expect(results.find((result) => result.url === "/join")?.excerpt).toContain("Submit Your Application");
  });

  it("retains fallback system-page search terms even when a CMS version of that page exists", async () => {
    mockGetAllPages.mockResolvedValue([joinCmsPage]);

    const { searchPublicSite } = await import("../services/public-search.service");
    const results = await searchPublicSite("application process");

    expect(results.some((result) => result.url === "/join")).toBe(true);
  });
});

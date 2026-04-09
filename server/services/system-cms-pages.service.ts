import { randomUUID } from "crypto";
import { storage } from "../storage";

function id() {
  return randomUUID();
}

function buildInsightsContent() {
  return {
    blocks: [
      {
        id: id(),
        type: "section-header",
        props: {
          eyebrow: "TCK Wellness Blog",
          title: "Insights & Articles",
          subtitle: "Explore articles, research, and insights on Third Culture Kid mental health and cross-cultural counseling.",
          alignment: "center",
        },
      },
      {
        id: id(),
        type: "blog-featured-post",
        props: {
          title: "Featured Article",
          layout: "split",
        },
      },
      {
        id: id(),
        type: "blog-post-feed",
        props: {
          title: "All Articles",
          postsPerPage: 9,
          gridColumns: "3",
          feedStyle: "pagination",
          showSearch: true,
          showCategoryFilter: true,
          showTagFilter: true,
        },
      },
    ],
  };
}

export async function ensureSystemCmsPages() {
  const existingInsights = await storage.cmsPages.getPageBySlug("insights");
  if (!existingInsights) {
    await storage.cmsPages.createPage({
      title: "Insights & Articles",
      slug: "insights",
      pageType: "custom",
      template: "full-width",
      status: "published",
      content: buildInsightsContent(),
      seoTitle: "Insights & Articles | TCK Wellness",
      seoDescription: "Explore articles, research, and insights on Third Culture Kid mental health and cross-cultural counseling.",
      seoKeywords: "",
      ogImageUrl: "",
      canonicalUrl: "",
      noindex: false,
      publishedAt: new Date(),
      scheduledAt: null,
      createdBy: null,
      updatedBy: null,
      sidebarId: null,
    });
  }
}

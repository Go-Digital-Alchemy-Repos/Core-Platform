import { randomUUID } from "crypto";
import { storage } from "../storage";
import { mergeJoinHeroBlocks, type CmsBuilderBlock } from "@shared/cms-blocks";
import type { SidebarWidget } from "@shared/schema";

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

function buildDefaultBlogSidebarWidgets(): SidebarWidget[] {
  return [
    {
      id: id(),
      type: "search",
      title: "Search",
      settings: {},
    },
    {
      id: id(),
      type: "recent-posts",
      title: "Recent Posts",
      settings: { limit: 5 },
    },
    {
      id: id(),
      type: "categories",
      title: "Categories",
      settings: {},
    },
    {
      id: id(),
      type: "tag-cloud",
      title: "Popular Topics",
      settings: {},
    },
    {
      id: id(),
      type: "newsletter",
      title: "Stay Connected",
      settings: {
        description: "Get TCK-informed articles, events, and resources in your inbox.",
        buttonText: "Sign Up",
        actionUrl: "",
      },
    },
  ];
}

function contentWithMergedJoinHero(rawContent: unknown): Record<string, unknown> | null {
  if (!rawContent || typeof rawContent !== "object") return null;

  const content = rawContent as Record<string, unknown>;
  if (!Array.isArray(content.blocks)) return null;

  const blocks = content.blocks as CmsBuilderBlock[];
  const mergedBlocks = mergeJoinHeroBlocks(blocks);

  if (JSON.stringify(blocks) === JSON.stringify(mergedBlocks)) {
    return null;
  }

  return {
    ...content,
    blocks: mergedBlocks,
  };
}

export async function ensureSystemCmsPages() {
  const defaultBlogSidebar = await storage.cmsSidebars.getDefault();
  if (!defaultBlogSidebar) {
    await storage.cmsSidebars.create({
      name: "Blog Sidebar",
      description: "Default sidebar for Insights & Articles and blog posts.",
      isDefault: true,
      widgets: buildDefaultBlogSidebarWidgets(),
    });
  }

  const existingInsights = await storage.cmsPages.getPageBySlug("insights");
  if (!existingInsights) {
    await storage.cmsPages.createPage({
      title: "Insights & Articles",
      slug: "insights",
      pageType: "custom",
      template: "with-sidebar",
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
  } else if (existingInsights.template !== "with-sidebar") {
    await storage.cmsPages.updatePage(existingInsights.id, {
      template: "with-sidebar",
      updatedBy: existingInsights.updatedBy,
    });
  }

  const existingJoin = await storage.cmsPages.getPageBySlug("join");
  if (existingJoin) {
    const mergedContent = contentWithMergedJoinHero(existingJoin.content);
    if (mergedContent) {
      await storage.cmsPages.updatePage(existingJoin.id, {
        content: mergedContent,
        updatedBy: existingJoin.updatedBy,
      });
    }
  }
}

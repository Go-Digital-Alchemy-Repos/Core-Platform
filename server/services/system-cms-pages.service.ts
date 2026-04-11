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

function buildEventsContent() {
  return {
    blocks: [
      {
        id: id(),
        type: "events-archive",
        props: {
          heading: "Upcoming Events",
          subheading:
            "We offer quarterly TCK-informed trainings for professional providers. All of our members get free registration to the events below.",
          defaultView: "list",
          showViewToggle: true,
        },
      },
    ],
  };
}

function buildRecordingsContent() {
  return {
    blocks: [
      {
        id: id(),
        type: "video-archives",
        props: {
          heading: "Video Archives",
          subheading: "Browse our collection of past trainings and webinars.",
          showSearch: true,
          showYearFilter: true,
          showAccessFilter: true,
        },
      },
    ],
  };
}

function buildDirectoryContent() {
  return {
    blocks: [
      {
        id: id(),
        type: "directory-browser",
        props: {
          heading: "Find a Mental Health Professional",
          subheading:
            "Search for TCK-informed care by specialty, location, language, or session format, then explore results on the map.",
          showCategoryChips: true,
          showMap: true,
        },
      },
      {
        id: id(),
        type: "text-image",
        props: {
          heading: "Why TCK Informed?",
          body:
            "Traditional therapy models were developed within a single cultural framework. When TCKs bring their experiences to these frameworks, important aspects of their story can be misunderstood or pathologized. A TCK-informed mental health professional understands concepts like ambiguous loss, hidden immigrants, cultural marginality, and grief of place. They recognize that growing up across cultures creates both remarkable strengths and unique challenges — and they know how to work with both.",
          imageUrl:
            "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=1200&h=1200&fit=crop&crop=faces",
          imageAlt: "TCK-informed counseling",
          imagePosition: "left",
        },
      },
      {
        id: id(),
        type: "rich-text",
        props: {
          title: 'What does it mean to be "vetted"?',
          subtitle: 'And just as importantly, what it does not mean.',
          content:
            "<h3>What does it mean to be &ldquo;vetted&rdquo;?</h3><ul><li>Every mental health professional completes a detailed application process</li><li>Credentials and licensure are verified</li><li>Training or lived experience with TCK/cross-cultural populations is required</li><li>Profiles are reviewed by our team before being published</li></ul><h3>What does it NOT mean to be &ldquo;vetted&rdquo;?</h3><ul><li>We are not a licensing or credentialing body</li><li>We do not provide clinical supervision</li><li>Listing does not constitute an endorsement of specific therapeutic outcomes</li><li>We do not guarantee a therapeutic match, but we make finding one easier</li></ul>",
          alignment: "left",
          sectionBackgroundColor: "#f6f7f5",
          sectionShowRadialGradient: true,
          sectionRadialGradientPosition: "bottom",
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

  const existingEvents = await storage.cmsPages.getPageBySlug("events");
  if (!existingEvents) {
    await storage.cmsPages.createPage({
      title: "Events",
      slug: "events",
      pageType: "custom",
      template: "full-width",
      status: "published",
      content: buildEventsContent(),
      seoTitle: "Upcoming Events | TCK Wellness",
      seoDescription: "Explore upcoming TCK Wellness trainings, workshops, and community events.",
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

  const existingRecordings = await storage.cmsPages.getPageBySlug("recordings");
  if (!existingRecordings) {
    await storage.cmsPages.createPage({
      title: "Video Archives",
      slug: "recordings",
      pageType: "custom",
      template: "full-width",
      status: "published",
      content: buildRecordingsContent(),
      seoTitle: "Video Archives | TCK Wellness",
      seoDescription: "Watch past TCK Wellness trainings and webinars from the video archives.",
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

  const existingDirectory = await storage.cmsPages.getPageBySlug("directory");
  if (!existingDirectory) {
    await storage.cmsPages.createPage({
      title: "Find a Mental Health Professional",
      slug: "directory",
      pageType: "custom",
      template: "full-width",
      status: "published",
      content: buildDirectoryContent(),
      seoTitle: "Find a Mental Health Professional | TCK Wellness",
      seoDescription: "Browse TCK-informed mental health professionals by location, specialty, language, and more.",
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

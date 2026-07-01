import { randomUUID } from "crypto";
import { storage } from "../storage";
import { logger } from "../utils/logger";
import {
  CAROLINA_BRAND,
  COMMERCIAL_SERVICES,
  RESIDENTIAL_SERVICES,
  SERVICE_AREAS,
  VALUE_PROPS,
  blogImagePath,
  carolinaBlogPosts,
  carolinaLocations,
  carolinaPages,
  imagePath,
  type CarolinaBlock,
  type CarolinaPageContent,
} from "@shared/carolina-content";
import { CAROLINA_LOCATION_IMAGES, CAROLINA_SALES_PAGE_DESIGN } from "@shared/carolina-site";
import type { InsertCmsPage } from "@shared/schema";

type CmsBlock = { id: string; type: string; props: Record<string, unknown> };

function id() {
  return randomUUID();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pageBlocksToHtml(blocks: CarolinaBlock[]) {
  return blocks
    .map((block) => {
      const text = escapeHtml(block.text);
      if (block.type === "h2") return `<h2>${text}</h2>`;
      if (block.type === "h3") return `<h3>${text}</h3>`;
      return `<p>${text}</p>`;
    })
    .join("");
}

function splitFaqs(blocks: CarolinaBlock[]) {
  const content: CarolinaBlock[] = [];
  const faqs: { question: string; answer: string }[] = [];
  let inFaq = false;

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block.type === "h2" && block.text.toLowerCase().includes("frequently asked")) {
      inFaq = true;
      continue;
    }

    if (inFaq && block.type === "h3") {
      const next = blocks[index + 1];
      if (next?.type === "p") {
        faqs.push({ question: block.text, answer: next.text });
        index += 1;
        continue;
      }
    }

    if (inFaq && block.type === "h2") {
      inFaq = false;
    }

    if (!inFaq) {
      content.push(block);
    }
  }

  return { content, faqs };
}

function block(type: string, props: Record<string, unknown>): CmsBlock {
  return { id: id(), type, props };
}

const SERVICE_HERO_IMAGES: Record<string, string> = {
  "residential-lawn-maintenance": imagePath("hero-home.png"),
  "residential-landscaping": imagePath("hero-home.png"),
  "residential-hardscape": imagePath("hero-hardscape.png"),
  "mulching-and-planting": imagePath("hero-mulch.png"),
  "drainage-solutions": imagePath("hero-drainage.png"),
  commercial: imagePath("hero-commercial.png"),
  "commercial-grounds-maintenance": imagePath("hero-commercial.png"),
  "commercial-landscaping": imagePath("hero-commercial.png"),
  "commercial-hardscape": imagePath("hero-hardscape.png"),
  "commercial-drainage": imagePath("hero-drainage.png"),
  "hoa-services": imagePath("hero-commercial.png"),
};

function locationImagePath(slug: string) {
  const filename = CAROLINA_LOCATION_IMAGES[slug];
  return filename ? imagePath(filename) : imagePath("hero-home.png");
}

function contentBlock(
  page: CarolinaPageContent,
  options: { articleMode?: boolean; commercial?: boolean; inlineCta?: boolean } = {},
) {
  const { content, faqs } = splitFaqs(page.blocks);
  const design = CAROLINA_SALES_PAGE_DESIGN[page.slug];
  const quoteLink =
    design?.quoteLink ?? (options.commercial ? "/commercial-quote" : "/get-a-quote");
  const quoteLabel =
    design?.quoteLabel ?? (options.commercial ? "REQUEST PROPOSAL" : "GET A QUOTE");
  return block("carolina-rich-content", {
    pageSlug: page.slug,
    content: pageBlocksToHtml(content),
    faqs,
    showSidebar: false,
    articleMode: options.articleMode ?? false,
    showInlineCta: options.inlineCta ?? true,
    quoteLink,
    quoteLabel,
  });
}

function pageIntro(page: CarolinaPageContent) {
  const firstParagraph = page.blocks.find((item) => item.type === "p")?.text;
  const design = CAROLINA_SALES_PAGE_DESIGN[page.slug];
  return block("carolina-page-intro", {
    pageSlug: page.slug,
    intro: design?.intro ?? firstParagraph ?? "",
    quoteLink: design?.quoteLink ?? "/get-a-quote",
    quoteLabel: design?.quoteLabel ?? "GET A QUOTE",
  });
}

function introHero(page: CarolinaPageContent, subheading = "") {
  return block("carolina-intro-hero", {
    heading: page.h1,
    subheading,
  });
}

function imageHero(page: CarolinaPageContent, imageUrl: string, subheading = "") {
  return block("carolina-hero", {
    badge: "",
    heading: page.h1,
    subheading,
    imageUrl,
    imageAlt: page.h1,
    minHeight: "standard",
    align: "left",
    primaryText: "",
    primaryLink: "",
    secondaryText: "",
    secondaryLink: "",
    showTrustSignals: false,
    trustSignals: [],
  });
}

function basePageRecord(
  slug: string,
  title: string,
  page: CarolinaPageContent,
  blocks: CmsBlock[],
) {
  const isHome = slug === "home";
  return {
    title,
    slug,
    status: "published",
    pageType: isHome
      ? "home"
      : slug === "about"
        ? "about"
        : slug.includes("quote")
          ? "contact"
          : "custom",
    template: "carolina",
    content: { blocks },
    seoTitle: page.titleTag,
    seoDescription: page.metaDescription,
    seoKeywords: [page.primaryKeyword, ...page.secondaryKeywords].filter(Boolean).join(", "),
    canonicalUrl: isHome ? CAROLINA_BRAND.domain : `${CAROLINA_BRAND.domain}/${slug}`,
    noindex: false,
    publishedAt: new Date(),
  } satisfies InsertCmsPage;
}

function buildHomeBlocks(page: CarolinaPageContent) {
  return [
    block("carolina-hero", {
      badge: CAROLINA_BRAND.tagline,
      heading: page.h1,
      subheading: `We design, build, and maintain premium outdoor spaces for homes and businesses across ${CAROLINA_BRAND.county}. One company, complete outdoor care.`,
      imageUrl: imagePath("hero-home.png"),
      imageAlt: "Carolina beautiful lawn",
      minHeight: "home",
      align: "left",
      primaryText: "REQUEST A QUOTE",
      primaryLink: "/get-a-quote",
      secondaryText: "OUR STORY",
      secondaryLink: "/about",
      showTrustSignals: true,
      trustSignals: [
        { label: "Licensed & Insured" },
        { label: "Locally Owned" },
        { label: "Reliable Schedules" },
      ],
    }),
    pageIntro(page),
    contentBlock(page),
    block("carolina-card-grid", {
      heading: "Residential Services",
      subheading: "Complete outdoor care for Carolina homeowners.",
      items: RESIDENTIAL_SERVICES.map((service) => ({
        title: service.name,
        description: service.short,
        href: `/${service.slug}`,
      })),
    }),
    block("carolina-card-grid", {
      heading: "Commercial Services",
      subheading: "Reliable landscape programs for properties, businesses, and HOAs.",
      items: COMMERCIAL_SERVICES.map((service) => ({
        title: service.name,
        description: service.short,
        href: `/${service.slug}`,
      })),
    }),
    block("carolina-cta", {
      heading: "Ready to transform your property?",
      subheading: `Contact ${CAROLINA_BRAND.name} today for a free estimate on your residential or commercial landscaping needs.`,
      primaryText: "START YOUR PROJECT",
      primaryLink: "/get-a-quote",
      secondaryText: "",
      secondaryLink: "",
      pageSlug: page.slug,
    }),
  ];
}

function buildAboutBlocks(page: CarolinaPageContent) {
  return [
    introHero(page, CAROLINA_BRAND.tagline),
    pageIntro(page),
    contentBlock(page),
    block("carolina-card-grid", {
      heading: "Our Values",
      subheading: "",
      items: VALUE_PROPS.map((item) => ({
        title: item.title,
        description: item.body,
        href: "",
      })),
    }),
    block("carolina-cta", {
      heading: "Experience the difference.",
      subheading:
        "Work with a local outdoor team that shows up, follows through, and treats your property like its own.",
      primaryText: "GET A QUOTE",
      primaryLink: "/get-a-quote",
      secondaryText: "",
      secondaryLink: "",
      pageSlug: page.slug,
    }),
  ];
}

function buildServiceBlocks(page: CarolinaPageContent) {
  const isCommercial = page.slug.includes("commercial") || page.slug === "hoa-services";
  return [
    imageHero(page, SERVICE_HERO_IMAGES[page.slug] ?? imagePath("hero-home.png")),
    pageIntro(page),
    contentBlock(page, { commercial: isCommercial }),
    block("carolina-cta", {
      heading: isCommercial
        ? "Ready for a clearer commercial landscape plan?"
        : "Ready to improve your property?",
      subheading: isCommercial
        ? "Request a commercial assessment and proposal tailored to your site, schedule, and property goals."
        : "Tell us what you need, and Carolina Exterior will follow up with a practical next step for your property.",
      primaryText:
        CAROLINA_SALES_PAGE_DESIGN[page.slug]?.quoteLabel ??
        (isCommercial ? "REQUEST PROPOSAL" : "GET A QUOTE"),
      primaryLink:
        CAROLINA_SALES_PAGE_DESIGN[page.slug]?.quoteLink ??
        (isCommercial ? "/commercial-quote" : "/get-a-quote"),
      secondaryText: "",
      secondaryLink: "",
      pageSlug: page.slug,
    }),
  ];
}

function buildServiceAreasBlocks(page: CarolinaPageContent) {
  return [
    imageHero(
      page,
      imagePath("hero-home.png"),
      `Serving ${CAROLINA_BRAND.county} and the greater Charlotte region.`,
    ),
    pageIntro(page),
    contentBlock(page),
    block("carolina-location-grid", {
      heading: "",
      subheading: "",
      items: SERVICE_AREAS.map((area) => ({
        city: area.city,
        state: area.state,
        href: `/service-areas/${area.slug}`,
      })),
    }),
  ];
}

function buildQuoteBlocks(page: CarolinaPageContent, formSlug: string) {
  const firstParagraph =
    page.blocks.find((item) => item.type === "p")?.text ?? "Request a free estimate.";
  return [
    introHero(page, firstParagraph),
    pageIntro(page),
    block("carolina-quote-form", {
      formSlug,
      buttonText:
        formSlug === "commercial-quote" ? "Request Commercial Proposal" : "Submit Request",
    }),
  ];
}

function buildGalleryBlocks(page: CarolinaPageContent, commercial = false) {
  return [
    introHero(
      page,
      commercial
        ? "Professional grounds maintenance, landscape design, and hardscape for businesses and HOAs."
        : "A showcase of our recent landscape and hardscape projects in the Carolina Piedmont.",
    ),
    pageIntro(page),
    block("carolina-gallery-grid", {
      heading: "",
      subheading: "",
      aspect: commercial ? "video" : "square",
      images: commercial
        ? [
            {
              src: imagePath("gallery-com-1.png"),
              alt: "Corporate office park landscaping",
            },
            {
              src: imagePath("gallery-com-2.png"),
              alt: "HOA community entrance landscaping",
            },
            {
              src: imagePath("gallery-com-3.png"),
              alt: "Commercial property hardscape and walkways",
            },
            {
              src: imagePath("hero-commercial.png"),
              alt: "Pristine commercial property grounds",
            },
          ]
        : [
            {
              src: imagePath("gallery-res-1.png"),
              alt: "Beautiful landscape design with retaining wall",
            },
            {
              src: imagePath("gallery-res-2.png"),
              alt: "Striped residential lawn with vibrant flower beds",
            },
            {
              src: imagePath("gallery-res-3.png"),
              alt: "Natural stone patio and outdoor living space",
            },
            {
              src: imagePath("hero-hardscape.png"),
              alt: "Custom hardscape patio",
            },
            {
              src: imagePath("hero-mulch.png"),
              alt: "Freshly mulched garden beds",
            },
            {
              src: imagePath("hero-drainage.png"),
              alt: "Drainage solution installation",
            },
          ],
    }),
  ];
}

function faqsForSlugs(slugs: string[]) {
  return slugs.flatMap((slug) => {
    const page = carolinaPages[slug];
    if (!page) return [];
    return splitFaqs(page.blocks).faqs.map((faq) => ({
      ...faq,
      source: page.h1,
    }));
  });
}

function buildFaqPageBlocks(page: CarolinaPageContent, commercial = false) {
  const slugs = commercial
    ? ["commercial", ...COMMERCIAL_SERVICES.map((service) => service.slug)]
    : RESIDENTIAL_SERVICES.map((service) => service.slug);
  return [
    introHero(
      page,
      commercial
        ? "Answers to common questions about commercial landscaping, HOA care, and site work."
        : "Answers to common questions about our lawn care, landscaping, and hardscape services.",
    ),
    pageIntro(page),
    block("carolina-faq", {
      heading: "",
      subheading: "",
      showSource: true,
      items: faqsForSlugs(slugs),
    }),
  ];
}

function buildBlogIndexBlocks(page: CarolinaPageContent) {
  return [
    introHero(
      page,
      "Expert insights, seasonal tips, and guides for properties in the Carolina Piedmont.",
    ),
    block("carolina-blog-index", {
      posts: carolinaBlogPosts.map((post) => ({
        slug: post.slug,
        h1: post.h1,
        category: post.category,
        excerpt: post.excerpt,
        date: post.date,
        readMinutes: post.readMinutes,
        image: post.image,
      })),
    }),
  ];
}

function buildBlogPostBlocks(
  post: CarolinaPageContent & {
    image: string;
    date: string;
    readMinutes: number;
  },
) {
  return [
    imageHero(post, blogImagePath(post.image), `${post.readMinutes} min read`),
    contentBlock(post, { articleMode: true, inlineCta: false }),
  ];
}

function buildCarolinaPages() {
  const records: InsertCmsPage[] = [];

  for (const page of Object.values(carolinaPages)) {
    if (page.slug === "home") {
      records.push(basePageRecord("home", "Home", page, buildHomeBlocks(page)));
      continue;
    }
    if (page.slug === "about") {
      records.push(basePageRecord("about", "About", page, buildAboutBlocks(page)));
      continue;
    }
    if (page.slug === "service-areas") {
      records.push(
        basePageRecord("service-areas", "Service Areas", page, buildServiceAreasBlocks(page)),
      );
      continue;
    }
    if (page.slug === "get-a-quote") {
      records.push(
        basePageRecord(
          "get-a-quote",
          "Get a Quote",
          page,
          buildQuoteBlocks(page, "residential-quote"),
        ),
      );
      continue;
    }
    if (page.slug === "commercial-quote") {
      records.push(
        basePageRecord(
          "commercial-quote",
          "Commercial Quote",
          page,
          buildQuoteBlocks(page, "commercial-quote"),
        ),
      );
      continue;
    }
    records.push(basePageRecord(page.slug, page.h1, page, buildServiceBlocks(page)));
  }

  const galleryPage = {
    ...carolinaPages.home,
    slug: "gallery",
    h1: "Residential Gallery",
    titleTag: `Residential Portfolio & Gallery | ${CAROLINA_BRAND.name}`,
    metaDescription: `View our recent residential landscaping, hardscape, and lawn maintenance projects across ${CAROLINA_BRAND.region}.`,
  };
  records.push(
    basePageRecord("gallery", "Residential Gallery", galleryPage, buildGalleryBlocks(galleryPage)),
  );

  const commercialPortfolioPage = {
    ...carolinaPages.commercial,
    slug: "commercial-portfolio",
    h1: "Commercial Portfolio",
    titleTag: `Commercial Portfolio | ${CAROLINA_BRAND.name}`,
    metaDescription: `View our recent commercial landscaping, grounds maintenance, and site work projects across ${CAROLINA_BRAND.region}.`,
  };
  records.push(
    basePageRecord(
      "commercial-portfolio",
      "Commercial Portfolio",
      commercialPortfolioPage,
      buildGalleryBlocks(commercialPortfolioPage, true),
    ),
  );

  const blogIndexPage = {
    ...carolinaPages.home,
    slug: "blog",
    h1: "The Landscape Journal",
    titleTag: "Landscaping & Lawn Care Blog | Carolina Exterior",
    metaDescription:
      "Expert advice, tips, and news about landscaping, lawn maintenance, and hardscaping in the Carolina Piedmont region.",
  };
  records.push(basePageRecord("blog", "Blog", blogIndexPage, buildBlogIndexBlocks(blogIndexPage)));

  const faqPage = {
    ...carolinaPages.home,
    slug: "faq",
    h1: "Residential FAQ",
    titleTag: `Residential FAQ | ${CAROLINA_BRAND.name}`,
    metaDescription:
      "Frequently asked questions about residential landscaping and lawn care services.",
  };
  records.push(basePageRecord("faq", "Residential FAQ", faqPage, buildFaqPageBlocks(faqPage)));

  const commercialFaqPage = {
    ...carolinaPages.commercial,
    slug: "commercial-faq",
    h1: "Commercial FAQ",
    titleTag: `Commercial FAQ | ${CAROLINA_BRAND.name}`,
    metaDescription:
      "Frequently asked questions about commercial landscaping, HOA grounds maintenance, and site work services.",
  };
  records.push(
    basePageRecord(
      "commercial-faq",
      "Commercial FAQ",
      commercialFaqPage,
      buildFaqPageBlocks(commercialFaqPage, true),
    ),
  );

  for (const location of carolinaLocations) {
    records.push(
      basePageRecord(
        `service-areas/${location.slug}`,
        `${location.city}, ${location.state}`,
        location,
        [
          imageHero(
            location,
            locationImagePath(location.slug),
            `Landscaping services in ${location.city}, ${location.state}.`,
          ),
          contentBlock(location, { inlineCta: false }),
        ],
      ),
    );
  }

  for (const post of carolinaBlogPosts) {
    records.push(basePageRecord(`blog/${post.slug}`, post.h1, post, buildBlogPostBlocks(post)));
  }

  return records;
}

async function upsertPage(page: InsertCmsPage) {
  const existing = await storage.cmsPages.getPageBySlug(page.slug);

  if (!existing) {
    await storage.cmsPages.createPage(page);
    return "created";
  }

  if (existing.template !== "carolina" || process.env.REFRESH_CAROLINA_CMS === "true") {
    await storage.cmsPages.updatePage(existing.id, page);
    return "updated";
  }

  return "preserved";
}

async function ensureCarolinaReusableSections() {
  const existing = await storage.cmsSections.getAllSections();
  const existingNames = new Set(existing.map((section) => section.name));
  const sections = [
    {
      name: "Carolina - Home Hero",
      description: "Primary Carolina Exterior home hero with quote and story CTAs.",
      category: "hero",
      blocks: buildHomeBlocks(carolinaPages.home).slice(0, 1),
    },
    {
      name: "Carolina - Service Content With Quote CTA",
      description: "Long-form service content with sticky quote call-to-action.",
      category: "content",
      blocks: buildServiceBlocks(carolinaPages["residential-lawn-maintenance"]),
    },
    {
      name: "Carolina - Gallery Grid",
      description: "Residential project gallery grid.",
      category: "content",
      blocks: buildGalleryBlocks({
        ...carolinaPages.home,
        slug: "gallery",
        h1: "Residential Gallery",
      }).slice(1),
    },
    {
      name: "Carolina - Quote Form",
      description: "Styled quote request form using Core Platform managed forms.",
      category: "cta",
      blocks: buildQuoteBlocks(carolinaPages["get-a-quote"], "residential-quote"),
    },
  ];

  let created = 0;
  for (const section of sections) {
    if (existingNames.has(section.name)) continue;
    await storage.cmsSections.createSection(section);
    created += 1;
  }
  return created;
}

export async function ensureCarolinaCmsSite() {
  const pages = buildCarolinaPages();
  const counts = { created: 0, updated: 0, preserved: 0 };

  for (const page of pages) {
    const result = await upsertPage(page);
    counts[result] += 1;
  }

  const sectionsCreated = await ensureCarolinaReusableSections();

  logger.cms.info("Ensured Carolina Exterior CMS site", {
    ...counts,
    sectionsCreated,
    totalPages: pages.length,
  });

  return { ...counts, sectionsCreated, totalPages: pages.length };
}

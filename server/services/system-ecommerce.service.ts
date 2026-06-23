import { storage } from "../storage";

const productImages = {
  workbook: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&h=900&fit=crop",
  course: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&h=900&fit=crop",
  cards: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=1200&h=900&fit=crop",
  toolkit: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&h=900&fit=crop",
  journal: "https://images.unsplash.com/photo-1517842645767-c639042777db?w=1200&h=900&fit=crop",
};

const seededCategories = [
  {
    name: "Guides & Workbooks",
    slug: "guides-workbooks",
    description: "Self-paced resources for reflection, identity work, and guided support.",
    sortOrder: 1,
  },
  {
    name: "Provider Training",
    slug: "professional-training",
    description: "Learning materials for platform-approved providers and teams.",
    sortOrder: 2,
  },
  {
    name: "Team Resources",
    slug: "family-resources",
    description: "Tools for operators, coordinators, and member families.",
    sortOrder: 3,
  },
];

const seededProducts = [
  {
    name: "Core Platform Operations Workbook",
    tagline: "A guided framework for mapping workflows, launch risks, and operational ownership.",
    description:
      "A practical digital workbook for customers, students, and teams. Includes reflection prompts, workflow maps, values work, and launch checklists.",
    price: 4900,
    salePrice: 3900,
    primaryImage: productImages.workbook,
    urlSlug: "core-platform-identity-workbook",
    sku: "CP-WORKBOOK-001",
    tags: ["Featured", "Digital", "Identity", "Workbook"],
    features: [
      "48-page downloadable workbook",
      "Transition mapping prompts",
      "Identity and belonging exercises",
    ],
    included: ["PDF workbook", "Printable worksheets", "Reflection guide"],
    categories: ["guides-workbooks"],
    metaTitle: "Core Platform Operations Workbook",
    metaDescription:
      "A guided workbook for Core Platform operations, onboarding, and transition support.",
  },
  {
    name: "Provider Mini-Course: platform-approved workflows",
    tagline: "A compact training for providers supporting members.",
    description:
      "A self-paced professional learning module introducing Core Platform terminology, review themes, onboarding considerations, and responsive support practices.",
    price: 12900,
    primaryImage: productImages.course,
    urlSlug: "provider-mini-course-core-platform-informed-care",
    sku: "CP-COURSE-101",
    tags: ["Training", "Providers", "Course"],
    features: ["Video lessons", "Reflection prompts", "Practice integration guide"],
    included: ["Course access", "Downloadable notes", "Completion checklist"],
    categories: ["professional-training"],
    metaTitle: "Provider Mini-Course for platform-approved workflows",
    metaDescription: "Self-paced training for providers working with members and global nomads.",
  },
  {
    name: "Team Transition Conversation Cards",
    tagline: "Conversation prompts for international moves, repatriation, and school transitions.",
    description:
      "A printable card deck designed to help families name emotions, compare expectations, and make space for each person during major transitions.",
    price: 2900,
    primaryImage: productImages.cards,
    urlSlug: "team-transition-conversation-cards",
    sku: "CP-CARDS-001",
    tags: ["Family", "Printable", "Transitions"],
    features: [
      "60 conversation prompts",
      "Age-flexible discussion themes",
      "Move-ready printable format",
    ],
    included: ["Printable card deck", "Facilitator notes", "Family check-in template"],
    categories: ["family-resources", "guides-workbooks"],
    metaTitle: "Team Transition Conversation Cards",
    metaDescription: "Printable conversation cards for distributed teams navigating transition.",
  },
  {
    name: "Operations Support Toolkit",
    tagline: "Support international and transitioning students with ready-to-use activities.",
    description:
      "A operations-facing toolkit with group activities, intake prompts, staff discussion guides, and transition support templates.",
    price: 8900,
    primaryImage: productImages.toolkit,
    urlSlug: "operations-provider-toolkit",
    sku: "CP-TOOLKIT-EDU",
    tags: ["Schools", "Toolkit", "Teams"],
    features: ["Group activity plans", "Transition worksheet", "Staff discussion guide"],
    included: ["Toolkit PDF", "Editable templates", "Implementation guide"],
    categories: ["professional-training", "family-resources"],
    metaTitle: "Organization Support Core Platform Toolkit",
    metaDescription:
      "A toolkit for organization teams supporting international and transitioning students.",
  },
  {
    name: "Launch Reflection Journal",
    tagline: "A gentle journaling companion for seasons of operational transition.",
    description:
      "A reflective digital journal with guided prompts for goals, tradeoffs, ownership, community, and creating rituals of belonging.",
    price: 2400,
    primaryImage: productImages.journal,
    urlSlug: "launch-reflection-journal",
    sku: "CP-JOURNAL-001",
    tags: ["Journal", "Reflection", "Digital"],
    features: ["30 guided prompts", "Weekly reflection pages", "Portable belonging exercises"],
    included: ["PDF journal", "Print-friendly layout", "Digital note-taking version"],
    categories: ["guides-workbooks"],
    metaTitle: "Launch Reflection Journal",
    metaDescription: "A guided reflection journal for launch planning and operations.",
  },
];

export async function ensureSystemEcommerce() {
  const existingCategories = await storage.ecommerce.getCategories(false);
  const categoryBySlug = new Map(existingCategories.map((category) => [category.slug, category]));

  for (const category of seededCategories) {
    const existingCategory = categoryBySlug.get(category.slug);
    if (existingCategory) {
      await storage.ecommerce.updateCategory(existingCategory.id, category);
    } else {
      const created = await storage.ecommerce.createCategory({ ...category, active: true });
      categoryBySlug.set(created.slug, created);
    }
  }

  const existingProducts = await storage.ecommerce.getProducts();
  const productSlugs = new Set(existingProducts.map((product) => product.urlSlug));
  const productBySku = new Map(existingProducts.map((product) => [product.sku, product]));
  for (const product of seededProducts) {
    const categoryIds = product.categories
      .map((slug) => categoryBySlug.get(slug)?.id)
      .filter((id): id is string => Boolean(id));
    const existingProduct = productBySku.get(product.sku);
    if (existingProduct) {
      await storage.ecommerce.updateProduct(
        existingProduct.id,
        {
          name: product.name,
          tagline: product.tagline,
          description: product.description,
          price: product.price,
          salePrice: product.salePrice,
          primaryImage: product.primaryImage,
          features: product.features,
          included: product.included,
          sku: product.sku,
          tags: product.tags,
          urlSlug: product.urlSlug,
          metaTitle: product.metaTitle,
          metaDescription: product.metaDescription,
          metaKeywords: "Core Platform, ecommerce, digital resources",
          ogTitle: product.metaTitle,
          ogDescription: product.metaDescription,
          ogImage: product.primaryImage,
        },
        categoryIds,
      );
      continue;
    }
    if (productSlugs.has(product.urlSlug)) continue;
    await storage.ecommerce.createProduct(
      {
        name: product.name,
        tagline: product.tagline,
        description: product.description,
        price: product.price,
        salePrice: product.salePrice,
        primaryImage: product.primaryImage,
        secondaryImages: [],
        features: product.features,
        included: product.included,
        active: true,
        status: "published",
        sku: product.sku,
        tags: product.tags,
        discountType: "NONE",
        urlSlug: product.urlSlug,
        robotsIndex: true,
        robotsFollow: true,
        metaTitle: product.metaTitle,
        metaDescription: product.metaDescription,
        metaKeywords: "Core Platform, ecommerce, digital resources",
        ogTitle: product.metaTitle,
        ogDescription: product.metaDescription,
        ogImage: product.primaryImage,
      },
      categoryIds,
    );
  }
}

import { storage } from "../storage";
import type { InsertPortfolioProject } from "@shared/schema";

const now = new Date();

const portfolioImage = (id: string, width = 1600, height = 1100) =>
  `https://images.unsplash.com/${id}?w=${width}&h=${height}&fit=crop&auto=format`;

const seededPortfolioProjects: InsertPortfolioProject[] = [
  {
    title: "Aster House Mixed-Use Residences",
    slug: "aster-house-mixed-use-residences",
    subtitle:
      "A boutique urban development built around walkability, daylight, and flexible ground-floor retail.",
    location: "Austin, TX",
    industry: "real_estate",
    projectType: "Mixed-Use Development",
    clientName: "Aster Urban Partners",
    services: ["Brand positioning", "Leasing story", "Photography direction", "Launch page"],
    technologies: [],
    categories: ["Residential", "Real Estate", "Brand Launch"],
    tags: ["adaptive reuse", "urban infill", "amenity strategy"],
    status: "published",
    visibility: "public",
    featured: true,
    sortOrder: 1,
    startedAt: new Date("2025-02-01"),
    completedAt: new Date("2025-11-01"),
    publishedAt: now,
    summary:
      "A high-touch case study for a 64-unit mixed-use residence that needed to communicate quiet luxury without losing its neighborhood roots.",
    description:
      "<p>Aster House needed a portfolio story that balanced developer credibility, residential warmth, and the practical details leasing teams rely on. The final presentation emphasized walkable access, durable material choices, and a flexible retail frontage that keeps the building active throughout the day.</p>",
    challenge:
      "<p>The project had strong architectural fundamentals, but early marketing assets read like separate pieces: renderings, leasing notes, and investor language. The work was to turn that raw material into one clear narrative.</p>",
    solution:
      "<p>We built a case-study system around three proof points: neighborhood connection, resident experience, and long-term asset value. Each section paired concise copy with large-format imagery and measurable project details.</p>",
    results:
      "<p>The finished portfolio entry gave stakeholders a polished reference for leasing conversations, investor updates, and future municipal presentations.</p>",
    testimonial:
      "The case study finally made the project feel as considered online as it does in person.",
    testimonialAuthor: "Managing Partner, Aster Urban Partners",
    heroImageUrl: portfolioImage("photo-1486406146926-c627a92ad1ab"),
    heroImageAlt: "Modern mixed-use residential building exterior",
    gallery: [
      {
        url: portfolioImage("photo-1494526585095-c41746248156"),
        alt: "Residential lounge with natural light",
        caption: "Amenity spaces positioned around daily resident rituals.",
      },
      {
        url: portfolioImage("photo-1518005020951-eccb494ad742"),
        alt: "Contemporary building facade detail",
        caption: "Material palette designed to feel warm, durable, and civic.",
      },
    ],
    videos: [],
    sections: [
      {
        title: "Positioning",
        body: "<p>The project was positioned as a calm, design-forward home base for residents who want city access without high-rise anonymity.</p>",
      },
      {
        title: "Story System",
        body: "<p>Each section can be reused by leasing, investor relations, and municipal outreach without rewriting the core message.</p>",
      },
    ],
    metrics: [
      {
        value: "64",
        label: "Residences",
        description: "Boutique-scale homes above active retail.",
      },
      {
        value: "18k",
        label: "Retail Sq Ft",
        description: "Ground-floor frontage planned for neighborhood services.",
      },
      {
        value: "4",
        label: "Stakeholder Decks",
        description: "Unified around one project narrative.",
      },
    ],
    ctaLabel: "Discuss a Real Estate Portfolio",
    ctaUrl: "/contact",
    metaTitle: "Aster House Mixed-Use Residences",
    metaDescription: "Portfolio case study for a boutique mixed-use real estate development.",
    noindex: false,
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Northline Commerce Platform",
    slug: "northline-commerce-platform",
    subtitle: "A conversion-focused storefront and operations layer for a specialty product brand.",
    location: "Remote / Chicago, IL",
    industry: "web_development",
    projectType: "Web Application",
    clientName: "Northline Supply Co.",
    services: ["UX strategy", "Frontend build", "Checkout optimization", "Analytics"],
    technologies: ["React", "Node.js", "PostgreSQL", "Stripe"],
    categories: ["Web Development", "Ecommerce", "SaaS"],
    tags: ["checkout", "catalog", "analytics"],
    status: "published",
    visibility: "public",
    featured: false,
    sortOrder: 2,
    startedAt: new Date("2025-03-01"),
    completedAt: new Date("2025-07-01"),
    publishedAt: now,
    summary:
      "A modern commerce experience built to help a catalog-heavy brand make product discovery faster and operations cleaner.",
    description:
      "<p>Northline needed a storefront that could carry deep product details without overwhelming first-time buyers. The final build combined a focused catalog, quick cart interactions, and admin-friendly order data.</p>",
    challenge:
      "<p>The existing experience forced customers through too many steps before they could compare product options or understand shipping constraints.</p>",
    solution:
      "<p>We reorganized product families, improved comparison cues, tightened checkout, and added operational views for customer service follow-up.</p>",
    results:
      "<p>The new experience reduced support questions and gave the team a more reliable foundation for future product launches.</p>",
    testimonial: "The new site gave customers confidence and gave our team breathing room.",
    testimonialAuthor: "Director of Operations, Northline Supply Co.",
    heroImageUrl: portfolioImage("photo-1460925895917-afdab827c52f"),
    heroImageAlt: "Analytics dashboard on a laptop",
    gallery: [
      {
        url: portfolioImage("photo-1498050108023-c5249f4df085"),
        alt: "Developer workspace",
        caption: "Reusable components for catalog and checkout workflows.",
      },
      {
        url: portfolioImage("photo-1551288049-bebda4e38f71"),
        alt: "Data dashboard charts",
        caption: "Operational reporting surfaced from reviewed order data.",
      },
    ],
    videos: [
      {
        title: "Platform Walkthrough",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        posterUrl: portfolioImage("photo-1551434678-e076c223a692"),
        caption: "Demo placeholder for video rendering tests.",
      },
    ],
    sections: [
      {
        title: "Architecture",
        body: "<p>The project used a modular service boundary so catalog, checkout, and customer account features could evolve independently.</p>",
      },
    ],
    metrics: [
      {
        value: "28%",
        label: "Fewer Support Tickets",
        description: "Common product questions were handled in-page.",
      },
      { value: "3", label: "Checkout Steps", description: "Reduced from a longer legacy flow." },
    ],
    ctaLabel: "Plan a Web Platform",
    ctaUrl: "/contact",
    metaTitle: "Northline Commerce Platform",
    metaDescription: "Portfolio case study for a React ecommerce platform.",
    noindex: false,
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Lumen Field Notes Collection",
    slug: "lumen-field-notes-collection",
    subtitle: "A digital portfolio and exhibition archive for a multidisciplinary artist.",
    location: "Portland, OR",
    industry: "artist_creative",
    projectType: "Artist Portfolio",
    clientName: "Mara Lumen Studio",
    services: ["Portfolio system", "Collection taxonomy", "Image sequencing", "Exhibition archive"],
    technologies: ["CMS", "Responsive gallery"],
    categories: ["Creative", "Artist", "Gallery"],
    tags: ["exhibition", "mixed media", "archive"],
    status: "published",
    visibility: "public",
    featured: false,
    sortOrder: 3,
    startedAt: new Date("2025-01-01"),
    completedAt: new Date("2025-04-01"),
    publishedAt: now,
    summary:
      "A serene portfolio archive designed to let artwork, process notes, and exhibition history coexist without visual noise.",
    description:
      "<p>The studio needed a site structure that could support individual works, collections, press references, and upcoming exhibitions while staying visually restrained.</p>",
    challenge:
      "<p>Previous portfolio updates were difficult because each exhibition required a custom layout and manual cross-linking.</p>",
    solution:
      "<p>We created a repeatable case-study format with collection-level galleries, short curatorial notes, and flexible sections for process documentation.</p>",
    results:
      "<p>The artist can now publish new bodies of work quickly while preserving a consistent visual rhythm across the archive.</p>",
    testimonial: "It feels like a quiet room for the work, which is exactly what I wanted.",
    testimonialAuthor: "Mara Lumen",
    heroImageUrl: portfolioImage("photo-1541961017774-22349e4a1262"),
    heroImageAlt: "Gallery wall with framed artwork",
    gallery: [
      {
        url: portfolioImage("photo-1500530855697-b586d89ba3ee"),
        alt: "Open creative studio space",
        caption: "Studio documentation supports the finished collection.",
      },
      {
        url: portfolioImage("photo-1492447166138-50c3889fccb1"),
        alt: "Framed artwork detail",
        caption: "Image sequencing designed for both mobile and desktop viewing.",
      },
    ],
    videos: [],
    sections: [
      {
        title: "Curatorial Notes",
        body: "<p>Short text modules give context without competing with the images.</p>",
      },
    ],
    metrics: [
      {
        value: "42",
        label: "Works Archived",
        description: "Organized across collections and exhibitions.",
      },
      { value: "6", label: "Gallery Templates", description: "Reusable presentation patterns." },
    ],
    ctaLabel: "Build an Artist Portfolio",
    ctaUrl: "/contact",
    metaTitle: "Lumen Field Notes Collection",
    metaDescription: "Portfolio case study for an artist archive and gallery site.",
    noindex: false,
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Cedar & Stone Private Villas",
    slug: "cedar-stone-private-villas",
    subtitle: "A real estate portfolio entry for a hospitality-minded residential development.",
    location: "Bend, OR",
    industry: "real_estate",
    projectType: "Luxury Residential",
    clientName: "Cedar & Stone Development",
    services: ["Case study copy", "Amenities storytelling", "Gallery sequencing"],
    technologies: [],
    categories: ["Residential", "Hospitality", "Real Estate"],
    tags: ["luxury", "villas", "mountain living"],
    status: "published",
    visibility: "public",
    featured: false,
    sortOrder: 4,
    startedAt: new Date("2024-10-01"),
    completedAt: new Date("2025-06-01"),
    publishedAt: now,
    summary:
      "A portfolio story for private villas designed around seasonal living, retreat hospitality, and long-view material choices.",
    description:
      "<p>The project needed to communicate privacy and landscape connection without feeling generic or overproduced.</p>",
    challenge:
      "<p>Hospitality cues, ownership value, and architectural restraint had to come through in a concise case study.</p>",
    solution:
      "<p>We paired development facts with experiential copy and a gallery sequence that moves from arrival to interior calm.</p>",
    results:
      "<p>The finished project page supports buyer conversations and partner presentations.</p>",
    testimonial: "",
    testimonialAuthor: "",
    heroImageUrl: portfolioImage("photo-1505693416388-ac5ce068fe85"),
    heroImageAlt: "Warm modern villa interior",
    gallery: [
      {
        url: portfolioImage("photo-1512917774080-9991f1c4c750"),
        alt: "Modern house exterior",
        caption: "Arrival story focused on landscape and privacy.",
      },
      {
        url: portfolioImage("photo-1600585154340-be6161a56a0c"),
        alt: "Contemporary home exterior at dusk",
        caption: "Evening visuals reinforce the retreat atmosphere.",
      },
    ],
    videos: [],
    sections: [],
    metrics: [
      { value: "12", label: "Private Villas", description: "Low-density ownership model." },
      { value: "3", label: "Amenity Zones", description: "Wellness, gathering, and trail access." },
    ],
    ctaLabel: "",
    ctaUrl: "",
    metaTitle: "Cedar & Stone Private Villas",
    metaDescription: "Real estate portfolio case study for private villa development.",
    noindex: false,
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Atlas Health Provider Portal",
    slug: "atlas-health-provider-portal",
    subtitle: "A secure operational dashboard for care coordination and provider workflows.",
    location: "Remote / Boston, MA",
    industry: "web_development",
    projectType: "SaaS Dashboard",
    clientName: "Atlas Health Collective",
    services: ["Product strategy", "Dashboard UX", "Role-based workflows", "Implementation"],
    technologies: ["React", "Express", "PostgreSQL"],
    categories: ["SaaS", "Healthcare", "Operations"],
    tags: ["dashboard", "workflow", "healthcare"],
    status: "published",
    visibility: "public",
    featured: false,
    sortOrder: 5,
    startedAt: new Date("2025-04-01"),
    completedAt: new Date("2025-09-01"),
    publishedAt: now,
    summary:
      "A work-focused provider portal designed for repeated daily use by clinical operations teams.",
    description:
      "<p>Atlas needed to move core coordination workflows out of spreadsheets and into a calmer, permission-aware interface.</p>",
    challenge:
      "<p>Dense operational data needed to be scannable without turning into a maze of cards and modals.</p>",
    solution:
      "<p>We designed compact tables, focused detail drawers, and clear status transitions around the team’s real operating rhythm.</p>",
    results:
      "<p>The portal reduced context switching and gave managers a stronger view of bottlenecks.</p>",
    testimonial: "The interface respects the seriousness of the work and still feels fast.",
    testimonialAuthor: "Clinical Operations Lead, Atlas Health Collective",
    heroImageUrl: portfolioImage("photo-1551434678-e076c223a692"),
    heroImageAlt: "Team reviewing a digital dashboard",
    gallery: [
      {
        url: portfolioImage("photo-1553877522-43269d4ea984"),
        alt: "Team collaborating on product workflow",
        caption: "Workflow mapping with operations leads.",
      },
      {
        url: portfolioImage("photo-1551288049-bebda4e38f71"),
        alt: "Dashboard analytics",
        caption: "Manager-facing performance and queue views.",
      },
    ],
    videos: [],
    sections: [
      {
        title: "Operational Design",
        body: "<p>The UI prioritizes scanning, assignment clarity, and safe state changes over decorative dashboard flourishes.</p>",
      },
    ],
    metrics: [
      {
        value: "41%",
        label: "Less Manual Tracking",
        description: "Measured against weekly coordination tasks.",
      },
      { value: "9", label: "Core Workflows", description: "Moved into one system." },
    ],
    ctaLabel: "Design an Operations Tool",
    ctaUrl: "/contact",
    metaTitle: "Atlas Health Provider Portal",
    metaDescription: "SaaS dashboard portfolio case study for healthcare operations.",
    noindex: false,
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Foundry Launch Identity",
    slug: "foundry-launch-identity",
    subtitle: "A brand and launch portfolio for a founder advisory studio.",
    location: "New York, NY",
    industry: "generic",
    projectType: "Brand Launch",
    clientName: "Foundry Advisory",
    services: ["Naming support", "Launch messaging", "Website direction", "Case-study system"],
    technologies: ["CMS", "Analytics"],
    categories: ["Brand", "Professional Services", "Launch"],
    tags: ["identity", "consulting", "positioning"],
    status: "published",
    visibility: "public",
    featured: false,
    sortOrder: 6,
    startedAt: new Date("2025-05-01"),
    completedAt: new Date("2025-08-01"),
    publishedAt: now,
    summary:
      "A crisp service-business launch that translated deep founder expertise into clear offers and proof-led case studies.",
    description:
      "<p>Foundry needed to look established from day one without pretending to be a large agency.</p>",
    challenge:
      "<p>The founder’s expertise was broad, but the launch needed a narrow, memorable offer structure.</p>",
    solution:
      "<p>We built a message hierarchy, proof points, and a compact portfolio framework for future advisory wins.</p>",
    results:
      "<p>The final launch gave prospects an easy way to understand fit, process, and next steps.</p>",
    testimonial: "",
    testimonialAuthor: "",
    heroImageUrl: portfolioImage("photo-1497366754035-f200968a6e72"),
    heroImageAlt: "Modern professional services workspace",
    gallery: [
      {
        url: portfolioImage("photo-1497366811353-6870744d04b2"),
        alt: "Conference room interior",
        caption: "Visual direction balanced trust and momentum.",
      },
    ],
    videos: [],
    sections: [],
    metrics: [
      { value: "5", label: "Core Offers", description: "Clarified for launch." },
      {
        value: "2 wk",
        label: "Messaging Sprint",
        description: "From audit to approved copy platform.",
      },
    ],
    ctaLabel: "",
    ctaUrl: "",
    metaTitle: "Foundry Launch Identity",
    metaDescription: "Professional services portfolio case study for a brand launch.",
    noindex: false,
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Solstice Ceramic Series",
    slug: "solstice-ceramic-series",
    subtitle: "A tactile collection archive for a ceramic artist and small-batch studio.",
    location: "Santa Fe, NM",
    industry: "artist_creative",
    projectType: "Collection Archive",
    clientName: "Solstice Clay Studio",
    services: ["Collection story", "Gallery structure", "Studio process writing"],
    technologies: ["CMS Gallery"],
    categories: ["Creative", "Ceramics", "Collection"],
    tags: ["ceramics", "studio", "craft"],
    status: "published",
    visibility: "public",
    featured: false,
    sortOrder: 7,
    startedAt: new Date("2024-12-01"),
    completedAt: new Date("2025-03-01"),
    publishedAt: now,
    summary:
      "A warm collection page designed to show finished ceramic work alongside process details and exhibition context.",
    description:
      "<p>The studio needed a portfolio format that could carry material details, edition notes, and poetic collection text.</p>",
    challenge:
      "<p>Product-style layouts made the work feel too commercial, while editorial pages hid practical details collectors needed.</p>",
    solution:
      "<p>We created a collection-first case study with gallery captions, process notes, and simple metadata.</p>",
    results:
      "<p>The artist can now share collections with galleries, buyers, and press using one durable reference page.</p>",
    testimonial: "",
    testimonialAuthor: "",
    heroImageUrl: portfolioImage("photo-1493106819501-66d381c466f1"),
    heroImageAlt: "Handmade ceramic vessels",
    gallery: [
      {
        url: portfolioImage("photo-1523413651479-597eb2da0ad6"),
        alt: "Studio shelves with ceramics",
        caption: "Studio context gives the collection material depth.",
      },
      {
        url: portfolioImage("photo-1501004318641-b39e6451bec6"),
        alt: "Clay-toned objects and plants",
        caption: "A restrained palette supports the work.",
      },
    ],
    videos: [],
    sections: [],
    metrics: [
      { value: "28", label: "Pieces", description: "Documented in the series." },
      { value: "4", label: "Process Notes", description: "Reusable editorial sections." },
    ],
    ctaLabel: "Plan a Creative Archive",
    ctaUrl: "/contact",
    metaTitle: "Solstice Ceramic Series",
    metaDescription: "Artist portfolio case study for a ceramic collection archive.",
    noindex: false,
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Harborline Leasing Microsite",
    slug: "harborline-leasing-microsite",
    subtitle: "A fast-moving leasing site for a waterfront commercial redevelopment.",
    location: "Charleston, SC",
    industry: "real_estate",
    projectType: "Commercial Redevelopment",
    clientName: "Harborline Group",
    services: ["Microsite strategy", "Interactive content", "Lead capture", "Asset packaging"],
    technologies: ["React", "CMS"],
    categories: ["Commercial", "Real Estate", "Leasing"],
    tags: ["waterfront", "leasing", "redevelopment"],
    status: "published",
    visibility: "public",
    featured: false,
    sortOrder: 8,
    startedAt: new Date("2025-02-01"),
    completedAt: new Date("2025-05-01"),
    publishedAt: now,
    summary:
      "A leasing-focused project page for a commercial redevelopment with strong location advantages and flexible tenant stories.",
    description:
      "<p>Harborline needed a public-facing presentation before final photography was complete.</p>",
    challenge:
      "<p>The site had to support broker outreach with partial assets and evolving floor plate details.</p>",
    solution:
      "<p>We structured the page around location, tenant flexibility, and phased updates so the site could mature with the project.</p>",
    results: "<p>The microsite created a polished destination for early leasing conversations.</p>",
    testimonial: "",
    testimonialAuthor: "",
    heroImageUrl: portfolioImage("photo-1500534314209-a25ddb2bd429"),
    heroImageAlt: "Waterfront district and buildings",
    gallery: [
      {
        url: portfolioImage("photo-1449824913935-59a10b8d2000"),
        alt: "Urban street and commercial buildings",
        caption: "Location story anchored broker conversations.",
      },
      {
        url: portfolioImage("photo-1486406146926-c627a92ad1ab"),
        alt: "Commercial building exterior",
        caption: "Architecture visuals supported early leasing outreach.",
      },
    ],
    videos: [],
    sections: [],
    metrics: [
      { value: "92k", label: "Leasable Sq Ft", description: "Across phased commercial spaces." },
      { value: "5", label: "Tenant Profiles", description: "Built into the leasing story." },
    ],
    ctaLabel: "",
    ctaUrl: "",
    metaTitle: "Harborline Leasing Microsite",
    metaDescription: "Commercial real estate portfolio case study for a leasing microsite.",
    noindex: false,
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Greenroom Booking Engine",
    slug: "greenroom-booking-engine",
    subtitle: "A streamlined scheduling and intake experience for a boutique production studio.",
    location: "Los Angeles, CA",
    industry: "web_development",
    projectType: "Booking Platform",
    clientName: "Greenroom Studio",
    services: ["Booking UX", "Availability model", "Payment workflow", "Admin tools"],
    technologies: ["React", "Stripe", "PostgreSQL"],
    categories: ["Web Development", "Booking", "Creative Operations"],
    tags: ["scheduling", "payments", "studio"],
    status: "published",
    visibility: "public",
    featured: false,
    sortOrder: 9,
    startedAt: new Date("2025-06-01"),
    completedAt: new Date("2025-10-01"),
    publishedAt: now,
    summary:
      "A booking platform that made studio availability, deposits, and production intake clearer for both clients and staff.",
    description:
      "<p>Greenroom’s manual scheduling process created delays and repeated back-and-forth before clients could reserve space.</p>",
    challenge:
      "<p>The team needed to preserve a consultative sales process while reducing repetitive coordination.</p>",
    solution:
      "<p>We designed a guided booking flow with intake questions, deposit handling, and a staff-facing queue for follow-up.</p>",
    results:
      "<p>Clients got clearer next steps and staff gained a reliable operational source of truth.</p>",
    testimonial:
      "It took the stress out of the first conversation without making the experience feel automated.",
    testimonialAuthor: "Studio Manager, Greenroom Studio",
    heroImageUrl: portfolioImage("photo-1497366754035-f200968a6e72"),
    heroImageAlt: "Creative studio booking workspace",
    gallery: [
      {
        url: portfolioImage("photo-1497366811353-6870744d04b2"),
        alt: "Production meeting room",
        caption: "Booking flows were grounded in real studio operations.",
      },
    ],
    videos: [],
    sections: [],
    metrics: [
      {
        value: "36%",
        label: "Faster Intake",
        description: "Average time from inquiry to qualified booking.",
      },
      { value: "7", label: "Room Types", description: "Modeled with distinct booking rules." },
    ],
    ctaLabel: "Build a Booking Flow",
    ctaUrl: "/contact",
    metaTitle: "Greenroom Booking Engine",
    metaDescription: "Booking platform portfolio case study for a production studio.",
    noindex: false,
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Kin & County Editorial Portfolio",
    slug: "kin-county-editorial-portfolio",
    subtitle: "A narrative portfolio for an editorial photographer moving into commercial work.",
    location: "Nashville, TN",
    industry: "artist_creative",
    projectType: "Photography Portfolio",
    clientName: "Kin & County",
    services: ["Portfolio structure", "Gallery editing", "Commercial positioning"],
    technologies: ["CMS", "Responsive images"],
    categories: ["Photography", "Creative", "Editorial"],
    tags: ["photo", "editorial", "commercial"],
    status: "published",
    visibility: "public",
    featured: false,
    sortOrder: 10,
    startedAt: new Date("2025-03-01"),
    completedAt: new Date("2025-05-01"),
    publishedAt: now,
    summary:
      "A photography portfolio that preserves editorial warmth while making commercial services easier to understand.",
    description:
      "<p>The photographer had strong bodies of work, but prospective commercial clients needed faster proof of range and process.</p>",
    challenge: "<p>The archive was beautiful but hard to scan by service type or use case.</p>",
    solution:
      "<p>We grouped work by story type, added concise project notes, and created calls to action around commercial inquiry paths.</p>",
    results:
      "<p>The portfolio now supports both gallery-style browsing and direct client evaluation.</p>",
    testimonial: "",
    testimonialAuthor: "",
    heroImageUrl: portfolioImage("photo-1492691527719-9d1e07e534b4"),
    heroImageAlt: "Photographer holding a camera",
    gallery: [
      {
        url: portfolioImage("photo-1500530855697-b586d89ba3ee"),
        alt: "Editorial landscape scene",
        caption: "Editorial pacing preserved across commercial categories.",
      },
      {
        url: portfolioImage("photo-1492447166138-50c3889fccb1"),
        alt: "Framed visual composition",
        caption: "Gallery rhythm designed for mobile inspection.",
      },
    ],
    videos: [],
    sections: [],
    metrics: [
      { value: "9", label: "Story Types", description: "Grouped for faster client review." },
      { value: "120+", label: "Images Reviewed", description: "Edited into focused galleries." },
    ],
    ctaLabel: "",
    ctaUrl: "",
    metaTitle: "Kin & County Editorial Portfolio",
    metaDescription: "Photography portfolio case study for editorial and commercial work.",
    noindex: false,
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Waypoint Partner Program",
    slug: "waypoint-partner-program",
    subtitle: "A service portfolio entry for a B2B partner enablement initiative.",
    location: "Denver, CO",
    industry: "generic",
    projectType: "Program Launch",
    clientName: "Waypoint Systems",
    services: ["Program positioning", "Partner content", "Landing page", "Case-study framework"],
    technologies: ["CMS", "CRM Forms"],
    categories: ["B2B", "Program Launch", "Content"],
    tags: ["partners", "enablement", "B2B"],
    status: "published",
    visibility: "public",
    featured: false,
    sortOrder: 11,
    startedAt: new Date("2025-01-01"),
    completedAt: new Date("2025-04-01"),
    publishedAt: now,
    summary:
      "A partner-program launch package that made eligibility, benefits, and proof points clear for channel teams.",
    description:
      "<p>Waypoint needed to turn internal partner strategy into public-facing content that sales and alliances teams could use immediately.</p>",
    challenge:
      "<p>Existing materials were scattered across decks, spreadsheets, and one-off partner emails.</p>",
    solution:
      "<p>We defined the offer, built reusable proof modules, and created a portfolio-style page that shows program outcomes.</p>",
    results: "<p>The launch gave the team a single source of truth for partner conversations.</p>",
    testimonial: "",
    testimonialAuthor: "",
    heroImageUrl: portfolioImage("photo-1556761175-b413da4baf72"),
    heroImageAlt: "Business team collaborating around a table",
    gallery: [
      {
        url: portfolioImage("photo-1552664730-d307ca884978"),
        alt: "Business workshop",
        caption: "Workshop outputs shaped public-facing partner content.",
      },
    ],
    videos: [],
    sections: [],
    metrics: [
      { value: "3", label: "Partner Tiers", description: "Clarified for launch." },
      { value: "11", label: "Enablement Assets", description: "Mapped to partner journey stages." },
    ],
    ctaLabel: "Shape a Program Launch",
    ctaUrl: "/contact",
    metaTitle: "Waypoint Partner Program",
    metaDescription: "B2B partner program portfolio case study.",
    noindex: false,
    createdBy: null,
    updatedBy: null,
  },
  {
    title: "Riverbend Civic Campus",
    slug: "riverbend-civic-campus",
    subtitle: "A public-private development portfolio story for a community-serving campus.",
    location: "Madison, WI",
    industry: "real_estate",
    projectType: "Civic Development",
    clientName: "Riverbend Development Authority",
    services: ["Stakeholder narrative", "Public presentation", "Project page"],
    technologies: [],
    categories: ["Civic", "Real Estate", "Community"],
    tags: ["campus", "public-private", "community"],
    status: "published",
    visibility: "public",
    featured: false,
    sortOrder: 12,
    startedAt: new Date("2024-08-01"),
    completedAt: new Date("2025-02-01"),
    publishedAt: now,
    summary:
      "A case study that explains a complex civic campus in plain language for residents, partners, and funders.",
    description:
      "<p>The Riverbend project had multiple audiences: residents, funders, city staff, and future tenants.</p>",
    challenge:
      "<p>The story needed enough substance for stakeholders without becoming a technical report.</p>",
    solution:
      "<p>We created a layered case study with summary metrics, community benefits, and a gallery of site and concept visuals.</p>",
    results:
      "<p>The page became a shared reference point for public updates and partner outreach.</p>",
    testimonial: "The project finally had a clear public narrative.",
    testimonialAuthor: "Communications Director, Riverbend Development Authority",
    heroImageUrl: portfolioImage("photo-1487958449943-2429e8be8625"),
    heroImageAlt: "Modern civic architecture exterior",
    gallery: [
      {
        url: portfolioImage("photo-1486406146926-c627a92ad1ab"),
        alt: "Civic building facade",
        caption: "Architecture and access framed for public audiences.",
      },
      {
        url: portfolioImage("photo-1449824913935-59a10b8d2000"),
        alt: "Urban public street",
        caption: "Connectivity was central to the story.",
      },
    ],
    videos: [],
    sections: [
      {
        title: "Community Benefits",
        body: "<p>The case study highlights public access, flexible gathering space, and long-term neighborhood investment.</p>",
      },
    ],
    metrics: [
      { value: "6.5", label: "Acres", description: "Campus site area." },
      {
        value: "4",
        label: "Public Uses",
        description: "Civic, education, recreation, and small business support.",
      },
    ],
    ctaLabel: "",
    ctaUrl: "",
    metaTitle: "Riverbend Civic Campus",
    metaDescription: "Civic real estate development portfolio case study.",
    noindex: false,
    createdBy: null,
    updatedBy: null,
  },
];

export async function ensureSystemPortfolio() {
  for (const project of seededPortfolioProjects) {
    const existing = await storage.portfolio.getProjectBySlug(project.slug);
    if (!existing) {
      await storage.portfolio.createProject(project);
    }
  }
}

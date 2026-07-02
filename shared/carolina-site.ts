export const CAROLINA_BRAND = {
  name: "Carolina Exterior Landscapes",
  shortName: "Carolina Exterior",
  tagline: "Rooted in Carolina. Built for Life.",
  subTagline: "Design / Build / Maintain",
  phoneDisplay: "(704) 975-5867",
  phoneTel: "+17049755867",
  email: "info@carolinaexteriorlandscapes.com",
  website: "CarolinaExteriorLandscapes.com",
  domain: "https://carolinaexteriorlandscapes.com",
  city: "Monroe",
  state: "NC",
  county: "Union County",
  region: "greater Charlotte region",
  addressLocality: "Monroe",
  addressRegion: "NC",
  postalCode: "28110",
  founded: "Locally owned, licensed & insured",
} as const;

export const RESIDENTIAL_SERVICES = [
  {
    slug: "residential-lawn-maintenance",
    name: "Lawn Maintenance",
    short:
      "Our flagship Annual Lawn Maintenance Contract covers mowing, fertilization, weed control, pruning, leaf removal and more, all year.",
  },
  {
    slug: "residential-landscaping",
    name: "Landscaping",
    short:
      "Custom landscape design, planting, and installation built for the Piedmont Carolina climate and your property's conditions.",
  },
  {
    slug: "residential-hardscape",
    name: "Hardscape",
    short:
      "Patios, walkways, retaining walls and steps in pavers, natural stone, concrete and brick, built to last decades.",
  },
  {
    slug: "mulching-and-planting",
    name: "Mulching & Planting",
    short:
      "Fresh mulch, seasonal color, and professionally prepped beds that protect soil, retain moisture and suppress weeds.",
  },
  {
    slug: "drainage-solutions",
    name: "Drainage Solutions",
    short:
      "French drains, grading, catch basins and swales that correct standing water and erosion in Union County clay soils.",
  },
] as const;

export const COMMERCIAL_SERVICES = [
  {
    slug: "commercial-grounds-maintenance",
    name: "Grounds Maintenance",
    short:
      "Dependable, scheduled grounds care for office parks, retail centers and business properties across the Charlotte region.",
  },
  {
    slug: "commercial-landscaping",
    name: "Commercial Landscaping",
    short:
      "Design and installation that elevates curb appeal and signals quality to your customers and tenants.",
  },
  {
    slug: "commercial-hardscape",
    name: "Commercial Hardscape",
    short:
      "Walkways, walls, parking islands and site features engineered for durability and heavy use.",
  },
  {
    slug: "commercial-drainage",
    name: "Drainage & Site Work",
    short:
      "Parking lot, common area and site drainage solutions that protect your property and reduce liability.",
  },
  {
    slug: "hoa-services",
    name: "HOA Services",
    short:
      "Full-service community grounds management with reliable communication boards and managers can count on.",
  },
] as const;

export const SERVICE_AREAS = [
  { slug: "marvin-nc", city: "Marvin", state: "NC" },
  { slug: "wesley-chapel-nc", city: "Wesley Chapel", state: "NC" },
  { slug: "waxhaw-nc", city: "Waxhaw", state: "NC" },
  { slug: "indian-land-sc", city: "Indian Land", state: "SC" },
  { slug: "monroe-nc", city: "Monroe", state: "NC" },
  { slug: "indian-trail-nc", city: "Indian Trail", state: "NC" },
  { slug: "charlotte-nc", city: "Charlotte", state: "NC" },
  { slug: "matthews-nc", city: "Matthews", state: "NC" },
  { slug: "lancaster-sc", city: "Lancaster", state: "SC" },
  { slug: "mineral-springs-nc", city: "Mineral Springs", state: "NC" },
  { slug: "weddington-nc", city: "Weddington", state: "NC" },
] as const;

export const CAROLINA_LOCATION_IMAGES: Record<string, string> = {
  "matthews-nc": "location-matthews-nc.png",
  "monroe-nc": "location-monroe-nc.png",
};

export const CAROLINA_IMAGE_METADATA: Record<
  string,
  { title: string; alt: string; description: string }
> = {
  "residential-lawn-maintenance.jpg": {
    title: "Residential Lawn Maintenance",
    alt: "Freshly mowed residential lawn with crisp edging and maintained planting beds.",
    description:
      "Residential lawn maintenance image for mowing, edging, turf care, and annual contract content.",
  },
  "residential-aeration-overseeding.jpg": {
    title: "Residential Aeration and Overseeding",
    alt: "Residential fescue lawn showing clean core aeration plugs after overseeding preparation.",
    description:
      "Residential lawn care image for aeration, overseeding, and fall turf health service cards.",
  },
  "residential-shrub-pruning.jpg": {
    title: "Residential Shrub Pruning",
    alt: "Neatly pruned shrubs and hedges beside a residential foundation planting bed.",
    description:
      "Residential pruning image for shrub trimming, hedge shaping, and ornamental plant care.",
  },
  "residential-downspout-extension.jpg": {
    title: "Residential Downspout Extension",
    alt: "Residential downspout extended discreetly away from the foundation through a clean drainage outlet.",
    description:
      "Residential drainage image for downspout extensions and roof runoff management copy.",
  },
  "residential-catch-basin.jpg": {
    title: "Residential Catch Basin",
    alt: "Small yard drain catch basin set flush into a residential lawn near a landscape bed.",
    description:
      "Residential drainage image for catch basin installation and low-spot water collection sections.",
  },
  "residential-french-drain.jpg": {
    title: "Residential French Drain",
    alt: "Subtle gravel French drain integrated along a residential lawn and planting bed.",
    description:
      "Residential drainage image for French drain solutions integrated into the landscape.",
  },
  "residential-yard-grading.jpg": {
    title: "Residential Yard Grading",
    alt: "Finished residential lawn graded gently away from the home foundation.",
    description:
      "Residential drainage image for yard grading, regrading, and positive slope corrections.",
  },
  "commercial-hardscape-walkway.jpg": {
    title: "Commercial Hardscape Walkway",
    alt: "Commercial building entrance with a durable walkway, clean curb edges, and maintained landscape beds.",
    description:
      "Commercial hardscape image for walkways, entry features, plazas, and accessible site circulation.",
  },
  "commercial-dumpster-enclosure.jpg": {
    title: "Commercial Dumpster Enclosure",
    alt: "Clean masonry dumpster enclosure with pavement, curbing, and landscape screening at a commercial property.",
    description:
      "Commercial hardscape image for dumpster enclosures, service areas, and site utility improvements.",
  },
  "commercial-drainage-catch-basin.jpg": {
    title: "Commercial Drainage Catch Basin",
    alt: "Commercial parking lot catch basin beside a landscaped island after rainfall.",
    description:
      "Commercial drainage image for parking lot flooding, catch basins, stormwater, and site drainage.",
  },
  "commercial-roof-drainage.jpg": {
    title: "Commercial Roof Drainage",
    alt: "Commercial downspout directed into a discreet drainage inlet beside a building walkway.",
    description:
      "Commercial drainage image for roof drainage, downspout management, and underground drainage inlets.",
  },
  "hoa-common-area-landscaping.jpg": {
    title: "HOA Common Area Landscaping",
    alt: "HOA entrance and common area landscaping with fresh mulch, seasonal color, and maintained turf.",
    description:
      "HOA services image for common areas, entrances, community mulch programs, and board-managed grounds.",
  },
  "commercial-grounds-maintenance.jpg": {
    title: "Commercial Grounds Maintenance",
    alt: "Commercial property with freshly maintained turf, clean sidewalk edges, and professional foundation landscaping.",
    description:
      "Commercial grounds image for recurring mowing, edging, cleanup, and site maintenance programs.",
  },
  "commercial-office-campus.jpg": {
    title: "Commercial Office Campus Landscaping",
    alt: "Office campus landscaping with clean parking lot edges, ornamental trees, and maintained planting beds.",
    description:
      "Commercial office campus image for property-type, corporate campus, and commercial hub content.",
  },
  "commercial-property-management.jpg": {
    title: "Commercial Property Management Site Planning",
    alt: "Commercial landscape plans and service materials staged at a maintained office property.",
    description:
      "Commercial operations image for property manager communication, planning, and site coordination content.",
  },
  "commercial-retail-landscaping.jpg": {
    title: "Commercial Retail Landscaping",
    alt: "Retail center parking island landscaping with seasonal flowers, shrubs, and clean storefront curb appeal.",
    description:
      "Commercial retail image for storefront landscaping, parking lot islands, and seasonal color programs.",
  },
  "commercial-service-territory.jpg": {
    title: "Commercial Service Territory",
    alt: "Commercial corridor with office and retail properties, maintained medians, and landscaped parking areas.",
    description:
      "Commercial territory image for service area, regional coverage, and multi-site property content.",
  },
};

export const VALUE_PROPS = [
  {
    title: "Rooted in Carolina",
    body: "We're proud of where we're from and committed to our community.",
  },
  {
    title: "Crafted with Care",
    body: "Thoughtful design and quality craftsmanship in every detail.",
  },
  {
    title: "Built to Last",
    body: "Durable solutions that stand the test of time and the elements.",
  },
  {
    title: "Outdoor Living",
    body: "Creating beautiful, functional spaces that bring people closer to nature.",
  },
  {
    title: "Local & Reliable",
    body: "We show up, we follow through, and we treat your property like our own.",
  },
] as const;

export const QUOTE_SERVICE_OPTIONS = [
  "Lawn Maintenance (Annual Contract)",
  "Landscaping Design & Installation",
  "Hardscape (Patios, Walkways, Walls)",
  "Mulching & Planting",
  "Drainage Solutions",
  "Aeration & Overseeding",
  "Sod Installation",
  "Other / Not Sure",
] as const;

export const COMMERCIAL_SERVICE_OPTIONS = [
  "Grounds Maintenance",
  "Commercial Landscaping",
  "Commercial Hardscape",
  "Drainage & Site Work",
  "HOA Community Services",
  "Seasonal Color Program",
  "Snow & Ice (Inquire)",
  "Other / Not Sure",
] as const;

export const PROPERTY_TYPES = ["Office", "Retail", "HOA", "Industrial", "Multi-family", "Other"];

export type CarolinaSalesPageDesign = {
  intro: string;
  quoteLink: string;
  quoteLabel: string;
  sectionImages: Record<string, string>;
  sectionModes?: Record<string, "feature" | "grid" | "process" | "problem-solution" | "split">;
};

export const CAROLINA_SALES_PAGE_DESIGN: Record<string, CarolinaSalesPageDesign> = {
  home: {
    intro:
      "Carolina Exterior brings lawn care, landscaping, hardscape, drainage, and commercial grounds work into one reliable outdoor partner for Monroe, Union County, and the greater Charlotte region.",
    quoteLink: "/get-a-quote",
    quoteLabel: "GET A QUOTE",
    sectionImages: {
      default: "hero-home.png",
      services: "card-plant-shrub-installation.png",
      contract: "card-sod-installation.png",
      communities: "gallery-res-2.png",
    },
  },
  about: {
    intro:
      "Carolina Exterior is built around a simple promise: dependable outdoor work, clear communication, and properties that look cared for season after season.",
    quoteLink: "/get-a-quote",
    quoteLabel: "GET A QUOTE",
    sectionImages: {
      default: "gallery-res-1.png",
      story: "gallery-res-2.png",
      mission: "card-plant-shrub-installation.png",
      different: "hero-hardscape.png",
    },
  },
  "residential-lawn-maintenance": {
    intro:
      "A complete annual lawn maintenance contract gives homeowners one dependable plan for mowing, edging, turf health, pruning, leaf removal, and seasonal care.",
    quoteLink: "/get-a-quote",
    quoteLabel: "GET A QUOTE",
    sectionImages: {
      default: "residential-lawn-maintenance.jpg",
      included: "residential-lawn-maintenance.jpg",
      optional: "residential-aeration-overseeding.jpg",
      process: "residential-lawn-maintenance.jpg",
      "what s included in your annual lawn maintenance contract":
        "residential-lawn-maintenance.jpg",
      "optional add on services": "residential-aeration-overseeding.jpg",
      "why choose an annual contract over one time services": "residential-lawn-maintenance.jpg",
      "the carolina exterior lawn care process": "residential-lawn-maintenance.jpg",
    },
  },
  "residential-landscaping": {
    intro:
      "From design through planting and installation, Carolina Exterior creates landscapes that fit your home, your site conditions, and the Piedmont Carolina climate.",
    quoteLink: "/get-a-quote",
    quoteLabel: "GET A QUOTE",
    sectionImages: {
      default: "card-plant-shrub-installation.png",
      services: "card-plant-shrub-installation.png",
      process: "gallery-res-1.png",
      why: "gallery-res-2.png",
      "our residential landscaping services": "card-plant-shrub-installation.png",
      "our landscaping process": "gallery-res-1.png",
      "why carolina exterior for your landscaping project": "gallery-res-2.png",
    },
  },
  "residential-hardscape": {
    intro:
      "Professional hardscape adds structure, usable outdoor living space, and long-term value when it is planned around drainage, grade, materials, and daily use.",
    quoteLink: "/get-a-quote",
    quoteLabel: "GET A QUOTE",
    sectionImages: {
      default: "hero-hardscape.png",
      services: "hero-hardscape.png",
      materials: "hero-hardscape.png",
      process: "gallery-res-1.png",
      "our hardscape services": "hero-hardscape.png",
      "hardscape materials we work with": "hero-hardscape.png",
      "our hardscape installation process": "gallery-res-1.png",
    },
  },
  "mulching-and-planting": {
    intro:
      "Fresh mulch, thoughtful plantings, and clean bed edges quickly make a property feel finished while protecting soil and supporting healthier landscapes.",
    quoteLink: "/get-a-quote",
    quoteLabel: "GET A QUOTE",
    sectionImages: {
      default: "hero-mulch.png",
      mulch: "hero-mulch.png",
      planting: "card-plant-shrub-installation.png",
      programs: "gallery-res-3.png",
      "mulching services": "hero-mulch.png",
      "planting bed services": "card-plant-shrub-installation.png",
      "spring fall mulching programs": "hero-mulch.png",
    },
  },
  "drainage-solutions": {
    intro:
      "Standing water, erosion, soggy turf, and foundation runoff are fixable when drainage is diagnosed from the way water actually moves across the property.",
    quoteLink: "/get-a-quote",
    quoteLabel: "GET A QUOTE",
    sectionImages: {
      default: "hero-drainage.png",
      problems: "hero-drainage.png",
      solutions: "residential-french-drain.jpg",
      swales: "card-swales.png",
      assessment: "residential-yard-grading.jpg",
      "common yard drainage problems we solve": "hero-drainage.png",
      "our drainage solutions": "residential-french-drain.jpg",
      "our drainage assessment process": "residential-yard-grading.jpg",
      "why drainage problems must be fixed": "residential-catch-basin.jpg",
    },
  },
  "service-areas": {
    intro:
      "Carolina Exterior serves homeowners and select commercial properties across Monroe, Union County, and nearby communities in the greater Charlotte region.",
    quoteLink: "/get-a-quote",
    quoteLabel: "GET A QUOTE",
    sectionImages: {
      default: "gallery-res-2.png",
      territory: "hero-home.png",
      areas: "gallery-res-1.png",
      services: "card-plant-shrub-installation.png",
    },
  },
  commercial: {
    intro:
      "For commercial properties, landscaping is part of the first impression, tenant experience, safety picture, and long-term asset value.",
    quoteLink: "/commercial-quote",
    quoteLabel: "REQUEST COMMERCIAL PROPOSAL",
    sectionImages: {
      default: "commercial-office-campus.jpg",
      services: "commercial-grounds-maintenance.jpg",
      areas: "commercial-service-territory.jpg",
      why: "commercial-property-management.jpg",
      managers: "commercial-property-management.jpg",
      "commercial property types we serve": "commercial-office-campus.jpg",
      "our commercial landscaping services": "commercial-grounds-maintenance.jpg",
      "why commercial property managers choose carolina exterior":
        "commercial-property-management.jpg",
      "service territory for commercial properties": "commercial-service-territory.jpg",
      "request a commercial landscaping estimate": "commercial-retail-landscaping.jpg",
    },
  },
  "commercial-grounds-maintenance": {
    intro:
      "A strong commercial grounds program should run on schedule, protect curb appeal, and reduce the amount of attention property managers spend chasing details.",
    quoteLink: "/commercial-quote",
    quoteLabel: "REQUEST COMMERCIAL PROPOSAL",
    sectionImages: {
      default: "commercial-grounds-maintenance.jpg",
      included: "commercial-grounds-maintenance.jpg",
      contract: "commercial-property-management.jpg",
      multisite: "commercial-service-territory.jpg",
      services: "commercial-grounds-maintenance.jpg",
      "what s included in our commercial grounds maintenance program":
        "commercial-grounds-maintenance.jpg",
      "commercial contract options": "commercial-property-management.jpg",
      "multi site property management": "commercial-service-territory.jpg",
      "why consistent grounds maintenance matters": "commercial-grounds-maintenance.jpg",
      "properties we serve in monroe indian trail waxhaw charlotte":
        "commercial-service-territory.jpg",
    },
  },
  "commercial-landscaping": {
    intro:
      "Commercial landscaping should strengthen the brand impression of a property while staying practical, maintainable, and durable through every season.",
    quoteLink: "/commercial-quote",
    quoteLabel: "REQUEST COMMERCIAL PROPOSAL",
    sectionImages: {
      default: "card-commercial-landscaping.png",
      services: "card-commercial-landscaping.png",
      process: "commercial-property-management.jpg",
      property: "card-commercial-landscaping.png",
      "commercial landscaping services we offer": "card-commercial-landscaping.png",
      "the commercial landscaping process": "commercial-property-management.jpg",
      "commercial landscaping across property types": "commercial-retail-landscaping.jpg",
      "serving monroe charlotte indian trail surrounding business communities":
        "commercial-service-territory.jpg",
    },
  },
  "commercial-hardscape": {
    intro:
      "Commercial hardscape needs to look professional, handle heavy use, and respect accessibility, drainage, and site durability from the start.",
    quoteLink: "/commercial-quote",
    quoteLabel: "REQUEST COMMERCIAL PROPOSAL",
    sectionImages: {
      default: "commercial-hardscape-walkway.jpg",
      services: "commercial-hardscape-walkway.jpg",
      materials: "commercial-hardscape-walkway.jpg",
      contractors: "commercial-property-management.jpg",
      "commercial hardscape services": "commercial-hardscape-walkway.jpg",
      "materials for commercial hardscape": "commercial-hardscape-walkway.jpg",
      "ada code compliance": "commercial-hardscape-walkway.jpg",
      "working with general contractors": "commercial-property-management.jpg",
      "commercial hardscape across monroe indian trail waxhaw charlotte":
        "commercial-service-territory.jpg",
    },
  },
  "commercial-drainage": {
    intro:
      "Commercial drainage issues can become property damage, liability exposure, tenant frustration, and maintenance cost if they are not corrected quickly.",
    quoteLink: "/commercial-quote",
    quoteLabel: "REQUEST COMMERCIAL PROPOSAL",
    sectionImages: {
      default: "commercial-drainage-catch-basin.jpg",
      problems: "commercial-drainage-catch-basin.jpg",
      services: "commercial-drainage-catch-basin.jpg",
      swales: "card-swales.png",
      assessment: "commercial-roof-drainage.jpg",
      "commercial drainage problems we solve": "commercial-drainage-catch-basin.jpg",
      "our commercial drainage services": "commercial-drainage-catch-basin.jpg",
      "why commercial drainage problems must be fixed quickly":
        "commercial-drainage-catch-basin.jpg",
      "the commercial drainage assessment process": "commercial-roof-drainage.jpg",
      "drainage projects in monroe waxhaw indian trail charlotte":
        "commercial-service-territory.jpg",
    },
  },
  "hoa-services": {
    intro:
      "HOA communities need a landscape partner that shows up reliably, communicates clearly, and keeps entrances, common areas, and shared grounds consistently presentable.",
    quoteLink: "/commercial-quote",
    quoteLabel: "REQUEST HOA PROPOSAL",
    sectionImages: {
      default: "hoa-common-area-landscaping.jpg",
      services: "hoa-common-area-landscaping.jpg",
      boards: "commercial-property-management.jpg",
      contracts: "commercial-grounds-maintenance.jpg",
      "hoa services we provide": "hoa-common-area-landscaping.jpg",
      "how we work with hoa boards": "commercial-property-management.jpg",
      "flexible hoa contract options": "commercial-property-management.jpg",
      "why hoas in waxhaw weddington marvin trust carolina exterior":
        "hoa-common-area-landscaping.jpg",
      "hoa communities we serve across union county": "commercial-service-territory.jpg",
    },
  },
  "get-a-quote": {
    intro:
      "Requesting a residential quote is simple: tell us about your property, the work you need, and the best way to reach you.",
    quoteLink: "/get-a-quote",
    quoteLabel: "REQUEST A QUOTE",
    sectionImages: { default: "gallery-res-1.png" },
  },
  "commercial-quote": {
    intro:
      "Commercial estimates start with a clear request, a practical site review, and a written proposal tailored to the property.",
    quoteLink: "/commercial-quote",
    quoteLabel: "REQUEST COMMERCIAL PROPOSAL",
    sectionImages: { default: "commercial-property-management.jpg" },
  },
  faq: {
    intro:
      "Get quick answers about residential landscaping, lawn maintenance, hardscape, drainage, and how Carolina Exterior works with local homeowners.",
    quoteLink: "/get-a-quote",
    quoteLabel: "GET A QUOTE",
    sectionImages: { default: "gallery-res-2.png" },
  },
  "commercial-faq": {
    intro:
      "Find answers about commercial landscaping, HOA grounds care, drainage, proposals, scheduling, and service expectations.",
    quoteLink: "/commercial-quote",
    quoteLabel: "REQUEST COMMERCIAL PROPOSAL",
    sectionImages: { default: "commercial-office-campus.jpg" },
  },
};

export function imagePath(filename: string) {
  return `/carolina/${filename}`;
}

export function blogImagePath(filename: string) {
  return `/carolina/blog/${filename}`;
}

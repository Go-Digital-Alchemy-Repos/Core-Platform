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
      default: "card-sod-installation.png",
      included: "card-sod-installation.png",
      optional: "gallery-res-3.png",
      process: "gallery-res-2.png",
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
      materials: "gallery-res-3.png",
      process: "gallery-res-1.png",
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
      solutions: "card-commercial-drainage.png",
      assessment: "gallery-res-1.png",
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
      default: "hero-commercial.png",
      properties: "hero-commercial.png",
      services: "card-commercial-drainage.png",
      managers: "card-hoa-entry-signage.png",
    },
  },
  "commercial-grounds-maintenance": {
    intro:
      "A strong commercial grounds program should run on schedule, protect curb appeal, and reduce the amount of attention property managers spend chasing details.",
    quoteLink: "/commercial-quote",
    quoteLabel: "REQUEST COMMERCIAL PROPOSAL",
    sectionImages: {
      default: "hero-commercial.png",
      included: "hero-commercial.png",
      contract: "gallery-com-2.png",
      multisite: "gallery-com-1.png",
    },
  },
  "commercial-landscaping": {
    intro:
      "Commercial landscaping should strengthen the brand impression of a property while staying practical, maintainable, and durable through every season.",
    quoteLink: "/commercial-quote",
    quoteLabel: "REQUEST COMMERCIAL PROPOSAL",
    sectionImages: {
      default: "hero-commercial.png",
      services: "gallery-com-1.png",
      process: "card-plant-shrub-installation.png",
      property: "card-hoa-entry-signage.png",
    },
  },
  "commercial-hardscape": {
    intro:
      "Commercial hardscape needs to look professional, handle heavy use, and respect accessibility, drainage, and site durability from the start.",
    quoteLink: "/commercial-quote",
    quoteLabel: "REQUEST COMMERCIAL PROPOSAL",
    sectionImages: {
      default: "hero-hardscape.png",
      services: "hero-hardscape.png",
      materials: "gallery-com-3.png",
      contractors: "gallery-com-1.png",
    },
  },
  "commercial-drainage": {
    intro:
      "Commercial drainage issues can become property damage, liability exposure, tenant frustration, and maintenance cost if they are not corrected quickly.",
    quoteLink: "/commercial-quote",
    quoteLabel: "REQUEST COMMERCIAL PROPOSAL",
    sectionImages: {
      default: "card-commercial-drainage.png",
      problems: "card-commercial-drainage.png",
      services: "hero-drainage.png",
      assessment: "gallery-com-2.png",
    },
  },
  "hoa-services": {
    intro:
      "HOA communities need a landscape partner that shows up reliably, communicates clearly, and keeps entrances, common areas, and shared grounds consistently presentable.",
    quoteLink: "/commercial-quote",
    quoteLabel: "REQUEST HOA PROPOSAL",
    sectionImages: {
      default: "card-hoa-entry-signage.png",
      services: "card-hoa-entry-signage.png",
      boards: "gallery-com-2.png",
      contracts: "hero-commercial.png",
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
    sectionImages: { default: "hero-commercial.png" },
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
    sectionImages: { default: "hero-commercial.png" },
  },
};

export function imagePath(filename: string) {
  return `/carolina/${filename}`;
}

export function blogImagePath(filename: string) {
  return `/carolina/blog/${filename}`;
}

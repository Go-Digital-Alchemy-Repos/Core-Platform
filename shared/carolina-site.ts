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
  { slug: "lancaster-sc", city: "Lancaster", state: "SC" },
  { slug: "mineral-springs-nc", city: "Mineral Springs", state: "NC" },
  { slug: "weddington-nc", city: "Weddington", state: "NC" },
] as const;

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

export function imagePath(filename: string) {
  return `/carolina/${filename}`;
}

export function blogImagePath(filename: string) {
  return `/carolina/blog/${filename}`;
}

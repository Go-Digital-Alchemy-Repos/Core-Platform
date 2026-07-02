import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Factory,
  FileText,
  HeartPulse,
  MapPin,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Tag,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicFormRenderer } from "@/components/forms/public-form-renderer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CAROLINA_BRAND,
  CAROLINA_IMAGE_METADATA,
  CAROLINA_LOCATION_IMAGES,
  CAROLINA_SALES_PAGE_DESIGN,
  SERVICE_AREAS,
  blogImagePath,
  imagePath,
} from "@shared/carolina-site";
import { carolinaBlogPosts } from "@shared/carolina-content";

type Props = Record<string, unknown>;
type RichContentNode = {
  tag: "p" | "h2" | "h3" | "ul" | "ol";
  text: string;
  html: string;
};

type RichContentSection = {
  heading?: RichContentNode;
  children: RichContentNode[];
};

type TopicCard = {
  title: string;
  bodyHtml: string;
};

type SectionMode = "feature" | "grid" | "process" | "problem-solution" | "split";

const TRUST_SIGNALS = ["Locally owned", "Licensed & insured", "Union County specialists"];
const CAROLINA_IMAGE_VERSION = "20260701";
const VERSIONED_CAROLINA_IMAGES = new Set([
  "hero-drainage.png",
  "card-commercial-drainage.png",
  "card-commercial-landscaping.png",
  "commercial-drainage-catch-basin.jpg",
  "commercial-dumpster-enclosure.jpg",
  "commercial-grounds-maintenance.jpg",
  "commercial-hardscape-walkway.jpg",
  "commercial-office-campus.jpg",
  "commercial-property-management.jpg",
  "commercial-retail-landscaping.jpg",
  "commercial-roof-drainage.jpg",
  "commercial-service-territory.jpg",
  "hoa-common-area-landscaping.jpg",
  "residential-aeration-overseeding.jpg",
  "residential-catch-basin.jpg",
  "residential-downspout-extension.jpg",
  "residential-french-drain.jpg",
  "residential-lawn-maintenance.jpg",
  "residential-shrub-pruning.jpg",
  "residential-yard-grading.jpg",
  "card-swales.png",
]);

const SERVICE_HERO_FILENAMES: Record<string, string> = {
  "/residential-lawn-maintenance": "residential-lawn-maintenance.jpg",
  "/residential-landscaping": "card-plant-shrub-installation.png",
  "/residential-hardscape": "hero-hardscape.png",
  "/mulching-and-planting": "hero-mulch.png",
  "/drainage-solutions": "hero-drainage.png",
  "/commercial": "commercial-office-campus.jpg",
  "/commercial-grounds-maintenance": "commercial-grounds-maintenance.jpg",
  "/commercial-landscaping": "card-commercial-landscaping.png",
  "/commercial-hardscape": "commercial-hardscape-walkway.jpg",
  "/commercial-drainage": "commercial-drainage-catch-basin.jpg",
  "/hoa-services": "hoa-common-area-landscaping.jpg",
};

function str(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function arr<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function bool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function pageSlugFromLocation(location: string) {
  return location.split("?")[0]?.replace(/^\/+|\/+$/g, "") || "home";
}

function normalizeTopicTag(value: string) {
  return value
    .replace(/\b(monroe|charlotte|waxhaw|weddington|indian trail|union county|north carolina|nc)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function imageFilenameFromSource(src: string) {
  return src.split("/").pop()?.split("?")[0] ?? "";
}

function getCarolinaImageAlt(src: string, fallback: string) {
  const filename = imageFilenameFromSource(src);
  return CAROLINA_IMAGE_METADATA[filename]?.alt ?? fallback;
}

function getCarolinaBlogTags(post: {
  slug?: string;
  category?: string;
  secondaryKeywords?: string[];
  primaryKeyword?: string;
}) {
  const fullPost = post.slug ? carolinaBlogPosts.find((item) => item.slug === post.slug) : null;
  const tags = [
    fullPost?.category ?? post.category,
    fullPost?.primaryKeyword ?? post.primaryKeyword,
    ...(Array.isArray(fullPost?.secondaryKeywords ?? post.secondaryKeywords)
      ? (fullPost?.secondaryKeywords ?? post.secondaryKeywords ?? []).slice(0, 2)
      : []),
  ]
    .filter((tag): tag is string => Boolean(tag))
    .map(normalizeTopicTag)
    .filter(Boolean);

  return Array.from(new Set(tags)).slice(0, 4);
}

function html(value: unknown) {
  return { __html: str(value) };
}

function cleanHeroHeading(value: unknown) {
  return str(value)
    .replace(/\s*\|\s*Carolina Exterior\b\s*/gi, " ")
    .replace(/\s+—\s+/g, " — ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function carolinaImageSrc(src: string) {
  const filename = src.split("?")[0]?.split("/").pop();
  if (!filename || !VERSIONED_CAROLINA_IMAGES.has(filename) || src.includes("v=")) {
    return src;
  }

  return `${src}${src.includes("?") ? "&" : "?"}v=${CAROLINA_IMAGE_VERSION}`;
}

function parseRichContentSections(content: string): RichContentSection[] | null {
  if (!content || typeof window === "undefined" || typeof window.DOMParser === "undefined") {
    return null;
  }

  const doc = new window.DOMParser().parseFromString(`<div>${content}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return null;

  const nodes = Array.from(root.children)
    .map((element) => {
      const tag = element.tagName.toLowerCase();
      if (!["p", "h2", "h3", "ul", "ol"].includes(tag)) return null;
      return {
        tag: tag as RichContentNode["tag"],
        text: element.textContent?.replace(/\s+/g, " ").trim() ?? "",
        html: element.innerHTML,
      };
    })
    .filter((node): node is RichContentNode => Boolean(node && node.text));

  if (nodes.length === 0) return null;

  const sections: RichContentSection[] = [{ children: [] }];
  for (const node of nodes) {
    if (node.tag === "h2") {
      sections.push({ heading: node, children: [] });
      continue;
    }
    sections[sections.length - 1].children.push(node);
  }

  return sections.filter((section) => section.heading || section.children.length > 0);
}

function richNodesHtml(nodes: RichContentNode[]) {
  return nodes.map((node) => `<${node.tag}>${node.html}</${node.tag}>`).join("");
}

function textFromHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ");
}

function groupHeadingCards(nodes: RichContentNode[]): {
  lead: RichContentNode[];
  cards: TopicCard[];
} {
  const lead: RichContentNode[] = [];
  const cards: TopicCard[] = [];
  let current: { title: string; nodes: RichContentNode[] } | null = null;

  for (const node of nodes) {
    if (node.tag === "h3") {
      if (current) cards.push({ title: current.title, bodyHtml: richNodesHtml(current.nodes) });
      current = { title: node.text, nodes: [] };
      continue;
    }

    if (current) {
      current.nodes.push(node);
    } else {
      lead.push(node);
    }
  }

  if (current) cards.push({ title: current.title, bodyHtml: richNodesHtml(current.nodes) });
  return { lead, cards };
}

function labeledParagraphCards(nodes: RichContentNode[]) {
  const paragraphNodes = nodes.filter((node) => node.tag === "p");
  if (paragraphNodes.length < 2) return [];

  const cards = paragraphNodes
    .map((node) => {
      const match = node.text.match(/^([^:]{3,70}):\s+(.+)$/);
      if (!match) return null;
      return {
        title: match[1].trim(),
        bodyHtml: node.html.replace(/^([^:]{3,70}):\s*/, ""),
      };
    })
    .filter((card): card is TopicCard => Boolean(card));

  return cards.length === paragraphNodes.length ? cards : [];
}

function getTopicImage(title: string, index = 0) {
  const normalized = title.toLowerCase();
  const matches: Array<[string[], string]> = [
    [
      ["commercial catch basin", "parking lot flooding", "parking lot drainage"],
      "commercial-drainage-catch-basin.jpg",
    ],
    [
      ["commercial downspout", "roof drainage", "roof drain"],
      "commercial-roof-drainage.jpg",
    ],
    [
      ["catch basin", "yard drain", "low spot"],
      "residential-catch-basin.jpg",
    ],
    [["downspout", "roof runoff"], "residential-downspout-extension.jpg"],
    [["french drain"], "residential-french-drain.jpg"],
    [["regrading", "grading"], "residential-yard-grading.jpg"],
    [["swale", "swales"], "card-swales.png"],
    [
      ["drain", "french", "basin", "downspout", "standing water", "erosion"],
      "hero-drainage.png",
    ],
    [
      ["dumpster enclosure", "service area", "utility"],
      "commercial-dumpster-enclosure.jpg",
    ],
    [
      ["commercial hardscape", "commercial walkway", "plaza", "ada", "ramp"],
      "commercial-hardscape-walkway.jpg",
    ],
    [
      ["commercial landscaping", "entryway landscaping", "business landscaping"],
      "card-commercial-landscaping.png",
    ],
    [
      ["commercial grounds", "grounds maintenance", "commercial lawn care"],
      "commercial-grounds-maintenance.jpg",
    ],
    [
      ["office park", "corporate campus", "professional building", "medical facility"],
      "commercial-office-campus.jpg",
    ],
    [["retail center", "storefront", "parking lot island"], "commercial-retail-landscaping.jpg"],
    [
      ["property manager", "single point", "consistent crews", "proactive communication"],
      "commercial-property-management.jpg",
    ],
    [["custom landscape", "landscape design", "design plan"], "gallery-res-2.png"],
    [["sod", "turf", "grass variety"], "hero-home.png"],
    [["aeration", "overseeding"], "residential-aeration-overseeding.jpg"],
    [["mow", "edging", "blowing"], "residential-lawn-maintenance.jpg"],
    [["fertil", "weed", "insect", "lime", "fungus"], "residential-lawn-maintenance.jpg"],
    [["leaf"], "residential-lawn-maintenance.jpg"],
    [["pruning", "bush", "hedge"], "residential-shrub-pruning.jpg"],
    [["seasonal", "color", "flower", "annual"], "gallery-res-3.png"],
    [["consultation", "assessment", "walkthrough"], "gallery-res-1.png"],
    [["installation", "plant sourcing", "plant selection"], "hero-mulch.png"],
    [
      [
        "hardscape",
        "patio",
        "walkway",
        "pathway",
        "retaining",
        "wall",
        "step",
        "stair",
        "paver",
        "stone",
        "brick",
        "concrete",
      ],
      "hero-hardscape.png",
    ],
    [["mulch", "plant", "shrub", "bed", "tree"], "hero-mulch.png"],
    [
      ["hoa", "common area", "entrance", "signage", "community-wide"],
      "hoa-common-area-landscaping.jpg",
    ],
    [
      ["commercial", "parking", "tenant", "hoa", "community", "grounds", "property manager"],
      "commercial-office-campus.jpg",
    ],
    [
      [
        "mow",
        "edging",
        "blowing",
        "weed",
        "fertil",
        "insect",
        "lime",
        "leaf",
        "pruning",
        "contract",
        "lawn",
      ],
      "hero-home.png",
    ],
  ];

  const match = matches.find(([keywords]) =>
    keywords.some((keyword) => normalized.includes(keyword)),
  );
  if (match) return carolinaImageSrc(imagePath(match[1]));

  if (typeof window !== "undefined") {
    const routeDefault =
      CAROLINA_SALES_PAGE_DESIGN[pageSlugFromLocation(window.location.pathname)]?.sectionImages
        .default;
    if (routeDefault) return carolinaImageSrc(imagePath(routeDefault));
  }

  const fallbackImages = [
    "gallery-res-1.png",
    "gallery-res-2.png",
    "gallery-res-3.png",
    "hero-home.png",
    "hero-hardscape.png",
    "hero-mulch.png",
    "hero-drainage.png",
    "commercial-office-campus.jpg",
  ];
  return carolinaImageSrc(imagePath(fallbackImages[index % fallbackImages.length]));
}

function CommercialTopicIcon({ title }: { title: string }) {
  const normalized = title.toLowerCase();
  let Icon = Building2;

  if (/retail|storefront|shopping/.test(normalized)) Icon = Store;
  else if (/hoa|multi-family|community/.test(normalized)) Icon = UsersRound;
  else if (/industrial|warehouse/.test(normalized)) Icon = Factory;
  else if (/medical|professional/.test(normalized)) Icon = HeartPulse;
  else if (/single point|contact|account/.test(normalized)) Icon = ClipboardCheck;
  else if (/crew|consistent/.test(normalized)) Icon = RefreshCw;
  else if (/communication|notify|document/.test(normalized)) Icon = MessageSquareText;
  else if (/contract|flexible|monthly|annual|seasonal/.test(normalized)) Icon = FileText;
  else if (/insured|licensed|documentation|certificate/.test(normalized)) Icon = ShieldCheck;

  return (
    <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
      <Icon className="h-7 w-7" aria-hidden="true" />
    </span>
  );
}

function ProcessStepIcon({ title, index }: { title: string; index: number }) {
  const normalized = normalizeKey(title);
  let Icon = ClipboardCheck;

  if (/request|call|contact|estimate|quote/.test(normalized)) Icon = MessageSquareText;
  else if (/assess|visit|walk|inspect|review|diagnos/.test(normalized)) Icon = Search;
  else if (/proposal|agreement|contract|plan|scope/.test(normalized)) Icon = FileText;
  else if (/schedule|timing|start|calendar|onboard/.test(normalized)) Icon = Calendar;
  else if (/work|service|install|maintain|execute/.test(normalized)) Icon = CheckCircle2;
  else if (/communicat|update|document/.test(normalized)) Icon = MessageSquareText;
  else if (/team|crew|manager/.test(normalized)) Icon = UsersRound;
  else if (/insured|licensed|protect/.test(normalized)) Icon = ShieldCheck;
  else if (/time|quick|respond/.test(normalized)) Icon = Clock;

  return (
    <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary text-primary-foreground shadow-sm">
      <Icon className="h-6 w-6" aria-hidden="true" />
      <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-accent text-[0.7rem] font-extrabold text-accent-foreground">
        {index + 1}
      </span>
    </span>
  );
}

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isWhatToExpectTitle(title: string) {
  return /\bwhat to expect\b/i.test(title);
}

function getSectionKey(title: string) {
  const normalized = normalizeKey(title);
  if (/swale/.test(normalized)) return "swales";
  if (/included|include|provided|offer|services|serve|property types/.test(normalized)) {
    return "services";
  }
  if (/assessment/.test(normalized)) return "assessment";
  if (/solution/.test(normalized)) return "solutions";
  if (/process|estimate/.test(normalized)) return "process";
  if (/problem|standing water|drainage/.test(normalized)) return "problems";
  if (/material/.test(normalized)) return "materials";
  if (/contract|option|program/.test(normalized)) return "contract";
  if (/community|area|territory|location|monroe|waxhaw|marvin|charlotte/.test(normalized)) {
    return "areas";
  }
  if (/why|choose|different|trusted|value/.test(normalized)) return "why";
  if (/story/.test(normalized)) return "story";
  if (/mission/.test(normalized)) return "mission";
  if (/board|hoa/.test(normalized)) return "boards";
  return "default";
}

function resolvePageSlug(pageSlug: string) {
  const normalized = pageSlug.replace(/^\/+|\/+$/g, "");
  if (normalized && CAROLINA_SALES_PAGE_DESIGN[normalized]) return normalized;

  if (typeof window !== "undefined") {
    const locationSlug = pageSlugFromLocation(window.location.pathname);
    if (CAROLINA_SALES_PAGE_DESIGN[locationSlug]) return locationSlug;
  }

  return normalized;
}

function getSalesDesign(pageSlug: string) {
  return CAROLINA_SALES_PAGE_DESIGN[resolvePageSlug(pageSlug)];
}

function getLocationImageFilename(pageSlug: string, title: string) {
  if (CAROLINA_LOCATION_IMAGES[pageSlug]) return CAROLINA_LOCATION_IMAGES[pageSlug];

  const normalized = normalizeKey(title);
  for (const [slug, filename] of Object.entries(CAROLINA_LOCATION_IMAGES)) {
    const cityKey = slug.replace(/-[a-z]{2}$/i, "");
    if (normalized === cityKey || normalized === cityKey.replace(/-/g, " ")) {
      return filename;
    }
  }

  return undefined;
}

function getPageTopicImageFilename(pageSlug: string, title: string) {
  const normalized = normalizeKey(title);

  if (pageSlug === "residential-lawn-maintenance") {
    if (/aeration|overseeding/.test(normalized)) return "residential-aeration-overseeding.jpg";
    if (/pruning|bush|shrub|hedge/.test(normalized)) return "residential-shrub-pruning.jpg";
    return "residential-lawn-maintenance.jpg";
  }

  if (pageSlug === "residential-landscaping") {
    if (/sod/.test(normalized)) return "card-sod-installation.png";
    return "card-plant-shrub-installation.png";
  }

  if (pageSlug === "residential-hardscape") return "hero-hardscape.png";

  if (pageSlug === "mulching-and-planting") {
    if (/seasonal|flower|plant|shrub|ornamental|bed preparation|cleanup/.test(normalized)) {
      return "card-plant-shrub-installation.png";
    }
    return "hero-mulch.png";
  }

  if (pageSlug === "drainage-solutions") {
    if (/catch basin|yard drain/.test(normalized)) return "residential-catch-basin.jpg";
    if (/downspout/.test(normalized)) return "residential-downspout-extension.jpg";
    if (/french drain/.test(normalized)) return "residential-french-drain.jpg";
    if (/regrading|grading/.test(normalized)) return "residential-yard-grading.jpg";
    if (/swale/.test(normalized)) return "card-swales.png";
    return "hero-drainage.png";
  }

  if (pageSlug === "commercial-grounds-maintenance") {
    return "commercial-grounds-maintenance.jpg";
  }

  if (pageSlug === "commercial-landscaping") {
    if (/seasonal color|parking lot island|retail|storefront/.test(normalized)) {
      return "commercial-retail-landscaping.jpg";
    }
    if (/process|proposal|schedule|phased/.test(normalized)) {
      return "commercial-property-management.jpg";
    }
    return "card-commercial-landscaping.png";
  }

  if (pageSlug === "commercial-hardscape") {
    if (/dumpster/.test(normalized)) return "commercial-dumpster-enclosure.jpg";
    return "commercial-hardscape-walkway.jpg";
  }

  if (pageSlug === "commercial-drainage") {
    if (/catch basin|stormwater/.test(normalized)) return "commercial-drainage-catch-basin.jpg";
    if (/downspout|roof drainage|roof drain/.test(normalized)) return "commercial-roof-drainage.jpg";
    if (/swale/.test(normalized)) return "card-swales.png";
    return "commercial-drainage-catch-basin.jpg";
  }

  if (pageSlug === "hoa-services") {
    if (/drainage/.test(normalized)) return "commercial-drainage-catch-basin.jpg";
    if (/hardscape|walkway|wall|paver|curb/.test(normalized)) {
      return "commercial-hardscape-walkway.jpg";
    }
    if (/board|contract|billing|documentation|photo/.test(normalized)) {
      return "commercial-property-management.jpg";
    }
    return "hoa-common-area-landscaping.jpg";
  }

  return "";
}

function getDesignedImage(pageSlug: string, title: string, index = 0, useDefault = true) {
  const resolvedPageSlug = resolvePageSlug(pageSlug);
  const locationFilename = getLocationImageFilename(resolvedPageSlug, title);
  if (locationFilename) return carolinaImageSrc(imagePath(locationFilename));

  const design = getSalesDesign(resolvedPageSlug);
  const sectionKey = getSectionKey(title);
  const pageTopicFilename = useDefault ? "" : getPageTopicImageFilename(resolvedPageSlug, title);
  const filename =
    design?.sectionImages[normalizeKey(title)] ??
    pageTopicFilename ??
    (sectionKey !== "default" ? design?.sectionImages[sectionKey] : undefined) ??
    (useDefault ? design?.sectionImages.default : undefined);
  return filename ? carolinaImageSrc(imagePath(filename)) : getTopicImage(title, index);
}

function getSectionMode(
  section: RichContentSection,
  index: number,
  cardCount: number,
): SectionMode {
  const title = section.heading?.text ?? "";
  const normalized = normalizeKey(title);
  if (index === 0) return "feature";
  if (isWhatToExpectTitle(title)) return "process";
  if (/process|assessment|estimate|how to|get service/.test(normalized)) return "process";
  if (/problem|must be fixed|why.*matter|why.*must/.test(normalized)) return "problem-solution";
  if (cardCount >= 3 || /included|services|types|materials|areas|properties/.test(normalized)) {
    return "grid";
  }
  return index % 2 === 0 ? "split" : "feature";
}

function getSectionBandClasses(index: number, mode: SectionMode) {
  if (mode === "problem-solution") return "bg-secondary text-secondary-foreground";
  const bands = ["bg-card", "bg-muted/55", "bg-[#eef1e7]", "bg-background"];
  return bands[index % bands.length];
}

function getCtaCopy(pageSlug: string) {
  const isCommercial = pageSlug.includes("commercial") || pageSlug === "hoa-services";
  return {
    heading: isCommercial
      ? "Need a site-specific proposal?"
      : "Want a property-specific recommendation?",
    text: isCommercial
      ? "Tell us what you manage and what needs attention. We will help you shape the right scope before the work starts."
      : "Share what you are seeing on your property, and we will recommend the right next step without overcomplicating the process.",
  };
}

export function CarolinaHeroBlock({ props }: { props: Props }) {
  const [location] = useLocation();
  const heading = cleanHeroHeading(props.heading);
  const minHeight =
    str(props.minHeight, "standard") === "home"
      ? "min-h-[76vh] md:min-h-[82vh]"
      : "min-h-[460px] md:min-h-[560px]";
  const align = str(props.align, "left");
  const eyebrow = str(props.badge) || CAROLINA_BRAND.tagline;
  const serviceAreaSlug = location.match(/^\/service-areas\/([^/?#]+)/)?.[1] ?? "";
  const locationFilename =
    CAROLINA_LOCATION_IMAGES[serviceAreaSlug] ??
    getLocationImageFilename(str(props.pageSlug), heading);
  const pageHeroFilename = SERVICE_HERO_FILENAMES[location] ?? "";
  const imageUrl = pageHeroFilename
    ? imagePath(pageHeroFilename)
    : locationFilename
      ? imagePath(locationFilename)
      : str(props.imageUrl, imagePath("hero-home.png"));

  return (
    <section
      className={`relative w-full ${minHeight} flex items-center bg-background overflow-hidden p-3 md:p-6`}
    >
      <div className="absolute inset-3 z-0 overflow-hidden rounded-[1.5rem] shadow-2xl md:inset-6 md:rounded-[2rem]">
        <img
          src={carolinaImageSrc(imageUrl)}
          alt={getCarolinaImageAlt(imageUrl, str(props.imageAlt, heading || CAROLINA_BRAND.name))}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/44 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/76 via-black/38 to-transparent" />
      </div>
      <div
        className={`relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-end px-4 pb-8 pt-24 md:px-8 md:pb-12 md:pt-28 ${
          align === "center" ? "items-center text-center" : ""
        }`}
      >
        <div className={`max-w-full ${align === "center" ? "md:max-w-4xl" : "md:max-w-3xl"}`}>
          <span className="mb-5 inline-flex max-w-full items-center rounded-full border border-white/35 bg-black/28 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-white shadow-sm backdrop-blur-sm">
            {eyebrow}
          </span>
          <h1 className="mb-6 max-w-full text-[clamp(2.05rem,8.8vw,4.5rem)] font-extrabold leading-[1.06] tracking-normal text-white drop-shadow-[0_3px_18px_rgba(0,0,0,0.55)] [overflow-wrap:anywhere] sm:text-5xl md:text-6xl lg:text-7xl">
            {heading}
          </h1>
          {str(props.subheading) ? (
            <p className="mb-8 max-w-2xl text-base font-bold leading-relaxed text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)] sm:text-lg md:text-xl">
              {str(props.subheading)}
            </p>
          ) : null}
          <ButtonRow props={props} />
          {bool(props.showTrustSignals, false) ? (
            <div className="mt-10 flex max-w-3xl flex-wrap gap-3">
              {(arr<{ label: string }>(props.trustSignals).length
                ? arr<{ label: string }>(props.trustSignals).map((item) => item.label)
                : TRUST_SIGNALS
              ).map((label) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-full border border-white/30 bg-black/28 px-4 py-2 text-sm font-extrabold text-white shadow-sm backdrop-blur-sm"
                >
                  <CheckCircle2 className="h-4 w-4 text-accent" /> {label}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function CarolinaIntroHeroBlock({ props }: { props: Props }) {
  return (
    <section className="bg-foreground py-20 md:py-24 px-4 text-center">
      <div className="max-w-4xl mx-auto">
        <h1 className="mb-4 text-[clamp(2.25rem,10vw,3.75rem)] font-extrabold leading-tight text-white md:text-6xl">
          {cleanHeroHeading(props.heading)}
        </h1>
        {str(props.subheading) ? (
          <p className="text-lg md:text-xl text-white/80 font-medium max-w-2xl mx-auto">
            {str(props.subheading)}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function CarolinaPageIntroBlock({ props }: { props: Props }) {
  const [location] = useLocation();
  const pageSlug = str(props.pageSlug) || pageSlugFromLocation(location);
  const design = getSalesDesign(pageSlug);
  const intro = str(props.intro, design?.intro ?? "");

  if (!intro) return null;

  return (
    <section className="bg-background px-4 py-10 md:py-14">
      <div className="mx-auto max-w-7xl text-center">
        <p className="carolina-eyebrow mb-3">How We Help</p>
        <p className="mx-auto max-w-5xl text-lg font-medium leading-relaxed text-muted-foreground md:text-xl">
          {intro}
        </p>
      </div>
    </section>
  );
}

export function CarolinaRichContentBlock({ props }: { props: Props }) {
  const sections = useMemo(() => parseRichContentSections(str(props.content)), [props.content]);
  const [location] = useLocation();
  const pageSlug = str(props.pageSlug) || pageSlugFromLocation(location);
  const design = getSalesDesign(pageSlug);
  const quoteLink = str(props.quoteLink, design?.quoteLink ?? "/get-a-quote");
  const quoteLabel = str(props.quoteLabel, design?.quoteLabel ?? "GET A QUOTE");
  const showInlineCta = bool(props.showInlineCta, true);
  const articleMode = bool(props.articleMode, false);

  return (
    <section className="bg-background">
      <div className="mx-auto w-full max-w-7xl min-w-0 px-4 py-8 md:py-14">
        <article className="min-w-0">
          {articleMode ? (
            <div
              className="prose prose-stone mx-auto max-w-full lg:max-w-3xl lg:prose-lg prose-headings:font-extrabold prose-h2:text-3xl prose-h2:mt-14 prose-h2:mb-5 prose-h3:text-xl prose-p:font-medium prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:font-medium prose-li:text-muted-foreground"
              dangerouslySetInnerHTML={html(props.content)}
            />
          ) : sections ? (
            <VisualRichContent
              pageSlug={pageSlug}
              sections={sections}
              quoteLink={quoteLink}
              quoteLabel={quoteLabel}
              showInlineCta={showInlineCta}
            />
          ) : (
            <div
              className="prose prose-stone max-w-full lg:prose-lg prose-headings:font-extrabold prose-h2:text-3xl prose-h2:mt-14 prose-h2:mb-5 prose-h3:text-xl prose-p:font-medium prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:font-medium prose-li:text-muted-foreground"
              dangerouslySetInnerHTML={html(props.content)}
            />
          )}
          {arr<{ question: string; answer: string }>(props.faqs).length > 0 ? (
            <FaqAccordion items={arr(props.faqs)} />
          ) : null}
        </article>
      </div>
    </section>
  );
}

function VisualRichContent({
  pageSlug,
  sections,
  quoteLink,
  quoteLabel,
  showInlineCta,
}: {
  pageSlug: string;
  sections: RichContentSection[];
  quoteLink: string;
  quoteLabel: string;
  showInlineCta: boolean;
}) {
  const hasIntroSection = sections[0] && !sections[0].heading;
  return (
    <div className="space-y-8 md:space-y-10">
      {sections.map((section, index) => {
        const visualIndex = hasIntroSection ? index - 1 : index;
        const shouldShowCta =
          showInlineCta &&
          visualIndex === 1 &&
          Boolean(section.heading) &&
          !pageSlug.includes("quote");
        return (
          <div key={`${section.heading?.text ?? "intro"}-${index}`} className="space-y-8">
            <VisualRichContentSection pageSlug={pageSlug} section={section} index={index} />
            {shouldShowCta ? (
              <InlineQuoteCta pageSlug={pageSlug} quoteLink={quoteLink} quoteLabel={quoteLabel} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function VisualRichContentSection({
  pageSlug,
  section,
  index,
}: {
  pageSlug: string;
  section: RichContentSection;
  index: number;
}) {
  const { lead, cards } = groupHeadingCards(section.children);
  const labeledCards = cards.length === 0 ? labeledParagraphCards(section.children) : [];
  const sectionCards = cards.length >= 2 ? cards : labeledCards;
  const sectionLead = sectionCards.length >= 2 ? lead : [];
  const hasHeading = Boolean(section.heading);
  const title = section.heading?.text ?? "Built around your property, not a template.";
  const mode = getSectionMode(section, index, sectionCards.length);
  const band = getSectionBandClasses(index, mode);
  const imageUrl = getDesignedImage(pageSlug, title, index);

  if (!hasHeading) {
    const introImageUrl = getDesignedImage(pageSlug, "", index);
    return (
      <section className="overflow-hidden rounded-[1.5rem] border border-border/80 bg-card shadow-sm md:rounded-[2rem]">
        <div className="h-56 w-full min-w-0 bg-muted sm:h-64 md:aspect-[16/6] md:h-auto md:max-h-[24rem] md:min-h-64">
          <img
            src={introImageUrl}
            alt={getCarolinaImageAlt(introImageUrl, "Carolina Exterior landscape service example")}
            className="block h-full w-full object-cover"
          />
        </div>
        <div className="p-6 md:p-8 lg:p-10">
          <p className="carolina-eyebrow mb-3">Local Landscape Care</p>
          <h2 className="mb-5 text-2xl font-extrabold leading-tight md:text-3xl">
            Built around your property, not a template.
          </h2>
          <div
            className="prose prose-stone max-w-none prose-p:font-medium prose-p:text-muted-foreground prose-p:leading-relaxed lg:prose-lg"
            dangerouslySetInnerHTML={{ __html: richNodesHtml(section.children) }}
          />
        </div>
      </section>
    );
  }

  if (sectionCards.length >= 2) {
    if (isWhatToExpectTitle(title)) {
      return (
        <section
          className={`overflow-hidden rounded-[1.5rem] border border-border/70 ${band} p-6 shadow-sm md:rounded-[2rem] md:p-8 lg:p-10`}
        >
          <div className="mx-auto mb-10 max-w-4xl text-center">
            <p className="carolina-eyebrow mb-3">What to Expect</p>
            <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl md:text-5xl">
              {title}
            </h2>
            {sectionLead.length > 0 ? (
              <div
                className="prose prose-stone mx-auto mt-5 max-w-3xl prose-p:font-medium prose-p:leading-relaxed prose-p:text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: richNodesHtml(sectionLead) }}
              />
            ) : null}
          </div>
          <div
            className={`grid gap-5 ${
              sectionCards.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
            }`}
          >
            {sectionCards.map((card, cardIndex) => (
              <article
                key={`${title}-${card.title}`}
                className="relative rounded-xl border border-border/70 bg-white/90 p-5 shadow-sm"
              >
                {cardIndex > 0 ? (
                  <span className="absolute right-[calc(100%+0.25rem)] top-12 hidden h-px w-5 bg-border lg:block" />
                ) : null}
                <ProcessStepIcon title={card.title} index={cardIndex} />
                <h3 className="mt-5 text-lg font-extrabold leading-tight">{card.title}</h3>
                <div
                  className="prose prose-stone mt-3 max-w-none prose-p:text-sm prose-p:font-medium prose-p:leading-relaxed prose-p:text-muted-foreground prose-li:text-sm prose-li:text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: card.bodyHtml }}
                />
              </article>
            ))}
          </div>
        </section>
      );
    }

    if (mode === "grid") {
      return (
        <section
          className={`overflow-hidden rounded-[1.5rem] border border-border/70 ${band} shadow-sm md:rounded-[2rem]`}
        >
          {pageSlug === "commercial" ? (
            <div className="h-52 w-full min-w-0 bg-muted sm:h-60 md:aspect-[16/5] md:h-auto md:max-h-[22rem] md:min-h-56">
              <img
                src={imageUrl}
                alt={getCarolinaImageAlt(imageUrl, `${title} example`)}
                className="block h-full w-full object-cover"
              />
            </div>
          ) : null}
          <div className="p-6 md:p-8 lg:p-10">
            <div className="mb-8 max-w-5xl">
              <p className="carolina-eyebrow mb-3">Service Details</p>
              <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl md:text-5xl">
                {title}
              </h2>
              {sectionLead.length > 0 ? (
                <div
                  className="prose prose-stone mt-5 max-w-none prose-p:font-medium prose-p:leading-relaxed prose-p:text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: richNodesHtml(sectionLead) }}
                />
              ) : null}
            </div>
            <TopicCardGrid
              pageSlug={pageSlug}
              title={title}
              cards={sectionCards}
              mode={mode}
              startIndex={index}
            />
          </div>
        </section>
      );
    }

    return (
      <section
        className={`overflow-hidden rounded-[1.5rem] border border-border/70 ${band} shadow-sm md:rounded-[2rem]`}
      >
        <div className="h-56 w-full min-w-0 bg-muted sm:h-64 md:aspect-[16/6] md:h-auto md:max-h-[24rem] md:min-h-64">
          <img
            src={imageUrl}
            alt={getCarolinaImageAlt(imageUrl, `${title} example`)}
            className="block h-full w-full object-cover"
          />
        </div>
        <div className="p-6 md:p-8 lg:p-10">
          <p className="carolina-eyebrow mb-3">
            {mode === "process"
              ? "Our Process"
              : mode === "problem-solution"
                ? "What We Solve"
                : "Service Details"}
          </p>
          <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl md:text-5xl">
            {title}
          </h2>
          {sectionLead.length > 0 ? (
            <div
              className="prose prose-stone mt-5 max-w-none prose-p:font-medium prose-p:leading-relaxed prose-p:text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: richNodesHtml(sectionLead) }}
            />
          ) : null}
          <TopicCardGrid
            pageSlug={pageSlug}
            title={title}
            cards={sectionCards}
            mode={mode}
            startIndex={index}
          />
        </div>
      </section>
    );
  }

  if (pageSlug === "commercial-landscaping") {
    return (
      <section
        className={`overflow-hidden rounded-[1.5rem] border border-border/70 ${band} shadow-sm md:rounded-[2rem]`}
      >
        <div className="h-56 w-full min-w-0 bg-muted sm:h-64 md:aspect-[16/6] md:h-auto md:max-h-[24rem] md:min-h-64">
          <img
            src={imageUrl}
            alt={getCarolinaImageAlt(imageUrl, `${title} example`)}
            className="block h-full w-full object-cover"
          />
        </div>
        <div className="p-6 md:p-8 lg:p-12">
          <p className="carolina-eyebrow mb-3">
            {mode === "process" ? "How It Works" : "Commercial Landscaping"}
          </p>
          <h2 className="text-2xl font-extrabold leading-tight md:text-4xl">{title}</h2>
          <div
            className="prose prose-stone mt-5 max-w-none prose-p:font-medium prose-p:leading-relaxed prose-p:text-muted-foreground prose-li:font-medium prose-li:text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: richNodesHtml(section.children) }}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className={`grid grid-cols-1 overflow-hidden rounded-[1.5rem] border border-border/70 ${band} shadow-sm md:rounded-[2rem] lg:grid-cols-2 ${
        index % 2 === 0 ? "" : "lg:[&_.visual-section-image]:order-2"
      }`}
    >
      <div className="visual-section-image h-72 bg-muted sm:h-80 lg:h-auto lg:min-h-[30rem]">
        <img
          src={imageUrl}
          alt={getCarolinaImageAlt(imageUrl, `${title} example`)}
          className="block h-full w-full object-cover"
        />
      </div>
      <div className="p-6 md:p-8 lg:p-12">
        <p className="carolina-eyebrow mb-3">
          {mode === "process" ? "How It Works" : "Local Proof"}
        </p>
        <h2 className="text-2xl md:text-4xl font-extrabold leading-tight">{title}</h2>
        <div
          className="prose prose-stone mt-5 max-w-none prose-p:text-muted-foreground prose-p:font-medium prose-p:leading-relaxed prose-li:text-muted-foreground prose-li:font-medium"
          dangerouslySetInnerHTML={{ __html: richNodesHtml(section.children) }}
        />
      </div>
    </section>
  );
}

function TopicCardGrid({
  pageSlug,
  title,
  cards,
  mode,
  startIndex,
}: {
  pageSlug: string;
  title: string;
  cards: TopicCard[];
  mode: SectionMode;
  startIndex: number;
}) {
  const gridColumns =
    cards.length === 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-3";
  const useCommercialIcons = pageSlug === "commercial";

  return (
    <div className={`mt-8 grid gap-4 ${gridColumns}`}>
      {cards.map((card, cardIndex) => {
        const cardImageUrl = getDesignedImage(pageSlug, card.title, startIndex + cardIndex + 1, false);
        return (
          <article
            key={`${title}-${card.title}`}
            className="group overflow-hidden rounded-xl border border-border/70 bg-white/85 shadow-sm transition-shadow hover:shadow-md"
          >
            {useCommercialIcons ? (
              <div className="px-5 pt-5">
                <CommercialTopicIcon title={card.title} />
              </div>
            ) : mode !== "process" && mode !== "problem-solution" ? (
              <div className="aspect-[16/9] overflow-hidden bg-muted">
                <img
                  src={cardImageUrl}
                  alt={getCarolinaImageAlt(cardImageUrl, `${card.title} service example`)}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            ) : null}
            <div className="p-5">
              <h3 className="text-lg font-extrabold leading-tight">{card.title}</h3>
              <div
                className="prose prose-stone mt-3 max-w-none prose-p:text-sm prose-p:font-medium prose-p:leading-relaxed prose-p:text-muted-foreground prose-li:text-sm prose-li:text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: card.bodyHtml }}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function InlineQuoteCta({
  pageSlug,
  quoteLink,
  quoteLabel,
}: {
  pageSlug: string;
  quoteLink: string;
  quoteLabel: string;
}) {
  const copy = getCtaCopy(pageSlug);
  return (
    <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-primary/15 bg-primary text-primary-foreground shadow-md md:rounded-[2rem]">
      <div className="grid min-w-0 gap-0 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0 p-5 sm:p-6 md:p-8">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-white/70">
            Ready When You Are
          </p>
          <h2 className="text-2xl font-extrabold leading-tight md:text-3xl">{copy.heading}</h2>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-white/78 md:text-base">
            {copy.text}
          </p>
        </div>
        <div className="min-w-0 px-5 pb-5 sm:px-6 sm:pb-6 md:p-8">
          <Link href={quoteLink} className="block min-w-0 md:inline-block">
            <Button className="min-h-12 h-auto w-full whitespace-normal bg-accent px-5 py-3 text-center font-extrabold leading-tight text-accent-foreground hover:bg-accent/90 md:w-auto md:px-6">
              {quoteLabel}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export function CarolinaCardGridBlock({ props }: { props: Props }) {
  const items = arr<{ title: string; description: string; href?: string }>(props.items);
  const [featuredItem, ...supportItems] = items;
  return (
    <section className="carolina-section-band py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeading props={props} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {featuredItem ? <FeatureServiceCard item={featuredItem} index={0} /> : null}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:col-span-7">
            {supportItems.map((item, index) => (
              <CompactServiceCard
                key={`${item.title}-${item.href ?? index}`}
                item={item}
                index={index + 1}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureServiceCard({
  item,
  index,
}: {
  item: { title: string; description: string; href?: string };
  index: number;
}) {
  const imageUrl = getTopicImage(`${item.title} ${item.description}`, index);
  const card = (
    <article className="group h-full overflow-hidden rounded-[1.5rem] border border-border/80 bg-card shadow-md transition-shadow hover:shadow-lg md:rounded-[2rem] lg:col-span-5">
      <div className="aspect-[16/10] overflow-hidden bg-muted">
        <img
          src={imageUrl}
          alt={getCarolinaImageAlt(imageUrl, `${item.title} service example`)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-6 md:p-8">
        <p className="carolina-eyebrow mb-3">Featured Service</p>
        <h3 className="text-2xl font-extrabold leading-tight group-hover:text-primary">
          {item.title}
        </h3>
        <p className="mt-4 text-muted-foreground font-medium leading-relaxed">{item.description}</p>
        {item.href ? (
          <span className="mt-6 inline-flex items-center justify-center gap-2 rounded-md border border-primary bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground transition-colors group-hover:bg-primary/90">
            Learn More <ArrowRight className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </article>
  );
  return item.href ? (
    <Link href={item.href} className="lg:col-span-5">
      {card}
    </Link>
  ) : (
    <div className="lg:col-span-5">{card}</div>
  );
}

function CompactServiceCard({
  item,
  index,
}: {
  item: { title: string; description: string; href?: string };
  index: number;
}) {
  const imageUrl = getTopicImage(`${item.title} ${item.description}`, index);
  const card = (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-border/80 bg-card shadow-sm transition-all hover:border-primary/45 hover:shadow-md">
      <div className="aspect-[16/7] overflow-hidden bg-muted">
        <img
          src={imageUrl}
          alt={getCarolinaImageAlt(imageUrl, `${item.title} service example`)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-extrabold leading-tight group-hover:text-primary">
          {item.title}
        </h3>
        <p className="mt-3 flex-1 text-sm font-medium leading-relaxed text-muted-foreground">
          {item.description}
        </p>
        {item.href ? (
          <span className="mt-5 inline-flex w-fit items-center justify-center gap-2 rounded-md border border-primary/80 px-4 py-2 text-sm font-extrabold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            Learn More <ArrowRight className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </article>
  );
  return item.href ? <Link href={item.href}>{card}</Link> : <div>{card}</div>;
}

export function CarolinaLocationGridBlock({ props }: { props: Props }) {
  const existingItems = arr<{ city: string; state: string; href: string }>(props.items);
  const itemsByHref = new Map(existingItems.map((item) => [item.href, item]));
  for (const area of SERVICE_AREAS) {
    const href = `/service-areas/${area.slug}`;
    if (!itemsByHref.has(href)) {
      itemsByHref.set(href, { city: area.city, state: area.state, href });
    }
  }
  const items = Array.from(itemsByHref.values());

  return (
    <section className="py-12 md:py-20 bg-background">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeading props={props} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {items.map((area) => (
            <Link key={area.href} href={area.href}>
              <div className="group border border-border/80 bg-card hover:border-primary/50 p-5 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span className="font-bold group-hover:text-primary">
                    {area.city}, {area.state}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CarolinaGalleryGridBlock({ props }: { props: Props }) {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeading props={props} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {arr<{ src: string; alt: string }>(props.images).map((image) => (
            <div
              key={image.src}
              className={`${str(props.aspect, "square") === "video" ? "aspect-video" : "aspect-square"} overflow-hidden rounded-[1.5rem] border border-border shadow-md group`}
            >
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CarolinaBlogSidebar({ currentSlug }: { currentSlug?: string }) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const publishedPosts = useMemo(
    () =>
      [...carolinaBlogPosts].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [],
  );
  const recentPosts = publishedPosts.filter((post) => post.slug !== currentSlug).slice(0, 5);
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    publishedPosts.forEach((post) => {
      counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [publishedPosts]);
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    publishedPosts.forEach((post) => {
      getCarolinaBlogTags(post).forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [publishedPosts]);

  return (
    <aside className="space-y-5 lg:sticky lg:top-28" data-testid="carolina-blog-sidebar">
      <div className="rounded-[1.25rem] border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-extrabold">Search</h2>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = query.trim();
            navigate(trimmed ? `/blog?search=${encodeURIComponent(trimmed)}` : "/blog");
          }}
          data-testid="carolina-blog-sidebar-search"
        >
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search articles..."
            className="h-11"
          />
          <Button type="submit" size="icon" aria-label="Search blog" className="h-11 w-11">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>

      <div className="rounded-[1.25rem] border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-extrabold">Recent Posts</h2>
        <div className="space-y-4">
          {recentPosts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <span className="block text-sm font-bold leading-relaxed text-foreground transition-colors hover:text-primary">
                {post.h1}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-[1.25rem] border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-extrabold">Categories</h2>
        <div className="space-y-2">
          {categories.map(([category, count]) => (
            <Link key={category} href={`/blog?category=${encodeURIComponent(category)}`}>
              <span className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-bold text-foreground transition-colors hover:bg-muted/70 hover:text-primary">
                <span>{category[0].toUpperCase() + category.slice(1)}</span>
                <Badge variant="secondary">{count}</Badge>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-[1.25rem] border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-extrabold">Tag Cloud</h2>
        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 18).map(([tag]) => (
            <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`}>
              <Badge
                variant="outline"
                className="max-w-full cursor-pointer whitespace-normal rounded-full border-primary/25 px-3 py-1.5 text-xs font-bold leading-snug text-foreground hover:border-primary hover:text-primary"
              >
                <Tag className="mr-1 h-3 w-3" />
                {tag}
              </Badge>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function CarolinaBlogIndexBlock({ props }: { props: Props }) {
  const posts = arr<{
    slug: string;
    h1: string;
    category: string;
    excerpt: string;
    date: string;
    readMinutes: number;
    image: string;
  }>(props.posts);
  const [location, navigate] = useLocation();
  const params = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, [location]);
  const categoryFilter = params.get("category") ?? "all";
  const tagFilter = params.get("tag") ?? "";
  const searchFilter = params.get("search") ?? "";
  const isAllFilter = categoryFilter === "all" && !tagFilter && !searchFilter;
  const visiblePosts = useMemo(() => {
    const normalizedSearch = searchFilter.toLowerCase();
    return posts.filter((post) => {
      if (categoryFilter !== "all" && post.category !== categoryFilter) return false;
      if (tagFilter && !getCarolinaBlogTags(post).includes(tagFilter)) return false;
      if (!normalizedSearch) return true;
      return [post.h1, post.excerpt, post.category, ...getCarolinaBlogTags(post)]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [categoryFilter, posts, searchFilter, tagFilter]);

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
          {["all", "residential", "commercial"].map((option) => (
            <button
              key={option}
              onClick={() => navigate(option === "all" ? "/blog" : `/blog?category=${option}`)}
              className={`px-6 py-2 rounded-full font-bold text-sm transition-colors border ${
                (option === "all" && isAllFilter) || categoryFilter === option
                  ? "bg-primary text-white border-primary"
                  : "bg-transparent text-foreground border-border hover:border-primary"
              }`}
            >
              {option === "all" ? "All Articles" : option[0].toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
        {!isAllFilter ? (
          <div className="mx-auto mb-10 flex max-w-3xl flex-wrap items-center justify-center gap-3 text-center">
            <p className="text-sm font-bold text-muted-foreground">
              Showing articles
              {searchFilter ? ` matching "${searchFilter}"` : ""}
              {tagFilter ? ` tagged "${tagFilter}"` : ""}
              {categoryFilter !== "all" ? ` in ${categoryFilter}` : ""}
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate("/blog")}>
              Clear filters
            </Button>
          </div>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {visiblePosts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <article className="h-full bg-card border border-border rounded-[1.25rem] hover:border-muted-foreground/40 transition-colors cursor-pointer group flex flex-col overflow-hidden">
                <div className="relative m-3 mb-0 aspect-[16/9] overflow-hidden rounded-[1rem] bg-muted">
                  <img
                    src={blogImagePath(post.image)}
                    alt={post.h1}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-6 flex-1">
                  <Badge
                    variant={post.category === "commercial" ? "secondary" : "default"}
                    className="uppercase tracking-widest text-[0.65rem] mb-4"
                  >
                    {post.category}
                  </Badge>
                  <h2 className="text-xl font-extrabold leading-tight group-hover:text-primary transition-colors">
                    {post.h1}
                  </h2>
                  <p className="mt-4 text-muted-foreground font-medium line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>
                <footer className="text-xs font-bold text-muted-foreground flex items-center justify-between border-t p-4">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {new Date(post.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {post.readMinutes} min read
                  </span>
                </footer>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CarolinaFaqBlock({ props }: { props: Props }) {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="max-w-3xl mx-auto px-4">
        <SectionHeading props={props} />
        <FaqAccordion items={arr(props.items)} showSource={bool(props.showSource, false)} />
      </div>
    </section>
  );
}

export function CarolinaQuoteFormBlock({ props }: { props: Props }) {
  return (
    <section className="pb-24 bg-background">
      <div className="max-w-3xl mx-auto px-4 -mt-10 relative z-10">
        <div className="bg-card p-8 md:p-12 rounded-xl shadow-xl border border-border">
          <PublicFormRenderer
            slug={str(props.formSlug, "residential-quote")}
            showHeader={false}
            buttonTextOverride={str(props.buttonText, "SUBMIT REQUEST")}
          />
        </div>
      </div>
    </section>
  );
}

export function CarolinaCtaBlock({ props }: { props: Props }) {
  const pageSlug = str(props.pageSlug);
  const imageUrl = getDesignedImage(pageSlug, str(props.heading, "quote"), 2);
  return (
    <section className="bg-background px-4 py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl min-w-0 overflow-hidden rounded-[1.5rem] border border-border/80 bg-[#e5dcc8] shadow-lg md:rounded-[2rem] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="min-w-0 p-6 md:p-12 lg:p-16">
          <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.16em] text-foreground/65">
            Ready When You Are
          </p>
          <h2 className="mb-6 text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">
            {str(props.heading)}
          </h2>
          <p className="mb-10 max-w-2xl text-base font-semibold leading-relaxed text-foreground/75 md:text-lg">
            {str(props.subheading)}
          </p>
          <ButtonRow props={props} />
        </div>
        <div className="h-72 bg-muted sm:h-80 lg:h-auto lg:min-h-full">
          <img
            src={imageUrl}
            alt={getCarolinaImageAlt(imageUrl, `${str(props.heading, "Carolina Exterior")} image`)}
            className="block h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ props }: { props: Props }) {
  return str(props.heading) || str(props.subheading) ? (
    <div className="max-w-3xl mx-auto text-center mb-12">
      <p className="carolina-eyebrow mb-3">Carolina Exterior</p>
      {str(props.heading) ? (
        <h2 className="mb-4 text-3xl font-extrabold leading-tight md:text-5xl">
          {str(props.heading)}
        </h2>
      ) : null}
      {str(props.subheading) ? (
        <p className="text-lg text-muted-foreground font-semibold leading-relaxed">
          {str(props.subheading)}
        </p>
      ) : null}
    </div>
  ) : null;
}

function ButtonRow({ props }: { props: Props }) {
  const primaryText = str(props.primaryText);
  const secondaryText = str(props.secondaryText);
  if (!primaryText && !secondaryText) return null;
  return (
    <div className="flex min-w-0 flex-col gap-4 justify-center sm:flex-row sm:justify-start">
      {primaryText ? (
        <Link href={str(props.primaryLink, "/get-a-quote")} className="min-w-0 sm:w-auto">
          <Button
            size="lg"
            className="min-h-14 h-auto w-full whitespace-normal px-6 py-3 text-base font-bold leading-tight sm:w-auto sm:px-8 sm:text-lg"
          >
            {primaryText} <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      ) : null}
      {secondaryText ? (
        <Link href={str(props.secondaryLink, "/about")} className="min-w-0 sm:w-auto">
          <Button
            variant="outline"
            size="lg"
            className="min-h-14 h-auto w-full whitespace-normal border-white/30 bg-transparent px-6 py-3 text-base font-bold leading-tight text-white hover:bg-white/10 sm:w-auto sm:px-8 sm:text-lg"
          >
            {secondaryText}
          </Button>
        </Link>
      ) : null}
    </div>
  );
}

function FaqAccordion({
  items,
  showSource = false,
}: {
  items: { question: string; answer: string; source?: string }[];
  showSource?: boolean;
}) {
  return (
    <Accordion type="multiple" className="w-full">
      {items.map((faq, index) => (
        <AccordionItem
          key={`${faq.question}-${index}`}
          value={`faq-${index}`}
          className="border-b border-border/50 py-2"
        >
          <AccordionTrigger className="text-left font-bold text-lg hover:text-primary transition-colors py-4">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground font-medium leading-relaxed pb-6 text-base">
            {faq.answer}
            {showSource && faq.source ? (
              <div className="mt-3 text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                From: {faq.source}
              </div>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

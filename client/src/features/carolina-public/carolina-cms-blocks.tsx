import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Calendar, CheckCircle2, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PublicFormRenderer } from "@/components/forms/public-form-renderer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CAROLINA_BRAND,
  CAROLINA_SALES_PAGE_DESIGN,
  blogImagePath,
  imagePath,
} from "@shared/carolina-site";

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

function str(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function arr<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function bool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function html(value: unknown) {
  return { __html: str(value) };
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
    [["custom landscape", "landscape design", "design plan"], "gallery-res-2.png"],
    [["sod", "turf", "grass variety"], "hero-home.png"],
    [["seasonal", "color", "flower", "annual"], "gallery-res-3.png"],
    [["consultation", "assessment", "walkthrough"], "gallery-res-1.png"],
    [["installation", "plant sourcing", "plant selection"], "hero-mulch.png"],
    [
      ["drain", "french", "basin", "downspout", "standing water", "erosion", "swale"],
      "hero-drainage.png",
    ],
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
      ["commercial", "parking", "tenant", "hoa", "community", "grounds", "property manager"],
      "hero-commercial.png",
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
  if (match) return imagePath(match[1]);

  const fallbackImages = [
    "gallery-res-1.png",
    "gallery-res-2.png",
    "gallery-res-3.png",
    "hero-home.png",
    "hero-hardscape.png",
    "hero-mulch.png",
    "hero-drainage.png",
    "hero-commercial.png",
  ];
  return imagePath(fallbackImages[index % fallbackImages.length]);
}

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getSectionKey(title: string) {
  const normalized = normalizeKey(title);
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

function getSalesDesign(pageSlug: string) {
  return CAROLINA_SALES_PAGE_DESIGN[pageSlug];
}

function getDesignedImage(pageSlug: string, title: string, index = 0, useDefault = true) {
  const design = getSalesDesign(pageSlug);
  const sectionKey = getSectionKey(title);
  const filename =
    (sectionKey !== "default" ? design?.sectionImages[sectionKey] : undefined) ??
    design?.sectionImages[normalizeKey(title)] ??
    (useDefault ? design?.sectionImages.default : undefined);
  return filename ? imagePath(filename) : getTopicImage(title, index);
}

function getSectionMode(
  section: RichContentSection,
  index: number,
  cardCount: number,
): SectionMode {
  const title = section.heading?.text ?? "";
  const normalized = normalizeKey(title);
  if (index === 0) return "feature";
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
  const minHeight =
    str(props.minHeight, "standard") === "home"
      ? "min-h-[76vh] md:min-h-[82vh]"
      : "min-h-[460px] md:min-h-[560px]";
  const align = str(props.align, "left");
  const eyebrow = str(props.badge) || CAROLINA_BRAND.tagline;

  return (
    <section
      className={`relative w-full ${minHeight} flex items-center bg-background overflow-hidden p-3 md:p-6`}
    >
      <div className="absolute inset-3 z-0 overflow-hidden rounded-[1.5rem] shadow-2xl md:inset-6 md:rounded-[2rem]">
        <img
          src={str(props.imageUrl, imagePath("hero-home.png"))}
          alt={str(props.imageAlt, str(props.heading, CAROLINA_BRAND.name))}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-foreground/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/72 via-foreground/26 to-foreground/5" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-foreground/45 to-transparent" />
      </div>
      <div
        className={`relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-end px-4 pb-8 pt-28 md:px-8 md:pb-12 ${
          align === "center" ? "items-center text-center" : ""
        }`}
      >
        <div className={align === "center" ? "max-w-4xl" : "max-w-3xl"}>
          <span className="mb-5 inline-flex items-center rounded-full border border-white/25 bg-white/12 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
            {eyebrow}
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-[1.02] tracking-normal">
            {str(props.heading)}
          </h1>
          {str(props.subheading) ? (
            <p className="text-lg md:text-xl text-white/86 font-semibold mb-8 leading-relaxed max-w-2xl">
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
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-sm font-extrabold text-white/86 backdrop-blur-sm"
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
        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4">
          {str(props.heading)}
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
  const pageSlug = str(props.pageSlug);
  const design = getSalesDesign(pageSlug);
  const intro = str(props.intro, design?.intro ?? "");

  if (!intro) return null;

  return (
    <section className="bg-background px-4 py-10 md:py-14">
      <div className="mx-auto max-w-5xl rounded-[1.5rem] border border-border/70 bg-card p-6 text-center shadow-sm md:p-8">
        <p className="carolina-eyebrow mb-3">How We Help</p>
        <p className="text-xl font-extrabold leading-relaxed text-foreground md:text-2xl">
          {intro}
        </p>
      </div>
    </section>
  );
}

export function CarolinaRichContentBlock({ props }: { props: Props }) {
  const sections = useMemo(() => parseRichContentSections(str(props.content)), [props.content]);
  const pageSlug = str(props.pageSlug);
  const design = getSalesDesign(pageSlug);
  const quoteLink = str(props.quoteLink, design?.quoteLink ?? "/get-a-quote");
  const quoteLabel = str(props.quoteLabel, design?.quoteLabel ?? "GET A QUOTE");
  const showInlineCta = bool(props.showInlineCta, true);
  const articleMode = bool(props.articleMode, false);

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-14">
        <article>
          {articleMode ? (
            <div
              className="prose prose-stone mx-auto max-w-3xl lg:prose-lg prose-headings:font-extrabold prose-h2:text-3xl prose-h2:mt-14 prose-h2:mb-5 prose-h3:text-xl prose-p:font-medium prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:font-medium prose-li:text-muted-foreground"
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
              className="prose prose-stone lg:prose-lg max-w-none prose-headings:font-extrabold prose-h2:text-3xl prose-h2:mt-14 prose-h2:mb-5 prose-h3:text-xl prose-p:font-medium prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:font-medium prose-li:text-muted-foreground"
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
    return (
      <section className="grid overflow-hidden rounded-[1.5rem] border border-border/80 bg-card shadow-sm md:rounded-[2rem] lg:grid-cols-[0.8fr_1.2fr]">
        <div className="min-h-72 bg-muted">
          <img
            src={getDesignedImage(
              pageSlug,
              section.children.map((node) => node.text).join(" "),
              index,
            )}
            alt=""
            className="h-full w-full object-cover"
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
    return (
      <section
        className={`overflow-hidden rounded-[1.5rem] border border-border/70 ${band} shadow-sm md:rounded-[2rem]`}
      >
        <div className="grid gap-0 lg:grid-cols-[0.78fr_1.22fr]">
          <div className="min-h-80 bg-muted lg:min-h-full">
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="p-6 md:p-8 lg:p-10">
            <p className="carolina-eyebrow mb-3">
              {mode === "process"
                ? "Our Process"
                : mode === "problem-solution"
                  ? "What We Solve"
                  : "Service Details"}
            </p>
            <h2 className="text-3xl font-extrabold leading-tight md:text-5xl">{title}</h2>
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
      <div className="visual-section-image min-h-72 bg-muted lg:min-h-[30rem]">
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
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
  const compact = mode === "process" || mode === "problem-solution";
  return (
    <div
      className={`mt-8 grid gap-4 ${compact ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}
    >
      {cards.map((card, cardIndex) => (
        <article
          key={`${title}-${card.title}`}
          className="group overflow-hidden rounded-xl border border-border/70 bg-white/85 shadow-sm transition-shadow hover:shadow-md"
        >
          {!compact ? (
            <div className="aspect-[16/9] overflow-hidden bg-muted">
              <img
                src={getDesignedImage(pageSlug, card.title, startIndex + cardIndex + 1, false)}
                alt=""
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
      ))}
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
    <section className="overflow-hidden rounded-[1.5rem] border border-primary/15 bg-primary text-primary-foreground shadow-md md:rounded-[2rem]">
      <div className="grid gap-0 md:grid-cols-[1fr_auto] md:items-center">
        <div className="p-6 md:p-8">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-white/70">
            Ready When You Are
          </p>
          <h2 className="text-2xl font-extrabold leading-tight md:text-3xl">{copy.heading}</h2>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-white/78 md:text-base">
            {copy.text}
          </p>
        </div>
        <div className="px-6 pb-6 md:p-8">
          <Link href={quoteLink}>
            <Button className="h-12 w-full bg-accent px-6 font-extrabold text-accent-foreground hover:bg-accent/90 md:w-auto">
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
  const card = (
    <article className="group h-full overflow-hidden rounded-[1.5rem] border border-border/80 bg-card shadow-md transition-shadow hover:shadow-lg md:rounded-[2rem] lg:col-span-5">
      <div className="aspect-[16/10] overflow-hidden bg-muted">
        <img
          src={getTopicImage(item.title, index)}
          alt=""
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
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-primary">
            Explore service <ArrowRight className="h-4 w-4" />
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
  const card = (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-border/80 bg-card shadow-sm transition-all hover:border-primary/45 hover:shadow-md">
      <div className="aspect-[16/7] overflow-hidden bg-muted">
        <img
          src={getTopicImage(item.title, index)}
          alt=""
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
        {item.href ? <ArrowRight className="mt-5 h-5 w-5 text-primary" /> : null}
      </div>
    </article>
  );
  return item.href ? <Link href={item.href}>{card}</Link> : <div>{card}</div>;
}

export function CarolinaLocationGridBlock({ props }: { props: Props }) {
  return (
    <section className="py-12 md:py-20 bg-background">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeading props={props} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {arr<{ city: string; state: string; href: string }>(props.items).map((area) => (
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
  const [filter, setFilter] = useState("all");
  const visiblePosts = useMemo(
    () => posts.filter((post) => filter === "all" || post.category === filter),
    [filter, posts],
  );

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
          {["all", "residential", "commercial"].map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`px-6 py-2 rounded-full font-bold text-sm transition-colors border ${
                filter === option
                  ? "bg-primary text-white border-primary"
                  : "bg-transparent text-foreground border-border hover:border-primary"
              }`}
            >
              {option === "all" ? "All Articles" : option[0].toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
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
      <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[1.5rem] border border-border/80 bg-accent shadow-lg md:rounded-[2rem] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="p-8 md:p-12 lg:p-16">
          <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.16em] text-foreground/65">
            Ready When You Are
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
            {str(props.heading)}
          </h2>
          <p className="text-lg font-semibold text-foreground/75 mb-10 max-w-2xl leading-relaxed">
            {str(props.subheading)}
          </p>
          <ButtonRow props={props} />
        </div>
        <div className="min-h-72 bg-muted lg:min-h-full">
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
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
        <h2 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
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
    <div className="flex flex-col sm:flex-row gap-4 justify-center sm:justify-start">
      {primaryText ? (
        <Link href={str(props.primaryLink, "/get-a-quote")}>
          <Button size="lg" className="h-14 px-8 text-lg font-bold w-full sm:w-auto">
            {primaryText} <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      ) : null}
      {secondaryText ? (
        <Link href={str(props.secondaryLink, "/about")}>
          <Button
            variant="outline"
            size="lg"
            className="h-14 px-8 text-lg font-bold w-full sm:w-auto bg-transparent border-white/30 text-white hover:bg-white/10"
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

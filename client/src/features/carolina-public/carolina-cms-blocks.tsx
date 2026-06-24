import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Calendar, CheckCircle2, Clock, MapPin, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PublicFormRenderer } from "@/components/forms/public-form-renderer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CAROLINA_BRAND, blogImagePath, imagePath } from "@shared/carolina-site";

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

export function CarolinaRichContentBlock({ props }: { props: Props }) {
  const sections = useMemo(() => parseRichContentSections(str(props.content)), [props.content]);

  return (
    <section className="bg-background">
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        <article
          className={
            bool(props.showSidebar, false) ? "lg:col-span-8" : "lg:col-span-10 lg:col-start-2"
          }
        >
          {sections ? (
            <VisualRichContent sections={sections} />
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
        {bool(props.showSidebar, false) ? (
          <aside className="lg:col-span-4">
            <div className="sticky top-32 bg-muted p-8 rounded-xl border border-border">
              <h3 className="text-2xl font-extrabold mb-4">
                {str(props.sidebarHeading, "Ready to start?")}
              </h3>
              <p className="text-muted-foreground font-medium mb-8">
                {str(
                  props.sidebarText,
                  "Contact us today for a free, no-obligation estimate for your property.",
                )}
              </p>
              <Link href={str(props.sidebarButtonLink, "/get-a-quote")}>
                <Button size="lg" className="w-full font-bold h-12">
                  {str(props.sidebarButtonText, "REQUEST A QUOTE")}
                </Button>
              </Link>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}

function VisualRichContent({ sections }: { sections: RichContentSection[] }) {
  return (
    <div className="space-y-16 md:space-y-20">
      {sections.map((section, index) => (
        <VisualRichContentSection
          key={`${section.heading?.text ?? "intro"}-${index}`}
          section={section}
          index={index}
        />
      ))}
      <ProjectProofPanel />
    </div>
  );
}

function VisualRichContentSection({
  section,
  index,
}: {
  section: RichContentSection;
  index: number;
}) {
  const { lead, cards } = groupHeadingCards(section.children);
  const labeledCards = cards.length === 0 ? labeledParagraphCards(section.children) : [];
  const sectionCards = cards.length >= 2 ? cards : labeledCards;
  const sectionLead = cards.length >= 2 ? lead : [];
  const hasHeading = Boolean(section.heading);

  if (!hasHeading) {
    return (
      <section className="overflow-hidden rounded-[1.5rem] border border-border/80 bg-card shadow-md md:rounded-[2rem]">
        <div className="aspect-[16/8] bg-muted md:aspect-[16/6]">
          <img
            src={getTopicImage(section.children.map((node) => node.text).join(" "), index)}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-[0.72fr_1fr] md:p-8">
          <div>
            <p className="carolina-eyebrow mb-3">Local Landscape Care</p>
            <h2 className="text-2xl font-extrabold leading-tight md:text-3xl">
              Built around your property, not a template.
            </h2>
          </div>
          <div
            className="prose prose-stone max-w-none prose-p:font-medium prose-p:text-muted-foreground prose-p:leading-relaxed lg:prose-lg"
            dangerouslySetInnerHTML={{ __html: richNodesHtml(section.children) }}
          />
        </div>
      </section>
    );
  }

  if (sectionCards.length >= 2) {
    const [featuredCard, ...supportCards] = sectionCards;
    return (
      <section>
        <div className="mb-8 max-w-4xl">
          <p className="carolina-eyebrow mb-3">What to Expect</p>
          <h2 className="text-3xl md:text-5xl font-extrabold leading-tight">
            {section.heading?.text}
          </h2>
          {sectionLead.length > 0 ? (
            <div
              className="prose prose-stone mt-4 max-w-none prose-p:text-muted-foreground prose-p:font-medium prose-p:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: richNodesHtml(sectionLead) }}
            />
          ) : null}
        </div>
        <div className="space-y-5">
          <FeaturedTopicCard
            title={featuredCard.title}
            bodyHtml={featuredCard.bodyHtml}
            imageUrl={getTopicImage(featuredCard.title, index)}
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {supportCards.map((card, cardIndex) => (
              <TopicImageCard
                key={`${section.heading?.text}-${card.title}`}
                title={card.title}
                bodyHtml={card.bodyHtml}
                imageUrl={getTopicImage(card.title, index + cardIndex + 1)}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`grid grid-cols-1 overflow-hidden rounded-[1.5rem] border border-border/80 bg-card shadow-md md:rounded-[2rem] lg:grid-cols-2 ${
        index % 2 === 0 ? "" : "lg:[&_.visual-section-image]:order-2"
      }`}
    >
      <div className="visual-section-image min-h-72 bg-muted lg:min-h-[30rem]">
        <img
          src={getTopicImage(section.heading?.text ?? "", index)}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-6 md:p-8 lg:p-12">
        <p className="carolina-eyebrow mb-3">Local Proof</p>
        <h2 className="text-2xl md:text-4xl font-extrabold leading-tight">
          {section.heading?.text}
        </h2>
        <div
          className="prose prose-stone mt-5 max-w-none prose-p:text-muted-foreground prose-p:font-medium prose-p:leading-relaxed prose-li:text-muted-foreground prose-li:font-medium"
          dangerouslySetInnerHTML={{ __html: richNodesHtml(section.children) }}
        />
      </div>
    </section>
  );
}

function FeaturedTopicCard({
  title,
  bodyHtml,
  imageUrl,
}: {
  title: string;
  bodyHtml: string;
  imageUrl: string;
}) {
  return (
    <article className="group grid overflow-hidden rounded-[1.5rem] border border-border/80 bg-card shadow-md md:rounded-[2rem] lg:grid-cols-[0.92fr_1.08fr]">
      <div className="min-h-72 overflow-hidden bg-muted">
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col justify-center p-6 md:p-8">
        <p className="carolina-eyebrow mb-3">Start Here</p>
        <h3 className="text-2xl font-extrabold leading-tight md:text-3xl">{title}</h3>
        <div
          className="prose prose-stone mt-4 max-w-none prose-p:text-sm prose-p:font-medium prose-p:leading-relaxed prose-p:text-muted-foreground prose-li:text-sm prose-li:text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </div>
    </article>
  );
}

function TopicImageCard({
  title,
  bodyHtml,
  imageUrl,
}: {
  title: string;
  bodyHtml: string;
  imageUrl: string;
}) {
  return (
    <article className="group h-full overflow-hidden rounded-[1.25rem] border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="aspect-[16/9] overflow-hidden bg-muted">
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-5 md:p-6">
        <h3 className="text-xl font-extrabold leading-tight">{title}</h3>
        <div
          className="prose prose-stone mt-4 max-w-none prose-p:text-sm prose-p:font-medium prose-p:leading-relaxed prose-p:text-muted-foreground prose-li:text-sm prose-li:text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </div>
    </article>
  );
}

function ProjectProofPanel() {
  return (
    <section className="grid overflow-hidden rounded-[1.5rem] border border-primary/15 bg-secondary text-secondary-foreground shadow-lg md:rounded-[2rem] lg:grid-cols-[0.85fr_1.15fr]">
      <div className="min-h-72 bg-muted lg:min-h-[34rem]">
        <img src={imagePath("hero-hardscape.png")} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="flex flex-col justify-center p-6 md:p-10 lg:p-12">
        <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.16em] text-accent">
          Project-Minded Process
        </p>
        <h2 className="text-3xl font-extrabold leading-tight text-white md:text-5xl">
          Clear scope, durable materials, and a property that looks finished.
        </h2>
        <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-white/78 md:text-lg">
          From drainage corrections to planting plans and hardscape details, Carolina Exterior plans
          each project around the way water moves, how the space will be used, and what will hold up
          in the Piedmont Carolina climate.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {["Site-first assessment", "Clean installation", "Local follow-through"].map((item) => (
            <div key={item} className="rounded-xl border border-white/15 bg-white/8 p-4">
              <ShieldCheck className="mb-3 h-5 w-5 text-accent" />
              <p className="text-sm font-extrabold text-white">{item}</p>
            </div>
          ))}
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
          <img src={imagePath("gallery-res-3.png")} alt="" className="h-full w-full object-cover" />
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

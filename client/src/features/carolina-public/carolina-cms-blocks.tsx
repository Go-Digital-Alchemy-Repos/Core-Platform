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
import { CAROLINA_BRAND, blogImagePath, imagePath } from "@shared/carolina-site";

type Props = Record<string, unknown>;

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

export function CarolinaHeroBlock({ props }: { props: Props }) {
  const minHeight =
    str(props.minHeight, "standard") === "home" ? "min-h-[90vh]" : "min-h-[400px] h-[50vh]";
  const align = str(props.align, "left");

  return (
    <section
      className={`relative w-full ${minHeight} flex items-center bg-background overflow-hidden py-4 md:py-6`}
    >
      <div className="absolute inset-4 z-0 overflow-hidden rounded-[1.75rem] shadow-2xl md:inset-6">
        <img
          src={str(props.imageUrl, imagePath("hero-home.png"))}
          alt={str(props.imageAlt, str(props.heading, CAROLINA_BRAND.name))}
          className="w-full h-full object-cover opacity-85"
        />
        <div className="absolute inset-0 bg-foreground/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 via-foreground/25 to-transparent" />
      </div>
      <div
        className={`relative z-10 max-w-7xl mx-auto px-4 w-full pt-20 ${align === "center" ? "text-center" : ""}`}
      >
        <div className={align === "center" ? "max-w-4xl mx-auto" : "max-w-3xl"}>
          {str(props.badge) ? (
            <span className="inline-block py-1 px-3 rounded-md bg-white/15 text-white font-bold tracking-widest text-sm mb-6 border border-white/25 uppercase backdrop-blur-sm">
              {str(props.badge)}
            </span>
          ) : null}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 leading-[1.08] tracking-normal">
            {str(props.heading)}
          </h1>
          {str(props.subheading) ? (
            <p className="text-xl md:text-2xl text-white/80 font-medium mb-10 leading-relaxed max-w-2xl">
              {str(props.subheading)}
            </p>
          ) : null}
          <ButtonRow props={props} />
          {bool(props.showTrustSignals, false) ? (
            <div className="mt-16 flex flex-wrap items-center gap-8 text-white/70 text-sm font-bold tracking-wide">
              {arr<{ label: string }>(props.trustSignals).map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <CheckCircle2 className="text-primary h-5 w-5" /> {item.label}
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
  return (
    <section className="bg-background">
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        <article
          className={
            bool(props.showSidebar, false) ? "lg:col-span-8" : "lg:col-span-10 lg:col-start-2"
          }
        >
          <div
            className="prose prose-stone lg:prose-lg max-w-none prose-headings:font-extrabold prose-h2:text-3xl prose-h2:mt-14 prose-h2:mb-5 prose-h3:text-xl prose-p:font-medium prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:font-medium prose-li:text-muted-foreground"
            dangerouslySetInnerHTML={html(props.content)}
          />
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

export function CarolinaCardGridBlock({ props }: { props: Props }) {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeading props={props} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {arr<{ title: string; description: string; href?: string }>(props.items).map((item) => {
            const card = (
              <div className="group h-full border border-border bg-card hover:border-primary p-6 rounded-xl shadow-sm hover:shadow-md transition-all">
                <h3 className="text-xl font-extrabold mb-3 group-hover:text-primary">
                  {item.title}
                </h3>
                <p className="text-muted-foreground font-medium leading-relaxed">
                  {item.description}
                </p>
                {item.href ? <ArrowRight className="h-5 w-5 mt-6 text-primary" /> : null}
              </div>
            );
            return item.href ? (
              <Link key={`${item.title}-${item.href}`} href={item.href}>
                {card}
              </Link>
            ) : (
              <div key={item.title}>{card}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function CarolinaLocationGridBlock({ props }: { props: Props }) {
  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="max-w-4xl mx-auto px-4">
        <SectionHeading props={props} />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {arr<{ city: string; state: string; href: string }>(props.items).map((area) => (
            <Link key={area.href} href={area.href}>
              <div className="group border border-border bg-card hover:border-primary p-6 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-between">
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
    <section className="py-24 bg-accent relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary rounded-full blur-3xl opacity-20" />
      <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-6">{str(props.heading)}</h2>
        <p className="text-xl font-medium text-foreground/80 mb-10 max-w-2xl mx-auto">
          {str(props.subheading)}
        </p>
        <ButtonRow props={props} />
      </div>
    </section>
  );
}

function SectionHeading({ props }: { props: Props }) {
  return str(props.heading) || str(props.subheading) ? (
    <div className="max-w-3xl mx-auto text-center mb-12">
      {str(props.heading) ? (
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4">{str(props.heading)}</h2>
      ) : null}
      {str(props.subheading) ? (
        <p className="text-lg text-muted-foreground font-medium">{str(props.subheading)}</p>
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

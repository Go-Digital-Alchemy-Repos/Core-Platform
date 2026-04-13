import { useState, useEffect, lazy, Suspense, type CSSProperties, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  SectionStyleWrapper,
  DEFAULT_SECTION_LINEAR_GRADIENT,
  getSectionPaddingClasses,
  getSectionStyleConfig,
  hasSectionStyleConfig,
  hexToRgba,
  normalizeHexColor,
} from "@/features/admin/cms/builder/section-style";
import { SectionHeading } from "@/features/admin/cms/builder/section-heading";
import {
  Globe, Heart, Users, MapPin, Mail, Phone, Star, CheckCircle,
  Quote, UserCheck, CalendarDays, BookOpen, Image, Play, Minus,
  ChevronLeft, ChevronRight, ExternalLink, XCircle, BadgeCheck,
  ArrowRight, Search, User, ShieldCheck, Lock, Building2,
  Loader2,
} from "lucide-react";
import type { BlockInstance, BuilderContent } from "@/features/admin/cms/builder/block-registry";
import { mergeJoinHeroBlocks } from "@shared/cms-blocks";

export type { BlockInstance, BuilderContent };

const LUCIDE_MAP: Record<string, React.ElementType> = {
  Globe, Heart, Users, MapPin, Mail, Phone, Star, CheckCircle,
  Quote, UserCheck, CalendarDays, BookOpen, Image, Play, Minus,
  ChevronLeft, ChevronRight, ExternalLink, XCircle, BadgeCheck,
  ArrowRight, Search, User, ShieldCheck, Lock, Building2,
};

function LucideIcon({ name, className }: { name: string; className?: string }) {
  const Icon = LUCIDE_MAP[name] ?? Globe;
  return <Icon className={className} />;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown, fallback = 3): number {
  return typeof v === "number" ? v : fallback;
}
function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function colorStyle(value: unknown, fallback?: string) {
  const normalized = normalizeHexColor(str(value)) || fallback || "";
  return normalized ? { color: normalized } : undefined;
}

const MOBILE_IMAGE_HEIGHT_MAP: Record<string, string> = {
  auto: "auto",
  sm: "240px",
  md: "320px",
  lg: "420px",
  xl: "520px",
};

function getMobileImageStyles(props: Record<string, unknown>): CSSProperties {
  const fit = str(props.mobileImageFit) || "cover";
  const heightKey = str(props.mobileImageHeight) || "auto";
  const height = MOBILE_IMAGE_HEIGHT_MAP[heightKey] ?? MOBILE_IMAGE_HEIGHT_MAP.auto;
  const positionX = Math.max(0, Math.min(100, num(props.mobileImagePositionX, 50)));
  const positionY = Math.max(0, Math.min(100, num(props.mobileImagePositionY, 50)));

  return {
    ["--mobile-image-fit" as string]: fit,
    ["--mobile-image-height" as string]: height,
    ["--mobile-image-position" as string]: `${positionX}% ${positionY}%`,
  };
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  return m ? m[1] : null;
}
function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

const SPACING_MAP: Record<string, string> = {
  xs: "h-4",
  sm: "h-8",
  md: "h-16",
  lg: "h-24",
  xl: "h-32",
};

const IMAGE_WIDTH_MAP: Record<string, string> = {
  full: "w-full",
  contained: "max-w-4xl mx-auto",
  narrow: "max-w-2xl mx-auto",
};

const LEGACY_CMS_ASSET_MAP: Record<string, string> = {
  "/images/hero-therapy-session.png": "/images/hero-therapy-session-1920w.webp",
};

function resolveCmsAssetUrl(url: string): string {
  return LEGACY_CMS_ASSET_MAP[url] ?? url;
}

const LazyTherapistMapBlock = lazy(() => import("./public-dynamic-blocks").then(m => ({ default: m.TherapistMapBlock })));
const LazyContactFormBlock = lazy(() => import("./public-dynamic-blocks").then(m => ({ default: m.ContactFormBlock })));
const LazyJoinHeroBlock = lazy(() => import("./public-dynamic-blocks").then(m => ({ default: m.JoinHeroBlock })));
const LazyJoinRegistrationFormBlock = lazy(() => import("./public-dynamic-blocks").then(m => ({ default: m.JoinRegistrationFormBlock })));
const LazyBlogPostFeedBlock = lazy(() => import("./public-dynamic-blocks").then(m => ({ default: m.BlogPostFeedBlock })));
const LazyBlogFeaturedPostBlock = lazy(() => import("./public-dynamic-blocks").then(m => ({ default: m.BlogFeaturedPostBlock })));
const LazyEventsArchiveSection = lazy(() => import("@/features/public/events-page").then(m => ({ default: m.EventsArchiveSection })));
const LazyRecordingArchivesSection = lazy(() => import("@/features/public/recording-archives-page").then(m => ({ default: m.RecordingArchivesSection })));
const LazyDirectoryBrowserSection = lazy(() => import("@/features/directory/directory-page").then(m => ({ default: m.DirectoryBrowserSection })));

function DynamicFallback() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function HeroBlock({ props }: { props: Record<string, unknown> }) {
  const bg = resolveCmsAssetUrl(str(props.backgroundImageUrl));
  const videoBg = str(props.videoBackgroundUrl);
  const opacity = num(props.overlayOpacity as number, 50);
  const overlayColor = normalizeHexColor(str(props.overlayColor)) || "#000000";
  const layout = str(props.layout) || "stacked";
  const badge = str(props.badge);
  const accentHeading = str(props.accentHeading);
  const minH = str(props.minHeight) || "420";
  const minHeightStyle = minH === "100vh" ? "100vh" : `${minH}px`;
  const bgPosX = Math.max(0, Math.min(100, num(props.backgroundPositionX as number, 50)));
  const bgPosY = Math.max(0, Math.min(100, num(props.backgroundPositionY as number, 50)));
  const isSplit = layout === "split";
  const overlayStrength = Math.max(0, Math.min(opacity, 100)) / 100;
  const sectionStyleConfig = getSectionStyleConfig(props, { resolveAssetUrl: resolveCmsAssetUrl });
  const overlayStyle = { backgroundColor: hexToRgba(overlayColor, overlayStrength) };
  const headingTextStyle = colorStyle(props.headingColor);
  const accentHeadingTextStyle = colorStyle(props.accentHeadingColor);
  const subheadingTextStyle = colorStyle(props.subheadingColor);

  return (
    <section
      className={`relative flex items-center overflow-hidden rounded-lg ${isSplit ? "justify-start text-left" : "justify-center text-center"}`}
      style={{
        minHeight: minHeightStyle,
        ...(sectionStyleConfig.backgroundColor ? { backgroundColor: sectionStyleConfig.backgroundColor } : {}),
        ...(bg && !videoBg
          ? { backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: `${bgPosX}% ${bgPosY}%` }
          : !videoBg && !sectionStyleConfig.backgroundColor
          ? { background: DEFAULT_SECTION_LINEAR_GRADIENT }
          : {}),
      }}
    >
      {videoBg && (
        <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover">
          <source src={videoBg} type="video/mp4" />
        </video>
      )}
      <div className="absolute inset-0 rounded-lg" style={overlayStyle} />
      <div className={`relative z-10 px-8 py-16 ${isSplit ? "max-w-2xl" : "max-w-3xl mx-auto"}`}>
        {badge && (
          <span className="inline-block px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-semibold mb-4 border border-accent/30">
            {badge}
          </span>
        )}
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4 leading-tight" style={headingTextStyle}>
          {str(props.heading) || "Hero Heading"}
          {accentHeading && (
            <>
              {" "}
              <span className="text-accent" style={accentHeadingTextStyle}>{accentHeading}</span>
            </>
          )}
        </h1>
        {str(props.subheading) && (
          <p className={`text-lg text-white/80 mb-8 ${isSplit ? "" : "max-w-xl mx-auto"}`} style={subheadingTextStyle}>{str(props.subheading)}</p>
        )}
        <div className={`flex flex-wrap gap-3 ${isSplit ? "justify-start" : "justify-center"}`}>
          {str(props.ctaText) && (
            <Link href={str(props.ctaLink) || "#"}>
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" data-testid="hero-cta-primary">
                {str(props.ctaText)}
              </Button>
            </Link>
          )}
          {str(props.ctaSecondaryText) && (
            <Link href={str(props.ctaSecondaryLink) || "#"}>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" data-testid="hero-cta-secondary">
                {str(props.ctaSecondaryText)}
              </Button>
            </Link>
          )}
        </div>
      </div>
      {isSplit && bg && (
        <div className="hidden md:block absolute right-0 top-0 bottom-0 w-1/3">
          <img src={bg} alt="" className="w-full h-full object-cover" />
        </div>
      )}
    </section>
  );
}

function TwoColumnTextBlock({ props }: { props: Record<string, unknown> }) {
  const leftItems = arr<{ text: string }>(props.leftItems);
  const rightItems = arr<{ text: string }>(props.rightItems);
  const columns = [
    {
      heading: str(props.leftHeading),
      body: str(props.leftBody),
      items: leftItems,
    },
    {
      heading: str(props.rightHeading),
      body: str(props.rightBody),
      items: rightItems,
    },
  ];

  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="grid gap-8 md:grid-cols-2">
        {columns.map((column, index) => (
          <div key={index} className="space-y-4">
            {column.heading && <h3 className="text-xl font-heading font-semibold">{column.heading}</h3>}
            {column.body && (
              <div
                className="prose prose-sm max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: column.body }}
              />
            )}
            {column.items.length > 0 && (
              <ul className="space-y-2 pl-5 list-disc text-sm text-muted-foreground">
                {column.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item.text}</li>
                ))}
              </ul>
            )}
            {!column.heading && !column.body && column.items.length === 0 && (
              <p className="text-sm text-muted-foreground">Add content for this column.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CalloutBoxBlock({ props }: { props: Record<string, unknown> }) {
  const variant = str(props.variant) || "accent";
  const variantClass =
    variant === "neutral"
      ? "bg-muted/40 border"
      : variant === "outline"
        ? "bg-background border-2"
        : "bg-accent/10 border border-accent/20";

  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      <div className={`rounded-2xl p-6 sm:p-8 ${variantClass}`}>
        <div
          className="prose prose-sm max-w-none text-foreground"
          dangerouslySetInnerHTML={{ __html: str(props.content) || "<p>Add callout content.</p>" }}
        />
        {str(props.ctaText) && (
          <div className="mt-6">
            <Link href={str(props.ctaLink) || "#"}>
              <Button>{str(props.ctaText)}</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function LinkListBlock({ props }: { props: Record<string, unknown> }) {
  const links = arr<{ label: string; description: string; url: string }>(props.links);
  const gridClass = str(props.columns) === "2" ? "md:grid-cols-2" : "md:grid-cols-1";

  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      <div className={`grid grid-cols-1 gap-4 ${gridClass}`}>
        {links.length === 0 ? (
          <div className="text-sm text-muted-foreground">Add links to display here.</div>
        ) : (
          links.map((link, index) => (
            <a
              key={index}
              href={link.url || "#"}
              className="rounded-xl border p-5 hover:shadow-md transition-shadow group"
              data-testid={`link-list-item-${index}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold group-hover:text-accent transition-colors">{link.label || "Untitled link"}</h3>
                  {link.description && <p className="mt-2 text-sm text-muted-foreground">{link.description}</p>}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors flex-shrink-0 mt-1" />
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}

function SectionHeaderBlock({ props }: { props: Record<string, unknown> }) {
  return (
    <SectionHeading
      props={props}
      defaultAlignment="center"
      className="py-4"
      titleClassName="text-3xl font-heading font-bold"
      fallbackTitle="Section Title"
    />
  );
}

function RichTextBlock({ props }: { props: Record<string, unknown> }) {
  const align = str(props.alignment) || "left";
  const textAlign = align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";
  return (
    <div>
      <SectionHeading props={props} defaultAlignment={align === "right" ? "right" : align === "center" ? "center" : "left"} className="mb-6" />
      <div
        className={`prose prose-sm max-w-none ${textAlign} text-foreground`}
        dangerouslySetInnerHTML={{ __html: str(props.content) || "<p>No content.</p>" }}
      />
    </div>
  );
}

function TextImageBlock({ props }: { props: Record<string, unknown> }) {
  const imageRight = str(props.imagePosition) !== "left";
  const hasImage = !!str(props.imageUrl);
  const mobileImageStyles = getMobileImageStyles(props);
  return (
    <div className={`flex flex-col ${imageRight ? "md:flex-row" : "md:flex-row-reverse"} gap-8 py-4 md:items-stretch`}>
      <div className="flex-1 space-y-3">
        {str(props.heading) && <h2 className="text-2xl font-heading font-bold">{str(props.heading)}</h2>}
        {str(props.body) && (
          <div
            className="prose prose-sm max-w-none text-foreground"
            dangerouslySetInnerHTML={{ __html: str(props.body) }}
          />
        )}
      </div>
      <div className="flex-1 self-stretch">
        {hasImage ? (
          <div className="flex h-full flex-col">
            <img
              src={str(props.imageUrl)}
              alt={str(props.imageAlt)}
              style={mobileImageStyles}
              className="min-h-72 w-full flex-1 rounded-xl [height:var(--mobile-image-height)] [object-fit:var(--mobile-image-fit)] [object-position:var(--mobile-image-position)] md:h-full md:object-cover md:object-center"
            />
            {str(props.imageCaption) && <p className="text-xs text-muted-foreground mt-2 text-center">{str(props.imageCaption)}</p>}
          </div>
        ) : (
          <div className="flex h-full min-h-48 items-center justify-center rounded-xl border border-dashed bg-muted/40">
            <span className="text-muted-foreground text-sm">Image placeholder</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CtaBlock({ props }: { props: Record<string, unknown> }) {
  const variant = str(props.variant) || "dark";
  const bgClass = variant === "dark"
    ? "bg-foreground text-background"
    : variant === "accent"
    ? "bg-accent text-accent-foreground"
    : "bg-muted/40 border";
  return (
    <div className={`rounded-2xl px-8 py-14 text-center ${bgClass}`}>
      <h2 className="text-3xl font-heading font-bold mb-3">{str(props.heading) || "Ready to Get Started?"}</h2>
      {str(props.subheading) && <p className={`mb-8 max-w-xl mx-auto ${variant === "light" ? "text-muted-foreground" : "opacity-80"}`}>{str(props.subheading)}</p>}
      <div className="flex flex-wrap gap-3 justify-center">
        {str(props.primaryText) && (
          <Link href={str(props.primaryLink) || "#"}>
            <Button size="lg" variant={variant === "dark" ? "secondary" : "default"} data-testid="cta-primary">
              {str(props.primaryText)}
            </Button>
          </Link>
        )}
        {str(props.secondaryText) && (
          <Link href={str(props.secondaryLink) || "#"}>
            <Button size="lg" variant="outline" data-testid="cta-secondary">
              {str(props.secondaryText)}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function CardsGridBlock({ props }: { props: Record<string, unknown> }) {
  const cols = str(props.columns) || "3";
  const colsClass = cols === "2" ? "md:grid-cols-2" : cols === "4" ? "md:grid-cols-4" : "md:grid-cols-3";
  const cards = arr<{ title: string; description: string; icon: string }>(props.cards);
  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className={`grid grid-cols-1 ${colsClass} gap-6`}>
        {cards.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-8">Add cards to display here</div>
        ) : cards.map((card, i) => (
          <Card key={i} className="text-center hover:shadow-md transition-shadow">
            <CardContent className="pt-8 pb-6">
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <LucideIcon name={card.icon || "Globe"} className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">{card.title}</h3>
              <p className="text-sm text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FaqBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ question: string; answer: string }>(props.items);
  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="left" className="mb-8" />
      <Accordion type="single" collapsible className="space-y-2">
        {items.length === 0 ? (
          <p className="text-muted-foreground">Add FAQ items to display here.</p>
        ) : items.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-4">
            <AccordionTrigger className="font-medium text-left">{item.question}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function TestimonialsBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ quote: string; name: string; role: string; location: string }>(props.items);
  const shouldCarousel = items.length > 2;

  const renderCard = (item: { quote: string; name: string; role: string; location: string }, i: number) => (
    <Card key={i} className="bg-muted/30 h-full">
      <CardContent className="pt-6">
        <Quote className="h-5 w-5 text-accent mb-3" />
        <p className="text-sm leading-relaxed mb-4 italic">"{item.quote}"</p>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-xs font-semibold text-accent">{item.name?.[0] ?? "?"}</span>
          </div>
          <div>
            <p className="text-sm font-semibold">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.role}{item.location ? ` · ${item.location}` : ""}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      {items.length === 0 ? (
        <p className="text-muted-foreground">Add testimonials to display here.</p>
      ) : shouldCarousel ? (
        <div>
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-6">
              {items.map((item, i) => (
                <CarouselItem key={i} className="pl-6 basis-full md:basis-1/2">
                  {renderCard(item, i)}
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="mt-6 flex items-center justify-center gap-3">
              <CarouselPrevious className="static h-9 w-9 translate-x-0 translate-y-0 border-border/70 bg-background/95" />
              <CarouselNext className="static h-9 w-9 translate-x-0 translate-y-0 border-border/70 bg-background/95" />
            </div>
          </Carousel>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item, i) => renderCard(item, i))}
        </div>
      )}
    </div>
  );
}

function FeaturedProfessionalsBlock({ props }: { props: Record<string, unknown> }) {
  const { data: professionals } = useQuery<{ id: string; title: string; user?: { firstName?: string; lastName?: string } }[]>({
    queryKey: ["/api/therapists/featured"],
  });
  const limit = num(props.limit, 3);
  const visible = (professionals ?? []).slice(0, limit);
  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visible.length === 0 ? (
          <div className="col-span-3 text-center py-8 text-muted-foreground">
            <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Featured mental health professionals will appear here</p>
          </div>
        ) : visible.map((c) => (
          <Card key={c.id} className="text-center hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <UserCheck className="h-6 w-6 text-accent" />
              </div>
              <p className="font-semibold text-sm">{c.user?.firstName} {c.user?.lastName}</p>
              <p className="text-xs text-muted-foreground">{c.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EventsPreviewBlock({ props }: { props: Record<string, unknown> }) {
  const { data: events } = useQuery<{ id: string; title: string; date: string; isVirtual: boolean; imageUrl?: string | null }[]>({
    queryKey: ["/api/events"],
  });
  const limit = num(props.limit, 3);
  const visible = (events ?? []).filter((e) => new Date(e.date) > new Date()).slice(0, limit);
  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visible.length === 0 ? (
          <div className="col-span-3 text-center py-8 text-muted-foreground">
            <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Upcoming events will appear here</p>
          </div>
        ) : visible.map((e) => (
          <Link key={e.id} href={`/events/${e.id}`}>
            <Card className="h-full overflow-hidden hover:shadow-md transition-shadow cursor-pointer" data-testid={`event-preview-${e.id}`}>
              <div className={e.imageUrl ? "flex h-full" : ""}>
                {e.imageUrl && (
                  <div className="w-28 min-w-[7rem] shrink-0" data-testid={`img-event-preview-${e.id}`}>
                    <img src={e.imageUrl} alt={e.title} className="h-full w-full object-cover" />
                  </div>
                )}
                <CardContent className={e.imageUrl ? "p-4 flex-1" : "pt-4"}>
                  <p className="text-xs text-accent font-medium mb-1">{new Date(e.date).toLocaleDateString()}</p>
                  <p className="font-semibold text-sm line-clamp-2">{e.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{e.isVirtual ? "Virtual" : "In Person"}</p>
                </CardContent>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function BlogPreviewBlock({ props }: { props: Record<string, unknown> }) {
  const { data: posts } = useQuery<{ id: string; title: string; excerpt: string; slug: string; coverImageUrl?: string | null; isPublished: boolean }[]>({
    queryKey: ["/api/blog"],
  });
  const limit = num(props.limit, 3);
  const visible = (posts ?? []).filter((p) => p.isPublished).slice(0, limit);
  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visible.length === 0 ? (
          <div className="col-span-3 text-center py-8 text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Blog articles will appear here</p>
          </div>
        ) : visible.map((p) => (
          <Link key={p.id} href={`/insights/${p.slug}`}>
            <Card className="h-full overflow-hidden hover:shadow-md transition-shadow cursor-pointer" data-testid={`blog-preview-${p.id}`}>
              {p.coverImageUrl && (
                <div className="aspect-[16/9] overflow-hidden">
                  <img src={p.coverImageUrl} alt={p.title} className="w-full h-full object-cover" data-testid={`img-blog-preview-${p.id}`} />
                </div>
              )}
              <CardContent className={p.coverImageUrl ? "p-5" : "pt-4"}>
                <p className="font-semibold text-sm mb-1 line-clamp-2">{p.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-3">{p.excerpt}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ButtonGroupBlock({ props }: { props: Record<string, unknown> }) {
  const align = str(props.alignment) || "center";
  const justifyClass = align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center";
  const buttons = arr<{ text: string; link: string; variant: string }>(props.buttons);
  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment={align === "right" ? "right" : align === "center" ? "center" : "left"} className="mb-6" />
      <div className={`flex flex-wrap gap-3 ${justifyClass}`}>
        {buttons.length === 0 ? (
          <p className="text-muted-foreground text-sm">Add buttons to display here</p>
        ) : buttons.map((btn, i) => (
          <Link key={i} href={btn.link || "#"}>
            <Button variant={(btn.variant === "outline" || btn.variant === "secondary" || btn.variant === "ghost" || btn.variant === "destructive") ? btn.variant : "default"} size="lg" data-testid={`button-group-${i}`}>
              {btn.text}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ImageBlockRenderer({ props }: { props: Record<string, unknown> }) {
  const widthClass = IMAGE_WIDTH_MAP[str(props.width)] ?? IMAGE_WIDTH_MAP.contained;
  const hasImage = !!str(props.imageUrl);
  const mobileImageStyles = getMobileImageStyles(props);
  return (
    <div className={`py-4 ${widthClass}`}>
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      {hasImage ? (
        <div>
          <img
            src={str(props.imageUrl)}
            alt={str(props.alt)}
            style={mobileImageStyles}
            className="w-full rounded-xl [height:var(--mobile-image-height)] [object-fit:var(--mobile-image-fit)] [object-position:var(--mobile-image-position)] md:h-auto md:object-cover md:object-center"
          />
          {str(props.caption) && <p className="text-xs text-muted-foreground text-center mt-2">{str(props.caption)}</p>}
        </div>
      ) : (
        <div className="rounded-xl bg-muted/40 border border-dashed h-48 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Image className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Image placeholder</p>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoEmbedBlock({ props }: { props: Record<string, unknown> }) {
  const url = str(props.url);
  const ytId = url ? getYouTubeId(url) : null;
  const vimeoId = url ? getVimeoId(url) : null;
  const aspect = str(props.aspectRatio) || "16/9";
  const paddingMap: Record<string, string> = { "16/9": "56.25%", "4/3": "75%", "1/1": "100%" };
  const paddingBottom = paddingMap[aspect] ?? "56.25%";
  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="left" className="mb-4" titleClassName="font-medium text-base" />
      {!url ? (
        <div className="rounded-xl bg-muted/40 border border-dashed h-48 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Play className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Enter a YouTube or Vimeo URL</p>
          </div>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden" style={{ paddingBottom }}>
          {ytId && (
            <iframe
              src={`https://www.youtube.com/embed/${ytId}`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
          {vimeoId && (
            <iframe
              src={`https://player.vimeo.com/video/${vimeoId}`}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
            />
          )}
          {!ytId && !vimeoId && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
              <p className="text-sm text-muted-foreground">Enter a valid YouTube or Vimeo URL</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContactInfoBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ icon: string; label: string; value: string }>(props.items);
  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="left" className="mb-6" />
      <div className="space-y-4">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Add contact items to display here.</p>
        ) : items.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <LucideIcon name={item.icon || "Globe"} className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="font-medium text-sm">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DividerBlock({ props }: { props: Record<string, unknown> }) {
  const style = str(props.style) || "spacer";
  const spacing = str(props.spacing) || "md";
  const heightClass = SPACING_MAP[spacing] ?? SPACING_MAP.md;
  if (style === "spacer") return <div className={heightClass} />;
  if (style === "dots") return (
    <div className={`flex justify-center items-center gap-2 ${heightClass}`}>
      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
    </div>
  );
  return <hr className={`border-border ${heightClass} border-0 border-t-[1px] my-auto`} />;
}

function FeatureListBlock({ props }: { props: Record<string, unknown> }) {
  const cols = str(props.columns) || "3";
  const colsClass = cols === "1" ? "grid-cols-1" : cols === "2" ? "md:grid-cols-2" : "md:grid-cols-3";
  const features = arr<{ icon: string; title: string; description: string }>(props.features);
  return (
    <div className="py-4" data-testid="block-feature-list">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className={`grid grid-cols-1 ${colsClass} gap-8`}>
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-4" data-testid={`feature-item-${i}`}>
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <LucideIcon name={f.icon || "CheckCircle"} className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ObjectionBustersBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ concern: string; response: string }>(props.items);
  return (
    <div className="py-4" data-testid="block-objection-busters">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="space-y-6 max-w-3xl mx-auto">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border p-6" data-testid={`objection-item-${i}`}>
            <div className="flex items-start gap-3 mb-3">
              <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="font-medium text-sm">{item.concern}</p>
            </div>
            <div className="flex items-start gap-3 pl-8">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">{item.response}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BeforeAfterBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ milestone: string; before: string; after: string }>(props.items);
  return (
    <div className="py-4" data-testid="block-before-after">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="relative max-w-3xl mx-auto">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border hidden sm:block" />
        <div className="space-y-8">
          {items.map((item, i) => (
            <div key={i} className="flex gap-4 sm:gap-6" data-testid={`milestone-item-${i}`}>
              <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-xs">
                {item.milestone}
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                  <p className="text-xs font-medium text-destructive mb-1">Before</p>
                  <p className="text-sm text-muted-foreground">{item.before}</p>
                </div>
                <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3">
                  <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">After</p>
                  <p className="text-sm text-muted-foreground">{item.after}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrustBarBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ icon: string; label: string }>(props.items);
  return (
    <div className="py-4 border-y bg-muted/20" data-testid="block-trust-bar">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-muted-foreground" data-testid={`trust-signal-${i}`}>
            <LucideIcon name={item.icon || "CheckCircle"} className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PressMentionsBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ name: string; logoUrl: string; link: string }>(props.items);
  return (
    <div className="py-4" data-testid="block-press-mentions">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
        {items.map((item, i) => {
          const content = item.logoUrl ? (
            <img src={item.logoUrl} alt={item.name} className="h-8 sm:h-10 object-contain opacity-60 hover:opacity-100 transition-opacity" />
          ) : (
            <span className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">{item.name}</span>
          );
          return item.link ? (
            <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1" data-testid={`press-item-${i}`}>
              {content}
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
          ) : (
            <div key={i} data-testid={`press-item-${i}`}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}

function SocialProofStatsBlock({ props }: { props: Record<string, unknown> }) {
  const stats = arr<{ value: string; label: string }>(props.stats);
  return (
    <div className="py-4" data-testid="block-social-proof-stats">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
        {stats.map((stat, i) => (
          <div key={i} className="text-center" data-testid={`stat-item-${i}`}>
            <p className="text-3xl md:text-4xl font-bold text-accent">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
      {str(props.disclaimer) && (
        <p className="text-xs text-muted-foreground text-center mt-6 italic">{str(props.disclaimer)}</p>
      )}
    </div>
  );
}

function ImageGridBlock({ props }: { props: Record<string, unknown> }) {
  const cols = str(props.columns) || "3";
  const colsClass = cols === "2" ? "md:grid-cols-2" : cols === "4" ? "md:grid-cols-4" : "md:grid-cols-3";
  const gapSize = str(props.gap) || "md";
  const gapClass = gapSize === "sm" ? "gap-2" : gapSize === "lg" ? "gap-6" : gapSize === "xl" ? "gap-8" : "gap-4";
  const images = arr<{ url: string; alt: string; caption: string }>(props.images);
  return (
    <div className="py-4" data-testid="block-image-grid">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      {images.length === 0 ? (
        <div className="rounded-xl bg-muted/40 border border-dashed h-48 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Add images to display here</p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${colsClass} ${gapClass}`}>
          {images.map((img, i) => (
            <div key={i} data-testid={`grid-image-${i}`}>
              <img src={img.url} alt={img.alt} className="w-full rounded-lg object-cover aspect-square" />
              {img.caption && <p className="text-xs text-muted-foreground text-center mt-1">{img.caption}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SliderBlock({ props }: { props: Record<string, unknown> }) {
  const [current, setCurrent] = useState(0);
  const slides = arr<{ imageUrl: string; heading: string; description: string }>(props.slides);
  useEffect(() => {
    if (slides.length > 0 && current >= slides.length) setCurrent(Math.max(0, slides.length - 1));
  }, [slides.length, current]);
  if (slides.length === 0) return (
    <div className="py-4 rounded-xl bg-muted/40 border border-dashed h-48 flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Add slides to display here</p>
    </div>
  );
  const safeIdx = Math.min(current, slides.length - 1);
  const slide = slides[safeIdx];
  return (
    <div className="py-4" data-testid="block-slider">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      <div className="relative rounded-xl overflow-hidden bg-muted/20 border">
        {slide.imageUrl && (
          <img src={slide.imageUrl} alt={slide.heading} className="w-full aspect-[16/9] object-cover" />
        )}
        <div className={`${slide.imageUrl ? "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent" : ""} p-6 sm:p-8`}>
          {slide.heading && <h3 className={`text-xl font-heading font-bold mb-2 ${slide.imageUrl ? "text-white" : ""}`}>{slide.heading}</h3>}
          {slide.description && <p className={`text-sm ${slide.imageUrl ? "text-white/80" : "text-muted-foreground"}`}>{slide.description}</p>}
        </div>
      </div>
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <Button variant="outline" size="icon" className="rounded-full h-8 w-8" onClick={() => setCurrent((c) => (c - 1 + slides.length) % slides.length)} data-testid="button-slider-prev">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button key={i} className={`w-2 h-2 rounded-full transition-colors ${i === current ? "bg-accent" : "bg-muted-foreground/30"}`} onClick={() => setCurrent(i)} data-testid={`button-slider-dot-${i}`} />
            ))}
          </div>
          <Button variant="outline" size="icon" className="rounded-full h-8 w-8" onClick={() => setCurrent((c) => (c + 1) % slides.length)} data-testid="button-slider-next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function StatsBarBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ icon: string; value: string; label: string }>(props.items);
  return (
    <div className="py-6 bg-muted/30 rounded-xl" data-testid="block-stats-bar">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6 px-4" />
      <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 px-4">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3" data-testid={`stats-bar-item-${i}`}>
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
              <LucideIcon name={item.icon || "Star"} className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IconGridBlock({ props }: { props: Record<string, unknown> }) {
  const cols = str(props.columns) || "4";
  const colsClass = cols === "2" ? "md:grid-cols-2" : cols === "3" ? "md:grid-cols-3" : cols === "5" ? "md:grid-cols-5" : "md:grid-cols-4";
  const items = arr<{ icon: string; title: string }>(props.items);
  return (
    <div className="py-4" data-testid="block-icon-grid">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className={`grid grid-cols-2 ${colsClass} gap-4`}>
        {items.map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-xl border hover:shadow-sm transition-shadow" data-testid={`icon-grid-item-${i}`}>
            <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <LucideIcon name={item.icon || "Globe"} className="h-6 w-6 text-accent" />
            </div>
            <p className="text-sm font-medium text-center">{item.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BenefitStackBlock({ props }: { props: Record<string, unknown> }) {
  const layout = str(props.layout) || "stack";
  const items = arr<{ icon: string; title: string; description: string }>(props.items);
  const isTimeline = layout === "timeline";
  return (
    <div className="py-4" data-testid="block-benefit-stack">
      <SectionHeading props={props} defaultAlignment="left" className="mb-8" />
      <div className={`relative ${isTimeline ? "pl-8" : ""}`}>
        {isTimeline && <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-accent/20" />}
        <div className={isTimeline ? "space-y-6" : "space-y-4"}>
          {items.map((item, i) => (
            <div key={i} className={`flex items-start gap-4 ${isTimeline ? "relative" : "p-4 rounded-lg border"}`} data-testid={`benefit-item-${i}`}>
              {isTimeline && <div className="absolute -left-5 top-1 h-4 w-4 rounded-full bg-accent border-2 border-background" />}
              <div className={`h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0`}>
                <LucideIcon name={item.icon || "CheckCircle"} className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScienceExplainerBlock({ props }: { props: Record<string, unknown> }) {
  const citations = arr<{ text: string; url: string }>(props.citations);
  return (
    <div className="py-4" data-testid="block-science-explainer">
      <SectionHeading props={props} defaultAlignment="left" className="mb-6" />
      {str(props.body) && (
        <div className="prose prose-sm max-w-none text-foreground mb-6" dangerouslySetInnerHTML={{ __html: str(props.body) }} />
      )}
      {citations.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Sources</p>
          <ol className="space-y-1">
            {citations.map((c, i) => (
              <li key={i} className="text-xs text-muted-foreground" data-testid={`citation-${i}`}>
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-accent/80">
                    {c.text}
                  </a>
                ) : c.text}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function SafetyChecklistBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ text: string; required: boolean }>(props.items);
  return (
    <div className="py-4" data-testid="block-safety-checklist">
      <SectionHeading props={props} defaultAlignment="left" className="mb-6" />
      <div className="space-y-3 max-w-2xl">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3" data-testid={`checklist-item-${i}`}>
            <CheckCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${item.required ? "text-accent" : "text-muted-foreground/50"}`} />
            <div className="flex items-center gap-2">
              <span className="text-sm">{item.text}</span>
              {item.required && <span className="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded">Required</span>}
            </div>
          </div>
        ))}
      </div>
      {str(props.disclaimer) && (
        <p className="text-xs text-muted-foreground mt-6 italic border-t pt-4">{str(props.disclaimer)}</p>
      )}
    </div>
  );
}

function GuaranteeWarrantyBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ text: string } | string>(props.items);
  return (
    <div className="py-4" data-testid="block-guarantee-warranty">
      <div className="rounded-2xl bg-accent/5 border border-accent/20 p-8 text-center">
        <BadgeCheck className="h-10 w-10 text-accent mx-auto mb-4" />
        <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
        <ul className="space-y-2 max-w-lg mx-auto text-left mb-6">
          {items.map((item, i) => {
            const text = typeof item === "string" ? item : (item as { text: string }).text;
            return (
              <li key={i} className="flex items-start gap-2" data-testid={`guarantee-item-${i}`}>
                <CheckCircle className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                <span className="text-sm">{text}</span>
              </li>
            );
          })}
        </ul>
        {str(props.ctaText) && (
          str(props.ctaLink) ? (
            <Link href={str(props.ctaLink)}>
              <Button className="bg-accent text-accent-foreground">{str(props.ctaText)}</Button>
            </Link>
          ) : (
            <Button className="bg-accent text-accent-foreground">{str(props.ctaText)}</Button>
          )
        )}
      </div>
    </div>
  );
}

function DeliverySetupBlock({ props }: { props: Record<string, unknown> }) {
  const steps = arr<{ step: string; title: string; description: string }>(props.steps);
  const includedItems = arr<{ text: string } | string>(props.includedItems);
  return (
    <div className="py-4" data-testid="block-delivery-setup">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="relative max-w-3xl mx-auto mb-8">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border hidden sm:block" />
        <div className="space-y-6">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-4 sm:gap-6" data-testid={`setup-step-${i}`}>
              <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm">
                {step.step}
              </div>
              <div className="pt-2">
                <h3 className="font-semibold text-sm sm:text-base mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {includedItems.length > 0 && (
        <div className="bg-muted/30 rounded-xl p-6 max-w-3xl mx-auto">
          <h3 className="font-semibold text-sm mb-3">What's Included</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {includedItems.map((item, i) => {
              const text = typeof item === "string" ? item : (item as { text: string }).text;
              return (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                  {text}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function RecoveryUseCasesBlock({ props }: { props: Record<string, unknown> }) {
  const personas = arr<{ icon: string; title: string; description: string }>(props.personas);
  return (
    <div className="py-4" data-testid="block-recovery-use-cases">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {personas.map((p, i) => (
          <Card key={i} className="text-center hover:shadow-md transition-shadow" data-testid={`persona-card-${i}`}>
            <CardContent className="pt-8 pb-6">
              <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <LucideIcon name={p.icon || "User"} className="h-7 w-7 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ProtocolBuilderBlock({ props }: { props: Record<string, unknown> }) {
  const level = str(props.level) || "beginner";
  const steps = arr<{ title: string; description: string }>(props.steps);
  const levelColors: Record<string, string> = {
    beginner: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    intermediate: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    advanced: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  };
  return (
    <div className="py-4" data-testid="block-protocol-builder">
      <div className="flex flex-wrap items-start gap-3 mb-6">
        <SectionHeading props={props} defaultAlignment="left" className="flex-1 min-w-[220px]" />
        <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${levelColors[level] || levelColors.beginner}`}>
          {level}
        </span>
      </div>
      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-4 items-start" data-testid={`protocol-step-${i}`}>
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
              {i + 1}
            </div>
            <div className="flex-1 border rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const RENDERERS: Record<string, React.ComponentType<{ props: Record<string, unknown> }>> = {
  hero: HeroBlock,
  "section-header": SectionHeaderBlock,
  "rich-text": RichTextBlock,
  "text-image": TextImageBlock,
  "two-column-text": TwoColumnTextBlock,
  "callout-box": CalloutBoxBlock,
  "link-list": LinkListBlock,
  cta: CtaBlock,
  "cards-grid": CardsGridBlock,
  faq: FaqBlock,
  testimonials: TestimonialsBlock,
  "featured-professionals": FeaturedProfessionalsBlock,
  "featured-counselors": FeaturedProfessionalsBlock,
  "events-preview": EventsPreviewBlock,
  "blog-preview": BlogPreviewBlock,
  "button-group": ButtonGroupBlock,
  "image-block": ImageBlockRenderer,
  "video-embed": VideoEmbedBlock,
  "contact-info": ContactInfoBlock,
  divider: DividerBlock,
  "feature-list": FeatureListBlock,
  "objection-busters": ObjectionBustersBlock,
  "before-after": BeforeAfterBlock,
  "trust-bar": TrustBarBlock,
  "press-mentions": PressMentionsBlock,
  "social-proof-stats": SocialProofStatsBlock,
  "image-grid": ImageGridBlock,
  slider: SliderBlock,
  "stats-bar": StatsBarBlock,
  "icon-grid": IconGridBlock,
  "benefit-stack": BenefitStackBlock,
  "science-explainer": ScienceExplainerBlock,
  "safety-checklist": SafetyChecklistBlock,
  "guarantee-warranty": GuaranteeWarrantyBlock,
  "delivery-setup": DeliverySetupBlock,
  "recovery-use-cases": RecoveryUseCasesBlock,
  "protocol-builder": ProtocolBuilderBlock,
};

const DYNAMIC_BLOCK_TYPES = new Set([
  "therapist-map",
  "contact-form",
  "join-hero",
  "join-registration-form",
  "blog-post-feed",
  "blog-featured-post",
  "events-archive",
  "video-archives",
  "directory-browser",
]);

export function PublicBlockRenderer({
  block,
  disableSectionStyleWrap = false,
}: {
  block: BlockInstance;
  disableSectionStyleWrap?: boolean;
}) {
  let renderedBlock: ReactElement | null = null;

  if (DYNAMIC_BLOCK_TYPES.has(block.type)) {
    if (block.type === "blog-post-feed") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyBlogPostFeedBlock props={block.props} />
        </Suspense>
      );
    }
    if (block.type === "blog-featured-post") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyBlogFeaturedPostBlock props={block.props} />
        </Suspense>
      );
    }
    if (block.type === "therapist-map") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyTherapistMapBlock props={block.props} />
        </Suspense>
      );
    }
    if (block.type === "contact-form") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyContactFormBlock />
        </Suspense>
      );
    }
    if (block.type === "join-hero") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyJoinHeroBlock props={block.props} />
        </Suspense>
      );
    }
    if (block.type === "join-registration-form") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyJoinRegistrationFormBlock props={block.props} />
        </Suspense>
      );
    }
    if (block.type === "events-archive") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyEventsArchiveSection props={block.props} />
        </Suspense>
      );
    }
    if (block.type === "video-archives") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyRecordingArchivesSection props={block.props} />
        </Suspense>
      );
    }
    if (block.type === "directory-browser") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyDirectoryBrowserSection props={block.props} />
        </Suspense>
      );
    }
  }

  if (!renderedBlock) {
    const Renderer = RENDERERS[block.type];
    if (!Renderer) {
      return (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
          Unknown block type: <code>{block.type}</code>
        </div>
      );
    }
    renderedBlock = <Renderer props={block.props} />;
  }

  if (block.type === "hero") {
    return renderedBlock;
  }

  if (disableSectionStyleWrap) {
    return renderedBlock;
  }

  return (
    <SectionStyleWrapper
      props={block.props}
      resolveAssetUrl={resolveCmsAssetUrl}
      contentClassName={getSectionPaddingClasses(block.props)}
    >
      {renderedBlock}
    </SectionStyleWrapper>
  );
}

export const FULL_WIDTH_BLOCK_TYPES = new Set([
  "hero",
  "join-hero",
  "join-registration-form",
  "events-archive",
  "video-archives",
  "directory-browser",
  "cta",
  "trust-bar",
  "divider",
  "slider",
  "stats-bar",
]);

export function PublicPageRenderer({ blocks }: { blocks: BlockInstance[] }) {
  let nonFullWidthIndex = 0;
  const normalizedBlocks = mergeJoinHeroBlocks(blocks);
  return (
    <div>
      {normalizedBlocks.map((block) => {
        const isFullWidth = FULL_WIDTH_BLOCK_TYPES.has(block.type);
        const sectionStyleConfig = getSectionStyleConfig(block.props, { resolveAssetUrl: resolveCmsAssetUrl });
        const hasCustomSectionStyle = block.type !== "hero" && hasSectionStyleConfig(sectionStyleConfig);
        const idx = isFullWidth ? nonFullWidthIndex : nonFullWidthIndex++;
        const isAlternate = idx % 2 === 1 && !hasCustomSectionStyle;

        if (hasCustomSectionStyle) {
          return (
            <SectionStyleWrapper
              key={block.id}
              props={block.props}
              resolveAssetUrl={resolveCmsAssetUrl}
              className="rounded-none"
              contentClassName={isFullWidth ? undefined : getSectionPaddingClasses(block.props)}
            >
              {isFullWidth ? (
                <PublicBlockRenderer block={block} disableSectionStyleWrap />
              ) : (
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
                  <PublicBlockRenderer block={block} disableSectionStyleWrap />
                </div>
              )}
            </SectionStyleWrapper>
          );
        }

        if (isFullWidth) {
          return <PublicBlockRenderer key={block.id} block={block} />;
        }

        return (
          <section
            key={block.id}
            className={`relative overflow-hidden ${isAlternate ? "bg-muted/30" : ""}`}
          >
            {isAlternate && (
              <div
                className="pointer-events-none absolute top-0 left-0 right-0 h-32"
                style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(var(--accent) / 0.10) 0%, transparent 70%)" }}
              />
            )}
            <div className={`relative max-w-7xl mx-auto px-4 sm:px-6 ${getSectionPaddingClasses(block.props)}`}>
              <PublicBlockRenderer block={block} disableSectionStyleWrap />
            </div>
          </section>
        );
      })}
    </div>
  );
}

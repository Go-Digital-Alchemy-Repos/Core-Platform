import { lazy, Suspense, useState, useMemo, useEffect, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FormModalButton } from "@/components/forms/form-modal-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Globe, Heart, Users, MapPin, Mail, Phone, Star, CheckCircle,
  Sparkles, FileText, LayoutTemplate, Megaphone, LayoutGrid,
  HelpCircle, Quote, UserCheck, CalendarDays, BookOpen,
  MousePointerClick, Image, Play, Minus, Heading,
  Map, Lock, UserPlus, Send, Loader2, ArrowRight, Clock,
  AlertCircle, ClipboardCheck, BarChart3, Search, User, ShieldCheck,
  List, Shield, Newspaper, TrendingUp, Grid3X3, Rss,
  ListChecks, FlaskConical, BadgeCheck, Workflow, ListOrdered,
  ChevronLeft, ChevronRight, GalleryHorizontal, Grid2X2, Building2,
  ExternalLink, XCircle,
} from "lucide-react";
import { LoginDialog } from "@/components/auth/login-dialog";
import { MapView } from "@/components/directory/map-view";
import type { BlockInstance } from "./block-registry";
import { PublicFormRenderer } from "@/components/forms/public-form-renderer";
import { CompanyInformationCard } from "@/components/shared/company-information-card";
import { getImageObjectPositionStyle } from "@/lib/image-focus";
import { getEventPath } from "@shared/event-url";
import { isDynamicBlock, getBlockDef } from "./block-registry";
import { mergeJoinHeroBlocks } from "@shared/cms-blocks";
import {
  SectionStyleWrapper,
  DEFAULT_SECTION_LINEAR_GRADIENT,
  getSectionPaddingClasses,
  getSectionStyleConfig,
  hasSectionStyleConfig,
  hexToRgba,
  normalizeHexColor,
} from "./section-style";
import { SectionHeading } from "./section-heading";
import { getPostCategories, getPrimaryPostCategory, postMatchesCategory } from "@/lib/blog-post-categories";
import {
  arr,
  colorStyle,
  getMobileImageStyles,
  getVimeoId,
  getYouTubeId,
  IMAGE_WIDTH_MAP,
  num,
  resolveCmsAssetUrl,
  SPACING_MAP,
  str,
} from "./block-renderer.shared";

const LUCIDE_MAP: Record<string, React.ElementType> = {
  Globe, Heart, Users, MapPin, Mail, Phone, Star, CheckCircle,
  Sparkles, FileText, LayoutTemplate, Megaphone, LayoutGrid,
  HelpCircle, Quote, UserCheck, CalendarDays, BookOpen,
  MousePointerClick, Image, Play, Minus, Heading,
  Map, Lock, UserPlus, Send, ArrowRight,
  AlertCircle, ClipboardCheck, BarChart3, Search, User, ShieldCheck,
  List, Shield, Newspaper, TrendingUp, Grid3X3, Rss,
  ListChecks, FlaskConical, BadgeCheck, Workflow, ListOrdered,
  ChevronLeft, ChevronRight, GalleryHorizontal, Grid2X2, Building2,
  ExternalLink, XCircle,
};

function LucideIcon({ name, className }: { name: string; className?: string }) {
  const Icon = LUCIDE_MAP[name] ?? Globe;
  return <Icon className={className} />;
}

const LazyManagedFormEmbedBlock = lazy(() =>
  import("@/features/public/public-dynamic-blocks").then((module) => ({
    default: module.ManagedFormEmbedBlock,
  }))
);

const LazyEventsArchiveSection = lazy(() =>
  import("@/features/public/events-page").then((module) => ({
    default: module.EventsArchiveSection,
  }))
);

const LazyRecordingArchivesSection = lazy(() =>
  import("@/features/public/recording-archives-page").then((module) => ({
    default: module.RecordingArchivesSection,
  }))
);

const LazyDirectoryBrowserSection = lazy(() =>
  import("@/features/directory/directory-page").then((module) => ({
    default: module.DirectoryBrowserSection,
  }))
);

function DynamicPreviewFallback() {
  return (
    <div className="flex justify-center py-10">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
      className={`relative flex items-center overflow-hidden ${isSplit ? "justify-start text-left" : "justify-center text-center"}`}
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
      <div className="absolute inset-0" style={overlayStyle} />
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
          <div
            className={`text-lg text-white/80 mb-8 [&_a]:text-white [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-white/80 [&_p]:m-0 ${isSplit ? "" : "max-w-xl mx-auto"}`}
            style={subheadingTextStyle}
            dangerouslySetInnerHTML={{ __html: str(props.subheading) }}
          />
        )}
        <div className={`flex flex-wrap gap-3 ${isSplit ? "justify-start" : "justify-center"}`}>
          {str(props.ctaText) && (
            <FormModalButton
              label={str(props.ctaText)}
              action={props.ctaAction}
              href={props.ctaLink}
              openInNewTab={props.ctaOpenInNewTab}
              formSlug={props.ctaFormSlug}
              modalTitle={props.ctaModalTitle}
              modalDescription={props.ctaModalDescription}
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              testId="hero-cta-primary"
            />
          )}
          {str(props.ctaSecondaryText) && (
            <FormModalButton
              label={str(props.ctaSecondaryText)}
              action={props.ctaSecondaryAction}
              href={props.ctaSecondaryLink}
              openInNewTab={props.ctaSecondaryOpenInNewTab}
              formSlug={props.ctaSecondaryFormSlug}
              modalTitle={props.ctaSecondaryModalTitle}
              modalDescription={props.ctaSecondaryModalDescription}
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
              testId="hero-cta-secondary"
            />
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
      <div className={`rounded-2xl p-5 sm:p-8 ${variantClass}`}>
        <div
          className="prose prose-sm max-w-none break-words text-foreground"
          dangerouslySetInnerHTML={{ __html: str(props.content) || "<p>Add callout content.</p>" }}
        />
        {str(props.ctaText) && (
          <div className="mt-6">
            <FormModalButton
              label={str(props.ctaText)}
              action={props.ctaAction}
              href={props.ctaLink}
              openInNewTab={props.ctaOpenInNewTab}
              formSlug={props.ctaFormSlug}
              modalTitle={props.ctaModalTitle}
              modalDescription={props.ctaModalDescription}
              className="w-full sm:w-auto"
            />
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
              className="group rounded-xl border p-4 transition-shadow hover:shadow-md sm:p-5"
              data-testid={`link-list-item-${index}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold break-words transition-colors group-hover:text-accent">{link.label || "Untitled link"}</h3>
                  {link.description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{link.description}</p>}
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
  const align = str(props.alignment) || "left";
  const bodyAlign = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  return (
    <div className={`flex flex-col ${imageRight ? "md:flex-row" : "md:flex-row-reverse"} gap-8 py-4 md:items-stretch`}>
      <div className="min-w-0 flex-1 space-y-3">
        <SectionHeading props={props} defaultAlignment={align === "center" ? "center" : align === "right" ? "right" : "left"} className="mb-4" />
        {str(props.body) && (
          <div
            className={`prose prose-sm max-w-none text-foreground ${bodyAlign}`}
            dangerouslySetInnerHTML={{ __html: str(props.body) }}
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 self-stretch flex-col">
        {hasImage ? (
          <div className="flex h-full flex-col">
            <div className="relative min-h-72 md:h-full md:min-h-0 md:flex-1">
            <img
              src={str(props.imageUrl)}
              alt={str(props.imageAlt)}
              style={mobileImageStyles}
              className="w-full rounded-xl [height:var(--mobile-image-height)] [object-fit:var(--mobile-image-fit)] [object-position:var(--mobile-image-position)] md:absolute md:inset-0 md:h-full md:w-full md:object-cover md:object-center"
            />
            </div>
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
    <div className={`px-4 py-10 text-center sm:px-8 sm:py-14 ${bgClass}`}>
      <h2 className="mb-3 text-2xl font-heading font-bold leading-tight sm:text-3xl md:text-4xl">{str(props.heading) || "Ready to Get Started?"}</h2>
      {str(props.subheading) && (
        <div
          className={`mb-8 mx-auto max-w-xl text-sm leading-relaxed sm:text-base [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:opacity-80 [&_p]:m-0 ${variant === "light" ? "text-muted-foreground [&_a]:text-primary" : "opacity-80 [&_a]:text-current"}`}
          dangerouslySetInnerHTML={{ __html: str(props.subheading) }}
        />
      )}
      <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
        {str(props.primaryText) && (
          <FormModalButton
            label={str(props.primaryText)}
            action={props.primaryAction}
            href={props.primaryLink}
            openInNewTab={props.primaryOpenInNewTab}
            formSlug={props.primaryFormSlug}
            modalTitle={props.primaryModalTitle}
            modalDescription={props.primaryModalDescription}
            size="lg"
            variant={variant === "dark" ? "secondary" : "default"}
            className="w-full sm:w-auto"
            testId="cta-primary"
          />
        )}
        {str(props.secondaryText) && (
          <FormModalButton
            label={str(props.secondaryText)}
            action={props.secondaryAction}
            href={props.secondaryLink}
            openInNewTab={props.secondaryOpenInNewTab}
            formSlug={props.secondaryFormSlug}
            modalTitle={props.secondaryModalTitle}
            modalDescription={props.secondaryModalDescription}
            size="lg"
            variant="outline"
            className="w-full sm:w-auto"
            testId="cta-secondary"
          />
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
      <div className={`grid grid-cols-1 ${colsClass} gap-4 sm:gap-6`}>
        {cards.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-8">Add cards to display here</div>
        ) : cards.map((card, i) => (
          <Card key={i} className="h-full overflow-hidden text-center transition-shadow hover:shadow-md">
            <CardContent className="px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-8">
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <LucideIcon name={card.icon || "Globe"} className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-2 text-base font-semibold leading-snug break-words">{card.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{card.description}</p>
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
            <AccordionContent>
              <div
                className="text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-primary/80 [&_p]:m-0"
                dangerouslySetInnerHTML={{ __html: item.answer }}
              />
            </AccordionContent>
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
  const { data: events } = useQuery<{ id: string; slug?: string | null; title: string; date: string; isVirtual: boolean; imageUrl?: string | null; imagePositionX?: number | null; imagePositionY?: number | null }[]>({
    queryKey: ["/api/events"],
  });
  const limit = num(props.limit, 4);
  const ctaText = str(props.ctaText);
  const ctaLink = str(props.ctaLink);
  const visible = (events ?? []).filter((e) => new Date(e.date) > new Date()).slice(0, limit);
  const shouldCarousel = visible.length > 4;

  const renderEventCard = (e: { id: string; slug?: string | null; title: string; date: string; isVirtual: boolean; imageUrl?: string | null; imagePositionX?: number | null; imagePositionY?: number | null }) => (
    <Link key={e.id} href={getEventPath(e)} className="w-full max-w-[13.5rem]">
      <Card className="mx-auto h-full w-full max-w-[13.5rem] overflow-hidden transition-shadow hover:shadow-md cursor-pointer" data-testid={`event-preview-${e.id}`}>
        {e.imageUrl && (
          <div className="aspect-[16/10] overflow-hidden" data-testid={`img-event-preview-${e.id}`}>
            <img src={e.imageUrl} alt={e.title} className="h-full w-full object-cover" style={getImageObjectPositionStyle(e.imagePositionX, e.imagePositionY)} />
          </div>
        )}
        <CardContent className={e.imageUrl ? "p-3.5" : "pt-3.5"}>
          <p className="mb-1 text-xs font-medium text-accent">{new Date(e.date).toLocaleDateString()}</p>
          <p className="line-clamp-2 text-sm font-semibold">{e.title}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{e.isVirtual ? "Virtual" : "In Person"}</p>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      {visible.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Upcoming events will appear here</p>
        </div>
      ) : shouldCarousel ? (
        <div>
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {visible.map((e) => (
                <CarouselItem key={e.id} className="pl-4 basis-[70%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                  {renderEventCard(e)}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((e) => renderEventCard(e))}
        </div>
      )}
      {ctaText && (
        <div className="mt-6 flex justify-center">
          <FormModalButton
            label={ctaText}
            action={props.ctaAction}
            href={ctaLink}
            openInNewTab={props.ctaOpenInNewTab}
            formSlug={props.ctaFormSlug}
            modalTitle={props.ctaModalTitle}
            modalDescription={props.ctaModalDescription}
          />
        </div>
      )}
    </div>
  );
}

function BlogPreviewBlock({ props }: { props: Record<string, unknown> }) {
  const { data: posts } = useQuery<{ id: string; title: string; excerpt: string; slug: string; coverImageUrl?: string | null; coverImagePositionX?: number | null; coverImagePositionY?: number | null; isPublished: boolean }[]>({
    queryKey: ["/api/blog"],
  });
  const limit = num(props.limit, 5);
  const enableHoverMotion = props.enableHoverMotion !== false;
  const visible = (posts ?? []).filter((p) => p.isPublished).slice(0, limit);
  const shouldCarousel = visible.length > 5;

  const renderBlogCard = (p: { id: string; title: string; excerpt: string; slug: string; coverImageUrl?: string | null; coverImagePositionX?: number | null; coverImagePositionY?: number | null }) => (
    <Link key={p.id} href={`/insights/${p.slug}`} className="w-full max-w-[13.5rem]">
      <Card className={`mx-auto h-full w-full max-w-[13.5rem] overflow-hidden cursor-pointer ${enableHoverMotion ? "blog-card-motion" : ""}`} data-testid={`blog-preview-${p.id}`}>
        {p.coverImageUrl && (
          <div className="aspect-[16/10] overflow-hidden">
            <img src={p.coverImageUrl} alt={p.title} className="h-full w-full object-cover" style={getImageObjectPositionStyle(p.coverImagePositionX, p.coverImagePositionY)} data-blog-card-image data-testid={`img-blog-preview-${p.id}`} />
          </div>
        )}
        <CardContent className={p.coverImageUrl ? "p-3.5" : "pt-3.5"}>
          <p className="mb-1 line-clamp-2 text-sm font-semibold">{p.title}</p>
          <p className="line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">{p.excerpt}</p>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      {visible.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-30" />
          <p className="text-sm">Blog articles will appear here</p>
        </div>
      ) : shouldCarousel ? (
        <div>
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {visible.map((p) => (
                <CarouselItem key={p.id} className="pl-4 basis-[70%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/5">
                  {renderBlogCard(p)}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {visible.map((p) => renderBlogCard(p))}
        </div>
      )}
      {visible.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Link href="/insights">
            <Button variant="outline" size="lg">
              Read More Articles
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function ButtonGroupBlock({ props }: { props: Record<string, unknown> }) {
  const align = str(props.alignment) || "center";
  const justifyClass = align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center";
  const buttons = arr<{ text: string; link: string; variant: string; action?: string; openInNewTab?: boolean; formSlug?: string; modalTitle?: string; modalDescription?: string }>(props.buttons);
  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment={align === "right" ? "right" : align === "center" ? "center" : "left"} className="mb-6" />
      <div className={`flex flex-wrap gap-3 ${justifyClass}`}>
        {buttons.length === 0 ? (
          <p className="text-muted-foreground text-sm">Add buttons to display here</p>
        ) : buttons.map((btn, i) => (
          <FormModalButton
            key={i}
            label={btn.text}
            action={btn.action}
            href={btn.link}
            openInNewTab={btn.openInNewTab}
            formSlug={btn.formSlug}
            modalTitle={btn.modalTitle}
            modalDescription={btn.modalDescription}
            variant={(btn.variant === "outline" || btn.variant === "secondary" || btn.variant === "ghost" || btn.variant === "destructive") ? btn.variant : "default"}
            size="lg"
            testId={`button-group-${i}`}
          />
        ))}
      </div>
    </div>
  );
}

function RawHtmlBlock({ props }: { props: Record<string, unknown> }) {
  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      <div
        className="prose prose-sm max-w-none text-foreground"
        dangerouslySetInnerHTML={{ __html: str(props.html) || "" }}
      />
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
              <p className="break-words font-medium text-sm">{item.value}</p>
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
      <div className={`grid grid-cols-1 ${colsClass} gap-6 sm:gap-8`}>
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
      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-center gap-3 rounded-xl border border-border/50 bg-background/70 px-4 py-4 text-center sm:justify-start" data-testid={`stats-bar-item-${i}`}>
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
  const colsClass =
    cols === "2"
      ? "sm:grid-cols-2"
      : cols === "3"
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : cols === "5"
          ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          : "sm:grid-cols-2 lg:grid-cols-4";
  const items = arr<{ icon: string; title: string }>(props.items);
  return (
    <div className="py-4" data-testid="block-icon-grid">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className={`grid grid-cols-1 ${colsClass} gap-4`}>
        {items.map((item, i) => (
          <div key={i} className="flex min-w-0 flex-col items-center gap-3 rounded-xl border p-4 text-center transition-shadow hover:shadow-sm sm:p-5" data-testid={`icon-grid-item-${i}`}>
            <div className="flex h-12 w-12 rounded-xl bg-accent/10 items-center justify-center">
              <LucideIcon name={item.icon || "Globe"} className="h-6 w-6 text-accent" />
            </div>
            <p className="text-sm font-medium leading-snug break-words">{item.title}</p>
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
              <div className={`h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 ${isTimeline ? "" : ""}`}>
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
          <FormModalButton
            label={str(props.ctaText)}
            action={props.ctaAction}
            href={props.ctaLink}
            openInNewTab={props.ctaOpenInNewTab}
            formSlug={props.ctaFormSlug}
            modalTitle={props.ctaModalTitle}
            modalDescription={props.ctaModalDescription}
            className="bg-accent text-accent-foreground"
          />
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
      <div className="max-w-3xl mx-auto mb-8">
        <div className="space-y-6">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-4 sm:gap-6" data-testid={`setup-step-${i}`}>
              <div className="relative flex w-12 flex-shrink-0 justify-center">
                {i < steps.length - 1 ? (
                  <div className="absolute left-1/2 top-12 h-[calc(100%+1.5rem)] w-0.5 -translate-x-1/2 bg-border hidden sm:block" />
                ) : null}
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-sm">
                  {step.step}
                </div>
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

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  category?: string;
  categories?: string[] | null;
  tags?: string[];
  coverImageUrl?: string;
  coverImagePositionX?: number | null;
  coverImagePositionY?: number | null;
  postType?: string | null;
  externalUrl?: string | null;
  isPublished: boolean;
}

function FeaturedBlogCard({
  post,
  layout,
  enableHoverMotion = true,
}: {
  post: BlogPost;
  layout: string;
  enableHoverMotion?: boolean;
}) {
  const isExternal = post.postType === "external" && post.externalUrl;
  const isPodcast = post.postType === "podcast";
  const actionText = isExternal ? "Visit Article" : isPodcast ? "Listen Now" : "Read Article";
  const card = (
    <Card className={`cursor-pointer overflow-hidden ${enableHoverMotion ? "blog-card-motion" : ""}`} data-testid="blog-featured-card">
      <div className={layout === "stacked" ? "grid grid-cols-1" : "grid grid-cols-1 md:grid-cols-2"}>
        {post.coverImageUrl && (
          <div className="aspect-[16/9] md:aspect-auto overflow-hidden">
            <img src={post.coverImageUrl} alt={post.title} className="w-full h-full object-cover" style={getImageObjectPositionStyle(post.coverImagePositionX, post.coverImagePositionY)} data-blog-card-image />
          </div>
        )}
        <CardContent className="p-6 flex flex-col justify-center">
          <h3 className="text-xl font-heading font-bold mb-3">{post.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-4">{post.excerpt}</p>
          <div className="mt-4">
            <span className="text-sm text-accent font-medium inline-flex items-center gap-1">
              {actionText} {isExternal ? <ExternalLink className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </span>
          </div>
        </CardContent>
      </div>
    </Card>
  );

  return isExternal ? (
    <a href={post.externalUrl!} target="_blank" rel="noopener noreferrer">
      {card}
    </a>
  ) : (
    <Link href={`/insights/${post.slug}`}>
      {card}
    </Link>
  );
}

function BlogFeedFilters({
  showSearch,
  showCategoryFilter,
  showTagFilter,
  searchQuery,
  selectedCategory,
  selectedTag,
  categories,
  allTags,
  onSearchChange,
  onCategoryChange,
  onTagChange,
  onReset,
}: {
  showSearch: boolean;
  showCategoryFilter: boolean;
  showTagFilter: boolean;
  searchQuery: string;
  selectedCategory: string;
  selectedTag: string;
  categories: string[];
  allTags: string[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-3 mb-6">
      {showSearch && (
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search articles..."
            className="pl-9"
            data-testid="input-blog-search"
          />
        </div>
      )}
      {showCategoryFilter && categories.length > 0 && (
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          data-testid="select-blog-category"
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
      {showTagFilter && allTags.length > 0 && (
        <select
          value={selectedTag}
          onChange={(e) => onTagChange(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          data-testid="select-blog-tag"
        >
          <option value="">All Tags</option>
          {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      )}
      {(searchQuery || selectedCategory || selectedTag) && (
        <Button variant="ghost" size="sm" onClick={onReset} className="text-xs" data-testid="button-clear-filters">
          Clear filters
        </Button>
      )}
    </div>
  );
}

function BlogFeedGrid({
  visible,
  feedStyle,
  gridColsClass,
  filteredCount,
  searchQuery,
  selectedCategory,
  selectedTag,
  safePage,
  totalPages,
  onPrevPage,
  onNextPage,
  onLoadMore,
  enableHoverMotion,
}: {
  visible: BlogPost[];
  feedStyle: string;
  gridColsClass: string;
  filteredCount: number;
  searchQuery: string;
  selectedCategory: string;
  selectedTag: string;
  safePage: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onLoadMore: () => void;
  enableHoverMotion: boolean;
}) {
  if (visible.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">{searchQuery || selectedCategory || selectedTag ? "No articles match your filters" : "No articles published yet"}</p>
      </div>
    );
  }

  return (
    <>
      <div className={`grid gap-6 ${gridColsClass}`}>
        {visible.map((p) => {
          const isExternal = p.postType === "external" && p.externalUrl;
          const isPodcast = p.postType === "podcast";
          const actionText = isExternal ? "Visit Article" : isPodcast ? "Listen Now" : "Read More";
          const card = (
            <Card className={`h-full cursor-pointer ${enableHoverMotion ? "blog-card-motion" : ""}`} data-testid={`blog-feed-card-${p.id}`}>
              {p.coverImageUrl && (
                <div className="aspect-[16/9] overflow-hidden rounded-t-lg">
                  <img src={p.coverImageUrl} alt={p.title} className="w-full h-full object-cover" style={getImageObjectPositionStyle(p.coverImagePositionX, p.coverImagePositionY)} data-blog-card-image />
                </div>
              )}
              <CardContent className="p-4">
                {getPrimaryPostCategory(p) && <span className="text-xs text-accent font-medium">{getPrimaryPostCategory(p)}</span>}
                <p className="font-semibold text-sm mb-1 line-clamp-2">{p.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-3">{p.excerpt}</p>
                <span className="mt-3 text-xs text-accent font-medium inline-flex items-center gap-1">
                  {actionText} {isExternal ? <ExternalLink className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
                </span>
              </CardContent>
            </Card>
          );

          if (isExternal) {
            return (
              <a key={p.id} href={p.externalUrl!} target="_blank" rel="noopener noreferrer">
                {card}
              </a>
            );
          }

          return (
            <Link key={p.id} href={`/insights/${p.slug}`}>
              {card}
            </Link>
          );
        })}
      </div>
      {feedStyle === "pagination" && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8" data-testid="blog-pagination">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={onPrevPage}
            data-testid="button-prev-page"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            Page {safePage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={onNextPage}
            data-testid="button-next-page"
          >
            Next
          </Button>
        </div>
      )}
      {feedStyle === "load-more" && visible.length < filteredCount && (
        <div className="flex justify-center mt-8" data-testid="blog-load-more">
          <Button variant="outline" onClick={onLoadMore}>
            Load More Articles
          </Button>
        </div>
      )}
    </>
  );
}

function BlogPostFeedBlock({ props }: { props: Record<string, unknown> }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { data: posts } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });
  const postsPerPage = num(props.postsPerPage, 9);
  const gridColumns = String(props.gridColumns ?? "3");
  const feedStyle = String(props.feedStyle ?? "pagination");
  const showSearch = props.showSearch !== false;
  const showCategoryFilter = props.showCategoryFilter !== false;
  const showTagFilter = props.showTagFilter !== false;
  const enableHoverMotion = props.enableHoverMotion !== false;
  const published = (posts ?? []).filter((p) => p.isPublished);

  const categories = Array.from(new Set(published.flatMap((p) => getPostCategories(p)).filter(Boolean))) as string[];
  const allTags = Array.from(new Set(published.flatMap((p) => p.tags ?? []).filter(Boolean)));

  const filtered = published.filter((p) => {
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !(p.excerpt ?? "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedCategory && !postMatchesCategory(p, selectedCategory)) return false;
    if (selectedTag && !(p.tags ?? []).includes(selectedTag)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / postsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const visible = feedStyle === "load-more"
    ? filtered.slice(0, safePage * postsPerPage)
    : filtered.slice((safePage - 1) * postsPerPage, safePage * postsPerPage);
  const gridColsClass = gridColumns === "2"
    ? "grid-cols-1 md:grid-cols-2"
    : gridColumns === "4"
      ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
      : "grid-cols-1 md:grid-cols-3";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedTag("");
    setCurrentPage(1);
  };

  return (
    <div className="py-4" data-testid="block-blog-post-feed">
      <BlogFeedFilters
        showSearch={showSearch}
        showCategoryFilter={showCategoryFilter}
        showTagFilter={showTagFilter}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        selectedTag={selectedTag}
        categories={categories}
        allTags={allTags}
        onSearchChange={(value) => { setSearchQuery(value); setCurrentPage(1); }}
        onCategoryChange={(value) => { setSelectedCategory(value); setCurrentPage(1); }}
        onTagChange={(value) => { setSelectedTag(value); setCurrentPage(1); }}
        onReset={resetFilters}
      />
      <BlogFeedGrid
        visible={visible}
        feedStyle={feedStyle}
        gridColsClass={gridColsClass}
        filteredCount={filtered.length}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        selectedTag={selectedTag}
        safePage={safePage}
        totalPages={totalPages}
        onPrevPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        onLoadMore={() => setCurrentPage((page) => page + 1)}
        enableHoverMotion={enableHoverMotion}
      />
    </div>
  );
}

function BlogFeaturedPostBlock({ props }: { props: Record<string, unknown> }) {
  const { data: posts } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });
  const featured = (posts ?? []).filter((p) => p.isPublished)[0];
  const layout = String(props.layout ?? "split");
  const enableHoverMotion = props.enableHoverMotion !== false;

  return (
    <div className="py-4" data-testid="block-blog-featured-post">
      {!featured ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Featured article will appear here</p>
        </div>
      ) : (
        <FeaturedBlogCard post={featured} layout={layout} enableHoverMotion={enableHoverMotion} />
      )}
    </div>
  );
}

function StandardBlogPageBlock({ props }: { props: Record<string, unknown> }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { data: posts } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });

  const featured = (posts ?? []).filter((p) => p.isPublished)[0];
  const layout = String(props.layout ?? "split");
  const postsPerPage = num(props.postsPerPage, 9);
  const gridColumns = String(props.gridColumns ?? "3");
  const feedStyle = String(props.feedStyle ?? "pagination");
  const showSearch = props.showSearch !== false;
  const showCategoryFilter = props.showCategoryFilter !== false;
  const showTagFilter = props.showTagFilter !== false;
  const enableHoverMotion = props.enableHoverMotion !== false;
  const published = (posts ?? []).filter((p) => p.isPublished);

  const categories = Array.from(new Set(published.flatMap((p) => getPostCategories(p)).filter(Boolean))) as string[];
  const allTags = Array.from(new Set(published.flatMap((p) => p.tags ?? []).filter(Boolean)));

  const filtered = published.filter((p) => {
    if (featured?.id && p.id === featured.id) return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !(p.excerpt ?? "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedCategory && !postMatchesCategory(p, selectedCategory)) return false;
    if (selectedTag && !(p.tags ?? []).includes(selectedTag)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / postsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const visible = feedStyle === "load-more"
    ? filtered.slice(0, safePage * postsPerPage)
    : filtered.slice((safePage - 1) * postsPerPage, safePage * postsPerPage);
  const gridColsClass = gridColumns === "2"
    ? "grid-cols-1 md:grid-cols-2"
    : gridColumns === "4"
      ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
      : "grid-cols-1 md:grid-cols-3";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedTag("");
    setCurrentPage(1);
  };

  return (
    <div className="py-4 space-y-8" data-testid="block-standard-blog-page">
      <BlogFeedFilters
        showSearch={showSearch}
        showCategoryFilter={showCategoryFilter}
        showTagFilter={showTagFilter}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        selectedTag={selectedTag}
        categories={categories}
        allTags={allTags}
        onSearchChange={(value) => { setSearchQuery(value); setCurrentPage(1); }}
        onCategoryChange={(value) => { setSelectedCategory(value); setCurrentPage(1); }}
        onTagChange={(value) => { setSelectedTag(value); setCurrentPage(1); }}
        onReset={resetFilters}
      />
      {featured ? <FeaturedBlogCard post={featured} layout={layout} enableHoverMotion={enableHoverMotion} /> : null}
      <BlogFeedGrid
        visible={visible}
        feedStyle={feedStyle}
        gridColsClass={gridColsClass}
        filteredCount={filtered.length}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        selectedTag={selectedTag}
        safePage={safePage}
        totalPages={totalPages}
        onPrevPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        onLoadMore={() => setCurrentPage((page) => page + 1)}
        enableHoverMotion={enableHoverMotion}
      />
    </div>
  );
}

function TherapistMapBlock({ props }: { props: Record<string, unknown> }) {
  const { data: allTherapistsData, isLoading } = useQuery<any>({
    queryKey: ["/api/therapists", "pageSize=500"],
    queryFn: async () => {
      const res = await fetch("/api/therapists?pageSize=500");
      if (!res.ok) throw new Error("Failed to fetch therapists");
      return res.json();
    },
  });

  const mapTherapists = useMemo(
    () =>
      (allTherapistsData?.items ?? []).map((t: any) => ({
        profile: t,
        user: {
          firstName: t.user?.firstName ?? null,
          lastName: t.user?.lastName ?? null,
          profileImageUrl: t.user?.profileImageUrl ?? null,
        },
      })),
    [allTherapistsData]
  );
  const headingAlignment = str(props.sectionHeadingAlignment) || "center";
  const buttonJustifyClass = headingAlignment === "left"
    ? "justify-start"
    : headingAlignment === "right"
      ? "justify-end"
      : "justify-center";

  return (
    <section className="relative bg-[#ffffff4d] overflow-hidden" data-testid="section-professional-map">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
        <div className="mb-8 sm:mb-12 space-y-5">
          <SectionHeading props={props} defaultAlignment="center" />
          <div className={`flex ${buttonJustifyClass}`}>
            <Link href="/directory">
              <Button variant="outline" data-testid="button-view-all-therapists">
                Find a Mental Health Professional <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <MapView
            therapists={mapTherapists}
            height="500px"
            interactive
            zoom={2}
            center={[20, 0]}
          />
        )}
      </div>
    </section>
  );
}

function ContactFormBlock() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="dynamic-contact-form">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Send a Message
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PublicFormRenderer slug="contact-form" showHeader={false} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <CompanyInformationCard />
        </div>
      </div>
    </div>
  );
}

function JoinRegistrationFormBlock({ props }: { props: Record<string, unknown> }) {
  const [loginOpen, setLoginOpen] = useState(false);
  const heading = str(props.heading);
  const accentHeading = str(props.accentHeading);
  const subheading = str(props.subheading);
  const hasImageBackground = !!str(props.sectionBackgroundImageUrl);
  const headingTextStyle = colorStyle(props.headingColor, hasImageBackground ? "#ffffff" : undefined);
  const accentHeadingTextStyle = colorStyle(props.accentHeadingColor, hasImageBackground ? "#ffffff" : undefined);
  const subheadingTextStyle = colorStyle(props.subheadingColor, hasImageBackground ? "#ffffff" : undefined);
  const applicationStatusText = str(props.applicationStatusText) || "Applications open in June.";
  const loginPromptPrefix = str(props.loginPromptPrefix) || "If you're already a member click here to";
  const loginLinkText = str(props.loginLinkText) || "Log in";
  const loginPromptSuffix = str(props.loginPromptSuffix) || "to your profile!";
  const hasHeroCopy = !!(heading || accentHeading);

  return (
    <section
      className={`max-w-4xl mx-auto px-4 sm:px-6 text-center ${hasHeroCopy ? "py-14 sm:py-20 md:py-24" : "py-8 sm:py-10 md:py-12"}`}
      data-testid="dynamic-join-registration-form"
    >
      {hasHeroCopy && (
        <>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-6" data-testid="text-join-title" style={headingTextStyle}>
            {heading}
            {accentHeading && (
              <>
                {" "}
                <span className="text-accent" style={accentHeadingTextStyle}>{accentHeading}</span>
              </>
            )}
          </h1>
          {subheading && (
            <div
              className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-primary/80 [&_p]:m-0"
              data-testid="text-join-subheading"
              style={subheadingTextStyle}
              dangerouslySetInnerHTML={{ __html: subheading }}
            />
          )}
        </>
      )}
      <Button
        size="lg"
        className="bg-accent text-accent-foreground border-accent-border text-base px-8 py-6 opacity-60 cursor-not-allowed"
        disabled
        data-testid="button-apply-member"
      >
        <Clock className="mr-2 h-5 w-5" />
        {applicationStatusText}
      </Button>
      <p className="text-sm sm:text-base text-muted-foreground mt-6" data-testid="text-login-prompt" style={subheadingTextStyle}>
        {loginPromptPrefix}{" "}
        <button
          onClick={() => setLoginOpen(true)}
          className="text-accent underline underline-offset-2 hover:text-accent/80 font-medium"
          data-testid="button-member-login"
        >
          {loginLinkText}
        </button>{" "}
        {loginPromptSuffix}
      </p>
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </section>
  );
}

function JoinHeroBlock({ props }: { props: Record<string, unknown> }) {
  const heading = str(props.heading) || "Are you a Core Platform-Informed Mental Health Professional?";
  const accentHeading = str(props.accentHeading) || "Join the Network!";
  const subheading = str(props.subheading);
  const hasImageBackground = !!str(props.sectionBackgroundImageUrl);
  const headingTextStyle = colorStyle(props.headingColor, hasImageBackground ? "#ffffff" : undefined);
  const accentHeadingTextStyle = colorStyle(props.accentHeadingColor, hasImageBackground ? "#ffffff" : undefined);
  const subheadingTextStyle = colorStyle(props.subheadingColor, hasImageBackground ? "#ffffff" : undefined);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24 text-center" data-testid="dynamic-join-hero">
      <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-6" data-testid="text-join-hero-title" style={headingTextStyle}>
        {heading}
        {accentHeading && (
          <>
            {" "}
            <span className="text-accent" style={accentHeadingTextStyle}>{accentHeading}</span>
          </>
        )}
      </h1>
      {subheading && (
        <div
          className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-primary/80 [&_p]:m-0"
          data-testid="text-join-hero-subheading"
          style={subheadingTextStyle}
          dangerouslySetInnerHTML={{ __html: subheading }}
        />
      )}
    </div>
  );
}

function DynamicPlaceholderAdmin({ block }: { block: BlockInstance }) {
  const def = getBlockDef(block.type);
  const label = def?.label ?? block.type;
  const iconName = def?.iconName ?? "Lock";

  return (
    <div className="rounded-lg border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 p-8 text-center" data-testid={`dynamic-placeholder-${block.type}`}>
      <div className="flex items-center justify-center gap-2 mb-3">
        <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <LucideIcon name={iconName} className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      </div>
      <p className="font-semibold text-sm text-amber-800 dark:text-amber-300">{label}</p>
      <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
        This section is managed automatically and displays live data on the public site.
      </p>
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
  "raw-html": RawHtmlBlock,
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

export function BlockRenderer({
  block,
  isAdminPreview,
  disableSectionStyleWrap = false,
}: {
  block: BlockInstance;
  isAdminPreview?: boolean;
  disableSectionStyleWrap?: boolean;
}) {
  let renderedBlock: ReactElement | null = null;

  if (isDynamicBlock(block.type)) {
    if (isAdminPreview) {
      renderedBlock = <DynamicPlaceholderAdmin block={block} />;
    }
    if (!renderedBlock && block.type === "therapist-map") renderedBlock = <TherapistMapBlock props={block.props} />;
    if (!renderedBlock && block.type === "contact-form") renderedBlock = <ContactFormBlock />;
    if (!renderedBlock && block.type === "form-embed") {
      renderedBlock = (
        <Suspense fallback={<DynamicPreviewFallback />}>
          <LazyManagedFormEmbedBlock props={block.props} />
        </Suspense>
      );
    }
    if (!renderedBlock && block.type === "join-hero") renderedBlock = <JoinHeroBlock props={block.props} />;
    if (!renderedBlock && block.type === "join-registration-form") renderedBlock = <JoinRegistrationFormBlock props={block.props} />;
    if (!renderedBlock && block.type === "blog-post-feed") renderedBlock = <BlogPostFeedBlock props={block.props} />;
    if (!renderedBlock && block.type === "blog-featured-post") renderedBlock = <BlogFeaturedPostBlock props={block.props} />;
    if (!renderedBlock && block.type === "standard-blog-page") renderedBlock = <StandardBlogPageBlock props={block.props} />;
    if (!renderedBlock && block.type === "events-archive") {
      renderedBlock = (
        <Suspense fallback={<DynamicPreviewFallback />}>
          <LazyEventsArchiveSection props={block.props} />
        </Suspense>
      );
    }
    if (!renderedBlock && block.type === "video-archives") {
      renderedBlock = (
        <Suspense fallback={<DynamicPreviewFallback />}>
          <LazyRecordingArchivesSection props={block.props} />
        </Suspense>
      );
    }
    if (!renderedBlock && block.type === "directory-browser") {
      renderedBlock = (
        <Suspense fallback={<DynamicPreviewFallback />}>
          <LazyDirectoryBrowserSection props={block.props} syncUrl={false} />
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

/** Block types that render edge-to-edge without a max-width container.
 *  Update this set when adding new full-width block types. */
const FULL_WIDTH_BLOCKS = new Set([
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

export function PageRenderer({ blocks }: { blocks: BlockInstance[] }) {
  const normalizedBlocks = mergeJoinHeroBlocks(blocks);

  return (
    <div>
      {normalizedBlocks.map((block) => {
        const isFullWidth = FULL_WIDTH_BLOCKS.has(block.type);
        const sectionStyleConfig = getSectionStyleConfig(block.props, { resolveAssetUrl: resolveCmsAssetUrl });
        const hasCustomSectionStyle = block.type !== "hero" && hasSectionStyleConfig(sectionStyleConfig);

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
                <BlockRenderer block={block} disableSectionStyleWrap />
              ) : (
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                  <BlockRenderer block={block} disableSectionStyleWrap />
                </div>
              )}
            </SectionStyleWrapper>
          );
        }

        if (isFullWidth) {
          return <BlockRenderer key={block.id} block={block} />;
        }

        return (
          <div key={block.id} className={`max-w-7xl mx-auto px-4 sm:px-6 ${getSectionPaddingClasses(block.props)}`}>
            <BlockRenderer block={block} disableSectionStyleWrap />
          </div>
        );
      })}
    </div>
  );
}

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BlockInstance } from "./block-registry";
import { isDynamicBlock, getBlockDef } from "./block-registry";

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

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown, fallback = 3): number {
  return typeof v === "number" ? v : fallback;
}
function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
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

function HeroBlock({ props }: { props: Record<string, unknown> }) {
  const bg = str(props.backgroundImageUrl);
  const videoBg = str(props.videoBackgroundUrl);
  const opacity = num(props.overlayOpacity as number, 50);
  const layout = str(props.layout) || "stacked";
  const badge = str(props.badge);
  const minH = str(props.minHeight) || "420";
  const minHeightStyle = minH === "100vh" ? "100vh" : `${minH}px`;
  const isSplit = layout === "split";
  const hasMediaBackground = !!(bg || videoBg);
  const overlayStrength = Math.max(0, Math.min(opacity, 100)) / 100;
  const effectiveOverlayStrength = hasMediaBackground ? Math.min(overlayStrength, 0.45) : overlayStrength;
  const overlayStyle = hasMediaBackground
    ? {
        background: `linear-gradient(180deg, rgba(15, 23, 42, ${effectiveOverlayStrength * 0.55}) 0%, rgba(15, 23, 42, ${effectiveOverlayStrength}) 100%)`,
      }
    : { backgroundColor: `rgba(0, 0, 0, ${overlayStrength})` };

  return (
    <section
      className={`relative flex items-center overflow-hidden rounded-lg ${isSplit ? "justify-start text-left" : "justify-center text-center"}`}
      style={{
        minHeight: minHeightStyle,
        ...(bg && !videoBg ? { backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" } : !videoBg ? { background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" } : {}),
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
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4 leading-tight">
          {str(props.heading) || "Hero Heading"}
        </h1>
        {str(props.subheading) && (
          <p className={`text-lg text-white/80 mb-8 ${isSplit ? "" : "max-w-xl mx-auto"}`}>{str(props.subheading)}</p>
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

function SectionHeaderBlock({ props }: { props: Record<string, unknown> }) {
  const align = str(props.alignment) || "center";
  const textAlign = align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";
  const itemsAlign = align === "left" ? "items-start" : align === "right" ? "items-end" : "items-center";
  return (
    <div className={`flex flex-col ${itemsAlign} gap-2 py-4`}>
      {str(props.eyebrow) && (
        <span className="text-xs font-semibold uppercase tracking-widest text-accent">{str(props.eyebrow)}</span>
      )}
      <h2 className={`text-3xl font-heading font-bold ${textAlign}`}>{str(props.title) || "Section Title"}</h2>
      {str(props.subtitle) && (
        <p className={`text-muted-foreground max-w-2xl ${textAlign}`}>{str(props.subtitle)}</p>
      )}
    </div>
  );
}

function RichTextBlock({ props }: { props: Record<string, unknown> }) {
  const align = str(props.alignment) || "left";
  const textAlign = align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";
  return (
    <div
      className={`prose prose-sm max-w-none ${textAlign} text-foreground`}
      dangerouslySetInnerHTML={{ __html: str(props.content) || "<p>No content.</p>" }}
    />
  );
}

function TextImageBlock({ props }: { props: Record<string, unknown> }) {
  const imageRight = str(props.imagePosition) !== "left";
  const hasImage = !!str(props.imageUrl);
  return (
    <div className={`flex flex-col ${imageRight ? "md:flex-row" : "md:flex-row-reverse"} gap-8 items-center py-4`}>
      <div className="flex-1 space-y-3">
        {str(props.heading) && <h2 className="text-2xl font-heading font-bold">{str(props.heading)}</h2>}
        {str(props.body) && <p className="text-muted-foreground leading-relaxed">{str(props.body)}</p>}
      </div>
      <div className="flex-1">
        {hasImage ? (
          <div>
            <img src={str(props.imageUrl)} alt={str(props.imageAlt)} className="rounded-xl w-full object-cover max-h-72" />
            {str(props.imageCaption) && <p className="text-xs text-muted-foreground mt-2 text-center">{str(props.imageCaption)}</p>}
          </div>
        ) : (
          <div className="rounded-xl bg-muted/40 border border-dashed h-48 flex items-center justify-center">
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
      {str(props.title) && <h2 className="text-2xl font-heading font-bold text-center mb-2">{str(props.title)}</h2>}
      {str(props.subtitle) && <p className="text-muted-foreground text-center mb-8">{str(props.subtitle)}</p>}
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
      {str(props.title) && <h2 className="text-2xl font-heading font-bold mb-8">{str(props.title)}</h2>}
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
  return (
    <div className="py-4">
      {str(props.title) && <h2 className="text-2xl font-heading font-bold text-center mb-8">{str(props.title)}</h2>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.length === 0 ? (
          <p className="text-muted-foreground">Add testimonials to display here.</p>
        ) : items.map((item, i) => (
          <Card key={i} className="bg-muted/30">
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
        ))}
      </div>
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
      {str(props.title) && <h2 className="text-2xl font-heading font-bold text-center mb-2">{str(props.title)}</h2>}
      {str(props.subtitle) && <p className="text-muted-foreground text-center mb-6">{str(props.subtitle)}</p>}
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
  const { data: events } = useQuery<{ id: string; title: string; date: string; isVirtual: boolean }[]>({
    queryKey: ["/api/events"],
  });
  const limit = num(props.limit, 3);
  const visible = (events ?? []).filter((e) => new Date(e.date) > new Date()).slice(0, limit);
  return (
    <div className="py-4">
      {str(props.title) && <h2 className="text-2xl font-heading font-bold text-center mb-2">{str(props.title)}</h2>}
      {str(props.subtitle) && <p className="text-muted-foreground text-center mb-6">{str(props.subtitle)}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visible.length === 0 ? (
          <div className="col-span-3 text-center py-8 text-muted-foreground">
            <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Upcoming events will appear here</p>
          </div>
        ) : visible.map((e) => (
          <Link key={e.id} href={`/events/${e.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" data-testid={`event-preview-${e.id}`}>
              <CardContent className="pt-4">
                <p className="text-xs text-accent font-medium mb-1">{new Date(e.date).toLocaleDateString()}</p>
                <p className="font-semibold text-sm line-clamp-2">{e.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{e.isVirtual ? "Virtual" : "In Person"}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function BlogPreviewBlock({ props }: { props: Record<string, unknown> }) {
  const { data: posts } = useQuery<{ id: string; title: string; excerpt: string; slug: string; isPublished: boolean }[]>({
    queryKey: ["/api/blog"],
  });
  const limit = num(props.limit, 3);
  const visible = (posts ?? []).filter((p) => p.isPublished).slice(0, limit);
  return (
    <div className="py-4">
      {str(props.title) && <h2 className="text-2xl font-heading font-bold text-center mb-2">{str(props.title)}</h2>}
      {str(props.subtitle) && <p className="text-muted-foreground text-center mb-6">{str(props.subtitle)}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visible.length === 0 ? (
          <div className="col-span-3 text-center py-8 text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Blog articles will appear here</p>
          </div>
        ) : visible.map((p) => (
          <Link key={p.id} href={`/insights/${p.slug}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" data-testid={`blog-preview-${p.id}`}>
              <CardContent className="pt-4">
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
    <div className={`flex flex-wrap gap-3 py-4 ${justifyClass}`}>
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
  );
}

function ImageBlockRenderer({ props }: { props: Record<string, unknown> }) {
  const widthClass = IMAGE_WIDTH_MAP[str(props.width)] ?? IMAGE_WIDTH_MAP.contained;
  const hasImage = !!str(props.imageUrl);
  return (
    <div className={`py-4 ${widthClass}`}>
      {hasImage ? (
        <div>
          <img src={str(props.imageUrl)} alt={str(props.alt)} className="w-full rounded-xl object-cover" />
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
      {str(props.title) && <p className="font-medium mb-3">{str(props.title)}</p>}
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
      {str(props.title) && <h2 className="text-2xl font-heading font-bold mb-6">{str(props.title)}</h2>}
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
      {str(props.title) && <h2 className="text-2xl font-heading font-bold text-center mb-2">{str(props.title)}</h2>}
      {str(props.subtitle) && <p className="text-muted-foreground text-center mb-8">{str(props.subtitle)}</p>}
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
      {str(props.title) && <h2 className="text-2xl font-heading font-bold text-center mb-2">{str(props.title)}</h2>}
      {str(props.subtitle) && <p className="text-muted-foreground text-center mb-8">{str(props.subtitle)}</p>}
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
      {str(props.title) && <h2 className="text-2xl font-heading font-bold text-center mb-2">{str(props.title)}</h2>}
      {str(props.subtitle) && <p className="text-muted-foreground text-center mb-8">{str(props.subtitle)}</p>}
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
      {str(props.title) && <h2 className="text-2xl font-heading font-bold text-center mb-8">{str(props.title)}</h2>}
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
      {str(props.title) && <h2 className="text-2xl font-heading font-bold text-center mb-8">{str(props.title)}</h2>}
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
      {str(props.title) && <h2 className="text-2xl font-heading font-bold text-center mb-8">{str(props.title)}</h2>}
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
      {str(props.title) && <h2 className="text-2xl font-heading font-bold text-center mb-6">{str(props.title)}</h2>}
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
      {str(props.title) && <h2 className="text-2xl font-heading font-bold text-center mb-2">{str(props.title)}</h2>}
      {str(props.subtitle) && <p className="text-muted-foreground text-center mb-8">{str(props.subtitle)}</p>}
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
      {str(props.title) && <h2 className="text-2xl font-heading font-bold mb-2">{str(props.title)}</h2>}
      {str(props.subtitle) && <p className="text-muted-foreground mb-8">{str(props.subtitle)}</p>}
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
      {str(props.title) && <h2 className="text-2xl font-heading font-bold mb-6">{str(props.title)}</h2>}
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
      {str(props.title) && <h2 className="text-2xl font-heading font-bold mb-6">{str(props.title)}</h2>}
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
        {str(props.title) && <h2 className="text-2xl font-heading font-bold mb-2">{str(props.title)}</h2>}
        {str(props.subtitle) && <p className="text-muted-foreground mb-6">{str(props.subtitle)}</p>}
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
      {str(props.title) && <h2 className="text-2xl font-heading font-bold text-center mb-2">{str(props.title)}</h2>}
      {str(props.subtitle) && <p className="text-muted-foreground text-center mb-8">{str(props.subtitle)}</p>}
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
      {str(props.title) && <h2 className="text-2xl font-heading font-bold text-center mb-2">{str(props.title)}</h2>}
      {str(props.subtitle) && <p className="text-muted-foreground text-center mb-8">{str(props.subtitle)}</p>}
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
      <div className="flex items-center gap-3 mb-6">
        {str(props.title) && <h2 className="text-2xl font-heading font-bold">{str(props.title)}</h2>}
        <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${levelColors[level] || levelColors.beginner}`}>
          {level}
        </span>
      </div>
      {str(props.subtitle) && <p className="text-muted-foreground mb-6">{str(props.subtitle)}</p>}
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
  tags?: string[];
  coverImageUrl?: string;
  isPublished: boolean;
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
  const published = (posts ?? []).filter((p) => p.isPublished);

  const categories = Array.from(new Set(published.map((p) => p.category).filter(Boolean))) as string[];
  const allTags = Array.from(new Set(published.flatMap((p) => p.tags ?? []).filter(Boolean)));

  const filtered = published.filter((p) => {
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !(p.excerpt ?? "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedCategory && p.category !== selectedCategory) return false;
    if (selectedTag && !(p.tags ?? []).includes(selectedTag)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / postsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const visible = filtered.slice((safePage - 1) * postsPerPage, safePage * postsPerPage);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedTag("");
    setCurrentPage(1);
  };

  return (
    <div className="py-4" data-testid="block-blog-post-feed">
      {str(props.title) && <h2 className="text-2xl font-heading font-bold text-center mb-6">{str(props.title)}</h2>}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search articles..." className="pl-9" data-testid="input-blog-search" />
        </div>
        {categories.length > 0 && (
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            data-testid="select-blog-category"
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {allTags.length > 0 && (
          <select
            value={selectedTag}
            onChange={(e) => { setSelectedTag(e.target.value); setCurrentPage(1); }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            data-testid="select-blog-tag"
          >
            <option value="">All Tags</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        {(searchQuery || selectedCategory || selectedTag) && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs" data-testid="button-clear-filters">Clear filters</Button>
        )}
      </div>
      {visible.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{searchQuery || selectedCategory || selectedTag ? "No articles match your filters" : "No articles published yet"}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {visible.map((p) => (
              <Link key={p.id} href={`/insights/${p.slug}`}>
                <Card className="h-full cursor-pointer hover:shadow-md transition-shadow" data-testid={`blog-feed-card-${p.id}`}>
                  {p.coverImageUrl && (
                    <div className="aspect-[16/9] overflow-hidden rounded-t-lg">
                      <img src={p.coverImageUrl} alt={p.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    {p.category && <span className="text-xs text-accent font-medium">{p.category}</span>}
                    <p className="font-semibold text-sm mb-1 line-clamp-2">{p.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">{p.excerpt}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8" data-testid="blog-pagination">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                data-testid="button-next-page"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BlogFeaturedPostBlock({ props }: { props: Record<string, unknown> }) {
  const { data: posts } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });
  const featured = (posts ?? []).filter((p) => p.isPublished)[0];
  return (
    <div className="py-4" data-testid="block-blog-featured-post">
      {str(props.title) && <h2 className="text-2xl font-heading font-bold mb-6">{str(props.title)}</h2>}
      {!featured ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Featured article will appear here</p>
        </div>
      ) : (
        <Link href={`/insights/${featured.slug}`}>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden" data-testid="blog-featured-card">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {featured.coverImageUrl && (
                <div className="aspect-[16/9] md:aspect-auto overflow-hidden">
                  <img src={featured.coverImageUrl} alt={featured.title} className="w-full h-full object-cover" />
                </div>
              )}
              <CardContent className="p-6 flex flex-col justify-center">
                <h3 className="text-xl font-heading font-bold mb-3">{featured.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-4">{featured.excerpt}</p>
                <div className="mt-4">
                  <span className="text-sm text-accent font-medium inline-flex items-center gap-1">
                    Read Article <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </CardContent>
            </div>
          </Card>
        </Link>
      )}
    </div>
  );
}

const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

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

  return (
    <section className="relative bg-[#ffffff4d] overflow-hidden" data-testid="section-professional-map">
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-32" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(var(--accent) / 0.12) 0%, transparent 70%)" }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
        <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap mb-8 sm:mb-12">
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold" data-testid="text-map-heading">
              {str(props.title) || "Our Mental Health Professionals Around the World"}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              {str(props.subtitle) || "Click a pin to learn more about a TCK-informed professional near you"}
            </p>
          </div>
          <Link href="/directory">
            <Button variant="outline" data-testid="button-view-all-therapists">
              Find a Mental Health Professional <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
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
  const { toast } = useToast();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: ContactFormValues) => {
      await apiRequest("POST", "/api/contact", data);
    },
    onSuccess: () => {
      toast({ title: "Message sent", description: "Thank you for reaching out. We'll get back to you soon." });
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send message", description: error.message, variant: "destructive" });
    },
  });

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
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} data-testid="input-contact-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" {...field} data-testid="input-contact-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="What is this about?" {...field} data-testid="input-contact-subject" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Tell us more..." className="resize-none min-h-[120px]" {...field} data-testid="input-contact-message" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-contact">
                    {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Message
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card data-testid="card-contact-location">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">Location</h3>
                  <p className="text-sm text-muted-foreground">Global — serving TCKs worldwide</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function JoinRegistrationFormBlock() {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24 text-center" data-testid="dynamic-join-registration-form">
      <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-6" data-testid="text-join-title">
        Are you a TCK-Informed Mental Health Professional?{" "}
        <span className="text-accent">Join the Network!</span>
      </h1>
      <Button
        size="lg"
        className="bg-accent text-accent-foreground border-accent-border text-base px-8 py-6 opacity-60 cursor-not-allowed"
        disabled
        data-testid="button-apply-member"
      >
        <Clock className="mr-2 h-5 w-5" />
        Applications open in June.
      </Button>
      <p className="text-sm sm:text-base text-muted-foreground mt-6" data-testid="text-login-prompt">
        If you're already a member click here to{" "}
        <button
          onClick={() => setLoginOpen(true)}
          className="text-accent underline underline-offset-2 hover:text-accent/80 font-medium"
          data-testid="button-member-login"
        >
          Log in
        </button>{" "}
        to your profile!
      </p>
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </section>
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

export function BlockRenderer({ block, isAdminPreview }: { block: BlockInstance; isAdminPreview?: boolean }) {
  if (isDynamicBlock(block.type)) {
    if (isAdminPreview) {
      return <DynamicPlaceholderAdmin block={block} />;
    }
    if (block.type === "therapist-map") return <TherapistMapBlock props={block.props} />;
    if (block.type === "contact-form") return <ContactFormBlock />;
    if (block.type === "join-registration-form") return <JoinRegistrationFormBlock />;
    if (block.type === "blog-post-feed") return <BlogPostFeedBlock props={block.props} />;
    if (block.type === "blog-featured-post") return <BlogFeaturedPostBlock props={block.props} />;
  }

  const Renderer = RENDERERS[block.type];
  if (!Renderer) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
        Unknown block type: <code>{block.type}</code>
      </div>
    );
  }
  return <Renderer props={block.props} />;
}

/** Block types that render edge-to-edge without a max-width container.
 *  Update this set when adding new full-width block types. */
const FULL_WIDTH_BLOCKS = new Set([
  "hero",
  "cta",
  "trust-bar",
  "divider",
  "slider",
  "stats-bar",
]);

export function PageRenderer({ blocks }: { blocks: BlockInstance[] }) {
  return (
    <div>
      {blocks.map((block) => {
        const isFullWidth = FULL_WIDTH_BLOCKS.has(block.type);
        if (isFullWidth) {
          return <BlockRenderer key={block.id} block={block} />;
        }
        return (
          <div key={block.id} className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
            <BlockRenderer block={block} />
          </div>
        );
      })}
    </div>
  );
}

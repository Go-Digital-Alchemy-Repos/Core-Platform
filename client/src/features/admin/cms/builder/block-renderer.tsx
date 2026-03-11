import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Globe, Heart, Users, MapPin, Mail, Phone, Star, CheckCircle,
  Sparkles, FileText, LayoutTemplate, Megaphone, LayoutGrid,
  HelpCircle, Quote, UserCheck, CalendarDays, BookOpen,
  MousePointerClick, Image, Play, Minus, Heading,
} from "lucide-react";
import type { BlockInstance } from "./block-registry";

const LUCIDE_MAP: Record<string, React.ElementType> = {
  Globe, Heart, Users, MapPin, Mail, Phone, Star, CheckCircle,
  Sparkles, FileText, LayoutTemplate, Megaphone, LayoutGrid,
  HelpCircle, Quote, UserCheck, CalendarDays, BookOpen,
  MousePointerClick, Image, Play, Minus, Heading,
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
  const opacity = num(props.overlayOpacity as number, 50);
  return (
    <section
      className="relative min-h-[420px] flex items-center justify-center text-center overflow-hidden rounded-lg"
      style={bg ? { backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}
    >
      {(bg || true) && (
        <div className="absolute inset-0 bg-black rounded-lg" style={{ opacity: opacity / 100 }} />
      )}
      <div className="relative z-10 px-8 py-16 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4 leading-tight">
          {str(props.heading) || "Hero Heading"}
        </h1>
        {str(props.subheading) && (
          <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">{str(props.subheading)}</p>
        )}
        <div className="flex flex-wrap gap-3 justify-center">
          {str(props.ctaText) && (
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              {str(props.ctaText)}
            </Button>
          )}
          {str(props.ctaSecondaryText) && (
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              {str(props.ctaSecondaryText)}
            </Button>
          )}
        </div>
      </div>
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
          <Button size="lg" variant={variant === "dark" ? "secondary" : "default"}>
            {str(props.primaryText)}
          </Button>
        )}
        {str(props.secondaryText) && (
          <Button size="lg" variant="outline">
            {str(props.secondaryText)}
          </Button>
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

function FeaturedCounselorsBlock({ props }: { props: Record<string, unknown> }) {
  const { data: counselors } = useQuery<{ id: string; title: string; user?: { firstName?: string; lastName?: string } }[]>({
    queryKey: ["/api/therapists/featured"],
  });
  const limit = num(props.limit, 3);
  const visible = (counselors ?? []).slice(0, limit);
  return (
    <div className="py-4">
      {str(props.title) && <h2 className="text-2xl font-heading font-bold text-center mb-2">{str(props.title)}</h2>}
      {str(props.subtitle) && <p className="text-muted-foreground text-center mb-6">{str(props.subtitle)}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visible.length === 0 ? (
          <div className="col-span-3 text-center py-8 text-muted-foreground">
            <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Featured counselors will appear here</p>
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
          <Card key={e.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4">
              <p className="text-xs text-accent font-medium mb-1">{new Date(e.date).toLocaleDateString()}</p>
              <p className="font-semibold text-sm line-clamp-2">{e.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{e.isVirtual ? "Virtual" : "In Person"}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BlogPreviewBlock({ props }: { props: Record<string, unknown> }) {
  const { data: posts } = useQuery<{ id: string; title: string; excerpt: string; slug: string }[]>({
    queryKey: ["/api/blog"],
  });
  const limit = num(props.limit, 3);
  const visible = (posts ?? []).filter((p) => (p as any).isPublished).slice(0, limit);
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
          <Card key={p.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4">
              <p className="font-semibold text-sm mb-1 line-clamp-2">{p.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-3">{p.excerpt}</p>
            </CardContent>
          </Card>
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
        <Button key={i} variant={(btn.variant as any) ?? "default"} size="lg">
          {btn.text}
        </Button>
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

const RENDERERS: Record<string, React.ComponentType<{ props: Record<string, unknown> }>> = {
  hero: HeroBlock,
  "section-header": SectionHeaderBlock,
  "rich-text": RichTextBlock,
  "text-image": TextImageBlock,
  cta: CtaBlock,
  "cards-grid": CardsGridBlock,
  faq: FaqBlock,
  testimonials: TestimonialsBlock,
  "featured-counselors": FeaturedCounselorsBlock,
  "events-preview": EventsPreviewBlock,
  "blog-preview": BlogPreviewBlock,
  "button-group": ButtonGroupBlock,
  "image-block": ImageBlockRenderer,
  "video-embed": VideoEmbedBlock,
  "contact-info": ContactInfoBlock,
  divider: DividerBlock,
};

export function BlockRenderer({ block }: { block: BlockInstance }) {
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

export function PageRenderer({ blocks }: { blocks: BlockInstance[] }) {
  return (
    <div className="space-y-6">
      {blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </div>
  );
}

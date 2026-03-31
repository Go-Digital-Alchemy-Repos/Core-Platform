import { useState, useMemo } from "react";
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
  Map, Lock, UserPlus, Send, Loader2, ArrowRight,
  AlertCircle, ClipboardCheck, BarChart3, Search, User, ShieldCheck,
} from "lucide-react";
import { ProfessionalRegisterDialog } from "@/components/auth/professional-register-dialog";
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
  const [registerOpen, setRegisterOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24 text-center" data-testid="dynamic-join-registration-form">
      <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-6" data-testid="text-join-title">
        Are you a TCK-Informed Mental Health Professional?{" "}
        <span className="text-accent">Join the Network!</span>
      </h1>
      <Button
        size="lg"
        className="bg-accent text-accent-foreground border-accent-border text-base px-8 py-6"
        onClick={() => setRegisterOpen(true)}
        data-testid="button-apply-member"
      >
        <UserPlus className="mr-2 h-5 w-5" />
        Apply to Become a Member
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
      <ProfessionalRegisterDialog open={registerOpen} onOpenChange={setRegisterOpen} />
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
};

export function BlockRenderer({ block, isAdminPreview }: { block: BlockInstance; isAdminPreview?: boolean }) {
  if (isDynamicBlock(block.type)) {
    if (isAdminPreview) {
      return <DynamicPlaceholderAdmin block={block} />;
    }
    if (block.type === "therapist-map") return <TherapistMapBlock props={block.props} />;
    if (block.type === "contact-form") return <ContactFormBlock />;
    if (block.type === "join-registration-form") return <JoinRegistrationFormBlock />;
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

export function PageRenderer({ blocks }: { blocks: BlockInstance[] }) {
  return (
    <div className="space-y-6">
      {blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </div>
  );
}

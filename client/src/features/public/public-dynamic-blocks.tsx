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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { MapPin, Send, Loader2, ArrowRight, Clock, Search, BookOpen } from "lucide-react";
import { LoginDialog } from "@/components/auth/login-dialog";
import { MapView } from "@/components/directory/map-view";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SectionHeading } from "@/features/admin/cms/builder/section-heading";

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function TherapistMapBlock({ props }: { props: Record<string, unknown> }) {
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

const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export function ContactFormBlock() {
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

export function JoinRegistrationFormBlock({ props = {} }: { props?: Record<string, unknown> }) {
  const [loginOpen, setLoginOpen] = useState(false);
  const heading = str(props.heading);
  const accentHeading = str(props.accentHeading);
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
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-6" data-testid="text-join-title">
          {heading}
          {accentHeading && (
            <>
              {" "}
              <span className="text-accent">{accentHeading}</span>
            </>
          )}
        </h1>
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
      <p className="text-sm sm:text-base text-muted-foreground mt-6" data-testid="text-login-prompt">
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

export function JoinHeroBlock({ props = {} }: { props?: Record<string, unknown> }) {
  const heading = str(props.heading) || "Are you a TCK-Informed Mental Health Professional?";
  const accentHeading = str(props.accentHeading) || "Join the Network!";
  const subheading = str(props.subheading);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24 text-center" data-testid="dynamic-join-hero">
      <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-6" data-testid="text-join-hero-title">
        {heading}
        {accentHeading && (
          <>
            {" "}
            <span className="text-accent">{accentHeading}</span>
          </>
        )}
      </h1>
      {subheading && (
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-join-hero-subheading">
          {subheading}
        </p>
      )}
    </div>
  );
}

function num(v: unknown, fallback = 3): number {
  return typeof v === "number" ? v : fallback;
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

export function BlogPostFeedBlock({ props }: { props: Record<string, unknown> }) {
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
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
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

export function BlogFeaturedPostBlock({ props }: { props: Record<string, unknown> }) {
  const { data: posts } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });
  const featured = (posts ?? []).filter((p) => p.isPublished)[0];
  return (
    <div className="py-4" data-testid="block-blog-featured-post">
      <SectionHeading props={props} defaultAlignment="left" className="mb-6" />
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

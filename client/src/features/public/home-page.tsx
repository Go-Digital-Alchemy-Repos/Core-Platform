import { useState, useCallback, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageLayout } from "@/components/layout/page-layout";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { MapView } from "@/components/directory/map-view";
import {
  Globe,
  Heart,
  Users,
  MapPin,
  Video,
  Calendar,
  ArrowRight,
  Quote,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { getImageObjectPositionStyle } from "@/lib/image-focus";
import { stripHtml } from "@/lib/html";
import { getEventPath } from "@shared/event-url";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

const testimonials = [
  {
    quote: "For the first time, I didn't have to explain what it means to grow up between cultures. My mental health professional just understood.",
    name: "Sarah M.",
    role: "Adult Core Platform",
    location: "Singapore",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=faces",
  },
  {
    quote: "Core Platform connected me with a mental health professional who speaks my language — literally and figuratively. It's been life-changing.",
    name: "James K.",
    role: "Expat Parent",
    location: "Dubai",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
  },
  {
    quote: "As a mental health professional, this platform lets me reach the exact community I trained to serve. The directory is beautifully done.",
    name: "Dr. Amara O.",
    role: "Licensed Mental Health Professional",
    location: "Nairobi",
    avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=faces",
  },
  {
    quote: "I struggled for years to find someone who understood repatriation grief. Core Platform made it possible in minutes.",
    name: "Lena T.",
    role: "Core Platform & College Student",
    location: "Germany",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces",
  },
  {
    quote: "The specialization filters helped me find a mental health professional experienced with military kid transitions. Highly recommend.",
    name: "Marcus W.",
    role: "Military Core Platform",
    location: "Virginia, USA",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
  },
  {
    quote: "Finally, a platform that recognizes our unique needs. I feel seen and supported for the first time in therapy.",
    name: "Priya D.",
    role: "Cross-Cultural Professional",
    location: "London",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=faces",
  },
];

const benefits = [
  {
    icon: Globe,
    title: "Culturally Informed Care",
    description: "Every mental health professional in our directory understands the unique challenges of growing up across cultures.",
  },
  {
    icon: Heart,
    title: "Specialized Support",
    description: "Find professionals trained in identity, belonging, grief of place, and cross-cultural transitions.",
  },
  {
    icon: Users,
    title: "Global Community",
    description: "Join a community that celebrates the richness of a multicultural upbringing.",
  },
];

function TestimonialsCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", slidesToScroll: 1 },
    [Autoplay({ delay: 5000, stopOnInteraction: true })]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  return (
    <section className="bg-muted/30" data-testid="section-testimonials">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
        <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold text-center mb-3 sm:mb-4" data-testid="text-testimonials-heading">
          What People Are Saying
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground text-center max-w-xl mx-auto mb-10 sm:mb-14">
          Hear from Core Platforms, expat families, and mental health professionals who have found their match.
        </p>
        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-6">
              {testimonials.map((t, idx) => (
                <div
                  key={idx}
                  className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
                >
                  <Card className="h-full" data-testid={`card-testimonial-${idx}`}>
                    <CardContent className="p-6 flex flex-col h-full">
                      <Quote className="h-6 w-6 text-accent/40 mb-3 flex-shrink-0" />
                      <p className="text-sm leading-relaxed flex-1 mb-5 italic text-foreground/90">
                        "{t.quote}"
                      </p>
                      <div className="flex items-center gap-3 pt-3 border-t">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={t.avatar} alt={t.name} data-testid={`img-testimonial-avatar-${idx}`} />
                          <AvatarFallback className="bg-accent/10 text-accent text-sm font-semibold">
                            {t.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.role} · {t.location}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-9 w-9"
              onClick={scrollPrev}
              data-testid="button-testimonial-prev"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex gap-1.5" data-testid="testimonial-dots">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === selectedIndex ? "bg-accent" : "bg-muted-foreground/30"
                  }`}
                  onClick={() => emblaApi?.scrollTo(idx)}
                  data-testid={`button-testimonial-dot-${idx}`}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-9 w-9"
              onClick={scrollNext}
              data-testid="button-testimonial-next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedArticlesCarousel({ articles }: { articles: any[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", slidesToScroll: 1 },
    [Autoplay({ delay: 4500, stopOnInteraction: true })]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  return (
    <section className="relative bg-muted/30 overflow-hidden" data-testid="section-featured-articles">
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-32" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(var(--accent) / 0.12) 0%, transparent 70%)" }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
        <div className="mb-10 flex flex-col items-start gap-4 sm:mb-14 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold mb-2" data-testid="text-featured-articles-heading">
              Featured Articles
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Latest insights on Core Platform mental health and cross-cultural wellness.
            </p>
          </div>
          <Link href="/insights">
            <Button variant="outline" className="w-full sm:w-auto" data-testid="button-view-all-articles">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-6">
              {articles.map((post: any, idx: number) => (
                <div
                  key={post.id}
                  className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
                >
                  <Link href={`/insights/${post.slug}`}>
                    <Card className="h-full cursor-pointer hover-elevate" data-testid={`card-featured-article-${idx}`}>
                      {post.coverImageUrl && (
                        <div className="aspect-[16/9] overflow-hidden rounded-t-lg">
                          <img
                            src={post.coverImageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover"
                            style={getImageObjectPositionStyle(post.coverImagePositionX, post.coverImagePositionY)}
                          />
                        </div>
                      )}
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {post.category && (
                            <Badge variant="secondary" className="text-xs">{post.category}</Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-base mb-2 line-clamp-2">{post.title}</h3>
                        {post.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                            {post.excerpt}
                          </p>
                        )}
                        <span className="text-xs text-accent font-medium flex items-center gap-1">
                          Read More <ArrowRight className="h-3 w-3" />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-9 w-9"
              onClick={scrollPrev}
              data-testid="button-article-prev"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex gap-1.5" data-testid="article-dots">
              {articles.map((_, idx) => (
                <button
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === selectedIndex ? "bg-accent" : "bg-muted-foreground/30"
                  }`}
                  onClick={() => emblaApi?.scrollTo(idx)}
                  data-testid={`button-article-dot-${idx}`}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-9 w-9"
              onClick={scrollNext}
              data-testid="button-article-next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { data: events, isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/events"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: allTherapistsData, isLoading: therapistsLoading } = useQuery<any>({
    queryKey: ["/api/therapists", "pageSize=500"],
    queryFn: async () => {
      const res = await fetch("/api/therapists?pageSize=500");
      if (!res.ok) throw new Error("Failed to fetch therapists");
      return res.json();
    },
  });
  const { data: blogPosts } = useQuery<any[]>({
    queryKey: ["/api/blog"],
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

  const upcomingEvents = events?.slice(0, 3) ?? [];
  const recentArticles = blogPosts?.slice(0, 6) ?? [];

  return (
    <PageLayout>
      <section className="relative overflow-hidden" data-testid="section-hero">
        <picture className="absolute inset-0">
          <source media="(max-width: 768px)" srcSet="/images/hero-therapy-session-768w.webp" />
          <source media="(max-width: 1280px)" srcSet="/images/hero-therapy-session-1280w.webp" />
          <source srcSet="/images/hero-therapy-session-1920w.webp" />
          <img
            src="/images/hero-therapy-session-1280w.webp"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
            data-testid="img-hero-background"
          />
        </picture>
        <div className="absolute inset-0 bg-background/85 dark:bg-background/90" />
        <div className="relative mx-auto max-w-7xl px-4 pb-18 pt-14 sm:px-6 sm:pb-24 sm:pt-20 md:pb-32 md:pt-28">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="mb-8 font-heading text-3xl font-bold tracking-tight sm:mb-12 sm:text-4xl md:text-5xl lg:text-6xl" data-testid="text-hero-heading">
              Care that understands where Core Platforms <span className="text-accent">"come from".</span>
            </h1>
            <div className="flex flex-col justify-center gap-6 sm:flex-row sm:gap-10 lg:gap-16">
              <div className="text-center">
                <p className="text-base sm:text-lg font-medium mb-4" data-testid="text-hero-support-label">Are you looking for Core Platform support?</p>
                <Link href="/directory">
                  <Button size="lg" className="w-full bg-accent text-accent-foreground border-accent-border sm:w-auto" data-testid="button-browse-directory">
                    Find a Mental Health Professional!
                  </Button>
                </Link>
              </div>
              <div className="text-center">
                <p className="text-base sm:text-lg font-medium mb-4" data-testid="text-hero-professional-label">Are you a mental health professional?</p>
                <Button size="lg" className="w-full bg-accent text-accent-foreground border-accent-border opacity-60 cursor-not-allowed sm:w-auto" disabled data-testid="button-join-therapist">
                  Applications open in June.
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="relative bg-muted/30 overflow-hidden" data-testid="section-benefits">
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32" style={{ background: "radial-gradient(ellipse at 50% 100%, hsl(var(--accent) / 0.18) 0%, transparent 70%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold text-center mb-3 sm:mb-4" data-testid="text-benefits-heading">Why Core Platform Informed?</h2>
          <p className="text-sm sm:text-base text-muted-foreground text-center max-w-xl mx-auto mb-10 sm:mb-14">
            We bridge the gap between Third Culture Kids and culturally competent mental health professionals.
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-10 xl:gap-12">
            {benefits.map((item) => (
              <div key={item.title} className="rounded-2xl border border-border/60 bg-background/80 p-6 text-center shadow-sm" data-testid={`text-benefit-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 text-accent mb-5">
                  <item.icon className="w-7 h-7" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-muted/20 dark:bg-muted/10" data-testid="section-counseling-needed">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold text-center mb-3 sm:mb-4" data-testid="text-counseling-needed-heading">Is Counseling What's Needed?</h2>
          <p className="text-sm sm:text-base text-muted-foreground text-center max-w-3xl mx-auto leading-relaxed">
            Not every challenge requires a clinical diagnosis or therapy. Sometimes what Core Platforms need most is validation, community, or practical guidance for navigating transitions. Our directory includes a range of professionals — from licensed therapists to certified coaches and peer support specialists — so you can find the right kind of support for wherever you are in your journey.
          </p>
        </div>
      </section>
      <TestimonialsCarousel />
      <section className="relative bg-muted/20 dark:bg-muted/10 overflow-hidden" data-testid="section-professional-map">
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-32" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(var(--accent) / 0.12) 0%, transparent 70%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
          <div className="mb-8 flex flex-col items-start gap-4 sm:mb-12 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold" data-testid="text-map-heading">
                Our Mental Health Professionals Around the World
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Click a pin to learn more about a Core Platform-informed professional near you</p>
            </div>
            <Link href="/directory">
              <Button variant="outline" className="w-full sm:w-auto" data-testid="button-view-all-therapists">
                Find a Mental Health Professional <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {therapistsLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner />
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24" data-testid="section-upcoming-events">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold mb-3 sm:mb-4" data-testid="text-events-heading">
            Upcoming Events
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-6">Join our community events for Core Platforms and mental health professionals.</p>
          <Link href="/events">
            <Button variant="outline" data-testid="button-view-all-events">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {eventsLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {upcomingEvents.map((event: any) => (
              <Link key={event.id} href={getEventPath(event)}>
                <Card className="cursor-pointer hover-elevate h-full" data-testid={`card-event-${event.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <Calendar className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium">
                        {new Date(event.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {event.isVirtual && <Badge variant="secondary" className="text-xs">Virtual</Badge>}
                      {event.memberOnly && <Badge variant="outline" className="text-xs">Members Only</Badge>}
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{stripHtml(event.description)}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-12">No upcoming events.</p>
        )}
      </section>
      {recentArticles.length > 0 && (
        <FeaturedArticlesCarousel articles={recentArticles} />
      )}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24 text-center" data-testid="section-cta">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold mb-3 sm:mb-4" data-testid="text-cta-heading">
            Are You a Core Platform-Informed Mental Health Professional?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            Join our growing directory and connect with clients who need your unique expertise. List your practice and reach the global Core Platform community.
          </p>
          <Button size="lg" className="bg-accent text-accent-foreground border-accent-border opacity-60 cursor-not-allowed" disabled data-testid="button-cta-join">
            Applications open in June.
          </Button>
        </div>
      </section>
    </PageLayout>
  );
}

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
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

const testimonials = [
  {
    quote: "For the first time, I didn't have to explain what it means to grow up between cultures. My counselor just understood.",
    name: "Sarah M.",
    role: "Adult TCK",
    location: "Singapore",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=faces",
  },
  {
    quote: "TCK Wellness connected me with a counselor who speaks my language — literally and figuratively. It's been life-changing.",
    name: "James K.",
    role: "Expat Parent",
    location: "Dubai",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
  },
  {
    quote: "As a counselor, this platform lets me reach the exact community I trained to serve. The directory is beautifully done.",
    name: "Dr. Amara O.",
    role: "Licensed Counselor",
    location: "Nairobi",
    avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=faces",
  },
  {
    quote: "I struggled for years to find someone who understood repatriation grief. TCK Wellness made it possible in minutes.",
    name: "Lena T.",
    role: "TCK & College Student",
    location: "Germany",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces",
  },
  {
    quote: "The specialization filters helped me find a counselor experienced with military kid transitions. Highly recommend.",
    name: "Marcus W.",
    role: "Military TCK",
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
    description: "Every counselor in our directory understands the unique challenges of growing up across cultures.",
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
          Hear from TCKs, expat families, and counselors who have found their match.
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
        <div className="flex items-center justify-between mb-10 sm:mb-14">
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold mb-2" data-testid="text-featured-articles-heading">
              Featured Articles
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Latest insights on TCK mental health and cross-cultural wellness.
            </p>
          </div>
          <Link href="/insights">
            <Button variant="outline" data-testid="button-view-all-articles">
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
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/hero-therapy-session.png')" }}
        />
        <div className="absolute inset-0 bg-background/85 dark:bg-background/90" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-18 sm:pt-20 sm:pb-24 md:pt-28 md:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-10 sm:mb-14" data-testid="text-hero-heading">
              Care that understands where TCKs <span className="text-accent">"come from".</span>
            </h1>
            <div className="flex flex-col sm:flex-row justify-center gap-8 sm:gap-16">
              <div className="text-center">
                <p className="text-base sm:text-lg font-medium mb-4" data-testid="text-hero-support-label">Are you looking for TCK support?</p>
                <Link href="/directory">
                  <Button size="lg" className="bg-accent text-accent-foreground border-accent-border" data-testid="button-browse-directory">
                    Find a Counselor!
                  </Button>
                </Link>
              </div>
              <div className="text-center">
                <p className="text-base sm:text-lg font-medium mb-4" data-testid="text-hero-counselor-label">Are you a counselor?</p>
                <Link href="/auth/register">
                  <Button size="lg" className="bg-accent text-accent-foreground border-accent-border" data-testid="button-join-therapist">
                    Join the Network!
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="relative bg-muted/30 overflow-hidden" data-testid="section-benefits">
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32" style={{ background: "radial-gradient(ellipse at 50% 100%, hsl(var(--accent) / 0.18) 0%, transparent 70%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold text-center mb-3 sm:mb-4" data-testid="text-benefits-heading">Why TCK Informed?</h2>
          <p className="text-sm sm:text-base text-muted-foreground text-center max-w-xl mx-auto mb-10 sm:mb-14">
            We bridge the gap between Third Culture Kids and culturally competent mental health professionals.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10 md:gap-12">
            {benefits.map((item) => (
              <div key={item.title} className="text-center" data-testid={`text-benefit-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
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
      <section className="bg-[#ffffff4d]" data-testid="section-counseling-needed">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold text-center mb-3 sm:mb-4" data-testid="text-counseling-needed-heading">Is Counseling What's Needed?</h2>
          <p className="text-sm sm:text-base text-muted-foreground text-center max-w-3xl mx-auto leading-relaxed">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
        </div>
      </section>
      <TestimonialsCarousel />
      <section className="relative bg-[#ffffff4d] overflow-hidden" data-testid="section-counselor-map">
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-32" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(var(--accent) / 0.12) 0%, transparent 70%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
          <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap mb-8 sm:mb-12">
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold" data-testid="text-map-heading">
                Our Counselors Around the World
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Click a pin to learn more about a TCK-informed professional near you</p>
            </div>
            <Link href="/directory">
              <Button variant="outline" data-testid="button-view-all-therapists">
                Find a Counselor <ArrowRight className="ml-2 h-4 w-4" />
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
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-6">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
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
              <Link key={event.id} href={`/events/${event.id}`}>
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
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{event.description}</p>
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
            Are You a TCK-Informed Counselor?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            Join our growing directory and connect with clients who need your unique expertise. List your practice and reach the global TCK community.
          </p>
          <Link href="/auth/register">
            <Button size="lg" className="bg-accent text-accent-foreground border-accent-border" data-testid="button-cta-join">
              Join the Directory
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </PageLayout>
  );
}

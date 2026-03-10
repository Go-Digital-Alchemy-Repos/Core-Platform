import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageLayout } from "@/components/layout/page-layout";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import {
  Search,
  SlidersHorizontal,
  MessageCircle,
  Globe,
  Heart,
  Users,
  MapPin,
  Video,
  Calendar,
  ArrowRight,
  Brain,
  Fingerprint,
  UserCheck,
  Puzzle,
  Sparkles,
  BookOpen,
  Leaf,
} from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";

const howItWorks = [
  {
    step: 1,
    icon: Search,
    title: "Browse Counselors",
    description: "Explore our curated directory of TCK-informed counselors from around the world.",
  },
  {
    step: 2,
    icon: SlidersHorizontal,
    title: "Filter & Compare",
    description: "Narrow results by specialization, language, location, and session format.",
  },
  {
    step: 3,
    icon: MessageCircle,
    title: "Connect & Begin",
    description: "Reach out directly to a counselor who truly understands your unique background.",
  },
];

const categories = [
  { icon: Brain, label: "Anxiety", slug: "Anxiety" },
  { icon: Fingerprint, label: "Identity & Belonging", slug: "Identity & Belonging" },
  { icon: Globe, label: "TCK Support", slug: "Third Culture Kids (TCK)" },
  { icon: UserCheck, label: "Expatriate Adjustment", slug: "Expatriate Adjustment" },
  { icon: Puzzle, label: "Cross-Cultural", slug: "Cross-Cultural Transitions" },
  { icon: Heart, label: "Grief & Loss", slug: "Grief & Loss" },
  { icon: Users, label: "Family Therapy", slug: "Family Therapy" },
  { icon: Sparkles, label: "Trauma & PTSD", slug: "Trauma & PTSD" },
  { icon: BookOpen, label: "CBT", slug: "CBT" },
  { icon: Leaf, label: "Mindfulness", slug: "Mindfulness & Meditation" },
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


export default function HomePage() {
  const { data: events, isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/events"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: featuredTherapistsData, isLoading: featuredLoading } = useQuery<any[]>({
    queryKey: ["/api/therapists/featured"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const featuredTherapists = featuredTherapistsData ?? [];
  const upcomingEvents = events?.slice(0, 3) ?? [];

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
              Care that understands where TCKs <span className="text-accent">"come from"</span>
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24 text-center" data-testid="section-why-tck-informed">
        <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold mb-3 sm:mb-4" data-testid="text-why-tck-informed-heading">
          Why TCK Informed
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
        </p>
      </section>
      <section className="relative border-t border-b bg-muted/30 overflow-hidden" data-testid="section-categories">
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32" style={{ background: "radial-gradient(ellipse at 50% 100%, hsl(var(--accent) / 0.18) 0%, transparent 70%)" }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 md:py-12">
          <h2 className="font-heading sm:text-xl font-semibold text-center mb-6 sm:mb-8 text-[26px]" data-testid="text-categories-heading">
            Explore by Specialization
          </h2>
          <div className="grid grid-cols-5 gap-3">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`/directory?specialization=${encodeURIComponent(cat.slug)}`}>
                <div
                  className="flex flex-col items-center gap-2.5 px-4 py-4 rounded-md hover-elevate cursor-pointer"
                  data-testid={`link-category-${cat.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 text-accent">
                    <cat.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-center whitespace-nowrap">{cat.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24" data-testid="section-how-it-works">
        <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold text-center mb-3 sm:mb-4" data-testid="text-how-heading">
          How It Works
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground text-center max-w-xl mx-auto mb-10 sm:mb-14">
          Getting started is simple. Find the right counselor in three easy steps.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12">
          {howItWorks.map((item) => (
            <div key={item.title} className="text-center" data-testid={`card-how-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 text-accent mb-5">
                <item.icon className="w-7 h-7" />
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-bold">
                  {item.step}
                </span>
              </div>
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-muted/30" data-testid="section-featured-therapists">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
          <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap mb-8 sm:mb-12">
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold" data-testid="text-featured-heading">
                Featured Counselors
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">TCK-informed professionals from around the world</p>
            </div>
            <Link href="/directory">
              <Button variant="outline" data-testid="button-view-all-therapists">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {featuredLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : featuredTherapists.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {featuredTherapists.map((therapist: any) => (
                <Link key={therapist.id} href={`/directory/${therapist.id}`}>
                  <Card className="h-full cursor-pointer hover-elevate" data-testid={`card-featured-therapist-${therapist.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="h-14 w-14 flex-shrink-0">
                          <AvatarImage src={therapist.user?.profileImageUrl ?? undefined} alt={`${therapist.user?.firstName} ${therapist.user?.lastName}`} />
                          <AvatarFallback className="bg-accent/10 text-accent font-semibold">
                            {therapist.user?.firstName?.[0]}{therapist.user?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate" data-testid={`text-therapist-name-${therapist.id}`}>
                            {therapist.user?.firstName} {therapist.user?.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">{therapist.title}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                        {therapist.practiceMode === "virtual" ? (
                          <><Video className="h-3.5 w-3.5 flex-shrink-0" /> Virtual Only</>
                        ) : therapist.city ? (
                          <><MapPin className="h-3.5 w-3.5 flex-shrink-0" /> {therapist.city}{therapist.country ? `, ${therapist.country}` : ""}</>
                        ) : (
                          <><Globe className="h-3.5 w-3.5 flex-shrink-0" /> Global</>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {therapist.specializations?.slice(0, 3).map((s: string) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                        {therapist.specializations?.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{therapist.specializations.length - 3}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">No counselors available yet.</p>
          )}
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24" data-testid="section-upcoming-events">
        <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap mb-8 sm:mb-12">
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold" data-testid="text-events-heading">
              Upcoming Events
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Workshops, webinars, and community gatherings</p>
          </div>
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
              <Card key={event.id} data-testid={`card-event-${event.id}`}>
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
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-12">No upcoming events.</p>
        )}
      </section>
      <section className="relative bg-muted/30 overflow-hidden" data-testid="section-benefits">
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-32" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(var(--accent) / 0.18) 0%, transparent 70%)" }} />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32" style={{ background: "radial-gradient(ellipse at 50% 100%, hsl(var(--accent) / 0.18) 0%, transparent 70%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold text-center mb-3 sm:mb-4" data-testid="text-benefits-heading">
            Why TCK Wellness
          </h2>
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

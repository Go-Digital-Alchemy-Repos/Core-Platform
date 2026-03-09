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
  Shield,
  BookOpen,
  Leaf,
} from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";

const howItWorks = [
  {
    step: 1,
    icon: Search,
    title: "Browse Counselors",
    description: "Explore our curated directory of TCK-informed therapists from around the world.",
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
    description: "Reach out directly to a therapist who truly understands your unique background.",
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
  { icon: Shield, label: "LGBTQ+ Affirming", slug: "LGBTQ+ Affirming" },
  { icon: BookOpen, label: "CBT", slug: "CBT" },
  { icon: Leaf, label: "Mindfulness", slug: "Mindfulness & Meditation" },
];

const benefits = [
  {
    icon: Globe,
    title: "Culturally Informed Care",
    description: "Every therapist in our directory understands the unique challenges of growing up across cultures.",
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

const trustStats = [
  { value: "40+", label: "Therapists" },
  { value: "15+", label: "Countries" },
  { value: "1000+", label: "Connections Made" },
];

export default function HomePage() {
  const { data: therapists, isLoading: therapistsLoading } = useQuery<any[]>({
    queryKey: ["/api/therapists"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: events, isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/events"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const featuredTherapists = therapists?.slice(0, 6) ?? [];
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
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-5 sm:mb-6" data-testid="text-hero-heading">
              Find Your <span className="text-accent">TCK-Informed</span> Therapist
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed" data-testid="text-hero-subtitle">
              A global directory connecting Third Culture Kids with therapists who truly understand the complexity of a cross-cultural life.
            </p>
            <div className="flex flex-col xs:flex-row flex-wrap justify-center gap-3 sm:gap-4 mb-10 sm:mb-14">
              <Link href="/directory">
                <Button size="lg" className="w-full xs:w-auto bg-accent text-accent-foreground border-accent-border" data-testid="button-browse-directory">
                  <Search className="h-4 w-4 mr-2" />
                  Browse Directory
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="lg" variant="outline" className="w-full xs:w-auto border-foreground/20 hover:bg-foreground/5" data-testid="button-join-therapist">
                  Join as Therapist
                </Button>
              </Link>
            </div>

            <div className="flex justify-center gap-6 sm:gap-8 md:gap-16" data-testid="section-trust-stats">
              {trustStats.map((stat) => (
                <div key={stat.label} className="text-center" data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading text-accent">{stat.value}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="border-t border-b bg-muted/30" data-testid="section-categories">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 md:py-12">
          <h2 className="font-heading sm:text-xl font-semibold text-center mb-6 sm:mb-8 text-[30px]" data-testid="text-categories-heading">
            Explore by Specialization
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`/directory?specialization=${encodeURIComponent(cat.slug)}`}>
                <div
                  className="flex flex-col items-center gap-2.5 min-w-[100px] px-4 py-4 rounded-md hover-elevate cursor-pointer"
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
          Getting started is simple. Find the right therapist in three easy steps.
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
                Featured Therapists
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">TCK-informed professionals from around the world</p>
            </div>
            <Link href="/directory">
              <Button variant="outline" data-testid="button-view-all-therapists">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {therapistsLoading ? (
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
            <p className="text-center text-muted-foreground py-12">No therapists available yet.</p>
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
      <section className="bg-muted/30" data-testid="section-benefits">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
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
            Are You a TCK-Informed Therapist?
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

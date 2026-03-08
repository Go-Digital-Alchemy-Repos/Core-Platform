import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageLayout } from "@/components/layout/page-layout";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Search, SlidersHorizontal, MessageCircle, Globe, Heart, Users, MapPin, Video, Calendar, ArrowRight } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";

const howItWorks = [
  {
    icon: Search,
    title: "Search",
    description: "Browse our directory of TCK-informed therapists from around the world.",
  },
  {
    icon: SlidersHorizontal,
    title: "Filter",
    description: "Narrow results by specialization, language, location, and practice mode.",
  },
  {
    icon: MessageCircle,
    title: "Connect",
    description: "Reach out directly to a therapist who understands your unique background.",
  },
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
      <section className="relative bg-primary text-primary-foreground" data-testid="section-hero">
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/50" />
        <div className="relative max-w-7xl mx-auto px-4 py-24 md:py-32 text-center">
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold mb-4" data-testid="text-hero-heading">
            Find Your TCK-Informed Therapist
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8 opacity-90" data-testid="text-hero-subtitle">
            A global directory connecting Third Culture Kids with therapists who truly understand the complexity of a cross-cultural life.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/directory">
              <Button size="lg" variant="secondary" data-testid="button-browse-directory">
                Browse Directory
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="lg" variant="outline" className="backdrop-blur-sm bg-background/10" data-testid="button-join-therapist">
                Join as Therapist
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16 md:py-20" data-testid="section-how-it-works">
        <h2 className="font-heading text-3xl font-semibold text-center mb-12" data-testid="text-how-heading">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {howItWorks.map((item) => (
            <Card key={item.title} data-testid={`card-how-${item.title.toLowerCase()}`}>
              <CardContent className="pt-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-accent/10 text-accent mb-4">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-muted/40" data-testid="section-featured-therapists">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-20">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="font-heading text-3xl font-semibold" data-testid="text-featured-heading">
                Featured Therapists
              </h2>
              <p className="text-muted-foreground mt-2">TCK-informed professionals from around the world</p>
            </div>
            <Link href="/directory">
              <Button variant="outline" data-testid="button-view-all-therapists">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {therapistsLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : featuredTherapists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredTherapists.map((therapist: any) => (
                <Link key={therapist.id} href={`/directory/${therapist.id}`}>
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer" data-testid={`card-featured-therapist-${therapist.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="h-14 w-14 flex-shrink-0">
                          <AvatarImage src={therapist.user?.profileImageUrl ?? undefined} alt={`${therapist.user?.firstName} ${therapist.user?.lastName}`} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
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
                          <><Video className="h-3.5 w-3.5" /> Virtual Only</>
                        ) : therapist.city ? (
                          <><MapPin className="h-3.5 w-3.5" /> {therapist.city}{therapist.country ? `, ${therapist.country}` : ""}</>
                        ) : (
                          <><Globe className="h-3.5 w-3.5" /> Global</>
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
            <p className="text-center text-muted-foreground py-8">No therapists available yet.</p>
          )}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16 md:py-20" data-testid="section-upcoming-events">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="font-heading text-3xl font-semibold" data-testid="text-events-heading">
              Upcoming Events
            </h2>
            <p className="text-muted-foreground mt-2">Workshops, webinars, and community gatherings</p>
          </div>
          <Link href="/events">
            <Button variant="outline" data-testid="button-view-all-events">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {eventsLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {upcomingEvents.map((event: any) => (
              <Card key={event.id} data-testid={`card-event-${event.id}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-primary" />
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
                  <p className="text-sm text-muted-foreground line-clamp-3">{event.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No upcoming events.</p>
        )}
      </section>

      <section className="bg-muted/40" data-testid="section-benefits">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-20">
          <h2 className="font-heading text-3xl font-semibold text-center mb-12" data-testid="text-benefits-heading">
            Why TCK Wellness
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {benefits.map((item) => (
              <div key={item.title} className="text-center" data-testid={`text-benefit-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-primary/10 text-primary mb-4">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16 md:py-20 text-center" data-testid="section-cta">
        <h2 className="font-heading text-3xl font-semibold mb-4" data-testid="text-cta-heading">
          Are You a TCK-Informed Therapist?
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-8">
          Join our growing directory and connect with clients who need your unique expertise. List your practice and reach the global TCK community.
        </p>
        <Link href="/auth/register">
          <Button size="lg" data-testid="button-cta-join">
            Join the Directory
          </Button>
        </Link>
      </section>
    </PageLayout>
  );
}

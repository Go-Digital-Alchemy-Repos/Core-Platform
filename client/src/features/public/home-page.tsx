import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Search, SlidersHorizontal, MessageCircle, Globe, Heart, Users } from "lucide-react";

function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

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

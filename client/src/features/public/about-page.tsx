import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, BookOpen, Users } from "lucide-react";

function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export default function AboutPage() {
  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <h1 className="font-heading text-4xl font-bold mb-6 text-center" data-testid="text-about-heading">
          About TCK Wellness
        </h1>

        <section className="mb-12" data-testid="section-mission">
          <h2 className="font-heading text-2xl font-semibold mb-4" data-testid="text-mission-heading">
            Our Mission
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            TCK Wellness exists to bridge the gap between Third Culture Kids and mental health professionals who understand their unique experiences. We believe that everyone deserves access to culturally informed care, especially those whose identities span multiple cultures and countries.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Our platform makes it easy for TCKs, Adult TCKs, and Cross-Cultural Kids to find therapists who specialize in the challenges of growing up between worlds — from identity formation and belonging to grief of place and cultural transition.
          </p>
        </section>

        <section className="mb-12" data-testid="section-tck">
          <h2 className="font-heading text-2xl font-semibold mb-4" data-testid="text-tck-heading">
            What is a Third Culture Kid?
          </h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground leading-relaxed mb-4">
                A Third Culture Kid (TCK) is a person who has spent a significant part of their developmental years outside their parents' home culture. TCKs build relationships to all of the cultures they've lived in, while not having full ownership in any. Although elements from each culture may be absorbed, the sense of belonging is often in relationship to others of a similar background.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The term was coined by sociologist Ruth Hill Useem in the 1950s. Today, millions of people worldwide identify as TCKs — children of diplomats, military families, missionaries, international business professionals, and others who grew up crossing cultural boundaries.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="mb-12" data-testid="section-values">
          <h2 className="font-heading text-2xl font-semibold mb-6" data-testid="text-values-heading">
            What We Value
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card data-testid="card-value-understanding">
              <CardContent className="pt-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-accent/10 text-accent mb-4">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-2">Cultural Understanding</h3>
                <p className="text-sm text-muted-foreground">
                  We prioritize therapists with lived or trained experience in cross-cultural dynamics.
                </p>
              </CardContent>
            </Card>
            <Card data-testid="card-value-accessibility">
              <CardContent className="pt-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-accent/10 text-accent mb-4">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-2">Accessibility</h3>
                <p className="text-sm text-muted-foreground">
                  With virtual and in-person options, we connect people to care no matter where they are.
                </p>
              </CardContent>
            </Card>
            <Card data-testid="card-value-community">
              <CardContent className="pt-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-accent/10 text-accent mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-2">Community</h3>
                <p className="text-sm text-muted-foreground">
                  We foster a supportive network for both TCKs seeking help and the professionals who serve them.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section data-testid="section-team">
          <h2 className="font-heading text-2xl font-semibold mb-4" data-testid="text-team-heading">
            Our Team
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            TCK Wellness was founded by a team of Adult TCKs and mental health advocates who experienced firsthand the difficulty of finding culturally competent care. We are passionate about making this process easier for the next generation of global citizens.
          </p>
        </section>
      </div>
    </PageLayout>
  );
}

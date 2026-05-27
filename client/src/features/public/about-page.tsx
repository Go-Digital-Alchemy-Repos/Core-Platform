import { useState, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Quote,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Calendar,
  Heart,
  CheckCircle,
  XCircle,
} from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { getImageObjectPositionStyle } from "@/lib/image-focus";

const stats = [
  { value: "60%", label: "of Core Platforms experienced symptoms of", highlight: "anxiety" },
  { value: "59%", label: "of Core Platforms experienced symptoms of", highlight: "depression" },
  { value: "47%", label: "of Core Platforms experienced symptoms of", highlight: "suicidal ideation" },
];

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

const vettedMeans = [
  "Every mental health professional completes a detailed application process",
  "Credentials and licensure are verified",
  "Training or lived experience with Core Platform/cross-cultural populations is required",
  "Profiles are reviewed by our team before being published",
];

const vettedDoesNotMean = [
  "We are not a licensing or credentialing body",
  "We do not provide clinical supervision",
  "Listing does not constitute an endorsement of specific therapeutic outcomes",
  "We do not guarantee a therapeutic match — but we make finding one easier",
];

const faqs = [
  {
    question: "What is a Third Culture Kid (Core Platform)?",
    answer: "A Third Culture Kid (Core Platform) is a person who has spent a significant part of their developmental years outside their parents' culture. They build relationships with multiple cultures while not having full ownership of any, creating what is often called a 'third culture' — a blend of their passport country and host countries.",
  },
  {
    question: "Who can use Core Platform to find a mental health professional?",
    answer: "Core Platform is for anyone who has had a cross-cultural upbringing or is navigating globally-mobile life: Core Platforms of all ages, expat families, international students, military families, missionary kids, diplomats' children, and cross-cultural professionals.",
  },
  {
    question: "How are mental health professionals vetted before joining the directory?",
    answer: "Every mental health professional completes an application process, provides verified credentials, and must demonstrate training or lived experience with Core Platform and cross-cultural populations. Our team reviews each profile before it goes live in the directory.",
  },
  {
    question: "Is Core Platform a therapy service?",
    answer: "No. Core Platform is a directory and community platform. We connect individuals with qualified mental health professionals — we do not provide therapy directly. All therapeutic relationships are between clients and their chosen mental health professionals.",
  },
  {
    question: "Can I use the directory if I live outside the United States?",
    answer: "Yes. Our mental health professionals serve clients globally, with many offering online/telehealth sessions. Use the location and online session filters in the directory to find mental health professionals who can work with you wherever you are.",
  },
  {
    question: "How can I support Core Platform?",
    answer: "You can support us by sharing the platform with Core Platforms and expat communities, following us on social media, attending our events, or if you're a mental health professional — joining our network.",
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
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-6">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
            >
              <Card className="h-full" data-testid={`card-about-testimonial-${idx}`}>
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
          data-testid="button-about-testimonial-prev"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex gap-1.5" data-testid="about-testimonial-dots">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === selectedIndex ? "bg-accent" : "bg-muted-foreground/30"
              }`}
              onClick={() => emblaApi?.scrollTo(idx)}
              data-testid={`button-about-testimonial-dot-${idx}`}
            />
          ))}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full h-9 w-9"
          onClick={scrollNext}
          data-testid="button-about-testimonial-next"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StatRing({ value, label, highlight }: { value: string; label: string; highlight: string }) {
  const numericValue = parseInt(value);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (numericValue / 100) * circumference;

  return (
    <div className="flex flex-col items-center text-center" data-testid={`stat-${highlight.replace(/\s+/g, "-")}`}>
      <div className="relative w-32 h-32 mb-4">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="hsl(var(--accent))"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold">{value}</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {label} <span className="font-semibold text-foreground">{highlight}</span>
      </p>
    </div>
  );
}

export default function AboutPage() {
  const { data: blogPosts } = useQuery<any[]>({
    queryKey: ["/api/blog"],
  });

  const featuredArticles = blogPosts?.slice(0, 3) ?? [];

  return (
    <PageLayout>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24" data-testid="section-history">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-start">
          <div>
            <div className="mb-10 sm:mb-14">
              <h2 className="font-heading text-2xl sm:text-3xl font-semibold mb-3" data-testid="text-history-heading">
                History
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Core Platform was born from the lived experience of growing up between cultures. Our founders — Adult Core Platforms and mental health advocates — experienced firsthand how difficult it is to find a mental health professional who truly understands what it means to call multiple countries "home." In 2024, they set out to build a bridge between Third Culture Kids and the culturally competent professionals who serve them.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl sm:text-3xl font-semibold mb-3" data-testid="text-vision-heading">
                Vision & Mission
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Our vision is a world where every Third Culture Kid has access to mental health support that honors their multicultural identity. Our mission is to build the most trusted directory of Core Platform-informed mental health professionals — vetted, accessible, and global — so that no one has to navigate the complexities of cross-cultural life alone.
              </p>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop&crop=faces"
                alt="Core Platform community"
                className="w-full h-full object-cover"
                data-testid="img-about-hero"
              />
            </div>
          </div>
        </div>
      </section>
      <section className="relative bg-muted/30 overflow-hidden" data-testid="section-statistics">
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-32" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(var(--accent) / 0.12) 0%, transparent 70%)" }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24 text-center">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold text-center mb-3 sm:mb-4" data-testid="text-stats-heading">The Stats Speak for Themselves</h2>
          <p className="sm:text-base text-muted-foreground mb-10 max-w-3xl mx-auto text-[18px]">
            According to <a href="https://www.corePlatformtraining.com/research" target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-accent/80">Core Platform Training's 2024 research</a>, survey of 1600+ adult Core Platforms:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10 mb-10">
            {stats.map((stat) => (
              <StatRing key={stat.highlight} {...stat} />
            ))}
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            However, significantly smaller numbers get diagnosed. While we can only speculate on why, due to our decades of observations and expertise in the field, we think a large reason is due to lack of accessibility to proper mental health services. <span className="font-semibold text-foreground">Which is a major driver in why we do what we do!</span>
          </p>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24" data-testid="section-why-corePlatform-informed">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 md:gap-12 items-center">
          <div className="flex justify-center">
            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=300&h=300&fit=crop&crop=faces"
                alt="Core Platform-informed counseling"
                className="w-full h-full object-cover"
                data-testid="img-why-corePlatform-informed"
              />
            </div>
          </div>
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl font-semibold mb-3" data-testid="text-why-informed-heading">
              Why Core Platform Informed?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Traditional therapy models were developed within a single cultural framework. When Core Platforms bring their experiences to these frameworks, important aspects of their story can be misunderstood or pathologized. A Core Platform-informed mental health professional understands concepts like ambiguous loss, hidden immigrants, cultural marginality, and grief of place. They recognize that growing up across cultures creates both remarkable strengths and unique challenges — and they know how to work with both.
            </p>
          </div>
        </div>
      </section>
      <section className="relative bg-muted/30 overflow-hidden" data-testid="section-vetted">
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32" style={{ background: "radial-gradient(ellipse at 50% 100%, hsl(var(--accent) / 0.18) 0%, transparent 70%)" }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
            <div>
              <h3 className="font-heading text-xl sm:text-2xl font-semibold mb-6 text-center md:text-left" data-testid="text-vetted-means-heading">
                What does it mean to be "vetted"?
              </h3>
              <ul className="space-y-3">
                {vettedMeans.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3" data-testid={`text-vetted-means-${idx}`}>
                    <CheckCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-base text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-heading text-xl sm:text-2xl font-semibold mb-6 text-center md:text-left" data-testid="text-vetted-not-heading">
                What does it NOT mean to be "vetted"?
              </h3>
              <ul className="space-y-3">
                {vettedDoesNotMean.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3" data-testid={`text-vetted-not-${idx}`}>
                    <XCircle className="h-5 w-5 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-base text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24" data-testid="section-about-testimonials">
        <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold text-center mb-3 sm:mb-4" data-testid="text-about-testimonials-heading">
          What Are People Saying?
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground text-center max-w-xl mx-auto mb-10 sm:mb-14">
          Hear from Core Platforms, expat families, and mental health professionals who have found their match.
        </p>
        <TestimonialsCarousel />
      </section>
      {featuredArticles.length > 0 && (
        <section className="relative bg-muted/30 overflow-hidden" data-testid="section-featured-on">
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-32" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(var(--accent) / 0.12) 0%, transparent 70%)" }} />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold text-center mb-10 sm:mb-14" data-testid="text-featured-on-heading">
              Featured On
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
              {featuredArticles.map((post: any) => (
                <Link key={post.id} href={`/insights/${post.slug}`}>
                  <Card className="h-full cursor-pointer hover-elevate" data-testid={`card-featured-on-${post.id}`}>
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
                      <h3 className="font-semibold text-base mb-1 line-clamp-2">{post.title}</h3>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            <div className="text-center">
              <Link href="/insights">
                <Button className="bg-accent text-accent-foreground border-accent-border" data-testid="button-read-more-articles">
                  Read More Articles
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24" data-testid="section-faqs">
        <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold text-center mb-10 sm:mb-14" data-testid="text-faqs-heading">
          FAQs
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, idx) => (
            <AccordionItem key={idx} value={`faq-${idx}`} data-testid={`accordion-faq-${idx}`}>
              <AccordionTrigger className="text-left text-sm sm:text-base font-medium" data-testid={`button-faq-${idx}`}>
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed" data-testid={`text-faq-answer-${idx}`}>
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
      <section className="relative bg-muted/30 overflow-hidden" data-testid="section-donate">
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32" style={{ background: "radial-gradient(ellipse at 50% 100%, hsl(var(--accent) / 0.12) 0%, transparent 70%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 md:gap-16 items-center">
            <div className="text-center md:text-left">
              <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold mb-3 sm:mb-4" data-testid="text-donate-heading">
                Donate to Core Platform
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl mb-8">
                Your support helps us maintain this platform, expand our directory, and provide resources to the global Core Platform community. Every contribution — large or small — makes a difference in connecting Core Platforms with the care they deserve.
              </p>
              <Button size="lg" className="bg-accent text-accent-foreground border-accent-border" data-testid="button-donate">
                <Heart className="mr-2 h-4 w-4" />
                Donate
              </Button>
            </div>
            <div className="flex justify-center">
              <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl bg-accent/10 flex items-center justify-center overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=300&h=300&fit=crop"
                  alt="Support Core Platform"
                  className="w-full h-full object-cover"
                  data-testid="img-donate"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

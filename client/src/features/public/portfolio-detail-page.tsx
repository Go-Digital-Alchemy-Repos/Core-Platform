import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, CalendarDays, Copy, ExternalLink, FolderKanban, MapPin, Play, Quote, Share2 } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { JsonLd } from "@/components/shared/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSeo } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { buildBreadcrumbLd } from "@/lib/structured-data";
import {
  PORTFOLIO_INDUSTRY_LABELS,
  type PortfolioProject,
  type PortfolioSettings,
  type SeoSettings,
} from "@shared/schema";

function RichSection({ title, html }: { title: string; html?: string | null }) {
  if (!html) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold tracking-normal">{title}</h2>
      <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}

function formatDate(value?: string | Date | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function videoEmbedUrl(url: string) {
  const youtube = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1];
  if (youtube) return `https://www.youtube.com/embed/${youtube}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/)?.[1];
  if (vimeo) return `https://player.vimeo.com/video/${vimeo}`;
  return url;
}

function ShareActions({ project, enabled }: { project: PortfolioProject; enabled?: boolean }) {
  const { toast } = useToast();
  if (!enabled) return null;
  const url = typeof window !== "undefined" ? `${window.location.origin}/portfolio/${project.slug}` : `/portfolio/${project.slug}`;
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    toast({ title: "Project link copied" });
  };
  const nativeShare = async () => {
    await navigator.share?.({ title: project.title, url });
  };
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={copy}><Copy className="mr-2 h-4 w-4" />Copy</Button>
      {typeof navigator !== "undefined" && "share" in navigator && (
        <Button variant="outline" size="sm" onClick={nativeShare}><Share2 className="mr-2 h-4 w-4" />Share</Button>
      )}
    </div>
  );
}

export default function PortfolioDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: project, isLoading } = useQuery<PortfolioProject>({ queryKey: [`/api/portfolio/projects/${slug}`] });
  const { data: settings } = useQuery<PortfolioSettings>({ queryKey: ["/api/portfolio/settings"] });
  const { data: globalSeo } = useQuery<SeoSettings>({ queryKey: ["/api/seo/global"] });
  const completedAt = formatDate(project?.completedAt);
  const heroImage = project?.heroImageUrl || project?.gallery?.[0]?.url;

  useSeo({
    title: project ? `${project.metaTitle || project.title} | Portfolio` : "Portfolio",
    description: project?.metaDescription || project?.summary || undefined,
    canonical: project && typeof window !== "undefined" ? `${window.location.origin}/portfolio/${project.slug}` : undefined,
    noindex: project?.noindex,
  });

  const schemas = useMemo(() => {
    if (!project) return [];
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return [
      {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        name: project.title,
        description: project.summary || project.metaDescription || undefined,
        image: heroImage ? `${origin}${heroImage.startsWith("/") ? heroImage : `/${heroImage}`}` : undefined,
        datePublished: project.publishedAt ? new Date(project.publishedAt).toISOString() : undefined,
        provider: globalSeo?.organizationName ? { "@type": "Organization", name: globalSeo.organizationName } : undefined,
      },
      buildBreadcrumbLd([
        { name: "Portfolio", url: `${origin}/portfolio` },
        { name: project.title, url: `${origin}/portfolio/${project.slug}` },
      ]),
    ];
  }, [project, heroImage, globalSeo]);

  if (isLoading) {
    return <PageLayout><main className="container mx-auto px-4 py-10">Loading project...</main></PageLayout>;
  }
  if (!project) {
    return <PageLayout><main className="container mx-auto px-4 py-10">Project not found.</main></PageLayout>;
  }

  return (
    <PageLayout>
      <JsonLd schemas={schemas} />
      <main className="container mx-auto space-y-10 px-4 py-10">
        <Link href="/portfolio" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Back to portfolio
        </Link>
        <header className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <section className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{PORTFOLIO_INDUSTRY_LABELS[project.industry]}</Badge>
              {project.projectType && <Badge variant="outline">{project.projectType}</Badge>}
              {project.featured && <Badge>Featured</Badge>}
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-normal sm:text-5xl">{project.title}</h1>
              {project.subtitle && <p className="text-xl text-muted-foreground">{project.subtitle}</p>}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {project.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{project.location}</span>}
              {completedAt && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{completedAt}</span>}
              {project.clientName && <span className="inline-flex items-center gap-1.5"><FolderKanban className="h-4 w-4" />{project.clientName}</span>}
            </div>
            <ShareActions project={project} enabled={settings?.sharingEnabled} />
          </section>
          {heroImage && (
            <img src={heroImage} alt={project.heroImageAlt || project.title} className="aspect-[4/3] w-full rounded-md object-cover" />
          )}
        </header>

        {project.metrics?.length > 0 && (
          <section className="grid gap-3 md:grid-cols-3">
            {project.metrics.map((metric, index) => (
              <Card key={`${metric.label}-${index}`}>
                <CardContent className="space-y-1 p-5">
                  <p className="text-3xl font-bold">{metric.value}</p>
                  <p className="font-medium">{metric.label}</p>
                  {metric.description && <p className="text-sm text-muted-foreground">{metric.description}</p>}
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        <section className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <article className="space-y-9">
            {project.summary && <p className="text-lg leading-8 text-muted-foreground">{project.summary}</p>}
            <RichSection title="Overview" html={project.description} />
            <RichSection title="Challenge" html={project.challenge} />
            <RichSection title="Solution" html={project.solution} />
            <RichSection title="Results" html={project.results} />
            {project.sections?.map((section, index) => <RichSection key={`${section.title}-${index}`} title={section.title} html={section.body} />)}
            {project.testimonial && (
              <Card>
                <CardContent className="space-y-3 p-6">
                  <Quote className="h-6 w-6 text-primary" />
                  <blockquote className="text-lg leading-8">{project.testimonial}</blockquote>
                  {project.testimonialAuthor && <p className="text-sm font-medium text-muted-foreground">{project.testimonialAuthor}</p>}
                </CardContent>
              </Card>
            )}
          </article>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <Card>
              <CardContent className="space-y-4 p-5 text-sm">
                {project.services?.length ? <div><p className="font-medium">Services</p><p className="text-muted-foreground">{project.services.join(", ")}</p></div> : null}
                {project.technologies?.length ? <div><p className="font-medium">Technologies</p><p className="text-muted-foreground">{project.technologies.join(", ")}</p></div> : null}
                {project.categories?.length ? <div><p className="font-medium">Categories</p><p className="text-muted-foreground">{project.categories.join(", ")}</p></div> : null}
                <Button asChild className="w-full">
                  <a href={project.ctaUrl || settings?.defaultCtaUrl || "/contact"}>
                    {project.ctaLabel || settings?.defaultCtaLabel || "Start a Project"}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </section>

        {project.gallery?.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-normal">Gallery</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {project.gallery.map((item, index) => (
                <figure key={`${item.url}-${index}`} className="space-y-2">
                  <img src={item.url} alt={item.alt || project.title} className="aspect-[4/3] w-full rounded-md object-cover" loading="lazy" />
                  {item.caption && <figcaption className="text-sm text-muted-foreground">{item.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </section>
        )}

        {project.videos?.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-normal">Videos</h2>
            <div className="grid gap-5 md:grid-cols-2">
              {project.videos.map((video, index) => (
                <Card key={`${video.url}-${index}`} className="overflow-hidden">
                  <div className="aspect-video bg-muted">
                    <iframe src={videoEmbedUrl(video.url)} title={video.title || `Project video ${index + 1}`} className="h-full w-full" allowFullScreen />
                  </div>
                  <CardContent className="space-y-1 p-4">
                    <p className="inline-flex items-center gap-2 font-medium"><Play className="h-4 w-4" />{video.title || "Project video"}</p>
                    {video.caption && <p className="text-sm text-muted-foreground">{video.caption}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </PageLayout>
  );
}

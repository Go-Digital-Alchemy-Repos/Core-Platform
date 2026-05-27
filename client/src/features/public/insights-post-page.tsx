import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { PageLayout } from "@/components/layout/page-layout";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Headphones, Play, Share2 } from "lucide-react";
import type { BlogPost, SeoSettings } from "@shared/schema";
import { useSeo } from "@/hooks/use-seo";
import { JsonLd } from "@/components/shared/json-ld";
import { PublicSidebar } from "@/features/public/public-sidebar";
import { BlogComments } from "@/components/blog/blog-comments";
import { getImageObjectPositionStyle } from "@/lib/image-focus";
import {
  buildOrganizationLd,
  buildBreadcrumbLd,
  buildArticleLd,
} from "@/lib/structured-data";

function PodcastPlayer({ podcastUrl }: { podcastUrl: string }) {
  const { toast } = useToast();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Podcast Episode", url: podcastUrl });
      } catch {}
    } else {
      await navigator.clipboard.writeText(podcastUrl);
      toast({ title: "Link copied to clipboard" });
    }
  };

  return (
    <Card className="mb-8 border-purple-200 bg-purple-50/40" data-testid="card-podcast-player">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100">
            <Headphones className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1 public-heading-3">Listen to this episode</h3>
            <p className="text-xs public-helper-text mb-3">Available on your favorite podcast platform</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                className="gap-1.5"
                asChild
                data-testid="button-play-podcast"
              >
                <a href={podcastUrl} target="_blank" rel="noopener noreferrer">
                  <Play className="h-3.5 w-3.5" />
                  Listen Now
                </a>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={handleShare}
                data-testid="button-share-podcast"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PostSeo({ post, globalSeo }: { post: BlogPost; globalSeo?: SeoSettings }) {
  const titleSuffix = globalSeo?.titleSuffix ?? " | Core Platform";
  const effectiveTitle = post.seoTitle || `${post.title}${titleSuffix}`;
  const effectiveDescription =
    post.seoDescription || post.excerpt || globalSeo?.defaultMetaDescription || undefined;
  const effectiveOgImage =
    post.ogImageUrl || post.coverImageUrl || globalSeo?.defaultOgImageUrl || undefined;
  const siteOrigin =
    globalSeo?.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");

  useSeo({
    title: effectiveTitle,
    description: effectiveDescription,
    ogImage: effectiveOgImage,
    canonical: `${siteOrigin}/insights/${post.slug}`,
    noindex: post.noindex ?? false,
  });

  const breadcrumbs = buildBreadcrumbLd([
    { name: "Home", url: siteOrigin || "/" },
    { name: "Insights", url: `${siteOrigin}/insights` },
    { name: post.title, url: `${siteOrigin}/insights/${post.slug}` },
  ]);

  return (
    <JsonLd
      schemas={[
        globalSeo ? buildOrganizationLd(globalSeo) : null,
        breadcrumbs,
        buildArticleLd(post, globalSeo),
      ]}
    />
  );
}

export default function InsightsPostPage() {
  const params = useParams<{ slug: string }>();

  const { data: post, isLoading, error } = useQuery<BlogPost>({
    queryKey: ["/api/blog", params.slug],
  });

  const { data: globalSeo } = useQuery<SeoSettings>({
    queryKey: ["/api/seo/global"],
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner />
        </div>
      </PageLayout>
    );
  }

  if (!post || error) {
    return (
      <PageLayout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center">
          <h1 className="text-2xl font-semibold mb-4 public-heading-1">Article Not Found</h1>
          <p className="public-helper-text mb-6">The article you're looking for doesn't exist or has been removed.</p>
          <Link href="/insights">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Articles
            </Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PostSeo post={post} globalSeo={globalSeo} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
          <article className="max-w-3xl">
            <Link href="/insights">
              <Button variant="ghost" size="sm" className="mb-6" data-testid="button-back-insights">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Articles
              </Button>
            </Link>

            {post.coverImageUrl && (
              <div className="aspect-[16/9] overflow-hidden rounded-lg mb-8">
                <img
                  src={post.coverImageUrl}
                  alt={post.title}
                  className="w-full h-full object-cover"
                  style={getImageObjectPositionStyle(post.coverImagePositionX, post.coverImagePositionY)}
                  data-testid="img-post-cover"
                />
              </div>
            )}

            {post.postType === "podcast" && post.podcastUrl && (
              <PodcastPlayer podcastUrl={post.podcastUrl} />
            )}

            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {post.postType === "podcast" && (
                <Badge variant="secondary" data-testid="badge-post-type">
                  <Headphones className="h-3 w-3 mr-1" />Podcast
                </Badge>
              )}
              {post.category && (
                <Badge variant="secondary" data-testid="badge-post-category">{post.category}</Badge>
              )}
              {post.tags?.map((tag) => (
                <Badge key={tag} variant="outline" data-testid={`badge-post-tag-${tag}`}>{tag}</Badge>
              ))}
            </div>

            <h1 className="text-3xl sm:text-4xl font-heading font-semibold mb-4 public-heading-1" data-testid="text-post-title">
              {post.title}
            </h1>

            <div className="flex items-center gap-4 text-sm public-meta-text mb-8 flex-wrap">
              <span className="flex items-center gap-1.5" data-testid="text-post-author">
                <User className="h-3.5 w-3.5" />
                {post.authorName}
              </span>
            </div>

            {post.excerpt && (
              <p className="text-lg public-body-text mb-8 leading-relaxed" data-testid="text-post-excerpt">
                {post.excerpt}
              </p>
            )}

            {post.content && post.content.trim().startsWith("<") ? (
              <div
                className="prose prose-neutral max-w-none public-prose"
                data-testid="div-post-content"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            ) : (
              <div
                className="prose prose-neutral max-w-none whitespace-pre-wrap public-prose"
                data-testid="div-post-content"
              >
                {post.content}
              </div>
            )}

            <BlogComments slug={post.slug} />
          </article>
          <PublicSidebar sidebarId={post.sidebarId} useDefault />
        </div>
      </div>
    </PageLayout>
  );
}

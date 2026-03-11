import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { PageLayout } from "@/components/layout/page-layout";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowLeft, User } from "lucide-react";
import type { BlogPost, SeoSettings } from "@shared/schema";
import { useSeo } from "@/hooks/use-seo";

function PostSeo({ post, globalSeo }: { post: BlogPost; globalSeo?: SeoSettings }) {
  const titleSuffix = globalSeo?.titleSuffix ?? " | TCK Wellness";
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
  return null;
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
          <h1 className="text-2xl font-semibold mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist or has been removed.</p>
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
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
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
              data-testid="img-post-cover"
            />
          </div>
        )}

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {post.category && (
            <Badge variant="secondary" data-testid="badge-post-category">{post.category}</Badge>
          )}
          {post.tags?.map((tag) => (
            <Badge key={tag} variant="outline" data-testid={`badge-post-tag-${tag}`}>{tag}</Badge>
          ))}
        </div>

        <h1 className="text-3xl sm:text-4xl font-heading font-semibold mb-4" data-testid="text-post-title">
          {post.title}
        </h1>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8 flex-wrap">
          <span className="flex items-center gap-1.5" data-testid="text-post-author">
            <User className="h-3.5 w-3.5" />
            {post.authorName}
          </span>
          {post.publishedAt && (
            <span className="flex items-center gap-1.5" data-testid="text-post-date">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          )}
        </div>

        {post.excerpt && (
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed" data-testid="text-post-excerpt">
            {post.excerpt}
          </p>
        )}

        <div
          className="prose prose-neutral dark:prose-invert max-w-none"
          data-testid="div-post-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </PageLayout>
  );
}

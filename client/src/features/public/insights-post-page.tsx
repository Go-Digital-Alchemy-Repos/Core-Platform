import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { PageLayout } from "@/components/layout/page-layout";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowLeft, User } from "lucide-react";
import type { BlogPost } from "@shared/schema";
import { useSeo } from "@/hooks/use-seo";

function PostSeo({ post }: { post: BlogPost }) {
  useSeo({
    title: post.seoTitle || `${post.title} | TCK Wellness`,
    description: post.seoDescription || post.excerpt || undefined,
    ogImage: post.ogImageUrl || post.coverImageUrl || undefined,
    canonical: `${window.location.origin}/insights/${post.slug}`,
  });
  return null;
}

export default function InsightsPostPage() {
  const params = useParams<{ slug: string }>();

  const { data: post, isLoading, error } = useQuery<BlogPost>({
    queryKey: ["/api/blog", params.slug],
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
      <PostSeo post={post} />
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
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-4" data-testid="text-post-title">
          {post.title}
        </h1>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8 pb-8 border-b">
          <span className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            {post.authorName}
          </span>
          {post.publishedAt && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>

        <div
          className="prose prose-slate dark:prose-invert max-w-none leading-relaxed whitespace-pre-wrap"
          data-testid="text-post-content"
        >
          {post.content}
        </div>
      </article>
    </PageLayout>
  );
}

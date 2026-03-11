import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PageLayout } from "@/components/layout/page-layout";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen } from "lucide-react";
import type { BlogPost } from "@shared/schema";

export default function InsightsPage() {
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });

  const featuredPost = posts?.[0];
  const gridPosts = posts?.slice(1) ?? [];

  return (
    <PageLayout>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
        <div className="text-center mb-10 sm:mb-14">
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4" data-testid="text-insights-heading">
            Insights & Articles
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Explore articles, research, and insights on Third Culture Kid mental health and cross-cultural counseling.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="space-y-10">
            {featuredPost && (
              <Link href={`/insights/${featuredPost.slug}`}>
                <Card className="overflow-hidden cursor-pointer hover-elevate" data-testid={`card-blog-featured-${featuredPost.id}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    {featuredPost.coverImageUrl && (
                      <div className="aspect-[16/9] md:aspect-auto md:min-h-[320px] overflow-hidden">
                        <img
                          src={featuredPost.coverImageUrl}
                          alt={featuredPost.title}
                          className="w-full h-full object-cover"
                          data-testid={`img-blog-cover-${featuredPost.id}`}
                        />
                      </div>
                    )}
                    <CardContent className="p-6 sm:p-8 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <Badge variant="default" className="text-xs bg-accent text-accent-foreground" data-testid={`badge-featured-${featuredPost.id}`}>
                          Featured
                        </Badge>
                        {featuredPost.category && (
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-category-${featuredPost.id}`}>
                            {featuredPost.category}
                          </Badge>
                        )}
                      </div>
                      <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-semibold mb-3" data-testid={`text-blog-title-${featuredPost.id}`}>
                        {featuredPost.title}
                      </h2>
                      {featuredPost.excerpt && (
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                          {featuredPost.excerpt}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">By {featuredPost.authorName}</span>
                        <span className="text-sm text-accent font-medium flex items-center gap-1">
                          Read More <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </Link>
            )}

            {gridPosts.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {gridPosts.map((post) => (
                  <Link key={post.id} href={`/insights/${post.slug}`}>
                    <Card className="h-full cursor-pointer hover-elevate" data-testid={`card-blog-${post.id}`}>
                      {post.coverImageUrl && (
                        <div className="aspect-[16/9] overflow-hidden rounded-t-lg">
                          <img
                            src={post.coverImageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover"
                            data-testid={`img-blog-cover-${post.id}`}
                          />
                        </div>
                      )}
                      <CardContent className={post.coverImageUrl ? "p-5" : "p-6"}>
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          {post.category && (
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-category-${post.id}`}>
                              {post.category}
                            </Badge>
                          )}
                        </div>
                        <h2 className="font-semibold text-lg mb-2 line-clamp-2" data-testid={`text-blog-title-${post.id}`}>
                          {post.title}
                        </h2>
                        {post.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-3">
                            {post.excerpt}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">By {post.authorName}</span>
                          <span className="text-xs text-accent font-medium flex items-center gap-1">
                            Read More <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No articles yet</h3>
            <p className="text-sm text-muted-foreground">Check back soon for insights on TCK mental health and cross-cultural counseling.</p>
          </div>
        )}
      </section>
    </PageLayout>
  );
}

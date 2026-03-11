import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BlogEditor } from "@/components/shared/blog-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Save,
  Globe,
  Eye,
  EyeOff,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { CmsImageUpload } from "./components/cms-image-upload";
import { SeoPreview } from "@/components/shared/seo-preview";
import { StructuredDataStatus } from "@/components/shared/structured-data-status";
import type { BlogPost } from "@shared/schema";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

const postFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  authorName: z.string().min(1, "Author name is required"),
  category: z.string().optional(),
  tags: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  coverImageUrl: z.string().optional(),
  isPublished: z.boolean().default(false),
  seoTitle: z.string().optional(),
  seoDescription: z.string().max(160, "Max 160 characters").optional(),
  ogImageUrl: z.string().optional(),
  noindex: z.boolean().default(false),
});

type PostForm = z.infer<typeof postFormSchema>;

export default function CmsBlogEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = !id || id === "new";
  const slugManuallyEdited = useRef(false);
  const [initialized, setInitialized] = useState(false);

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: ["/api/admin/blog", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/blog/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Post not found");
      return res.json();
    },
    enabled: !isNew,
  });

  const form = useForm<PostForm>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      title: "",
      slug: "",
      authorName: "",
      category: "",
      tags: "",
      excerpt: "",
      content: "",
      coverImageUrl: "",
      isPublished: false,
      seoTitle: "",
      seoDescription: "",
      ogImageUrl: "",
      noindex: false,
    },
  });

  useEffect(() => {
    if (post && !initialized) {
      form.reset({
        title: post.title,
        slug: post.slug,
        authorName: post.authorName,
        category: post.category ?? "",
        tags: post.tags?.join(", ") ?? "",
        excerpt: post.excerpt ?? "",
        content: post.content,
        coverImageUrl: post.coverImageUrl ?? "",
        isPublished: post.isPublished ?? false,
        seoTitle: post.seoTitle ?? "",
        seoDescription: post.seoDescription ?? "",
        ogImageUrl: post.ogImageUrl ?? "",
        noindex: post.noindex ?? false,
      });
      slugManuallyEdited.current = true;
      setInitialized(true);
    }
  }, [post, initialized, form]);

  const watchTitle = form.watch("title");
  useEffect(() => {
    if (isNew && !slugManuallyEdited.current) {
      form.setValue("slug", generateSlug(watchTitle), { shouldValidate: false });
    }
  }, [watchTitle, isNew, form]);

  const buildPayload = (data: PostForm) => {
    const tagsArray = (data.tags ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    return {
      title: data.title,
      slug: data.slug || generateSlug(data.title),
      excerpt: data.excerpt || null,
      content: data.content,
      coverImageUrl: data.coverImageUrl || null,
      authorName: data.authorName,
      category: data.category || null,
      tags: tagsArray.length > 0 ? tagsArray : null,
      isPublished: data.isPublished,
      publishedAt: data.isPublished ? new Date() : null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      ogImageUrl: data.ogImageUrl || null,
      noindex: data.noindex ?? false,
    };
  };

  const createMutation = useMutation({
    mutationFn: async (data: PostForm) => {
      const res = await apiRequest("POST", "/api/admin/blog", buildPayload(data));
      return res.json();
    },
    onSuccess: (created: BlogPost) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      toast({ title: "Post created" });
      navigate(`/admin/cms/blog/${created.id}`);
    },
    onError: () => toast({ title: "Failed to create post", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PostForm) => {
      const res = await apiRequest("PUT", `/api/admin/blog/${id}`, buildPayload(data));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      toast({ title: "Post saved" });
    },
    onError: () => toast({ title: "Failed to save post", variant: "destructive" }),
  });

  const onSave = () => {
    form.handleSubmit((data) => {
      if (isNew) {
        createMutation.mutate(data);
      } else {
        updateMutation.mutate(data);
      }
    })();
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isPublished = form.watch("isPublished");
  const currentSlug = form.watch("slug");
  const watchSeoTitle = form.watch("seoTitle");
  const watchSeoDescription = form.watch("seoDescription");
  const watchOgImageUrl = form.watch("ogImageUrl");
  const watchCoverImageUrl = form.watch("coverImageUrl");
  const watchBlogTitle = form.watch("title");
  const watchAuthorName = form.watch("authorName");
  const watchNoindex = form.watch("noindex");

  if (!isNew && isLoading) {
    return (
      <AdminSidebar>
        <div className="p-6 max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminSidebar>
    );
  }

  return (
    <AdminSidebar>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link href="/admin/cms/blog">
                <ArrowLeft className="h-4 w-4" />
                Blog
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-orange-500" />
              <h1 className="text-xl font-heading font-semibold" data-testid="text-blog-editor-title">
                {isNew ? "New Post" : (form.watch("title") || "Edit Post")}
              </h1>
              {!isNew && (
                isPublished ? (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" data-testid="badge-post-published">
                    <Eye className="h-3 w-3 mr-1" />
                    Published
                  </Badge>
                ) : (
                  <Badge variant="outline" data-testid="badge-post-draft">
                    <EyeOff className="h-3 w-3 mr-1" />
                    Draft
                  </Badge>
                )
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && isPublished && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/insights/${currentSlug}`} target="_blank" rel="noopener noreferrer" data-testid="button-view-live">
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  View Live
                </a>
              </Button>
            )}
            <Button onClick={onSave} disabled={isSaving} data-testid="button-save-post">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
            <Tabs defaultValue="content" className="space-y-4">
              <TabsList>
                <TabsTrigger value="content" data-testid="tab-content">Content</TabsTrigger>
                <TabsTrigger value="seo" data-testid="tab-seo">
                  <Globe className="h-3.5 w-3.5 mr-1.5" />
                  SEO
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground font-medium">Post Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Post title" {...field} data-testid="input-post-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL Slug</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="post-url-slug"
                              {...field}
                              onChange={(e) => {
                                slugManuallyEdited.current = true;
                                field.onChange(e);
                              }}
                              className="font-mono text-sm"
                              data-testid="input-post-slug"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Public URL: /insights/<span className="font-mono">{currentSlug || "…"}</span>
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="authorName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Author Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-post-author" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. TCK Research"
                                {...field}
                                data-testid="input-post-category"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tags <span className="text-muted-foreground font-normal text-xs">(comma-separated)</span></FormLabel>
                          <FormControl>
                            <Input
                              placeholder="TCK, identity, belonging"
                              {...field}
                              data-testid="input-post-tags"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground font-medium">Cover Image</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="coverImageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <CmsImageUpload
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              helpText="Displayed at the top of the article. Recommended: 1200 × 630 px."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground font-medium">Content</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="excerpt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Excerpt <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Brief summary for listing cards…"
                              rows={2}
                              {...field}
                              data-testid="input-post-excerpt"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Body Content</FormLabel>
                          <FormControl>
                            <BlogEditor
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              placeholder="Write your article here…"
                              data-testid="input-post-content"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-5">
                    <FormField
                      control={form.control}
                      name="isPublished"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-3">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-post-published"
                              />
                            </FormControl>
                            <div>
                              <FormLabel className="cursor-pointer">Publish this post</FormLabel>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {field.value
                                  ? "Post is visible to the public at /insights/"
                                  : "Post is saved as a draft and not visible publicly"}
                              </p>
                            </div>
                          </div>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seo" className="mt-0 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      Search Engine
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="seoTitle"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>SEO Title <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
                            {(field.value ?? "").length > 0 && (
                              <span className={`text-xs ${(field.value ?? "").length > 60 ? "text-amber-500" : (field.value ?? "").length < 20 ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                                {(field.value ?? "").length}/60
                              </span>
                            )}
                          </div>
                          <FormControl>
                            <Input
                              placeholder="Overrides post title in search results"
                              {...field}
                              data-testid="input-seo-title"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            If blank, the post title is used. Aim for 30–60 characters.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="seoDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Meta Description
                            <span className={`ml-2 text-xs font-normal ${(field.value ?? "").length > 130 ? "text-amber-500" : "text-muted-foreground"}`}>
                              ({(field.value ?? "").length}/160)
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Brief description for search engine results (max 160 chars)"
                              rows={3}
                              {...field}
                              data-testid="textarea-seo-description"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            If blank, the post excerpt is used.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="noindex"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                            <div>
                              <FormLabel className="text-sm font-medium cursor-pointer">
                                Hide from search engines
                              </FormLabel>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Sets noindex,nofollow. Use for drafts or unlisted posts.
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-noindex"
                              />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      Social / Open Graph
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="ogImageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Open Graph / Social Share Image <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
                          <FormControl>
                            <CmsImageUpload
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              helpText="Shown when the article is shared on social media. Recommended: 1200 × 630 px. Defaults to cover image, then global OG image."
                              data-testid="og-image-upload"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <SeoPreview
                  title={watchSeoTitle || watchBlogTitle || ""}
                  description={watchSeoDescription || ""}
                  url={`${typeof window !== "undefined" ? window.location.origin : ""}/insights/${currentSlug || ""}`}
                  ogImage={watchOgImageUrl || watchCoverImageUrl || ""}
                  source="post"
                  data-testid="seo-preview-panel"
                />

                <StructuredDataStatus
                  contentType="post"
                  fields={{
                    hasTitle: !!(watchSeoTitle || watchBlogTitle),
                    hasDescription: !!watchSeoDescription,
                    hasImage: !!(watchOgImageUrl || watchCoverImageUrl),
                    hasAuthor: !!watchAuthorName,
                    hasDate: !!isPublished,
                    noindex: !!watchNoindex,
                    isPublished: !!isPublished,
                  }}
                  data-testid="structured-data-status"
                />
              </TabsContent>
            </Tabs>
          </form>
        </Form>

        <div className="flex justify-end pb-8">
          <Button onClick={onSave} disabled={isSaving} data-testid="button-save-post-bottom">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving…" : "Save Post"}
          </Button>
        </div>
      </div>
    </AdminSidebar>
  );
}

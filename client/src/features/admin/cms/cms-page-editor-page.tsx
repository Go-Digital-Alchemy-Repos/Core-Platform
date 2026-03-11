import { useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Save,
  Globe,
  Clock,
  ChevronDown,
  Info,
  Upload,
  Layers,
  Eye,
} from "lucide-react";
import type { CmsPage, CmsPageRevision } from "@shared/schema";
import { format } from "date-fns";

const editorSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-/]+$/, "Lowercase letters, numbers, hyphens and slashes only"),
  pageType: z.enum(["home", "about", "contact", "landing", "custom"]),
  status: z.enum(["draft", "published", "archived"]),
  seoTitle: z.string().optional(),
  seoDescription: z.string().max(160, "Max 160 characters").optional(),
  seoKeywords: z.string().optional(),
  ogImageUrl: z.string().optional(),
});

type EditorForm = z.infer<typeof editorSchema>;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function CmsPageEditorPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const isNew = !id || id === "new";
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const titleRef = useRef<string>("");
  const slugManuallyEdited = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: page, isLoading: pageLoading } = useQuery<CmsPage>({
    queryKey: ["/api/admin/cms/pages", id],
    queryFn: () => fetch(`/api/admin/cms/pages/${id}`, { credentials: "include" }).then((r) => r.json()),
    enabled: !isNew,
  });

  const { data: revisions = [] } = useQuery<CmsPageRevision[]>({
    queryKey: ["/api/admin/cms/pages", id, "revisions"],
    queryFn: () => fetch(`/api/admin/cms/pages/${id}/revisions`, { credentials: "include" }).then((r) => r.json()),
    enabled: !isNew,
  });

  const form = useForm<EditorForm>({
    resolver: zodResolver(editorSchema),
    defaultValues: {
      title: "",
      slug: "",
      pageType: "custom",
      status: "draft",
      seoTitle: "",
      seoDescription: "",
      seoKeywords: "",
      ogImageUrl: "",
    },
  });

  useEffect(() => {
    if (page) {
      form.reset({
        title: page.title,
        slug: page.slug,
        pageType: (page.pageType as EditorForm["pageType"]) ?? "custom",
        status: (page.status as EditorForm["status"]) ?? "draft",
        seoTitle: page.seoTitle ?? "",
        seoDescription: page.seoDescription ?? "",
        seoKeywords: page.seoKeywords ?? "",
        ogImageUrl: page.ogImageUrl ?? "",
      });
    }
  }, [page, form]);

  const watchTitle = form.watch("title");
  useEffect(() => {
    if (isNew && !slugManuallyEdited.current && watchTitle !== titleRef.current) {
      titleRef.current = watchTitle;
      form.setValue("slug", slugify(watchTitle), { shouldValidate: false });
    }
  }, [watchTitle, isNew, form]);

  const createMutation = useMutation({
    mutationFn: (data: EditorForm) => apiRequest("POST", "/api/admin/cms/pages", data),
    onSuccess: async (res) => {
      const created: CmsPage = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] });
      toast({ title: "Page created successfully" });
      navigate(`/admin/cms/pages/${created.id}`);
    },
    onError: async (err: any) => {
      const msg = await err?.response?.json?.().catch(() => null);
      toast({ title: msg?.error || "Failed to create page", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: EditorForm) => apiRequest("PUT", `/api/admin/cms/pages/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages", id, "revisions"] });
      toast({ title: "Page saved" });
    },
    onError: async (err: any) => {
      const msg = await err?.response?.json?.().catch(() => null);
      toast({ title: msg?.error || "Failed to save page", variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/cms/pages/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages", id] });
      toast({ title: "Page published" });
    },
    onError: () => toast({ title: "Failed to publish page", variant: "destructive" }),
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads/attachment", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      form.setValue("ogImageUrl", data.url);
      toast({ title: "Image uploaded" });
    },
    onError: () => toast({ title: "Image upload failed", variant: "destructive" }),
  });

  const onSubmit = (data: EditorForm) => {
    if (isNew) {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!isNew && pageLoading) {
    return (
      <AdminSidebar>
        <div className="p-6 max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AdminSidebar>
    );
  }

  const ogImageUrl = form.watch("ogImageUrl");

  return (
    <AdminSidebar>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/cms/pages")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-heading font-semibold" data-testid="text-editor-title">
                {isNew ? "Create Page" : "Edit Page"}
              </h1>
              {!isNew && page && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last saved {page.updatedAt ? format(new Date(page.updatedAt), "MMM d, yyyy 'at' h:mm a") : "—"}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && page?.status !== "published" && (
              <Button
                variant="outline"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
                data-testid="button-publish"
              >
                <Eye className="h-4 w-4 mr-2" />
                Publish
              </Button>
            )}
            {!isNew && page?.status === "published" && (
              <Badge className="bg-green-600 text-white" data-testid="badge-published">
                <Globe className="h-3 w-3 mr-1" />
                Published
              </Badge>
            )}
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={isPending}
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-2" />
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Page Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Page title"
                              {...field}
                              data-testid="input-title"
                            />
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
                          <FormLabel>Slug</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="page-slug"
                              {...field}
                              onChange={(e) => {
                                slugManuallyEdited.current = true;
                                field.onChange(e);
                              }}
                              className="font-mono text-sm"
                              data-testid="input-slug"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Lowercase letters, numbers, and hyphens. Used in the URL.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="pageType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Page Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-page-type">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="home">Home</SelectItem>
                                <SelectItem value="about">About</SelectItem>
                                <SelectItem value="contact">Contact</SelectItem>
                                <SelectItem value="landing">Landing</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-status">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      SEO Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="seoTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SEO Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Overrides page title in search results"
                              {...field}
                              data-testid="input-seo-title"
                            />
                          </FormControl>
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
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="seoKeywords"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Keywords</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="comma, separated, keywords"
                              {...field}
                              data-testid="input-seo-keywords"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ogImageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Open Graph Image</FormLabel>
                          <div className="space-y-2">
                            {ogImageUrl && (
                              <img
                                src={ogImageUrl}
                                alt="OG preview"
                                className="h-24 w-full object-cover rounded-md border"
                                data-testid="img-og-preview"
                              />
                            )}
                            <div className="flex gap-2">
                              <FormControl>
                                <Input
                                  placeholder="https://... or upload below"
                                  {...field}
                                  data-testid="input-og-image-url"
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadImageMutation.isPending}
                                data-testid="button-upload-og-image"
                              >
                                <Upload className="h-4 w-4" />
                              </Button>
                            </div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadImageMutation.mutate(file);
                                e.target.value = "";
                              }}
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3 text-muted-foreground">
                      <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Layers className="h-4 w-4 text-violet-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">Visual Page Builder</p>
                        <p className="text-xs mt-1">
                          The drag-and-drop block builder is coming in the next CMS phase. Content blocks, hero sections,
                          image grids, testimonials, and more will be configurable here without code.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </form>
            </Form>
          </div>

          {!isNew && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Revision History
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {revisions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No revisions yet</p>
                  ) : (
                    <div className="space-y-2" data-testid="list-revisions">
                      {revisions.slice(0, 5).map((rev, idx) => (
                        <div key={rev.id} className="text-xs border-b last:border-0 pb-2 last:pb-0" data-testid={`item-revision-${rev.id}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">
                              {idx === 0 ? "Current" : `v${revisions.length - idx}`}
                            </span>
                            <Badge variant="outline" className="text-[10px]">{rev.status}</Badge>
                          </div>
                          <p className="text-muted-foreground mt-0.5">
                            {rev.createdAt ? format(new Date(rev.createdAt), "MMM d 'at' h:mm a") : "—"}
                          </p>
                          {rev.changeNote && (
                            <p className="text-muted-foreground italic">{rev.changeNote}</p>
                          )}
                        </div>
                      ))}
                      {revisions.length > 5 && (
                        <p className="text-xs text-muted-foreground">+{revisions.length - 5} older revisions</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-start gap-1.5">
                      <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <p>Each save creates a revision snapshot for future rollback support.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AdminSidebar>
  );
}

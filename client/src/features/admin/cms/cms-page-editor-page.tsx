import { useEffect, useRef, useState, useCallback } from "react";
import { CmsImageUpload } from "./components/cms-image-upload";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Save,
  Globe,
  Clock,
  Info,
  Eye,
  Layers,
} from "lucide-react";
import type { CmsPage, CmsPageRevision } from "@shared/schema";
import { format } from "date-fns";
import { PageBuilder } from "./builder/page-builder";
import type { BuilderContent } from "./builder/block-registry";

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

const EMPTY_CONTENT: BuilderContent = { blocks: [] };

function parseBuilderContent(raw: unknown): BuilderContent {
  if (!raw || typeof raw !== "object") return EMPTY_CONTENT;
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.blocks)) {
    return { blocks: obj.blocks as BuilderContent["blocks"] };
  }
  return EMPTY_CONTENT;
}

export default function CmsPageEditorPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const isNew = !id || id === "new";
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const titleRef = useRef<string>("");
  const slugManuallyEdited = useRef(false);
  const [builderContent, setBuilderContent] = useState<BuilderContent>(EMPTY_CONTENT);
  const [activeTab, setActiveTab] = useState("builder");

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
      setBuilderContent(parseBuilderContent(page.content));
    }
  }, [page, form]);

  const watchTitle = form.watch("title");
  useEffect(() => {
    if (isNew && !slugManuallyEdited.current && watchTitle !== titleRef.current) {
      titleRef.current = watchTitle;
      form.setValue("slug", slugify(watchTitle), { shouldValidate: false });
    }
  }, [watchTitle, isNew, form]);

  const handleBuilderChange = useCallback((content: BuilderContent) => {
    setBuilderContent(content);
  }, []);

  const createMutation = useMutation({
    mutationFn: (data: EditorForm & { content: BuilderContent }) =>
      apiRequest("POST", "/api/admin/cms/pages", data),
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
    mutationFn: (data: EditorForm & { content: BuilderContent }) =>
      apiRequest("PUT", `/api/admin/cms/pages/${id}`, data),
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

  const onSave = () => {
    form.handleSubmit((formData) => {
      const payload = { ...formData, content: builderContent };
      if (isNew) {
        createMutation.mutate(payload);
      } else {
        updateMutation.mutate(payload);
      }
    })();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!isNew && pageLoading) {
    return (
      <AdminSidebar>
        <div className="p-6 max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminSidebar>
    );
  }


  return (
    <AdminSidebar>
      <div className="p-6 max-w-6xl mx-auto space-y-4">
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
                {isNew ? "Create Page" : (form.watch("title") || "Edit Page")}
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
              onClick={onSave}
              disabled={isPending}
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-2" />
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="builder" data-testid="tab-builder">
              <Layers className="h-4 w-4 mr-1.5" />
              Builder
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              Page Settings
            </TabsTrigger>
            <TabsTrigger value="seo" data-testid="tab-seo">
              <Globe className="h-4 w-4 mr-1.5" />
              SEO
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="mt-0">
            <PageBuilder content={builderContent} onChange={handleBuilderChange} />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Form {...form}>
                  <form className="space-y-6">
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
                                <Input placeholder="Page title" {...field} data-testid="input-title" />
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
                                <span className="font-medium">{idx === 0 ? "Current" : `v${revisions.length - idx}`}</span>
                                <Badge variant="outline" className="text-[10px]">{rev.status}</Badge>
                              </div>
                              <p className="text-muted-foreground mt-0.5">
                                {rev.createdAt ? format(new Date(rev.createdAt), "MMM d 'at' h:mm a") : "—"}
                              </p>
                              {rev.changeNote && <p className="text-muted-foreground italic">{rev.changeNote}</p>}
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
                      <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <p>Each save creates a revision snapshot for future rollback support.</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="seo" className="mt-0">
            <div className="max-w-2xl">
              <Form {...form}>
                <form className="space-y-6">
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
                              <Input placeholder="Overrides page title in search results" {...field} data-testid="input-seo-title" />
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
                              <Input placeholder="comma, separated, keywords" {...field} data-testid="input-seo-keywords" />
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
                            <CmsImageUpload
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              helpText="Recommended: 1200 × 630 px. Shown when the page is shared on social media."
                              data-testid="og-image-upload"
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </form>
              </Form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminSidebar>
  );
}

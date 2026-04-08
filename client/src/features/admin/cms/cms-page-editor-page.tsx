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
import { Switch } from "@/components/ui/switch";
import { SeoPreview } from "@/components/shared/seo-preview";
import { StructuredDataStatus } from "@/components/shared/structured-data-status";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Save,
  Globe,
  Clock,
  CalendarClock,
  Info,
  Eye,
  EyeOff,
  Layers,
  RotateCcw,
  Loader2,
  LayoutTemplate,
  Check,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CmsPage, CmsPageRevision } from "@shared/schema";
import { format } from "date-fns";
import { PageBuilder } from "./builder/page-builder";
import type { BuilderContent } from "./builder/block-registry";
import { TemplatePicker } from "./components/template-picker";
import { LandingPageWizard } from "./components/landing-page-wizard";

const editorSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-/]+$/, "Lowercase letters, numbers, hyphens and slashes only"),
  pageType: z.enum(["home", "about", "contact", "landing", "custom"]),
  status: z.enum(["draft", "published", "scheduled", "archived"]),
  seoTitle: z.string().optional(),
  seoDescription: z.string().max(160, "Max 160 characters").optional(),
  seoKeywords: z.string().optional(),
  ogImageUrl: z.string().optional(),
  canonicalUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  noindex: z.boolean().default(false),
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
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slugManuallyEdited = useRef(false);
  const [builderContent, setBuilderContent] = useState<BuilderContent>(EMPTY_CONTENT);
  const [activeTab, setActiveTab] = useState("builder");
  const [templatePickerOpen, setTemplatePickerOpen] = useState(isNew);
  const [wizardOpen, setWizardOpen] = useState(false);

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
      canonicalUrl: "",
      noindex: false,
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
        canonicalUrl: page.canonicalUrl ?? "",
        noindex: page.noindex ?? false,
      });
      setBuilderContent(parseBuilderContent(page.content));
    }
  }, [page, form]);

  const watchTitle = form.watch("title");
  const watchSlug = form.watch("slug");
  const watchSeoTitle = form.watch("seoTitle");
  const watchSeoDescription = form.watch("seoDescription");
  const watchOgImageUrl = form.watch("ogImageUrl");
  const watchNoindex = form.watch("noindex");
  const watchStatus = form.watch("status");
  const hasFaqBlocks = (builderContent?.blocks ?? []).some((b: any) => b.type === "faq");

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
      setSaveStatus("success");
      navTimerRef.current = setTimeout(() => navigate(`/admin/cms/pages/${created.id}`), 1500);
    },
    onError: async (err: any) => {
      const msg = await err?.response?.json?.().catch(() => null);
      toast({ title: msg?.error || "Failed to create page", variant: "destructive" });
      setSaveStatus("error");
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
      setSaveStatus("success");
    },
    onError: async (err: any) => {
      const msg = await err?.response?.json?.().catch(() => null);
      toast({ title: msg?.error || "Failed to save page", variant: "destructive" });
      setSaveStatus("error");
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

  const unpublishMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/cms/pages/${id}/unpublish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages", id] });
      toast({ title: "Page unpublished — reverted to draft" });
    },
    onError: () => toast({ title: "Failed to unpublish page", variant: "destructive" }),
  });

  const [scheduleDate, setScheduleDate] = useState("");
  const [schedulePopoverOpen, setSchedulePopoverOpen] = useState(false);

  const scheduleMutation = useMutation({
    mutationFn: (scheduledAt: string) =>
      apiRequest("POST", `/api/admin/cms/pages/${id}/schedule`, { scheduledAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages", id] });
      setSchedulePopoverOpen(false);
      setScheduleDate("");
      toast({ title: "Page scheduled for publishing" });
    },
    onError: () => toast({ title: "Failed to schedule page", variant: "destructive" }),
  });

  const [restoringId, setRestoringId] = useState<string | null>(null);
  const restoreMutation = useMutation({
    mutationFn: (revisionId: string) =>
      apiRequest("POST", `/api/admin/cms/pages/${id}/revisions/${revisionId}/restore`),
    onSuccess: async (res) => {
      const restored = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages", id, "revisions"] });
      setBuilderContent(parseBuilderContent(restored?.content));
      form.setValue("title", restored?.title ?? form.getValues("title"));
      setRestoringId(null);
      toast({ title: "Revision restored successfully" });
    },
    onError: () => {
      setRestoringId(null);
      toast({ title: "Failed to restore revision", variant: "destructive" });
    },
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

  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (saveStatus !== "idle") {
      const timer = setTimeout(() => setSaveStatus("idle"), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

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
            {isNew && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTemplatePickerOpen(true)}
                data-testid="button-reopen-templates"
              >
                <LayoutTemplate className="h-4 w-4 mr-1.5" />
                Templates
              </Button>
            )}
            {!isNew && page?.status === "published" && (
              <>
                <Badge className="bg-green-600 text-white" data-testid="badge-published">
                  <Globe className="h-3 w-3 mr-1" />
                  Published
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unpublishMutation.mutate()}
                  disabled={unpublishMutation.isPending}
                  data-testid="button-unpublish"
                >
                  {unpublishMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <EyeOff className="h-4 w-4 mr-1.5" />
                  )}
                  Unpublish
                </Button>
              </>
            )}
            {!isNew && page?.status === "scheduled" && (
              <>
                <Badge className="bg-blue-600 text-white" data-testid="badge-scheduled">
                  <CalendarClock className="h-3 w-3 mr-1" />
                  Scheduled
                  {page.scheduledAt && (
                    <span className="ml-1 font-normal">
                      {format(new Date(page.scheduledAt), "MMM d, h:mm a")}
                    </span>
                  )}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unpublishMutation.mutate()}
                  disabled={unpublishMutation.isPending}
                  data-testid="button-cancel-schedule"
                >
                  {unpublishMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <EyeOff className="h-4 w-4 mr-1.5" />
                  )}
                  Cancel Schedule
                </Button>
              </>
            )}
            {!isNew && page?.status !== "published" && page?.status !== "scheduled" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending}
                  data-testid="button-publish"
                >
                  {publishMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Publish
                </Button>
                <Popover open={schedulePopoverOpen} onOpenChange={setSchedulePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="button-open-schedule">
                      <CalendarClock className="h-4 w-4 mr-1.5" />
                      Schedule
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72" align="end">
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Schedule Publishing</p>
                      <p className="text-xs text-muted-foreground">
                        Choose a future date and time for this page to go live automatically.
                      </p>
                      <input
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        data-testid="input-schedule-date"
                      />
                      <Button
                        className="w-full"
                        size="sm"
                        disabled={!scheduleDate || scheduleMutation.isPending}
                        onClick={() => scheduleMutation.mutate(new Date(scheduleDate).toISOString())}
                        data-testid="button-confirm-schedule"
                      >
                        {scheduleMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <CalendarClock className="h-4 w-4 mr-1.5" />
                        )}
                        Confirm Schedule
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}
            <Button
              onClick={onSave}
              disabled={isPending}
              data-testid="button-save"
              className={
                saveStatus === "success"
                  ? "bg-green-600 hover:bg-green-600 text-white"
                  : saveStatus === "error"
                  ? "bg-red-600 hover:bg-red-600 text-white"
                  : ""
              }
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : saveStatus === "success" ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Saved!
                </>
              ) : saveStatus === "error" ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save failed
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
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
                                    {field.value === "scheduled" && (
                                      <SelectItem value="scheduled" disabled>Scheduled</SelectItem>
                                    )}
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
                          {revisions.slice(0, 8).map((rev, idx) => (
                            <div key={rev.id} className="text-xs border-b last:border-0 pb-2 last:pb-0" data-testid={`item-revision-${rev.id}`}>
                              <div className="flex items-center justify-between gap-1 flex-wrap">
                                <div>
                                  <span className="font-medium">{idx === 0 ? "Current" : `v${revisions.length - idx}`}</span>
                                  <span className="text-muted-foreground ml-1.5">
                                    {rev.createdAt ? format(new Date(rev.createdAt), "MMM d 'at' h:mm a") : "—"}
                                  </span>
                                </div>
                                {idx > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                                    disabled={restoringId === rev.id || restoreMutation.isPending}
                                    onClick={() => {
                                      setRestoringId(rev.id);
                                      restoreMutation.mutate(rev.id);
                                    }}
                                    data-testid={`button-restore-revision-${rev.id}`}
                                  >
                                    {restoringId === rev.id ? (
                                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                    ) : (
                                      <RotateCcw className="h-2.5 w-2.5" />
                                    )}
                                    <span className="ml-1">Restore</span>
                                  </Button>
                                )}
                              </div>
                              {rev.changeNote && (
                                <p className="text-muted-foreground italic mt-0.5">{rev.changeNote}</p>
                              )}
                            </div>
                          ))}
                          {revisions.length > 8 && (
                            <p className="text-xs text-muted-foreground">+{revisions.length - 8} older revisions</p>
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
            <div className="max-w-2xl space-y-5">
              <Form {...form}>
                <form className="space-y-5">
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
                              <Input placeholder="Overrides page title in search results" {...field} data-testid="input-seo-title" />
                            </FormControl>
                            <FormDescription className="text-xs">If blank, the page title is used. Aim for 30–60 characters.</FormDescription>
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="seoKeywords"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Keywords <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
                            <FormControl>
                              <Input placeholder="comma, separated, keywords" {...field} data-testid="input-seo-keywords" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="canonicalUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Canonical URL <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
                            <FormControl>
                              <Input placeholder="https://tckwellness.com/about" {...field} data-testid="input-canonical-url" />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Override the canonical link tag. Leave blank to auto-generate from the page slug.
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
                                  Sets noindex,nofollow. Use for private or staging pages.
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
                            <FormLabel>Open Graph Image <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
                            <CmsImageUpload
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              helpText="Recommended: 1200 × 630 px. Shown when the page is shared on social media. Falls back to global default OG image."
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

              <SeoPreview
                title={watchSeoTitle || watchTitle || ""}
                description={watchSeoDescription || ""}
                url={`${typeof window !== "undefined" ? window.location.origin : ""}/${watchSlug || ""}`}
                ogImage={watchOgImageUrl || ""}
                source="page"
                data-testid="seo-preview-panel"
              />

              <StructuredDataStatus
                contentType="page"
                fields={{
                  hasTitle: !!(watchSeoTitle || watchTitle),
                  hasDescription: !!watchSeoDescription,
                  hasImage: !!watchOgImageUrl,
                  noindex: !!watchNoindex,
                  isPublished: watchStatus === "published",
                  hasFaqBlocks,
                }}
                data-testid="structured-data-status"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {isNew && (
        <>
          <TemplatePicker
            open={templatePickerOpen}
            onClose={() => setTemplatePickerOpen(false)}
            onSelect={(content, templateName) => {
              setBuilderContent(content);
              setTemplatePickerOpen(false);
              if (templateName !== "Blank Page") {
                toast({ title: `Template "${templateName}" applied` });
              }
            }}
            onOpenWizard={() => setWizardOpen(true)}
          />
          <LandingPageWizard
            open={wizardOpen}
            onClose={() => setWizardOpen(false)}
            onCreate={(content, title) => {
              setBuilderContent(content);
              form.setValue("title", title);
              form.setValue("pageType", "landing");
              if (!slugManuallyEdited.current) {
                form.setValue("slug", slugify(title));
              }
              setWizardOpen(false);
              toast({ title: "Landing page generated — customize it below" });
            }}
          />
        </>
      )}
    </AdminSidebar>
  );
}

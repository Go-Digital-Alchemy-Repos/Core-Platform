import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, FolderKanban, Plus, Save, Trash2 } from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";
import { CmsRichTextEditor } from "@/features/admin/cms/builder/cms-rich-text-editor";
import { CmsImageUpload } from "@/features/admin/cms/components/cms-image-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  PORTFOLIO_INDUSTRY_LABELS,
  PORTFOLIO_STATUS_LABELS,
  PORTFOLIO_STATUSES,
  PORTFOLIO_VISIBILITY_LABELS,
  type PortfolioGalleryItem,
  type PortfolioMetric,
  type PortfolioProject,
  type PortfolioSection,
  type PortfolioVideo,
} from "@shared/schema";

type PortfolioForm = Omit<PortfolioProject, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "startedAt" | "completedAt" | "publishedAt"> & {
  startedAt: string;
  completedAt: string;
  publishedAt: string;
};

const emptyForm: PortfolioForm = {
  title: "",
  slug: "",
  subtitle: "",
  location: "",
  industry: "generic",
  projectType: "",
  clientName: "",
  services: [],
  technologies: [],
  categories: [],
  tags: [],
  status: "draft",
  visibility: "public",
  featured: false,
  sortOrder: 0,
  startedAt: "",
  completedAt: "",
  publishedAt: "",
  summary: "",
  description: "",
  challenge: "",
  solution: "",
  results: "",
  testimonial: "",
  testimonialAuthor: "",
  heroImageUrl: "",
  heroImageAlt: "",
  gallery: [],
  videos: [],
  sections: [],
  metrics: [],
  ctaLabel: "",
  ctaUrl: "",
  metaTitle: "",
  metaDescription: "",
  noindex: false,
};

function toLocalDate(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toForm(project?: PortfolioProject | null): PortfolioForm {
  if (!project) return emptyForm;
  return {
    title: project.title,
    slug: project.slug,
    subtitle: project.subtitle ?? "",
    location: project.location ?? "",
    industry: project.industry,
    projectType: project.projectType ?? "",
    clientName: project.clientName ?? "",
    services: project.services ?? [],
    technologies: project.technologies ?? [],
    categories: project.categories ?? [],
    tags: project.tags ?? [],
    status: project.status,
    visibility: project.visibility,
    featured: project.featured,
    sortOrder: project.sortOrder,
    startedAt: toLocalDate(project.startedAt),
    completedAt: toLocalDate(project.completedAt),
    publishedAt: toLocalDate(project.publishedAt),
    summary: project.summary ?? "",
    description: project.description ?? "",
    challenge: project.challenge ?? "",
    solution: project.solution ?? "",
    results: project.results ?? "",
    testimonial: project.testimonial ?? "",
    testimonialAuthor: project.testimonialAuthor ?? "",
    heroImageUrl: project.heroImageUrl ?? "",
    heroImageAlt: project.heroImageAlt ?? "",
    gallery: project.gallery ?? [],
    videos: project.videos ?? [],
    sections: project.sections ?? [],
    metrics: project.metrics ?? [],
    ctaLabel: project.ctaLabel ?? "",
    ctaUrl: project.ctaUrl ?? "",
    metaTitle: project.metaTitle ?? "",
    metaDescription: project.metaDescription ?? "",
    noindex: project.noindex,
  };
}

function parseList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function serializeList(value?: string[] | null) {
  return (value ?? []).join(", ");
}

function toPayload(form: PortfolioForm) {
  return {
    ...form,
    startedAt: form.startedAt || null,
    completedAt: form.completedAt || null,
    publishedAt: form.publishedAt || null,
    subtitle: form.subtitle || null,
    location: form.location || null,
    projectType: form.projectType || null,
    clientName: form.clientName || null,
    summary: form.summary || null,
    description: form.description || null,
    challenge: form.challenge || null,
    solution: form.solution || null,
    results: form.results || null,
    testimonial: form.testimonial || null,
    testimonialAuthor: form.testimonialAuthor || null,
    heroImageUrl: form.heroImageUrl || null,
    heroImageAlt: form.heroImageAlt || null,
    ctaLabel: form.ctaLabel || null,
    ctaUrl: form.ctaUrl || null,
    metaTitle: form.metaTitle || null,
    metaDescription: form.metaDescription || null,
  };
}

export default function AdminPortfolioEditorPage() {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isNew = !params.id || params.id === "new";
  const { data: project } = useQuery<PortfolioProject>({
    queryKey: [`/api/admin/portfolio/projects/${params.id}`],
    enabled: !isNew,
  });
  const [form, setForm] = useState<PortfolioForm>(emptyForm);

  useEffect(() => {
    setForm(toForm(project));
  }, [project?.id]);

  const set = <K extends keyof PortfolioForm>(key: K, value: PortfolioForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(isNew ? "POST" : "PUT", isNew ? "/api/admin/portfolio/projects" : `/api/admin/portfolio/projects/${params.id}`, toPayload(form));
      return response.json() as Promise<PortfolioProject>;
    },
    onSuccess: async (saved) => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) => String(query.queryKey[0] ?? "").startsWith("/api/admin/portfolio/projects"),
        }),
        queryClient.invalidateQueries({
          predicate: (query) => String(query.queryKey[0] ?? "").startsWith("/api/portfolio/projects"),
        }),
      ]);
      toast({ title: isNew ? "Portfolio project created" : "Portfolio project saved" });
      if (isNew) navigate(`/admin/portfolio/${saved.id}`);
    },
    onError: (error: Error) => toast({ title: "Could not save project", description: error.message, variant: "destructive" }),
  });

  const updateGallery = (index: number, patch: Partial<PortfolioGalleryItem>) =>
    set("gallery", form.gallery.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const updateVideo = (index: number, patch: Partial<PortfolioVideo>) =>
    set("videos", form.videos.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const updateSection = (index: number, patch: Partial<PortfolioSection>) =>
    set("sections", form.sections.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const updateMetric = (index: number, patch: Partial<PortfolioMetric>) =>
    set("metrics", form.metrics.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <AdminSidebar>
      <main className="flex-1 space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" asChild><Link href="/admin/portfolio"><ArrowLeft className="mr-2 h-4 w-4" />Back to Portfolio</Link></Button>
            <h1 className="flex items-center gap-2 text-2xl font-heading font-semibold">
              <FolderKanban className="h-6 w-6 text-indigo-600" />
              {isNew ? "Add Portfolio Project" : `Edit ${form.title || "Portfolio Project"}`}
            </h1>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title.trim()}>
            <Save className="mr-2 h-4 w-4" />{saveMutation.isPending ? "Saving..." : "Save Project"}
          </Button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Essentials</CardTitle><CardDescription>Core portfolio information used on archive cards and case-study headers.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(event) => set("title", event.target.value)} required /></div>
                  <div className="space-y-1.5"><Label>Slug</Label><Input value={form.slug} onChange={(event) => set("slug", event.target.value)} placeholder="auto-generated" /></div>
                  <div className="space-y-1.5"><Label>Subtitle</Label><Input value={form.subtitle ?? ""} onChange={(event) => set("subtitle", event.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Location</Label><Input value={form.location ?? ""} onChange={(event) => set("location", event.target.value)} /></div>
                  <div className="space-y-1.5">
                    <Label>Industry</Label>
                    <Select value={form.industry} onValueChange={(value) => set("industry", value as PortfolioForm["industry"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(PORTFOLIO_INDUSTRY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label>Project type</Label><Input value={form.projectType ?? ""} onChange={(event) => set("projectType", event.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Client / collection</Label><Input value={form.clientName ?? ""} onChange={(event) => set("clientName", event.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Sort order</Label><Input type="number" value={form.sortOrder} onChange={(event) => set("sortOrder", Number(event.target.value) || 0)} /></div>
                </div>
                <div className="space-y-1.5"><Label>Summary</Label><Textarea value={form.summary ?? ""} onChange={(event) => set("summary", event.target.value)} rows={3} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Media</CardTitle><CardDescription>Use the CMS media library for hero and gallery images.</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                  <CmsImageUpload value={form.heroImageUrl ?? ""} onChange={(url) => set("heroImageUrl", url)} label="Hero image" />
                  <div className="space-y-1.5"><Label>Hero image alt text</Label><Textarea value={form.heroImageAlt ?? ""} onChange={(event) => set("heroImageAlt", event.target.value)} rows={5} /></div>
                </div>
                <ArrayHeader title="Gallery" onAdd={() => set("gallery", [...form.gallery, { url: "", alt: "", caption: "" }])} />
                <div className="space-y-4">
                  {form.gallery.map((item, index) => (
                    <Card key={index}>
                      <CardContent className="grid gap-4 p-4 md:grid-cols-[280px_1fr_auto]">
                        <CmsImageUpload value={item.url} onChange={(url) => updateGallery(index, { url })} />
                        <div className="space-y-3">
                          <Input value={item.alt ?? ""} onChange={(event) => updateGallery(index, { alt: event.target.value })} placeholder="Alt text" />
                          <Input value={item.caption ?? ""} onChange={(event) => updateGallery(index, { caption: event.target.value })} placeholder="Caption" />
                        </div>
                        <DeleteButton onClick={() => set("gallery", form.gallery.filter((_, i) => i !== index))} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <ArrayHeader title="Videos" onAdd={() => set("videos", [...form.videos, { title: "", url: "", posterUrl: "", caption: "" }])} />
                <div className="space-y-4">
                  {form.videos.map((item, index) => (
                    <Card key={index}>
                      <CardContent className="grid gap-4 p-4 md:grid-cols-[220px_1fr_auto]">
                        <CmsImageUpload value={item.posterUrl ?? ""} onChange={(url) => updateVideo(index, { posterUrl: url })} label="Poster" />
                        <div className="space-y-3">
                          <Input value={item.title ?? ""} onChange={(event) => updateVideo(index, { title: event.target.value })} placeholder="Video title" />
                          <Input value={item.url} onChange={(event) => updateVideo(index, { url: event.target.value })} placeholder="YouTube, Vimeo, or direct video URL" />
                          <Input value={item.caption ?? ""} onChange={(event) => updateVideo(index, { caption: event.target.value })} placeholder="Caption" />
                        </div>
                        <DeleteButton onClick={() => set("videos", form.videos.filter((_, i) => i !== index))} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Case Study</CardTitle><CardDescription>Format case-study content with links, media, alignment, and rich text controls.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {(["description", "challenge", "solution", "results"] as const).map((key) => (
                  <div key={key} className="space-y-1.5">
                    <Label>{key[0].toUpperCase() + key.slice(1)}</Label>
                    <CmsRichTextEditor
                      value={form[key] ?? ""}
                      onChange={(value) => set(key, value)}
                      placeholder={`Write the project ${key}...`}
                      data-testid={`input-portfolio-${key}`}
                    />
                  </div>
                ))}
                <ArrayHeader title="Flexible sections" onAdd={() => set("sections", [...form.sections, { title: "New Section", body: "" }])} />
                {form.sections.map((section, index) => (
                  <Card key={index}>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex gap-3">
                        <Input value={section.title} onChange={(event) => updateSection(index, { title: event.target.value })} placeholder="Section title" />
                        <DeleteButton onClick={() => set("sections", form.sections.filter((_, i) => i !== index))} />
                      </div>
                      <CmsRichTextEditor
                        value={section.body ?? ""}
                        onChange={(value) => updateSection(index, { body: value })}
                        placeholder="Write and format this section..."
                        data-testid={`input-portfolio-section-body-${index}`}
                      />
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Publishing</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5"><Label>Status</Label><Select value={form.status} onValueChange={(value) => set("status", value as PortfolioForm["status"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PORTFOLIO_STATUSES.map((value) => <SelectItem key={value} value={value}>{PORTFOLIO_STATUS_LABELS[value]}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label>Visibility</Label><Select value={form.visibility} onValueChange={(value) => set("visibility", value as PortfolioForm["visibility"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PORTFOLIO_VISIBILITY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.featured} onCheckedChange={(value) => set("featured", value === true)} />Feature this project</label>
                <div className="grid gap-3">
                  <div className="space-y-1.5"><Label>Started</Label><Input type="date" value={form.startedAt} onChange={(event) => set("startedAt", event.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Completed</Label><Input type="date" value={form.completedAt} onChange={(event) => set("completedAt", event.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Published</Label><Input type="date" value={form.publishedAt} onChange={(event) => set("publishedAt", event.target.value)} /></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Taxonomy</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <CommaField label="Services" value={form.services} onChange={(value) => set("services", value)} />
                <CommaField label="Technologies / materials" value={form.technologies} onChange={(value) => set("technologies", value)} />
                <CommaField label="Categories" value={form.categories} onChange={(value) => set("categories", value)} />
                <CommaField label="Tags" value={form.tags} onChange={(value) => set("tags", value)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Metrics</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <ArrayHeader title="Outcome metrics" onAdd={() => set("metrics", [...form.metrics, { label: "", value: "", description: "" }])} />
                {form.metrics.map((metric, index) => (
                  <Card key={index}>
                    <CardContent className="space-y-3 p-3">
                      <div className="flex gap-2"><Input value={metric.value} onChange={(event) => updateMetric(index, { value: event.target.value })} placeholder="Value" /><DeleteButton onClick={() => set("metrics", form.metrics.filter((_, i) => i !== index))} /></div>
                      <Input value={metric.label} onChange={(event) => updateMetric(index, { label: event.target.value })} placeholder="Label" />
                      <Input value={metric.description ?? ""} onChange={(event) => updateMetric(index, { description: event.target.value })} placeholder="Description" />
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>CTA And SEO</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5"><Label>CTA label</Label><Input value={form.ctaLabel ?? ""} onChange={(event) => set("ctaLabel", event.target.value)} /></div>
                <div className="space-y-1.5"><Label>CTA URL</Label><Input value={form.ctaUrl ?? ""} onChange={(event) => set("ctaUrl", event.target.value)} /></div>
                <div className="space-y-1.5"><Label>SEO title</Label><Input value={form.metaTitle ?? ""} onChange={(event) => set("metaTitle", event.target.value)} /></div>
                <div className="space-y-1.5"><Label>SEO description</Label><Textarea value={form.metaDescription ?? ""} onChange={(event) => set("metaDescription", event.target.value)} rows={3} /></div>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.noindex} onCheckedChange={(value) => set("noindex", value === true)} />Hide from search engines</label>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </AdminSidebar>
  );
}

function ArrayHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-medium">{title}</h3>
      <Button type="button" size="sm" variant="outline" onClick={onAdd}><Plus className="mr-2 h-4 w-4" />Add</Button>
    </div>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return <Button type="button" size="icon" variant="ghost" onClick={onClick}><Trash2 className="h-4 w-4 text-destructive" /></Button>;
}

function CommaField({ label, value, onChange }: { label: string; value?: string[] | null; onChange: (value: string[]) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={serializeList(value)} onChange={(event) => onChange(parseList(event.target.value))} placeholder="Comma-separated" />
    </div>
  );
}

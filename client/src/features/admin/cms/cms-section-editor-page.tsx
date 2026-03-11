import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Layers } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import type { CmsSection } from "@shared/schema";
import { PageBuilder } from "./builder/page-builder";
import type { BuilderContent } from "./builder/block-registry";

const EMPTY_CONTENT: BuilderContent = { blocks: [] };

const sectionFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().default("general"),
});

type SectionForm = z.infer<typeof sectionFormSchema>;

const CATEGORIES = ["general", "hero", "cta", "testimonials", "faq", "features", "content", "team"];

export default function CmsSectionEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = !id || id === "new";

  const [builderContent, setBuilderContent] = useState<BuilderContent>(EMPTY_CONTENT);
  const [initialized, setInitialized] = useState(false);

  const { data: section, isLoading: sectionLoading } = useQuery<CmsSection>({
    queryKey: ["/api/admin/cms/sections", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/cms/sections/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Section not found");
      return res.json();
    },
    enabled: !isNew,
  });

  const form = useForm<SectionForm>({
    resolver: zodResolver(sectionFormSchema),
    defaultValues: { name: "", description: "", category: "general" },
  });

  useEffect(() => {
    if (section && !initialized) {
      form.reset({
        name: section.name,
        description: section.description ?? "",
        category: section.category ?? "general",
      });
      const blocks = Array.isArray(section.blocks) ? section.blocks : [];
      setBuilderContent({ blocks: blocks as any });
      setInitialized(true);
    }
  }, [section, initialized, form]);

  const createMutation = useMutation({
    mutationFn: async (data: SectionForm) => {
      return apiRequest("POST", "/api/admin/cms/sections", {
        ...data,
        blocks: builderContent.blocks,
      });
    },
    onSuccess: async (res) => {
      const created: CmsSection = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/sections"] });
      toast({ title: "Section created" });
      navigate(`/admin/cms/sections/${created.id}`);
    },
    onError: () => toast({ title: "Failed to create section", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SectionForm) => {
      return apiRequest("PUT", `/api/admin/cms/sections/${id}`, {
        ...data,
        blocks: builderContent.blocks,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/sections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/sections", id] });
      toast({ title: "Section saved" });
    },
    onError: () => toast({ title: "Failed to save section", variant: "destructive" }),
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

  if (!isNew && sectionLoading) {
    return (
      <AdminSidebar>
        <div className="p-6 max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminSidebar>
    );
  }

  return (
    <AdminSidebar>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link href="/admin/cms/sections">
                <ArrowLeft className="h-4 w-4" />
                Sections
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-violet-500" />
              <h1 className="text-xl font-heading font-semibold" data-testid="text-section-editor-title">
                {isNew ? "New Section" : (form.watch("name") || "Edit Section")}
              </h1>
            </div>
          </div>
          <Button
            onClick={onSave}
            disabled={isSaving}
            data-testid="button-save-section"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving…" : "Save Section"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Section Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Homepage Hero"
                            {...field}
                            data-testid="input-section-name"
                          />
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
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-section-category">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c} className="capitalize">
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description of when to use this section…"
                          rows={2}
                          {...field}
                          data-testid="input-section-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Blocks</h2>
          <Card>
            <CardContent className="pt-4">
              <PageBuilder
                content={builderContent}
                onChange={setBuilderContent}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={onSave}
            disabled={isSaving}
            data-testid="button-save-section-bottom"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving…" : "Save Section"}
          </Button>
        </div>
      </div>
    </AdminSidebar>
  );
}

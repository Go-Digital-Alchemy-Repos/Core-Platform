import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { BlogTaxonomy } from "@shared/schema";
import { BookOpen, FolderTree, Pencil, Plus, Tag, Trash2, Settings } from "lucide-react";

type TaxonomyDraft = {
  id?: string;
  name: string;
  parentId: string;
};

function buildCategoryPath(taxonomy: BlogTaxonomy, all: BlogTaxonomy[]): string {
  const labels = [taxonomy.name];
  let parentId = taxonomy.parentId;

  while (parentId) {
    const parent = all.find((item) => item.id === parentId);
    if (!parent) break;
    labels.unshift(parent.name);
    parentId = parent.parentId;
  }

  return labels.join(" / ");
}

function TaxonomyManager({
  type,
  taxonomies,
}: {
  type: "category" | "tag";
  taxonomies: BlogTaxonomy[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<TaxonomyDraft>({ name: "", parentId: "" });

  const categories = useMemo(
    () => taxonomies.filter((item) => item.type === "category"),
    [taxonomies]
  );
  const items = useMemo(
    () => taxonomies.filter((item) => item.type === type),
    [taxonomies, type]
  );

  const saveMutation = useMutation({
    mutationFn: async (payload: TaxonomyDraft) => {
      if (payload.id) {
        const response = await apiRequest("PUT", `/api/admin/blog/settings/taxonomies/${payload.id}`, {
          name: payload.name,
          parentId: type === "category" ? payload.parentId || null : null,
        });
        return response.json();
      }

      const response = await apiRequest("POST", "/api/admin/blog/settings/taxonomies", {
        name: payload.name,
        type,
        parentId: type === "category" ? payload.parentId || null : null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/settings/taxonomies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      toast({ title: `${type === "category" ? "Category" : "Tag"} saved` });
      setDraft({ name: "", parentId: "" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to save term", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/blog/settings/taxonomies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/settings/taxonomies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      toast({ title: `${type === "category" ? "Category" : "Tag"} deleted` });
      setDraft({ name: "", parentId: "" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to delete term", variant: "destructive" });
    },
  });

  const isEditing = Boolean(draft.id);
  const heading = type === "category" ? "Categories" : "Tags";
  const icon = type === "category" ? FolderTree : Tag;
  const Icon = icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-violet-500" />
          {heading}
        </CardTitle>
        <CardDescription>
          {type === "category"
            ? "Create top-level categories and subcategories for your blog posts."
            : "Manage reusable tags that editors can assign across multiple posts."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border p-4 bg-muted/10 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{type === "category" ? "Category Name" : "Tag Name"}</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))}
                placeholder={type === "category" ? "e.g. TCK Research" : "e.g. belonging"}
                data-testid={`input-blog-${type}-name`}
              />
            </div>
            {type === "category" && (
              <div className="space-y-1.5">
                <Label>Parent Category</Label>
                <Select
                  value={draft.parentId || "__none__"}
                  onValueChange={(value) => setDraft((current) => ({ ...current, parentId: value === "__none__" ? "" : value }))}
                >
                  <SelectTrigger data-testid="select-blog-category-parent">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {categories
                      .filter((item) => item.id !== draft.id)
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {buildCategoryPath(item, categories)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              onClick={() => saveMutation.mutate(draft)}
              disabled={!draft.name.trim() || saveMutation.isPending}
              data-testid={`button-save-blog-${type}`}
            >
              {isEditing ? "Update" : "Add"} {type === "category" ? "Category" : "Tag"}
            </Button>
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setDraft({ name: "", parentId: "" })}
                data-testid={`button-cancel-blog-${type}`}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No {heading.toLowerCase()} yet.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border p-3"
                data-testid={`row-blog-taxonomy-${item.id}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">
                      {type === "category" ? buildCategoryPath(item, categories) : item.name}
                    </p>
                    {item.parentId && <Badge variant="outline">Subcategory</Badge>}
                    <Badge variant="secondary" className="capitalize">{item.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">/{item.slug}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDraft({ id: item.id, name: item.name, parentId: item.parentId ?? "" })}
                    data-testid={`button-edit-blog-taxonomy-${item.id}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(item.id)}
                    data-testid={`button-delete-blog-taxonomy-${item.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CmsBlogSettingsPage() {
  const { data: taxonomies = [], isLoading } = useQuery<BlogTaxonomy[]>({
    queryKey: ["/api/admin/blog/settings/taxonomies"],
  });

  return (
    <AdminSidebar>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-semibold" data-testid="text-blog-settings-title">
              Blog Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure reusable blog taxonomy controls and future publishing settings.
            </p>
          </div>
        </div>

        <Tabs defaultValue="taxonomy" className="space-y-4">
          <TabsList>
            <TabsTrigger value="taxonomy" data-testid="tab-blog-taxonomy">
              <BookOpen className="h-3.5 w-3.5 mr-1.5" />
              Categories & Tags
            </TabsTrigger>
          </TabsList>

          <TabsContent value="taxonomy" className="mt-0 space-y-4">
            {isLoading ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-80 w-full" />
                <Skeleton className="h-80 w-full" />
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <TaxonomyManager type="category" taxonomies={taxonomies} />
                <TaxonomyManager type="tag" taxonomies={taxonomies} />
              </div>
            )}

            <Card className="border-dashed">
              <CardContent className="pt-6 text-sm text-muted-foreground flex items-center gap-2">
                <Plus className="h-4 w-4 text-violet-500" />
                Additional blog settings tabs can plug into this screen without moving the main blog workflow around again.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminSidebar>
  );
}

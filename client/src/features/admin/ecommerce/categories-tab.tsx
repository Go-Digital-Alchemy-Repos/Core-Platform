import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FolderTree, Pencil, Plus, Save, Search, Tag, Trash2 } from "lucide-react";

import { CmsImageUpload } from "@/features/admin/cms/components/cms-image-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

import type { Category } from "./ecommerce-page.types";
import { slugify } from "./ecommerce-page.utils";

export function CategoriesTab() {
  const { toast } = useToast();
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/admin/ecommerce/categories"] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryStatusFilter, setCategoryStatusFilter] = useState("all");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    parentId: "",
    image: "",
    sortOrder: "0",
    active: true,
  });

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const childrenByParent = categories.reduce<Map<string, Category[]>>((map, category) => {
    const key = category.parentId || "root";
    const siblings = map.get(key) ?? [];
    siblings.push(category);
    map.set(key, siblings);
    return map;
  }, new Map());

  const sortCategories = (items: Category[]) =>
    [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const collectDescendantIds = (categoryId: string): Set<string> => {
    const descendants = new Set<string>();
    const visit = (parentId: string) => {
      for (const child of childrenByParent.get(parentId) ?? []) {
        descendants.add(child.id);
        visit(child.id);
      }
    };
    visit(categoryId);
    return descendants;
  };

  const flattenedCategories = (() => {
    const rows: Array<Category & { depth: number }> = [];
    const visited = new Set<string>();
    const visit = (items: Category[], depth: number) => {
      for (const category of sortCategories(items)) {
        if (visited.has(category.id)) continue;
        visited.add(category.id);
        rows.push({ ...category, depth });
        visit(childrenByParent.get(category.id) ?? [], depth + 1);
      }
    };
    visit(childrenByParent.get("root") ?? [], 0);
    const orphaned = categories.filter((category) => category.parentId && !categoryMap.has(category.parentId));
    visit(orphaned, 0);
    return rows;
  })();

  const blockedParentIds = editingId ? collectDescendantIds(editingId) : new Set<string>();
  if (editingId) blockedParentIds.add(editingId);

  const categorySearchTerm = categorySearch.trim().toLowerCase();
  const visibleCategories = flattenedCategories.filter((category) => {
    const parentName = category.parentId ? categoryMap.get(category.parentId)?.name ?? "" : "";
    const matchesSearch = !categorySearchTerm || [
      category.name,
      category.slug,
      category.description ?? "",
      parentName,
    ].some((value) => value.toLowerCase().includes(categorySearchTerm));
    const matchesStatus =
      categoryStatusFilter === "all" ||
      (categoryStatusFilter === "active" && category.active) ||
      (categoryStatusFilter === "inactive" && !category.active);
    return matchesSearch && matchesStatus;
  });
  const activeCategoryCount = categories.filter((category) => category.active).length;
  const rootCategoryCount = categories.filter((category) => !category.parentId).length;
  const subcategoryCount = categories.length - rootCategoryCount;

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      slug: "",
      description: "",
      parentId: "",
      image: "",
      sortOrder: "0",
      active: true,
    });
  };

  const openEdit = (category: Category) => {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      parentId: category.parentId ?? "",
      image: category.image ?? "",
      sortOrder: String(category.sortOrder ?? 0),
      active: category.active,
    });
  };

  const startSubcategory = (parentId: string) => {
    resetForm();
    setForm((current) => ({ ...current, parentId }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        slug: slugify(form.slug || form.name),
        description: form.description.trim() || null,
        parentId: form.parentId || null,
        image: form.image.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
        active: form.active,
      };
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/admin/ecommerce/categories/${editingId}` : "/api/admin/ecommerce/categories";
      return apiRequest(method, url, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/categories"] });
      toast({ title: editingId ? "Category updated" : "Category created" });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Category could not be saved",
        description: error instanceof Error ? error.message : "Please review the category details.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => apiRequest("DELETE", `/api/admin/ecommerce/categories/${categoryId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/categories"] });
      toast({ title: "Category deactivated" });
      resetForm();
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            {editingId ? "Edit category" : "Category editor"}
          </CardTitle>
          <CardDescription>Create parent categories and sub-categories for product browsing.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Guides & Workbooks"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                placeholder={slugify(form.name) || "guides-workbooks"}
              />
            </div>
            <div className="space-y-2">
              <Label>Parent category</Label>
              <Select
                value={form.parentId || "__root"}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, parentId: value === "__root" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root">No parent category</SelectItem>
                  {flattenedCategories
                    .filter((category) => !blockedParentIds.has(category.id))
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {"-- ".repeat(category.depth)}
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
              />
            </div>
            <CmsImageUpload
              label="Category image"
              value={form.image}
              onChange={(image) => setForm((current) => ({ ...current, image }))}
              helpText="Upload, drop, or choose a category image from the CMS media library."
              data-testid="ecommerce-category-image"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
                />
              </div>
              <div className="flex items-center gap-3 pt-7">
                <Switch
                  checked={form.active}
                  onCheckedChange={(active) => setForm((current) => ({ ...current, active }))}
                />
                <Label>Active</Label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saveMutation.isPending || !form.name.trim()}>
                <Save className="mr-2 h-4 w-4" />
                {editingId ? "Update category" : "Create category"}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Categories
          </CardTitle>
          <CardDescription>Edit existing categories or add child categories under any parent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-semibold">{categories.length}</p>
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-lg font-semibold">{activeCategoryCount}</p>
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <p className="text-xs text-muted-foreground">Subcategories</p>
              <p className="text-lg font-semibold">{subcategoryCount}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                placeholder="Search categories, slugs, descriptions, or parents"
              />
            </div>
            <Select value={categoryStatusFilter} onValueChange={setCategoryStatusFilter}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="inactive">Inactive only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No categories match the current filters.
                  </TableCell>
                </TableRow>
              ) : visibleCategories.map((category) => (
                <TableRow
                  key={category.id}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => openEdit(category)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openEdit(category);
                    }
                  }}
                >
                  <TableCell className="font-medium">
                    <span style={{ paddingLeft: `${category.depth * 1.25}rem` }}>{category.name}</span>
                  </TableCell>
                  <TableCell>{category.slug}</TableCell>
                  <TableCell>{category.parentId ? categoryMap.get(category.parentId)?.name ?? "Missing parent" : "-"}</TableCell>
                  <TableCell>
                    <Badge variant={category.active ? "default" : "secondary"}>
                      {category.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); startSubcategory(category.id); }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Sub
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); openEdit(category); }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteMutation.mutate(category.id);
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Deactivate
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


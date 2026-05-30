import { type ElementType, FormEvent, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ClipboardList,
  Copy,
  FolderTree,
  Eye,
  Package,
  Pencil,
  Plug,
  Plus,
  Save,
  Search,
  Settings,
  ShoppingBag,
  Tag,
  TicketPercent,
  Trash2,
  Truck,
  Undo2,
} from "lucide-react";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/features/ecommerce/cart-store";
import { cn } from "@/lib/utils";
import {
  ECOMMERCE_INTEGRATION_CATEGORIES,
  INTEGRATION_GROUPS,
  INTEGRATIONS,
  IntegrationCard,
  type SettingsData,
} from "@/features/admin/settings-page";

type View =
  | "products"
  | "categories"
  | "coupons"
  | "orders"
  | "shipping"
  | "refunds"
  | "integrations"
  | "settings";

interface Product {
  id: string;
  name: string;
  price: number;
  salePrice?: number | null;
  status: string;
  active: boolean;
  sku?: string | null;
  urlSlug: string;
  tags: string[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  image?: string | null;
  sortOrder: number;
  active: boolean;
}

interface Coupon {
  id: string;
  code: string;
  name?: string | null;
  description?: string | null;
  notes?: string | null;
  type: string;
  value: number;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  maxRedemptions?: number | null;
  perCustomerLimit?: number | null;
  active: boolean;
  timesUsed: number;
  startDate?: string | null;
  endDate?: string | null;
  customerEligibility: string;
  eligibleCustomerEmails: string[];
  eligibleProductIds: string[];
  eligibleCategoryIds: string[];
  excludedProductIds: string[];
  excludedCategoryIds: string[];
  allowStacking: boolean;
  appliesTo: string;
  applyBeforeTax: boolean;
  archivedAt?: string | null;
  createdAt: string;
}

interface CouponReport {
  totalUses: number;
  totalDiscountGiven: number;
  totalRevenue: number;
  remainingUses: number | null;
  recentOrders: Array<{
    orderId: string;
    customerEmail: string | null;
    totalAmount: number;
    discountAmount: number;
    redeemedAt: string;
  }>;
}

interface Order {
  id: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  customer?: { name: string; email: string } | null;
  items: Array<{ id: string; productName: string; quantity: number; lineTotal: number }>;
}

interface StripeSettingsStatus {
  activeMode: "test" | "live";
  testPublishableKey: string;
  livePublishableKey: string;
  hasTestSecretKey: boolean;
  hasLiveSecretKey: boolean;
  hasTestWebhookSecret: boolean;
  hasLiveWebhookSecret: boolean;
}

const nav: Array<{ view: View; label: string; icon: ElementType; iconColor: string }> = [
  { view: "products", label: "Products", icon: Package, iconColor: "text-emerald-600" },
  { view: "categories", label: "Categories", icon: Tag, iconColor: "text-emerald-500" },
  { view: "coupons", label: "Coupons", icon: TicketPercent, iconColor: "text-amber-600" },
  { view: "orders", label: "Orders", icon: ClipboardList, iconColor: "text-blue-600" },
  { view: "shipping", label: "Shipping", icon: CalendarDays, iconColor: "text-sky-600" },
  { view: "refunds", label: "Refunds", icon: Undo2, iconColor: "text-rose-600" },
  { view: "integrations", label: "Integrations", icon: Plug, iconColor: "text-blue-600" },
  { view: "settings", label: "Settings", icon: Settings, iconColor: "text-slate-500" },
];

function cents(value: string): number {
  return Math.round((Number(value) || 0) * 100);
}

function csv(value: string): string[] {
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function moneyInput(value?: number | null): string {
  return value == null ? "" : (value / 100).toFixed(2);
}

function dateTimeInput(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function nullableCents(value: string): number | null {
  return value.trim() ? cents(value) : null;
}

function nullableInt(value: string): number | null {
  return value.trim() ? Number(value) || 0 : null;
}

function couponStatus(coupon: Coupon): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  const now = Date.now();
  if (coupon.archivedAt) return { label: "Archived", variant: "outline" };
  if (!coupon.active) return { label: "Inactive", variant: "secondary" };
  if (coupon.startDate && new Date(coupon.startDate).getTime() > now) return { label: "Scheduled", variant: "outline" };
  if (coupon.endDate && new Date(coupon.endDate).getTime() < now) return { label: "Expired", variant: "destructive" };
  if (coupon.maxRedemptions != null && coupon.timesUsed >= coupon.maxRedemptions) {
    return { label: "Usage limit reached", variant: "destructive" };
  }
  return { label: "Active", variant: "default" };
}

function ProductsTab() {
  const { toast } = useToast();
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/admin/ecommerce/products"] });
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    description: "",
    price: "",
    salePrice: "",
    sku: "",
    urlSlug: "",
    primaryImage: "",
    tags: "",
    features: "",
    included: "",
    status: "draft",
    active: true,
    metaTitle: "",
    metaDescription: "",
    ogImage: "",
  });
  const mutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/ecommerce/products", {
      ...form,
      price: cents(form.price),
      salePrice: form.salePrice ? cents(form.salePrice) : undefined,
      tags: csv(form.tags),
      features: csv(form.features),
      included: csv(form.included),
      secondaryImages: [],
      urlSlug: form.urlSlug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/products"] });
      toast({ title: "Product created" });
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };
  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Product editor</CardTitle><CardDescription>Create products with pricing, media URLs, tags, and SEO fields.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4">
            {([
              ["name", "Name"],
              ["tagline", "Tagline"],
              ["price", "Price"],
              ["salePrice", "Sale price"],
              ["sku", "SKU"],
              ["urlSlug", "URL slug"],
              ["primaryImage", "Primary image URL"],
              ["tags", "Tags"],
              ["features", "Features"],
              ["included", "Included items"],
              ["metaTitle", "Meta title"],
              ["metaDescription", "Meta description"],
              ["ogImage", "OpenGraph image"],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <Input value={form[key]} onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))} required={key === "name" || key === "price"} />
              </div>
            ))}
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(status) => setForm((current) => ({ ...current, status }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem></SelectContent></Select></div>
              <div className="flex items-center gap-3 pt-7"><Switch checked={form.active} onCheckedChange={(active) => setForm((current) => ({ ...current, active }))} /><Label>Active</Label></div>
            </div>
            <Button type="submit" disabled={mutation.isPending}><Save className="mr-2 h-4 w-4" /> Save product</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Products</CardTitle></CardHeader>
        <CardContent>
          <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Price</TableHead><TableHead>SKU</TableHead></TableRow></TableHeader><TableBody>
            {products.map((product) => <TableRow key={product.id}><TableCell className="font-medium">{product.name}</TableCell><TableCell><Badge variant={product.status === "published" ? "default" : "secondary"}>{product.status}</Badge></TableCell><TableCell>{formatMoney(product.salePrice ?? product.price)}</TableCell><TableCell>{product.sku || "-"}</TableCell></TableRow>)}
          </TableBody></Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CategoriesTab() {
  const { toast } = useToast();
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/admin/ecommerce/categories"] });
  const [editingId, setEditingId] = useState<string | null>(null);
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
      toast({ title: "Category deleted" });
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
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={form.image}
                onChange={(event) => setForm((current) => ({ ...current, image: event.target.value }))}
                placeholder="https://..."
              />
            </div>
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
        <CardContent>
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
              {flattenedCategories.map((category) => (
                <TableRow key={category.id}>
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
                      <Button type="button" variant="outline" size="sm" onClick={() => startSubcategory(category.id)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Sub
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => openEdit(category)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(category.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
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

function CouponsTab() {
  const { toast } = useToast();
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/admin/ecommerce/products"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/admin/ecommerce/categories"] });
  const { data: coupons = [] } = useQuery<Coupon[]>({ queryKey: ["/api/admin/ecommerce/coupons"] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    notes: "",
    type: "fixed",
    value: "",
    minOrderAmount: "",
    maxDiscountAmount: "",
    maxRedemptions: "",
    perCustomerLimit: "",
    startDate: "",
    endDate: "",
    active: true,
    customerEligibility: "all",
    eligibleCustomerEmails: "",
    eligibleProductIds: [] as string[],
    eligibleCategoryIds: [] as string[],
    excludedProductIds: [] as string[],
    excludedCategoryIds: [] as string[],
    allowStacking: false,
    appliesTo: "subtotal",
    applyBeforeTax: true,
  });

  const { data: report } = useQuery<CouponReport>({
    queryKey: [`/api/admin/ecommerce/coupons/${selectedReportId}/report`],
    enabled: Boolean(selectedReportId),
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({
      code: "",
      name: "",
      description: "",
      notes: "",
      type: "fixed",
      value: "",
      minOrderAmount: "",
      maxDiscountAmount: "",
      maxRedemptions: "",
      perCustomerLimit: "",
      startDate: "",
      endDate: "",
      active: true,
      customerEligibility: "all",
      eligibleCustomerEmails: "",
      eligibleProductIds: [],
      eligibleCategoryIds: [],
      excludedProductIds: [],
      excludedCategoryIds: [],
      allowStacking: false,
      appliesTo: "subtotal",
      applyBeforeTax: true,
    });
  };

  const openEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      name: coupon.name ?? "",
      description: coupon.description ?? "",
      notes: coupon.notes ?? "",
      type: coupon.type,
      value: coupon.type === "percentage" ? String(coupon.value) : moneyInput(coupon.value),
      minOrderAmount: moneyInput(coupon.minOrderAmount),
      maxDiscountAmount: moneyInput(coupon.maxDiscountAmount),
      maxRedemptions: coupon.maxRedemptions == null ? "" : String(coupon.maxRedemptions),
      perCustomerLimit: coupon.perCustomerLimit == null ? "" : String(coupon.perCustomerLimit),
      startDate: dateTimeInput(coupon.startDate),
      endDate: dateTimeInput(coupon.endDate),
      active: coupon.active,
      customerEligibility: coupon.customerEligibility ?? "all",
      eligibleCustomerEmails: coupon.eligibleCustomerEmails.join(", "),
      eligibleProductIds: coupon.eligibleProductIds ?? [],
      eligibleCategoryIds: coupon.eligibleCategoryIds ?? [],
      excludedProductIds: coupon.excludedProductIds ?? [],
      excludedCategoryIds: coupon.excludedCategoryIds ?? [],
      allowStacking: coupon.allowStacking,
      appliesTo: coupon.appliesTo ?? "subtotal",
      applyBeforeTax: coupon.applyBeforeTax,
    });
  };

  const payload = () => ({
    code: form.code.trim().toUpperCase(),
    name: form.name.trim() || null,
    description: form.description.trim() || null,
    notes: form.notes.trim() || null,
    type: form.type,
    value: form.type === "percentage" ? Number(form.value) || 0 : cents(form.value),
    minOrderAmount: nullableCents(form.minOrderAmount),
    maxDiscountAmount: nullableCents(form.maxDiscountAmount),
    maxRedemptions: nullableInt(form.maxRedemptions),
    perCustomerLimit: nullableInt(form.perCustomerLimit),
    startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
    endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
    active: form.active,
    customerEligibility: form.customerEligibility,
    eligibleCustomerEmails: csv(form.eligibleCustomerEmails).map((email) => email.toLowerCase()),
    eligibleProductIds: form.eligibleProductIds,
    eligibleCategoryIds: form.eligibleCategoryIds,
    excludedProductIds: form.excludedProductIds,
    excludedCategoryIds: form.excludedCategoryIds,
    allowStacking: form.allowStacking,
    appliesTo: form.appliesTo,
    applyBeforeTax: form.applyBeforeTax,
  });

  const saveMutation = useMutation({
    mutationFn: async () => apiRequest(
      editingId ? "PUT" : "POST",
      editingId ? `/api/admin/ecommerce/coupons/${editingId}` : "/api/admin/ecommerce/coupons",
      payload(),
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/coupons"] });
      toast({ title: editingId ? "Coupon updated" : "Coupon created" });
      resetForm();
    },
    onError: (error) => toast({
      title: "Coupon could not be saved",
      description: error instanceof Error ? error.message : "Please review the coupon settings.",
      variant: "destructive",
    }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (coupon: Coupon) => apiRequest("POST", `/api/admin/ecommerce/coupons/${coupon.id}/duplicate`, {
      code: `${coupon.code}-COPY-${Math.floor(Math.random() * 1000)}`,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/coupons"] }),
  });

  const archiveMutation = useMutation({
    mutationFn: async (couponId: string) => apiRequest("DELETE", `/api/admin/ecommerce/coupons/${couponId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/coupons"] }),
  });

  const toggleIdInForm = (key: "eligibleProductIds" | "eligibleCategoryIds" | "excludedProductIds" | "excludedCategoryIds", id: string) => {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(id) ? current[key].filter((item) => item !== id) : [...current[key], id],
    }));
  };

  const filteredCoupons = coupons.filter((coupon) => {
    const status = couponStatus(coupon).label.toLowerCase();
    const term = search.trim().toLowerCase();
    if (term && !`${coupon.code} ${coupon.name ?? ""}`.toLowerCase().includes(term)) return false;
    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (typeFilter !== "all" && coupon.type !== typeFilter) return false;
    return true;
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[460px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TicketPercent className="h-5 w-5" /> {editingId ? "Edit coupon" : "Coupon editor"}</CardTitle>
          <CardDescription>Configure discount rules, limits, eligibility, and lifecycle dates.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm((c) => ({ ...c, code: e.target.value.toUpperCase() }))} required /></div>
              <div className="space-y-2"><Label>Internal name</Label><Input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Discount type</Label><Select value={form.type} onValueChange={(type) => setForm((c) => ({ ...c, type }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fixed">Fixed amount</SelectItem><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="freeShipping">Free shipping</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Discount value</Label><Input value={form.value} onChange={(e) => setForm((c) => ({ ...c, value: e.target.value }))} placeholder={form.type === "percentage" ? "15" : "25.00"} disabled={form.type === "freeShipping"} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Minimum subtotal</Label><Input value={form.minOrderAmount} onChange={(e) => setForm((c) => ({ ...c, minOrderAmount: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Maximum discount</Label><Input value={form.maxDiscountAmount} onChange={(e) => setForm((c) => ({ ...c, maxDiscountAmount: e.target.value }))} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Overall usage limit</Label><Input type="number" value={form.maxRedemptions} onChange={(e) => setForm((c) => ({ ...c, maxRedemptions: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Per customer limit</Label><Input type="number" value={form.perCustomerLimit} onChange={(e) => setForm((c) => ({ ...c, perCustomerLimit: e.target.value }))} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Start</Label><Input type="datetime-local" value={form.startDate} onChange={(e) => setForm((c) => ({ ...c, startDate: e.target.value }))} /></div>
              <div className="space-y-2"><Label>End</Label><Input type="datetime-local" value={form.endDate} onChange={(e) => setForm((c) => ({ ...c, endDate: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} rows={2} /></div>
            <div className="space-y-2"><Label>Internal notes</Label><Textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} rows={2} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Customer eligibility</Label><Select value={form.customerEligibility} onValueChange={(customerEligibility) => setForm((c) => ({ ...c, customerEligibility }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All customers</SelectItem><SelectItem value="specific_emails">Specific emails</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Eligible emails</Label><Input value={form.eligibleCustomerEmails} onChange={(e) => setForm((c) => ({ ...c, eligibleCustomerEmails: e.target.value }))} placeholder="name@example.com, ..." /></div>
            </div>
            <CouponCheckboxGroup title="Eligible products" items={products.map((product) => ({ id: product.id, label: product.name }))} selected={form.eligibleProductIds} onToggle={(id) => toggleIdInForm("eligibleProductIds", id)} />
            <CouponCheckboxGroup title="Eligible categories" items={categories.map((category) => ({ id: category.id, label: category.name }))} selected={form.eligibleCategoryIds} onToggle={(id) => toggleIdInForm("eligibleCategoryIds", id)} />
            <CouponCheckboxGroup title="Excluded products" items={products.map((product) => ({ id: product.id, label: product.name }))} selected={form.excludedProductIds} onToggle={(id) => toggleIdInForm("excludedProductIds", id)} />
            <CouponCheckboxGroup title="Excluded categories" items={categories.map((category) => ({ id: category.id, label: category.name }))} selected={form.excludedCategoryIds} onToggle={(id) => toggleIdInForm("excludedCategoryIds", id)} />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3"><Switch checked={form.active} onCheckedChange={(active) => setForm((c) => ({ ...c, active }))} /><Label>Active</Label></div>
              <div className="flex items-center gap-3"><Switch checked={form.allowStacking} onCheckedChange={(allowStacking) => setForm((c) => ({ ...c, allowStacking }))} /><Label>Stacking</Label></div>
              <div className="flex items-center gap-3"><Switch checked={form.applyBeforeTax} onCheckedChange={(applyBeforeTax) => setForm((c) => ({ ...c, applyBeforeTax }))} /><Label>Before tax</Label></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saveMutation.isPending || !form.code.trim()}><Save className="mr-2 h-4 w-4" /> {editingId ? "Update coupon" : "Create coupon"}</Button>
              {editingId ? <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button> : null}
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Coupons</CardTitle><CardDescription>Search, filter, edit, duplicate, archive, and review coupon performance.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
              <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code or name" /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="usage limit reached">Usage limit reached</SelectItem></SelectContent></Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem><SelectItem value="fixed">Fixed</SelectItem><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="freeShipping">Free shipping</SelectItem></SelectContent></Select>
            </div>
            <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Status</TableHead><TableHead>Discount</TableHead><TableHead>Used</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{filteredCoupons.map((coupon) => {
              const status = couponStatus(coupon);
              return <TableRow key={coupon.id}><TableCell><div className="font-medium">{coupon.code}</div><div className="text-xs text-muted-foreground">{coupon.name || coupon.description || "-"}</div></TableCell><TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell><TableCell>{coupon.type === "percentage" ? `${coupon.value}%` : coupon.type === "freeShipping" ? "Free shipping" : formatMoney(coupon.value)}</TableCell><TableCell>{coupon.timesUsed}{coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ""}</TableCell><TableCell><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setSelectedReportId(coupon.id)}><Eye className="mr-2 h-4 w-4" />Report</Button><Button size="sm" variant="outline" onClick={() => openEdit(coupon)}><Pencil className="mr-2 h-4 w-4" />Edit</Button><Button size="sm" variant="outline" onClick={() => duplicateMutation.mutate(coupon)}><Copy className="mr-2 h-4 w-4" />Copy</Button><Button size="sm" variant="outline" onClick={() => archiveMutation.mutate(coupon.id)}><Trash2 className="mr-2 h-4 w-4" />Archive</Button></div></TableCell></TableRow>;
            })}</TableBody></Table>
          </CardContent>
        </Card>
        {selectedReportId && report ? (
          <Card>
            <CardHeader><CardTitle>Coupon usage</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <Metric label="Uses" value={String(report.totalUses)} />
                <Metric label="Revenue" value={formatMoney(report.totalRevenue)} />
                <Metric label="Discounts" value={formatMoney(report.totalDiscountGiven)} />
                <Metric label="Remaining" value={report.remainingUses == null ? "Unlimited" : String(report.remainingUses)} />
              </div>
              <Table><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Total</TableHead><TableHead>Discount</TableHead></TableRow></TableHeader><TableBody>{report.recentOrders.map((order) => <TableRow key={order.orderId}><TableCell className="font-mono text-xs">{order.orderId}</TableCell><TableCell>{order.customerEmail || "-"}</TableCell><TableCell>{formatMoney(order.totalAmount)}</TableCell><TableCell>{formatMoney(order.discountAmount)}</TableCell></TableRow>)}</TableBody></Table>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function CouponCheckboxGroup({ title, items, selected, onToggle }: { title: string; items: Array<{ id: string; label: string }>; selected: string[]; onToggle: (id: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className="max-h-32 overflow-auto rounded-lg border p-2">
        {items.map((item) => (
          <label key={item.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm">
            <input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="text-lg font-semibold">{value}</div></div>;
}

function OrdersTab() {
  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ["/api/admin/ecommerce/orders"] });
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> Orders</CardTitle></CardHeader>
      <CardContent>
        <Table><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead></TableRow></TableHeader><TableBody>
          {orders.map((order) => <TableRow key={order.id}><TableCell className="font-mono text-xs">{order.id}</TableCell><TableCell>{order.customer?.email || "-"}</TableCell><TableCell><Badge>{order.status}</Badge> <Badge variant="outline">{order.paymentStatus}</Badge></TableCell><TableCell>{formatMoney(order.totalAmount)}</TableCell></TableRow>)}
        </TableBody></Table>
      </CardContent>
    </Card>
  );
}

function ShippingTab() {
  const { data: zones = [] } = useQuery<Array<{ id: string; name: string; active: boolean }>>({ queryKey: ["/api/admin/ecommerce/shipping/zones"] });
  const [name, setName] = useState("");
  const mutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/ecommerce/shipping/zones", { name, countries: ["US"], states: [], active: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/shipping/zones"] }),
  });
  return <CrudList title="Shipping zones" icon={<Truck className="h-5 w-5" />} value={name} setValue={setName} onCreate={() => mutation.mutate()} rows={zones.map((z) => [z.name, "US", z.active ? "Active" : "Inactive"])} />;
}

function RefundsTab() {
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const mutation = useMutation({ mutationFn: async () => apiRequest("POST", "/api/admin/ecommerce/refunds", { orderId, amount: cents(amount), source: "manual", type: "partial" }) });
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Undo2 className="h-5 w-5" /> Refunds</CardTitle><CardDescription>Create a manual refund record or Stripe refund when a payment intent exists.</CardDescription></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[1fr_180px_auto]">
        <Input placeholder="Order ID" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
        <Input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>Create refund</Button>
      </CardContent>
    </Card>
  );
}

function IntegrationsTab() {
  const { data: settings = {} } = useQuery<SettingsData>({
    queryKey: ["/api/admin/settings"],
  });
  const ecommerceIntegrations = INTEGRATIONS.filter((config) =>
    ECOMMERCE_INTEGRATION_CATEGORIES.has(config.category),
  );
  const configuredCount = ecommerceIntegrations.filter((config) =>
    config.fields.some((field) => {
      const setting = settings[config.category]?.[field.key];
      return setting?.value && setting.value !== "";
    }),
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Ecommerce Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Connect store-specific marketing, product feed, shipping, inventory, and fulfillment
          providers. {configuredCount} of {ecommerceIntegrations.length} ecommerce integrations
          have saved settings.
        </p>
      </div>
      <div className="space-y-8">
        {INTEGRATION_GROUPS.map((group) => {
          const groupIntegrations = ecommerceIntegrations.filter(
            (config) => config.group === group.key,
          );
          if (groupIntegrations.length === 0) return null;

          return (
            <section
              key={group.key}
              className="space-y-4"
              data-testid={`ecommerce-integration-group-${group.key}`}
            >
              <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-3">
                <div>
                  <h3 className="text-base font-semibold">{group.title}</h3>
                  <p className="text-sm text-muted-foreground">{group.description}</p>
                </div>
                <Badge variant="outline">
                  {groupIntegrations.length} {groupIntegrations.length === 1 ? "option" : "options"}
                </Badge>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {groupIntegrations.map((config) => (
                  <IntegrationCard key={config.category} config={config} settings={settings} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data } = useQuery<StripeSettingsStatus>({ queryKey: ["/api/admin/ecommerce/settings/stripe"] });
  const [activeMode, setActiveMode] = useState("test");
  const [testPublishableKey, setTestPublishableKey] = useState("");
  const [testSecretKey, setTestSecretKey] = useState("");
  const [testWebhookSecret, setTestWebhookSecret] = useState("");
  const [livePublishableKey, setLivePublishableKey] = useState("");
  const [liveSecretKey, setLiveSecretKey] = useState("");
  const [liveWebhookSecret, setLiveWebhookSecret] = useState("");
  useEffect(() => {
    if (data) {
      setActiveMode(data.activeMode || "test");
      setTestPublishableKey(data.testPublishableKey || "");
      setLivePublishableKey(data.livePublishableKey || "");
    }
  }, [data]);
  const mutation = useMutation({
    mutationFn: async () => apiRequest("PUT", "/api/admin/ecommerce/settings/stripe", {
      activeMode,
      testPublishableKey,
      testSecretKey,
      testWebhookSecret,
      livePublishableKey,
      liveSecretKey,
      liveWebhookSecret,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/settings/stripe"] }),
  });
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Stripe settings</CardTitle><CardDescription>Secret values are encrypted and masked after save.</CardDescription></CardHeader>
      <CardContent className="grid gap-4">
        <div className="space-y-2"><Label>Active mode</Label><Select value={activeMode} onValueChange={setActiveMode}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="test">Test</SelectItem><SelectItem value="live">Live</SelectItem></SelectContent></Select></div>
        <div className="grid gap-4 md:grid-cols-2">
          <StripeModeFields title="Test keys" publishable={testPublishableKey} setPublishable={setTestPublishableKey} secret={testSecretKey} setSecret={setTestSecretKey} webhook={testWebhookSecret} setWebhook={setTestWebhookSecret} hasSecret={data?.hasTestSecretKey} hasWebhook={data?.hasTestWebhookSecret} />
          <StripeModeFields title="Live keys" publishable={livePublishableKey} setPublishable={setLivePublishableKey} secret={liveSecretKey} setSecret={setLiveSecretKey} webhook={liveWebhookSecret} setWebhook={setLiveWebhookSecret} hasSecret={data?.hasLiveSecretKey} hasWebhook={data?.hasLiveWebhookSecret} />
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-fit"><Save className="mr-2 h-4 w-4" /> Save Stripe settings</Button>
      </CardContent>
    </Card>
  );
}

function StripeModeFields(props: { title: string; publishable: string; setPublishable: (v: string) => void; secret: string; setSecret: (v: string) => void; webhook: string; setWebhook: (v: string) => void; hasSecret?: boolean; hasWebhook?: boolean }) {
  return <div className="space-y-3 rounded-lg border p-4"><h3 className="font-medium">{props.title}</h3><Input placeholder="Publishable key" value={props.publishable} onChange={(e) => props.setPublishable(e.target.value)} /><Input placeholder={props.hasSecret ? "Secret key saved" : "Secret key"} value={props.secret} onChange={(e) => props.setSecret(e.target.value)} /><Input placeholder={props.hasWebhook ? "Webhook secret saved" : "Webhook secret"} value={props.webhook} onChange={(e) => props.setWebhook(e.target.value)} /></div>;
}

function CrudList({ title, icon, value, setValue, onCreate, rows }: { title: string; icon: React.ReactNode; value: string; setValue: (value: string) => void; onCreate: () => void; rows: string[][] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="flex gap-3"><Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Name" /><Button onClick={onCreate}>Create</Button></div>
        <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Slug / Region</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.join(":")}><TableCell>{row[0]}</TableCell><TableCell>{row[1]}</TableCell><TableCell>{row[2]}</TableCell></TableRow>)}</TableBody></Table>
      </CardContent>
    </Card>
  );
}

export default function AdminEcommercePage() {
  const [location] = useLocation();
  const view = (location.split("/").pop() || "products") as View;
  const activeView: View = nav.some((item) => item.view === view) ? view : "products";
  return (
    <AdminSidebar>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Ecommerce</h1>
          <p className="text-muted-foreground">Manage the storefront, checkout operations, fulfillment, and Stripe configuration.</p>
        </div>
        <Tabs value={activeView}>
          <TabsList className="flex h-auto flex-wrap justify-start">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger key={item.view} value={item.view} asChild>
                  <Link href={`/admin/ecommerce/${item.view}`} className="gap-2">
                    <Icon className={cn("h-4 w-4", item.iconColor)} />
                    <span>{item.label}</span>
                  </Link>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
        {activeView === "products" ? <ProductsTab /> : null}
        {activeView === "categories" ? <CategoriesTab /> : null}
        {activeView === "coupons" ? <CouponsTab /> : null}
        {activeView === "orders" ? <OrdersTab /> : null}
        {activeView === "shipping" ? <ShippingTab /> : null}
        {activeView === "refunds" ? <RefundsTab /> : null}
        {activeView === "integrations" ? <IntegrationsTab /> : null}
        {activeView === "settings" ? <SettingsTab /> : null}
      </div>
    </AdminSidebar>
  );
}

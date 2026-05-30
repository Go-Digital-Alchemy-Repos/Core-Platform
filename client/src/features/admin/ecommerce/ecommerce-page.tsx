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
  Percent,
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
  tagline?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  productType?: string | null;
  vendor?: string | null;
  price: number;
  compareAtPrice?: number | null;
  costPerItem?: number | null;
  taxable: boolean;
  taxCategory?: string | null;
  featured: boolean;
  visibility: string;
  publishedAt?: string | null;
  archivedAt?: string | null;
  salePrice?: number | null;
  status: string;
  active: boolean;
  sku?: string | null;
  urlSlug: string;
  tags: string[];
  primaryImage?: string | null;
  secondaryImages: string[];
  features: string[];
  included: string[];
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: string | null;
  physicalProduct: boolean;
  requiresShipping: boolean;
  weight?: number | null;
  weightUnit: string;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimensionUnit: string;
  shippingProfile?: string | null;
  fulfillmentType: string;
  badgeText?: string | null;
  categories?: Category[];
  variants?: ProductVariant[];
  media?: ProductMedia[];
}

interface ProductVariant {
  id: string;
  productId: string;
  title: string;
  sku?: string | null;
  barcode?: string | null;
  price?: number | null;
  salePrice?: number | null;
  compareAtPrice?: number | null;
  costPerItem?: number | null;
  inventoryQuantity: number;
  trackInventory: boolean;
  lowStockThreshold?: number | null;
  allowBackorder: boolean;
  status: string;
  active: boolean;
  isDefault: boolean;
}

interface ProductMedia {
  id: string;
  url: string;
  type: string;
  altText?: string | null;
  primary: boolean;
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

interface FulfillmentLocation {
  id: string;
  name: string;
  type: string;
  city?: string | null;
  state?: string | null;
  country: string;
  isPrimary: boolean;
  active: boolean;
}

interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  states: string[];
  active: boolean;
}

interface ShippingRate {
  id: string;
  zoneId: string;
  name: string;
  description?: string | null;
  amount: number;
  minOrderAmount?: number | null;
  maxOrderAmount?: number | null;
  active: boolean;
}

interface ShippingProvider {
  provider: string;
  displayName: string;
  type: string;
  recommendedFor: string;
  capabilities: string[];
  setupFields: Array<{ key: string; label: string; secret?: boolean; hasValue?: boolean }>;
  active: boolean;
  testMode: boolean;
  connectedAt?: string | null;
  configured?: boolean;
  operational?: boolean;
  readyCapabilities?: string[];
  missingCredentialLabels?: string[];
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
  subtotalAmount?: number;
  shippingAmount?: number;
  taxAmount?: number;
  discountAmount?: number;
  createdAt: string;
  customer?: { name: string; email: string } | null;
  items: Array<{ id: string; productName: string; quantity: number; lineTotal: number }>;
  shipments?: Array<{ id: string; carrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null; status: string; shippedAt: string }>;
  fulfillments?: Array<{ id: string; status: string; carrier?: string | null; trackingNumber?: string | null; fulfilledAt?: string | null }>;
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

interface TaxSettingsStatus {
  enabled: boolean;
  manualRateBps: number;
  taxShipping: boolean;
  stripeTaxEnabled: boolean;
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
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/admin/ecommerce/categories"] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [inventoryFilter, setInventoryFilter] = useState("all");
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    shortDescription: "",
    description: "",
    productType: "",
    vendor: "",
    price: "",
    compareAtPrice: "",
    salePrice: "",
    costPerItem: "",
    sku: "",
    barcode: "",
    urlSlug: "",
    primaryImage: "",
    mediaUrl: "",
    mediaAltText: "",
    tags: "",
    features: "",
    included: "",
    categoryIds: [] as string[],
    status: "draft",
    active: true,
    featured: false,
    visibility: "online",
    publishedAt: "",
    taxable: true,
    taxCategory: "",
    metaTitle: "",
    metaDescription: "",
    ogImage: "",
    physicalProduct: true,
    requiresShipping: true,
    weight: "",
    weightUnit: "oz",
    length: "",
    width: "",
    height: "",
    dimensionUnit: "in",
    shippingProfile: "",
    fulfillmentType: "merchant",
    badgeText: "",
    trackInventory: false,
    inventoryQuantity: "0",
    lowStockThreshold: "",
    allowBackorder: false,
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      tagline: "",
      shortDescription: "",
      description: "",
      productType: "",
      vendor: "",
      price: "",
      compareAtPrice: "",
      salePrice: "",
      costPerItem: "",
      sku: "",
      barcode: "",
      urlSlug: "",
      primaryImage: "",
      mediaUrl: "",
      mediaAltText: "",
      tags: "",
      features: "",
      included: "",
      categoryIds: [],
      status: "draft",
      active: true,
      featured: false,
      visibility: "online",
      publishedAt: "",
      taxable: true,
      taxCategory: "",
      metaTitle: "",
      metaDescription: "",
      ogImage: "",
      physicalProduct: true,
      requiresShipping: true,
      weight: "",
      weightUnit: "oz",
      length: "",
      width: "",
      height: "",
      dimensionUnit: "in",
      shippingProfile: "",
      fulfillmentType: "merchant",
      badgeText: "",
      trackInventory: false,
      inventoryQuantity: "0",
      lowStockThreshold: "",
      allowBackorder: false,
    });
  };

  const openEdit = (product: Product) => {
    const defaultVariant = product.variants?.find((variant) => variant.isDefault) ?? product.variants?.[0];
    setEditingId(product.id);
    setForm({
      name: product.name,
      tagline: product.tagline ?? "",
      shortDescription: product.shortDescription ?? "",
      description: product.description ?? "",
      productType: product.productType ?? "",
      vendor: product.vendor ?? "",
      price: moneyInput(product.price),
      compareAtPrice: moneyInput(product.compareAtPrice),
      salePrice: moneyInput(product.salePrice),
      costPerItem: moneyInput(product.costPerItem),
      sku: defaultVariant?.sku ?? product.sku ?? "",
      barcode: defaultVariant?.barcode ?? "",
      urlSlug: product.urlSlug,
      primaryImage: product.primaryImage ?? "",
      mediaUrl: "",
      mediaAltText: "",
      tags: product.tags.join(", "),
      features: product.features.join(", "),
      included: product.included.join(", "),
      categoryIds: product.categories?.map((category) => category.id) ?? [],
      status: product.status,
      active: product.active,
      featured: product.featured,
      visibility: product.visibility,
      publishedAt: dateTimeInput(product.publishedAt),
      taxable: product.taxable,
      taxCategory: product.taxCategory ?? "",
      metaTitle: product.metaTitle ?? "",
      metaDescription: product.metaDescription ?? "",
      ogImage: product.ogImage ?? "",
      physicalProduct: product.physicalProduct,
      requiresShipping: product.requiresShipping,
      weight: product.weight == null ? "" : String(product.weight),
      weightUnit: product.weightUnit,
      length: product.length == null ? "" : String(product.length),
      width: product.width == null ? "" : String(product.width),
      height: product.height == null ? "" : String(product.height),
      dimensionUnit: product.dimensionUnit,
      shippingProfile: product.shippingProfile ?? "",
      fulfillmentType: product.fulfillmentType,
      badgeText: product.badgeText ?? "",
      trackInventory: defaultVariant?.trackInventory ?? false,
      inventoryQuantity: String(defaultVariant?.inventoryQuantity ?? 0),
      lowStockThreshold: defaultVariant?.lowStockThreshold == null ? "" : String(defaultVariant.lowStockThreshold),
      allowBackorder: defaultVariant?.allowBackorder ?? false,
    });
  };

  const productPayload = () => ({
      name: form.name.trim(),
      tagline: form.tagline.trim() || null,
      shortDescription: form.shortDescription.trim() || null,
      description: form.description.trim() || null,
      productType: form.productType.trim() || null,
      vendor: form.vendor.trim() || null,
      price: cents(form.price),
      compareAtPrice: nullableCents(form.compareAtPrice),
      salePrice: nullableCents(form.salePrice),
      costPerItem: nullableCents(form.costPerItem),
      sku: form.sku.trim() || null,
      primaryImage: form.primaryImage.trim() || null,
      tags: csv(form.tags),
      features: csv(form.features),
      included: csv(form.included),
      secondaryImages: [],
      urlSlug: form.urlSlug || slugify(form.name),
      categoryIds: form.categoryIds,
      status: form.status,
      active: form.active,
      featured: form.featured,
      visibility: form.visibility,
      publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
      taxable: form.taxable,
      taxCategory: form.taxCategory.trim() || null,
      metaTitle: form.metaTitle.trim() || null,
      metaDescription: form.metaDescription.trim() || null,
      ogImage: form.ogImage.trim() || null,
      physicalProduct: form.physicalProduct,
      requiresShipping: form.requiresShipping,
      weight: nullableInt(form.weight),
      weightUnit: form.weightUnit,
      length: nullableInt(form.length),
      width: nullableInt(form.width),
      height: nullableInt(form.height),
      dimensionUnit: form.dimensionUnit,
      shippingProfile: form.shippingProfile.trim() || null,
      fulfillmentType: form.fulfillmentType,
      badgeText: form.badgeText.trim() || null,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        editingId ? "PUT" : "POST",
        editingId ? `/api/admin/ecommerce/products/${editingId}` : "/api/admin/ecommerce/products",
        productPayload(),
      );
      const product = await response.json() as Product;
      const defaultVariant = products.find((item) => item.id === product.id)?.variants?.find((variant) => variant.isDefault);
      if (editingId && defaultVariant) {
        await apiRequest("PUT", `/api/admin/ecommerce/products/${product.id}/variants/${defaultVariant.id}`, {
          sku: form.sku.trim() || null,
          barcode: form.barcode.trim() || null,
          price: cents(form.price),
          salePrice: nullableCents(form.salePrice),
          compareAtPrice: nullableCents(form.compareAtPrice),
          costPerItem: nullableCents(form.costPerItem),
          inventoryQuantity: nullableInt(form.inventoryQuantity) ?? 0,
          trackInventory: form.trackInventory,
          lowStockThreshold: nullableInt(form.lowStockThreshold),
          allowBackorder: form.allowBackorder,
          active: form.active,
          status: form.active ? "active" : "inactive",
          image: form.primaryImage.trim() || null,
        });
      }
      if (form.mediaUrl.trim()) {
        await apiRequest("POST", `/api/admin/ecommerce/products/${product.id}/media`, {
          url: form.mediaUrl.trim(),
          altText: form.mediaAltText.trim() || product.name,
          type: "image",
          primary: !product.primaryImage,
          sortOrder: 0,
        });
      }
      return product;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/products"] });
      toast({ title: editingId ? "Product updated" : "Product created" });
      resetForm();
    },
    onError: (error) => toast({
      title: "Product could not be saved",
      description: error instanceof Error ? error.message : "Please review product settings.",
      variant: "destructive",
    }),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  const toggleCategory = (categoryId: string) => {
    setForm((current) => ({
      ...current,
      categoryIds: current.categoryIds.includes(categoryId)
        ? current.categoryIds.filter((id) => id !== categoryId)
        : [...current.categoryIds, categoryId],
    }));
  };

  const inventoryStatus = (product: Product) => {
    const defaultVariant = product.variants?.find((variant) => variant.isDefault) ?? product.variants?.[0];
    if (!defaultVariant?.trackInventory) return { label: "Not tracked", variant: "outline" as const };
    if (defaultVariant.inventoryQuantity <= 0) {
      return { label: defaultVariant.allowBackorder ? "Backordered" : "Out of stock", variant: "destructive" as const };
    }
    if (defaultVariant.lowStockThreshold != null && defaultVariant.inventoryQuantity <= defaultVariant.lowStockThreshold) {
      return { label: "Low stock", variant: "secondary" as const };
    }
    return { label: "In stock", variant: "default" as const };
  };

  const profitMargin = (() => {
    const price = cents(form.salePrice || form.price);
    const cost = cents(form.costPerItem);
    if (!price || !cost) return null;
    return Math.round(((price - cost) / price) * 100);
  })();

  const filteredProducts = products.filter((product) => {
    const term = search.trim().toLowerCase();
    const text = `${product.name} ${product.sku ?? ""} ${product.vendor ?? ""} ${product.tags.join(" ")}`.toLowerCase();
    if (term && !text.includes(term)) return false;
    if (statusFilter !== "all" && product.status !== statusFilter) return false;
    if (inventoryFilter !== "all" && inventoryStatus(product).label.toLowerCase() !== inventoryFilter) return false;
    return true;
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> {editingId ? "Edit product" : "Product editor"}</CardTitle>
          <CardDescription>Manage catalog data, pricing, inventory, media, shipping, visibility, and SEO.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4">
            <ProductEditorSection title="Basic Info">
              <div className="space-y-2"><Label>Title</Label><Input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Subtitle</Label><Input value={form.tagline} onChange={(e) => setForm((current) => ({ ...current, tagline: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Short description</Label><Textarea value={form.shortDescription} onChange={(e) => setForm((current) => ({ ...current, shortDescription: e.target.value }))} rows={2} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} rows={4} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Product type</Label><Input value={form.productType} onChange={(e) => setForm((current) => ({ ...current, productType: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Vendor / brand</Label><Input value={form.vendor} onChange={(e) => setForm((current) => ({ ...current, vendor: e.target.value }))} /></div>
              </div>
            </ProductEditorSection>

            <ProductEditorSection title="Pricing">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Base price</Label><Input value={form.price} onChange={(e) => setForm((current) => ({ ...current, price: e.target.value }))} required /></div>
                <div className="space-y-2"><Label>Sale price</Label><Input value={form.salePrice} onChange={(e) => setForm((current) => ({ ...current, salePrice: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Compare-at price</Label><Input value={form.compareAtPrice} onChange={(e) => setForm((current) => ({ ...current, compareAtPrice: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Cost per item</Label><Input value={form.costPerItem} onChange={(e) => setForm((current) => ({ ...current, costPerItem: e.target.value }))} /></div>
              </div>
              <p className="text-xs text-muted-foreground">Estimated margin: {profitMargin == null ? "Add cost and price" : `${profitMargin}%`}</p>
              <div className="flex items-center gap-3"><Switch checked={form.taxable} onCheckedChange={(taxable) => setForm((current) => ({ ...current, taxable }))} /><Label>Taxable</Label></div>
              <div className="space-y-2"><Label>Tax category</Label><Input value={form.taxCategory} onChange={(e) => setForm((current) => ({ ...current, taxCategory: e.target.value }))} /></div>
            </ProductEditorSection>

            <ProductEditorSection title="Inventory">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm((current) => ({ ...current, sku: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Barcode / UPC</Label><Input value={form.barcode} onChange={(e) => setForm((current) => ({ ...current, barcode: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={form.inventoryQuantity} onChange={(e) => setForm((current) => ({ ...current, inventoryQuantity: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Low stock threshold</Label><Input type="number" value={form.lowStockThreshold} onChange={(e) => setForm((current) => ({ ...current, lowStockThreshold: e.target.value }))} /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3"><Switch checked={form.trackInventory} onCheckedChange={(trackInventory) => setForm((current) => ({ ...current, trackInventory }))} /><Label>Track inventory</Label></div>
                <div className="flex items-center gap-3"><Switch checked={form.allowBackorder} onCheckedChange={(allowBackorder) => setForm((current) => ({ ...current, allowBackorder }))} /><Label>Allow backorders</Label></div>
              </div>
            </ProductEditorSection>

            <ProductEditorSection title="Media">
              <div className="space-y-2"><Label>Primary image URL</Label><Input value={form.primaryImage} onChange={(e) => setForm((current) => ({ ...current, primaryImage: e.target.value }))} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Add gallery image URL</Label><Input value={form.mediaUrl} onChange={(e) => setForm((current) => ({ ...current, mediaUrl: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Gallery image alt text</Label><Input value={form.mediaAltText} onChange={(e) => setForm((current) => ({ ...current, mediaAltText: e.target.value }))} /></div>
              </div>
            </ProductEditorSection>

            <ProductEditorSection title="Organization">
              <div className="space-y-2"><Label>Tags</Label><Input value={form.tags} onChange={(e) => setForm((current) => ({ ...current, tags: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Features</Label><Input value={form.features} onChange={(e) => setForm((current) => ({ ...current, features: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Included items</Label><Input value={form.included} onChange={(e) => setForm((current) => ({ ...current, included: e.target.value }))} /></div>
              {categories.length ? (
                <div className="space-y-2">
                  <Label>Categories</Label>
                  <div className="max-h-32 overflow-auto rounded-lg border p-2">
                    {categories.map((category) => (
                      <label key={category.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm">
                        <input type="checkbox" checked={form.categoryIds.includes(category.id)} onChange={() => toggleCategory(category.id)} />
                        <span>{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </ProductEditorSection>

            <ProductEditorSection title="Shipping">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3"><Switch checked={form.physicalProduct} onCheckedChange={(physicalProduct) => setForm((current) => ({ ...current, physicalProduct }))} /><Label>Physical product</Label></div>
                <div className="flex items-center gap-3"><Switch checked={form.requiresShipping} onCheckedChange={(requiresShipping) => setForm((current) => ({ ...current, requiresShipping }))} /><Label>Requires shipping</Label></div>
                <div className="space-y-2"><Label>Weight</Label><Input type="number" value={form.weight} onChange={(e) => setForm((current) => ({ ...current, weight: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Weight unit</Label><Select value={form.weightUnit} onValueChange={(weightUnit) => setForm((current) => ({ ...current, weightUnit }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="oz">oz</SelectItem><SelectItem value="lb">lb</SelectItem><SelectItem value="g">g</SelectItem><SelectItem value="kg">kg</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Length</Label><Input type="number" value={form.length} onChange={(e) => setForm((current) => ({ ...current, length: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Width</Label><Input type="number" value={form.width} onChange={(e) => setForm((current) => ({ ...current, width: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Height</Label><Input type="number" value={form.height} onChange={(e) => setForm((current) => ({ ...current, height: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Shipping profile</Label><Input value={form.shippingProfile} onChange={(e) => setForm((current) => ({ ...current, shippingProfile: e.target.value }))} /></div>
              </div>
            </ProductEditorSection>

            <ProductEditorSection title="Visibility and SEO">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(status) => setForm((current) => ({ ...current, status }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="archived">Archived</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Visibility</Label><Select value={form.visibility} onValueChange={(visibility) => setForm((current) => ({ ...current, visibility }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="online">Online store</SelectItem><SelectItem value="hidden">Hidden</SelectItem><SelectItem value="admin">Admin only</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Scheduled publish</Label><Input type="datetime-local" value={form.publishedAt} onChange={(e) => setForm((current) => ({ ...current, publishedAt: e.target.value }))} /></div>
                <div className="space-y-2"><Label>URL slug</Label><Input value={form.urlSlug} onChange={(e) => setForm((current) => ({ ...current, urlSlug: e.target.value }))} /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3"><Switch checked={form.active} onCheckedChange={(active) => setForm((current) => ({ ...current, active }))} /><Label>Active</Label></div>
                <div className="flex items-center gap-3"><Switch checked={form.featured} onCheckedChange={(featured) => setForm((current) => ({ ...current, featured }))} /><Label>Featured</Label></div>
              </div>
              <div className="space-y-2"><Label>Meta title</Label><Input value={form.metaTitle} onChange={(e) => setForm((current) => ({ ...current, metaTitle: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Meta description</Label><Textarea value={form.metaDescription} onChange={(e) => setForm((current) => ({ ...current, metaDescription: e.target.value }))} rows={2} /></div>
              <div className="space-y-2"><Label>OpenGraph image</Label><Input value={form.ogImage} onChange={(e) => setForm((current) => ({ ...current, ogImage: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Badge text</Label><Input value={form.badgeText} onChange={(e) => setForm((current) => ({ ...current, badgeText: e.target.value }))} /></div>
            </ProductEditorSection>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="submit" disabled={saveMutation.isPending}><Save className="mr-2 h-4 w-4" /> {editingId ? "Update product" : "Save product"}</Button>
              {editingId ? <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button> : null}
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Products</CardTitle><CardDescription>Search, filter, and edit catalog products.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
            <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, SKU, vendor, tag" /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="archived">Archived</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem></SelectContent></Select>
            <Select value={inventoryFilter} onValueChange={setInventoryFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All inventory</SelectItem><SelectItem value="in stock">In stock</SelectItem><SelectItem value="low stock">Low stock</SelectItem><SelectItem value="out of stock">Out of stock</SelectItem><SelectItem value="backordered">Backordered</SelectItem><SelectItem value="not tracked">Not tracked</SelectItem></SelectContent></Select>
          </div>
          <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Inventory</TableHead><TableHead>Price</TableHead><TableHead>Vendor</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
            {filteredProducts.map((product) => {
              const inventory = inventoryStatus(product);
              const defaultVariant = product.variants?.find((variant) => variant.isDefault) ?? product.variants?.[0];
              return (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-muted-foreground">{defaultVariant?.sku || product.sku || product.urlSlug}</div>
                  </TableCell>
                  <TableCell><Badge variant={product.status === "published" ? "default" : "secondary"}>{product.status}</Badge></TableCell>
                  <TableCell><Badge variant={inventory.variant}>{inventory.label}</Badge></TableCell>
                  <TableCell>{formatMoney(defaultVariant?.salePrice ?? product.salePrice ?? defaultVariant?.price ?? product.price)}</TableCell>
                  <TableCell>{product.vendor || "-"}</TableCell>
                  <TableCell><div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" asChild><Link href={`/products/${product.urlSlug}`}><Eye className="mr-2 h-4 w-4" />Preview</Link></Button><Button type="button" variant="outline" size="sm" onClick={() => openEdit(product)}><Pencil className="mr-2 h-4 w-4" />Edit</Button></div></TableCell>
                </TableRow>
              );
            })}
          </TableBody></Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductEditorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

export function CategoriesTab() {
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
  const { toast } = useToast();
  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ["/api/admin/ecommerce/orders"] });
  const { data: locations = [] } = useQuery<FulfillmentLocation[]>({
    queryKey: ["/api/admin/ecommerce/shipping/locations"],
  });
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [orderSearch, setOrderSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [shipmentForm, setShipmentForm] = useState({
    carrier: "",
    trackingNumber: "",
    trackingUrl: "",
    locationId: "",
    serviceLevel: "",
  });
  const [statusForm, setStatusForm] = useState({
    status: "",
    notes: "",
  });
  const filteredOrders = orders.filter((order) => {
    const query = orderSearch.trim().toLowerCase();
    const matchesSearch = !query || [
      order.id,
      order.customer?.email,
      order.customer?.name,
      ...order.items.map((item) => item.productName),
      ...(order.shipments ?? []).map((shipment) => shipment.trackingNumber ?? ""),
    ].some((value) => value?.toLowerCase().includes(query));
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesPayment = paymentFilter === "all" || order.paymentStatus === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });
  const selectedOrder = filteredOrders.find((order) => order.id === selectedOrderId)
    ?? orders.find((order) => order.id === selectedOrderId)
    ?? filteredOrders[0]
    ?? null;
  const visibleRevenue = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const unfulfilledCount = orders.filter((order) => !["shipped", "delivered", "cancelled"].includes(order.status)).length;

  useEffect(() => {
    if ((!selectedOrderId || !filteredOrders.some((order) => order.id === selectedOrderId)) && filteredOrders[0]?.id) {
      setSelectedOrderId(filteredOrders[0].id);
    }
  }, [filteredOrders, selectedOrderId]);

  useEffect(() => {
    if (selectedOrder) {
      setStatusForm({ status: selectedOrder.status, notes: "" });
    }
  }, [selectedOrder?.id]);

  const statusMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) throw new Error("Select an order first.");
      return apiRequest("PUT", `/api/admin/ecommerce/orders/${selectedOrder.id}`, {
        status: statusForm.status,
        notes: statusForm.notes.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/orders"] });
      toast({ title: "Order updated" });
      setStatusForm((current) => ({ ...current, notes: "" }));
    },
    onError: (error) => toast({
      title: "Order could not be updated",
      description: error instanceof Error ? error.message : "Please review the order status.",
      variant: "destructive",
    }),
  });

  const shipmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) throw new Error("Select an order first.");
      const shipmentResponse = await apiRequest("POST", `/api/admin/ecommerce/orders/${selectedOrder.id}/shipments`, {
        carrier: shipmentForm.carrier.trim() || null,
        trackingNumber: shipmentForm.trackingNumber.trim() || null,
        trackingUrl: shipmentForm.trackingUrl.trim() || null,
        status: "shipped",
      });
      const shipment = await shipmentResponse.json() as { id: string };
      await apiRequest("POST", `/api/admin/ecommerce/orders/${selectedOrder.id}/fulfillments`, {
        fulfillment: {
          shipmentId: shipment.id,
          locationId: shipmentForm.locationId || null,
          status: "fulfilled",
          method: "manual",
          serviceLevel: shipmentForm.serviceLevel.trim() || null,
          carrier: shipmentForm.carrier.trim() || null,
          trackingNumber: shipmentForm.trackingNumber.trim() || null,
          trackingUrl: shipmentForm.trackingUrl.trim() || null,
          fulfilledAt: new Date().toISOString(),
        },
        items: selectedOrder.items.map((item) => ({ orderItemId: item.id, quantity: item.quantity })),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/orders"] });
      toast({ title: "Order marked shipped" });
      setShipmentForm({ carrier: "", trackingNumber: "", trackingUrl: "", locationId: "", serviceLevel: "" });
    },
    onError: (error) => toast({
      title: "Shipment could not be created",
      description: error instanceof Error ? error.message : "Please review the fulfillment details.",
      variant: "destructive",
    }),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_460px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> Orders</CardTitle>
          <CardDescription>Select an order to review items and create a shipment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Visible orders" value={String(filteredOrders.length)} />
            <Metric label="Visible revenue" value={formatMoney(visibleRevenue)} />
            <Metric label="Needs fulfillment" value={String(unfulfilledCount)} />
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={orderSearch}
                onChange={(event) => setOrderSearch(event.target.value)}
                placeholder="Search order, customer, item, or tracking"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="refund_pending">Refund pending</SelectItem>
                <SelectItem value="partially_refunded">Partially refunded</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="refund_failed">Refund failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id} className={selectedOrder?.id === order.id ? "bg-muted/50" : undefined}>
                  <TableCell>
                    <div className="font-mono text-xs">{order.id}</div>
                    <div className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</div>
                  </TableCell>
                  <TableCell>{order.customer?.email || "-"}</TableCell>
                  <TableCell><Badge>{order.status}</Badge> <Badge variant="outline">{order.paymentStatus}</Badge></TableCell>
                  <TableCell>{formatMoney(order.totalAmount)}</TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedOrderId(order.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No orders match the current filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Order detail</CardTitle>
          <CardDescription>{selectedOrder ? `Order ${selectedOrder.id}` : "Select an order to manage."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedOrder ? (
            <>
              <div className="space-y-3">
                <div className="grid gap-2 rounded-lg border p-3">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-4 text-sm">
                      <span>{item.productName} x {item.quantity}</span>
                      <span>{formatMoney(item.lineTotal)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Total</span>
                    <span>{formatMoney(selectedOrder.totalAmount)}</span>
                  </div>
                </div>
                <div className="grid gap-2 rounded-lg border p-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(selectedOrder.subtotalAmount ?? 0)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatMoney(selectedOrder.discountAmount ?? 0)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatMoney(selectedOrder.shippingAmount ?? 0)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatMoney(selectedOrder.taxAmount ?? 0)}</span></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(selectedOrder.shipments ?? []).map((shipment) => (
                    <Badge key={shipment.id} variant="outline">
                      {shipment.carrier || "Shipment"} {shipment.trackingNumber || shipment.status}
                    </Badge>
                  ))}
                  {(selectedOrder.fulfillments ?? []).map((fulfillment) => (
                    <Badge key={fulfillment.id} variant="secondary">{fulfillment.status}</Badge>
                  ))}
                </div>
              </div>

              <form
                className="grid gap-4 rounded-lg border p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  statusMutation.mutate();
                }}
              >
                <div>
                  <h3 className="text-sm font-semibold">Status</h3>
                  <p className="text-xs text-muted-foreground">Changing status sends the customer an order status email.</p>
                </div>
                <div className="space-y-2">
                  <Label>Order status</Label>
                  <Select value={statusForm.status || selectedOrder.status} onValueChange={(status) => setStatusForm((current) => ({ ...current, status }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Internal note</Label>
                  <Textarea value={statusForm.notes} onChange={(event) => setStatusForm((current) => ({ ...current, notes: event.target.value }))} rows={3} />
                </div>
                <Button type="submit" variant="outline" disabled={statusMutation.isPending || !statusForm.status}>
                  <Save className="mr-2 h-4 w-4" />
                  Update order
                </Button>
              </form>

              <form
                className="grid gap-4 rounded-lg border p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  shipmentMutation.mutate();
                }}
              >
                <div>
                  <h3 className="text-sm font-semibold">Fulfillment</h3>
                  <p className="text-xs text-muted-foreground">Creates a shipment, fulfillment record, and customer shipping email.</p>
                </div>
                <div className="space-y-2">
                  <Label>Fulfillment location</Label>
                  <Select value={shipmentForm.locationId || "__none"} onValueChange={(locationId) => setShipmentForm((current) => ({ ...current, locationId: locationId === "__none" ? "" : locationId }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No location</SelectItem>
                      {locations.map((location) => <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Carrier</Label>
                    <Input value={shipmentForm.carrier} onChange={(event) => setShipmentForm((current) => ({ ...current, carrier: event.target.value }))} placeholder="UPS" />
                  </div>
                  <div className="space-y-2">
                    <Label>Service</Label>
                    <Input value={shipmentForm.serviceLevel} onChange={(event) => setShipmentForm((current) => ({ ...current, serviceLevel: event.target.value }))} placeholder="Ground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tracking number</Label>
                  <Input value={shipmentForm.trackingNumber} onChange={(event) => setShipmentForm((current) => ({ ...current, trackingNumber: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Tracking URL</Label>
                  <Input value={shipmentForm.trackingUrl} onChange={(event) => setShipmentForm((current) => ({ ...current, trackingUrl: event.target.value }))} placeholder="https://..." />
                </div>
                <Button type="submit" disabled={shipmentMutation.isPending || selectedOrder.items.length === 0}>
                  <Save className="mr-2 h-4 w-4" />
                  Mark shipped
                </Button>
              </form>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No orders are available yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ShippingTab() {
  const { toast } = useToast();
  const { data: zones = [] } = useQuery<ShippingZone[]>({
    queryKey: ["/api/admin/ecommerce/shipping/zones"],
  });
  const { data: rates = [] } = useQuery<ShippingRate[]>({
    queryKey: ["/api/admin/ecommerce/shipping/rates"],
  });
  const { data: locations = [] } = useQuery<FulfillmentLocation[]>({
    queryKey: ["/api/admin/ecommerce/shipping/locations"],
  });
  const { data: providers = [] } = useQuery<ShippingProvider[]>({
    queryKey: ["/api/admin/ecommerce/shipping/providers"],
  });
  const [zoneForm, setZoneForm] = useState({
    id: "",
    name: "",
    countries: "US",
    states: "",
    active: true,
  });
  const [rateForm, setRateForm] = useState({
    id: "",
    zoneId: "",
    name: "",
    description: "",
    amount: "",
    minOrderAmount: "",
    maxOrderAmount: "",
    active: true,
  });
  const [locationForm, setLocationForm] = useState({
    id: "",
    name: "",
    type: "merchant",
    city: "",
    state: "",
    country: "US",
    isPrimary: false,
    active: true,
  });
  const [providerCredentialForms, setProviderCredentialForms] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    if (!rateForm.zoneId && zones[0]?.id) {
      setRateForm((current) => ({ ...current, zoneId: zones[0].id }));
    }
  }, [rateForm.zoneId, zones]);

  const resetZoneForm = () => setZoneForm({
    id: "",
    name: "",
    countries: "US",
    states: "",
    active: true,
  });

  const resetRateForm = () => setRateForm({
    id: "",
    zoneId: zones[0]?.id ?? "",
    name: "",
    description: "",
    amount: "",
    minOrderAmount: "",
    maxOrderAmount: "",
    active: true,
  });

  const resetLocationForm = () => setLocationForm({
    id: "",
    name: "",
    type: "merchant",
    city: "",
    state: "",
    country: "US",
    isPrimary: false,
    active: true,
  });

  const zoneMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: zoneForm.name.trim(),
        countries: csv(zoneForm.countries).map((country) => country.toUpperCase()),
        states: csv(zoneForm.states).map((state) => state.toUpperCase()),
        active: zoneForm.active,
      };
      return zoneForm.id
        ? apiRequest("PUT", `/api/admin/ecommerce/shipping/zones/${zoneForm.id}`, payload)
        : apiRequest("POST", "/api/admin/ecommerce/shipping/zones", payload);
    },
    onSuccess: async () => {
      resetZoneForm();
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/shipping/zones"] });
      toast({ title: zoneForm.id ? "Shipping zone updated" : "Shipping zone created" });
    },
    onError: (error) => toast({
      title: "Shipping zone could not be saved",
      description: error instanceof Error ? error.message : "Please review the zone details.",
      variant: "destructive",
    }),
  });
  const rateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        zoneId: rateForm.zoneId,
        name: rateForm.name.trim(),
        description: rateForm.description.trim() || null,
        amount: cents(rateForm.amount),
        minOrderAmount: rateForm.minOrderAmount ? cents(rateForm.minOrderAmount) : null,
        maxOrderAmount: rateForm.maxOrderAmount ? cents(rateForm.maxOrderAmount) : null,
        active: rateForm.active,
      };
      return rateForm.id
        ? apiRequest("PUT", `/api/admin/ecommerce/shipping/rates/${rateForm.id}`, payload)
        : apiRequest("POST", "/api/admin/ecommerce/shipping/rates", payload);
    },
    onSuccess: async () => {
      resetRateForm();
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/shipping/rates"] });
      toast({ title: rateForm.id ? "Shipping rate updated" : "Shipping rate created" });
    },
    onError: (error) => toast({
      title: "Shipping rate could not be saved",
      description: error instanceof Error ? error.message : "Please review the rate details.",
      variant: "destructive",
    }),
  });
  const locationMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: locationForm.name.trim(),
        type: locationForm.type,
        city: locationForm.city.trim() || null,
        state: locationForm.state.trim() || null,
        country: locationForm.country.trim().toUpperCase() || "US",
        isPrimary: locationForm.isPrimary,
        active: locationForm.active,
      };
      return locationForm.id
        ? apiRequest("PUT", `/api/admin/ecommerce/shipping/locations/${locationForm.id}`, payload)
        : apiRequest("POST", "/api/admin/ecommerce/shipping/locations", payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/shipping/locations"] });
      toast({ title: locationForm.id ? "Fulfillment location updated" : "Fulfillment location created" });
      resetLocationForm();
    },
    onError: (error) => toast({
      title: "Location could not be saved",
      description: error instanceof Error ? error.message : "Please review the fulfillment location.",
      variant: "destructive",
    }),
  });
  const providerMutation = useMutation({
    mutationFn: async ({ provider, active, testMode }: { provider: ShippingProvider; active: boolean; testMode: boolean }) =>
      apiRequest("PUT", `/api/admin/ecommerce/shipping/providers/${provider.provider}`, {
        displayName: provider.displayName,
        type: provider.type,
        capabilities: provider.capabilities,
        settings: {},
        active,
        testMode,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/shipping/providers"] });
      toast({ title: "Shipping provider updated" });
    },
    onError: (error) => toast({
      title: "Shipping provider could not be updated",
      description: error instanceof Error ? error.message : "Save provider credentials before enabling it.",
      variant: "destructive",
    }),
  });
  const credentialMutation = useMutation({
    mutationFn: async (provider: ShippingProvider) => apiRequest(
      "PUT",
      `/api/admin/ecommerce/shipping/providers/${provider.provider}/credentials`,
      { credentials: providerCredentialForms[provider.provider] ?? {} },
    ),
    onSuccess: async (_response, provider) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/shipping/providers"] });
      setProviderCredentialForms((current) => ({ ...current, [provider.provider]: {} }));
      toast({ title: `${provider.displayName} credentials saved` });
    },
    onError: (error) => toast({
      title: "Credentials could not be saved",
      description: error instanceof Error ? error.message : "Please review the provider credentials.",
      variant: "destructive",
    }),
  });

  const updateProviderCredential = (provider: string, key: string, value: string) => {
    setProviderCredentialForms((current) => ({
      ...current,
      [provider]: {
        ...(current[provider] ?? {}),
        [key]: value,
      },
    }));
  };

  const groupedProviders = providers.reduce<Record<string, ShippingProvider[]>>((groups, provider) => {
    const key = provider.type.replace(/_/g, " ");
    groups[key] = [...(groups[key] ?? []), provider];
    return groups;
  }, {});
  const zoneMap = new Map(zones.map((zone) => [zone.id, zone]));

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {zoneForm.id ? "Edit shipping zone" : "Shipping zone"}
            </CardTitle>
            <CardDescription>Define the countries and optional states a group of checkout rates applies to.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                zoneMutation.mutate();
              }}
            >
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={zoneForm.name}
                  onChange={(event) => setZoneForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="United States"
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Countries</Label>
                  <Input
                    value={zoneForm.countries}
                    onChange={(event) => setZoneForm((current) => ({ ...current, countries: event.target.value }))}
                    placeholder="US, CA"
                  />
                </div>
                <div className="space-y-2">
                  <Label>States</Label>
                  <Input
                    value={zoneForm.states}
                    onChange={(event) => setZoneForm((current) => ({ ...current, states: event.target.value }))}
                    placeholder="MI, OH"
                  />
                </div>
              </div>
              <label className="flex items-center gap-3 rounded-lg border p-3">
                <Switch checked={zoneForm.active} onCheckedChange={(active) => setZoneForm((current) => ({ ...current, active }))} />
                <span className="text-sm font-medium">Active</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={zoneMutation.isPending || !zoneForm.name.trim()}>
                  <Save className="mr-2 h-4 w-4" />
                  {zoneForm.id ? "Update zone" : "Create zone"}
                </Button>
                {zoneForm.id ? <Button type="button" variant="outline" onClick={resetZoneForm}>Cancel</Button> : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipping zones
            </CardTitle>
            <CardDescription>Active zones determine which shipping rates can be selected at checkout.</CardDescription>
          </CardHeader>
          <CardContent>
            {zones.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Countries</TableHead>
                    <TableHead>States</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell className="font-medium">{zone.name}</TableCell>
                      <TableCell>{zone.countries.length ? zone.countries.join(", ") : "All"}</TableCell>
                      <TableCell>{zone.states.length ? zone.states.join(", ") : "All"}</TableCell>
                      <TableCell><Badge variant={zone.active ? "default" : "secondary"}>{zone.active ? "Active" : "Inactive"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setZoneForm({
                            id: zone.id,
                            name: zone.name,
                            countries: zone.countries.join(", "),
                            states: zone.states.join(", "),
                            active: zone.active,
                          })}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No shipping zones have been added yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {rateForm.id ? "Edit shipping rate" : "Shipping rate"}
            </CardTitle>
            <CardDescription>Add flat rates and optional order thresholds for checkout.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                rateMutation.mutate();
              }}
            >
              <div className="space-y-2">
                <Label>Zone</Label>
                <Select
                  value={rateForm.zoneId}
                  onValueChange={(zoneId) => setRateForm((current) => ({ ...current, zoneId }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select a zone" /></SelectTrigger>
                  <SelectContent>
                    {zones.map((zone) => <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={rateForm.name} onChange={(event) => setRateForm((current) => ({ ...current, name: event.target.value }))} placeholder="Standard shipping" required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={rateForm.description} onChange={(event) => setRateForm((current) => ({ ...current, description: event.target.value }))} placeholder="3-5 business days" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" min="0" step="0.01" value={rateForm.amount} onChange={(event) => setRateForm((current) => ({ ...current, amount: event.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Min order</Label>
                  <Input type="number" min="0" step="0.01" value={rateForm.minOrderAmount} onChange={(event) => setRateForm((current) => ({ ...current, minOrderAmount: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Max order</Label>
                  <Input type="number" min="0" step="0.01" value={rateForm.maxOrderAmount} onChange={(event) => setRateForm((current) => ({ ...current, maxOrderAmount: event.target.value }))} />
                </div>
              </div>
              <label className="flex items-center gap-3 rounded-lg border p-3">
                <Switch checked={rateForm.active} onCheckedChange={(active) => setRateForm((current) => ({ ...current, active }))} />
                <span className="text-sm font-medium">Active</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={rateMutation.isPending || !rateForm.zoneId || !rateForm.name.trim() || !rateForm.amount.trim()}>
                  <Save className="mr-2 h-4 w-4" />
                  {rateForm.id ? "Update rate" : "Create rate"}
                </Button>
                {rateForm.id ? <Button type="button" variant="outline" onClick={resetRateForm}>Cancel</Button> : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipping rates
            </CardTitle>
            <CardDescription>These rates are returned to checkout when their zone and order thresholds match.</CardDescription>
          </CardHeader>
          <CardContent>
            {rates.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Order range</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell>
                        <div className="font-medium">{rate.name}</div>
                        {rate.description ? <div className="text-xs text-muted-foreground">{rate.description}</div> : null}
                      </TableCell>
                      <TableCell>{zoneMap.get(rate.zoneId)?.name ?? "Missing zone"}</TableCell>
                      <TableCell>{formatMoney(rate.amount)}</TableCell>
                      <TableCell>
                        {rate.minOrderAmount || rate.maxOrderAmount
                          ? `${rate.minOrderAmount ? formatMoney(rate.minOrderAmount) : "$0.00"} - ${rate.maxOrderAmount ? formatMoney(rate.maxOrderAmount) : "No max"}`
                          : "Any order"}
                      </TableCell>
                      <TableCell><Badge variant={rate.active ? "default" : "secondary"}>{rate.active ? "Active" : "Inactive"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRateForm({
                            id: rate.id,
                            zoneId: rate.zoneId,
                            name: rate.name,
                            description: rate.description ?? "",
                            amount: String(rate.amount / 100),
                            minOrderAmount: rate.minOrderAmount == null ? "" : String(rate.minOrderAmount / 100),
                            maxOrderAmount: rate.maxOrderAmount == null ? "" : String(rate.maxOrderAmount / 100),
                            active: rate.active,
                          })}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No shipping rates have been added yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {locationForm.id ? "Edit location" : "Fulfillment location"}
            </CardTitle>
            <CardDescription>Create merchant, store, warehouse, or future 3PL fulfillment locations.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                locationMutation.mutate();
              }}
            >
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={locationForm.name}
                  onChange={(event) => setLocationForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Main warehouse"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={locationForm.type}
                  onValueChange={(type) => setLocationForm((current) => ({ ...current, type }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merchant">Merchant</SelectItem>
                    <SelectItem value="store">Store</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="third_party_logistics">3PL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-1">
                  <Label>City</Label>
                  <Input value={locationForm.city} onChange={(event) => setLocationForm((current) => ({ ...current, city: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={locationForm.state} onChange={(event) => setLocationForm((current) => ({ ...current, state: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={locationForm.country} onChange={(event) => setLocationForm((current) => ({ ...current, country: event.target.value }))} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-lg border p-3">
                  <Switch checked={locationForm.isPrimary} onCheckedChange={(isPrimary) => setLocationForm((current) => ({ ...current, isPrimary }))} />
                  <span className="text-sm font-medium">Primary location</span>
                </label>
                <label className="flex items-center gap-3 rounded-lg border p-3">
                  <Switch checked={locationForm.active} onCheckedChange={(active) => setLocationForm((current) => ({ ...current, active }))} />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={locationMutation.isPending || !locationForm.name.trim()}>
                  <Save className="mr-2 h-4 w-4" />
                  {locationForm.id ? "Update location" : "Create location"}
                </Button>
                {locationForm.id ? <Button type="button" variant="outline" onClick={resetLocationForm}>Cancel</Button> : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Fulfillment locations
            </CardTitle>
            <CardDescription>Locations are the foundation for future warehouse routing, local delivery, split shipments, and 3PL workflows.</CardDescription>
          </CardHeader>
          <CardContent>
            {locations.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.name}</TableCell>
                      <TableCell className="capitalize">{location.type.replace(/_/g, " ")}</TableCell>
                      <TableCell>{[location.city, location.state, location.country].filter(Boolean).join(", ")}</TableCell>
                      <TableCell>
                        <Badge variant={location.active ? "default" : "secondary"}>
                          {location.isPrimary ? "Primary" : location.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setLocationForm({
                            id: location.id,
                            name: location.name,
                            type: location.type,
                            city: location.city ?? "",
                            state: location.state ?? "",
                            country: location.country,
                            isPrimary: location.isPrimary,
                            active: location.active,
                          })}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No fulfillment locations have been added yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Carrier and fulfillment providers
          </CardTitle>
          <CardDescription>Provider connections are modeled separately from zones so checkout, labels, tracking, and fulfillment automation can share the same engine.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {Object.entries(groupedProviders).map(([group, groupProviders]) => (
            <div key={group} className="space-y-3">
              <h3 className="text-sm font-semibold capitalize">{group}</h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {groupProviders.map((provider) => {
                  const activationBlocked = !provider.active && !provider.configured;
                  return (
                    <div key={provider.provider} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{provider.displayName}</div>
                          <p className="mt-1 text-sm text-muted-foreground">{provider.recommendedFor}</p>
                        </div>
                        <Badge variant={provider.active ? "default" : "secondary"}>
                          {provider.operational ? "Operational" : provider.active ? "Needs setup" : "Available"}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {provider.capabilities.map((capability) => (
                          <Badge key={capability} variant="outline" className="capitalize">
                            {capability.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-4 grid gap-3 rounded-lg bg-muted/40 p-3">
                        <label className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium">Enabled</span>
                          <Switch
                            checked={provider.active}
                            onCheckedChange={(active) => providerMutation.mutate({
                              provider,
                              active,
                              testMode: provider.testMode,
                            })}
                            disabled={activationBlocked || providerMutation.isPending}
                          />
                        </label>
                        <label className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium">Test mode</span>
                          <Switch
                            checked={provider.testMode}
                            onCheckedChange={(testMode) => providerMutation.mutate({
                              provider,
                              active: provider.active,
                              testMode,
                            })}
                            disabled={providerMutation.isPending}
                          />
                        </label>
                        {provider.setupFields.length ? (
                          <p className="text-xs text-muted-foreground">
                            {provider.configured
                              ? `Ready for ${provider.readyCapabilities?.map((capability) => capability.replace(/_/g, " ")).join(", ") || "provider workflows"}.`
                              : `Missing ${provider.missingCredentialLabels?.join(", ") || provider.setupFields.map((field) => field.label).join(", ")} in encrypted credential storage.`}
                          </p>
                        ) : null}
                        {provider.setupFields.length ? (
                          <div className="grid gap-2">
                            {provider.setupFields.map((field) => (
                              <Input
                                key={field.key}
                                type={field.secret ? "password" : "text"}
                                value={providerCredentialForms[provider.provider]?.[field.key] ?? ""}
                                onChange={(event) => updateProviderCredential(provider.provider, field.key, event.target.value)}
                                placeholder={field.hasValue ? `${field.label} saved` : field.label}
                              />
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => credentialMutation.mutate(provider)}
                              disabled={
                                credentialMutation.isPending ||
                                !Object.values(providerCredentialForms[provider.provider] ?? {}).some((value) => value.trim())
                              }
                            >
                              <Save className="mr-2 h-4 w-4" />
                              Save credentials
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
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
  const { data: taxData } = useQuery<TaxSettingsStatus>({ queryKey: ["/api/admin/ecommerce/settings/tax"] });
  const { toast } = useToast();
  const [activeMode, setActiveMode] = useState("test");
  const [testPublishableKey, setTestPublishableKey] = useState("");
  const [testSecretKey, setTestSecretKey] = useState("");
  const [testWebhookSecret, setTestWebhookSecret] = useState("");
  const [livePublishableKey, setLivePublishableKey] = useState("");
  const [liveSecretKey, setLiveSecretKey] = useState("");
  const [liveWebhookSecret, setLiveWebhookSecret] = useState("");
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [manualRate, setManualRate] = useState("");
  const [taxShipping, setTaxShipping] = useState(false);
  const [stripeTaxEnabled, setStripeTaxEnabled] = useState(false);
  useEffect(() => {
    if (data) {
      setActiveMode(data.activeMode || "test");
      setTestPublishableKey(data.testPublishableKey || "");
      setLivePublishableKey(data.livePublishableKey || "");
    }
  }, [data]);
  useEffect(() => {
    if (taxData) {
      setTaxEnabled(taxData.enabled);
      setManualRate((taxData.manualRateBps / 100).toFixed(2).replace(/\.00$/, ""));
      setTaxShipping(taxData.taxShipping);
      setStripeTaxEnabled(taxData.stripeTaxEnabled);
    }
  }, [taxData]);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/settings/stripe"] });
      toast({ title: "Stripe settings saved" });
    },
  });
  const taxMutation = useMutation({
    mutationFn: async () => apiRequest("PUT", "/api/admin/ecommerce/settings/tax", {
      enabled: taxEnabled,
      manualRateBps: Math.round((Number(manualRate) || 0) * 100),
      taxShipping,
      stripeTaxEnabled,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/settings/tax"] });
      toast({ title: "Tax settings saved" });
    },
  });
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-slate-500" /> Stripe settings</CardTitle><CardDescription>Secret values are encrypted and masked after save.</CardDescription></CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2"><Label>Active mode</Label><Select value={activeMode} onValueChange={setActiveMode}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="test">Test</SelectItem><SelectItem value="live">Live</SelectItem></SelectContent></Select></div>
          <div className="grid gap-4 md:grid-cols-2">
            <StripeModeFields title="Test keys" publishable={testPublishableKey} setPublishable={setTestPublishableKey} secret={testSecretKey} setSecret={setTestSecretKey} webhook={testWebhookSecret} setWebhook={setTestWebhookSecret} hasSecret={data?.hasTestSecretKey} hasWebhook={data?.hasTestWebhookSecret} />
            <StripeModeFields title="Live keys" publishable={livePublishableKey} setPublishable={setLivePublishableKey} secret={liveSecretKey} setSecret={setLiveSecretKey} webhook={liveWebhookSecret} setWebhook={setLiveWebhookSecret} hasSecret={data?.hasLiveSecretKey} hasWebhook={data?.hasLiveWebhookSecret} />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-fit"><Save className="mr-2 h-4 w-4" /> Save Stripe settings</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5 text-amber-600" /> Tax settings</CardTitle><CardDescription>Checkout tax is calculated server-side from saved settings and taxable product records.</CardDescription></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div><Label>Enable tax calculation</Label><p className="text-sm text-muted-foreground">Adds tax to cart, checkout, and order totals.</p></div>
              <Switch checked={taxEnabled} onCheckedChange={setTaxEnabled} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div><Label>Tax shipping</Label><p className="text-sm text-muted-foreground">Include shipping charges in the taxable base.</p></div>
              <Switch checked={taxShipping} onCheckedChange={setTaxShipping} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Manual tax rate (%)</Label><Input value={manualRate} onChange={(event) => setManualRate(event.target.value)} placeholder="6.00" inputMode="decimal" /></div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div><Label>Prepare Stripe Tax</Label><p className="text-sm text-muted-foreground">Marks this store for provider-backed tax calculation once the Stripe Tax API is connected.</p></div>
              <Switch checked={stripeTaxEnabled} onCheckedChange={setStripeTaxEnabled} />
            </div>
          </div>
          <Button onClick={() => taxMutation.mutate()} disabled={taxMutation.isPending} className="w-fit"><Save className="mr-2 h-4 w-4" /> Save tax settings</Button>
        </CardContent>
      </Card>
    </div>
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

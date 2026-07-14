import { type ElementType, FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  DollarSign,
  Eye,
  Image,
  Package,
  Pencil,
  Percent,
  Plug,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Settings,
  ShoppingBag,
  Tag,
  TicketPercent,
  Truck,
  Undo2,
} from "lucide-react";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { CmsImageUpload } from "@/features/admin/cms/components/cms-image-upload";
import { CmsRichTextEditor } from "@/features/admin/cms/builder/cms-rich-text-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdminEditDeepLink } from "@/features/frontend-edit/frontend-edit";
import { formatMoney } from "@/features/ecommerce/cart-store";
import {
  getEcommerceOrderStatusBadge,
  getEcommercePaymentStatusBadge,
} from "@/features/ecommerce/order-status-labels";
import { cn } from "@/lib/utils";
import { CategoriesTab } from "@/features/admin/ecommerce/categories-tab";
import { CouponsTab } from "@/features/admin/ecommerce/coupons-tab";
import { RefundsTab } from "@/features/admin/ecommerce/refunds-tab";
import { IntegrationsTab } from "@/features/admin/ecommerce/integrations-tab";
import { SettingsTab } from "@/features/admin/ecommerce/settings-tab";
import { Metric } from "@/features/admin/ecommerce/metric";
import type { EcommerceStoreSettings } from "@shared/ecommerce-shipping-settings";
import type {
  Category,
  Customer,
  FulfillmentLocation,
  Order,
  PaymentRequest,
  Product,
  ShippingProvider,
  ShippingRate,
  ShippingZone,
} from "@/features/admin/ecommerce/ecommerce-page.types";
import {
  cents,
  csv,
  dateTimeInput,
  moneyInput,
  nullableCents,
  nullableInt,
  slugify,
} from "@/features/admin/ecommerce/ecommerce-page.utils";

export { IntegrationsTab } from "@/features/admin/ecommerce/integrations-tab";
export { CategoriesTab } from "@/features/admin/ecommerce/categories-tab";
export { CouponsTab } from "@/features/admin/ecommerce/coupons-tab";

type View =
  | "products"
  | "categories"
  | "coupons"
  | "orders"
  | "shipping"
  | "refunds"
  | "integrations"
  | "settings";

function getOrderDisplayNumber(orderId: string) {
  return `#${orderId.split("-")[0]?.toUpperCase() || orderId.toUpperCase()}`;
}

function OrderTableRow({
  order,
  selected,
  onSelect,
  onCopy,
}: {
  order: Order;
  selected: boolean;
  onSelect: () => void;
  onCopy: (order: Order) => void;
}) {
  const orderStatus = getEcommerceOrderStatusBadge(order.status);
  const paymentStatus = getEcommercePaymentStatusBadge(order.paymentStatus);
  const displayOrderNumber = getOrderDisplayNumber(order.id);

  return (
    <TableRow
      role="button"
      tabIndex={0}
      className={cn(
        "cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected ? "bg-muted/50" : undefined,
      )}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{displayOrderNumber}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label={`Copy order number ${displayOrderNumber}`}
            onClick={(event) => {
              event.stopPropagation();
              onCopy(order);
            }}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          {new Date(order.createdAt).toLocaleDateString()}
        </div>
      </TableCell>
      <TableCell>{order.customer?.email || "-"}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2">
          <Badge variant={orderStatus.variant} className={orderStatus.className}>
            {orderStatus.label}
          </Badge>
          <Badge variant={paymentStatus.variant} className={paymentStatus.className}>
            {paymentStatus.label}
          </Badge>
        </div>
      </TableCell>
      <TableCell>{formatMoney(order.totalAmount)}</TableCell>
      <TableCell className="text-right">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
        >
          <Eye className="mr-2 h-4 w-4" />
          View
        </Button>
      </TableCell>
    </TableRow>
  );
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

export function ProductsTab() {
  const { toast } = useToast();
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/admin/ecommerce/products"],
  });
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/admin/ecommerce/categories"],
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeProductEditorTab, setActiveProductEditorTab] = useState("content");
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

  const openCreate = () => {
    resetForm();
    setActiveProductEditorTab("content");
    setEditorOpen(true);
  };

  const openEdit = (product: Product) => {
    const defaultVariant =
      product.variants?.find((variant) => variant.isDefault) ?? product.variants?.[0];
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
      lowStockThreshold:
        defaultVariant?.lowStockThreshold == null ? "" : String(defaultVariant.lowStockThreshold),
      allowBackorder: defaultVariant?.allowBackorder ?? false,
    });
    setActiveProductEditorTab("content");
    setEditorOpen(true);
  };

  useAdminEditDeepLink(products, (product) => product.id, openEdit);

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
      const product = (await response.json()) as Product;
      const defaultVariant = products
        .find((item) => item.id === product.id)
        ?.variants?.find((variant) => variant.isDefault);
      if (editingId && defaultVariant) {
        await apiRequest(
          "PUT",
          `/api/admin/ecommerce/products/${product.id}/variants/${defaultVariant.id}`,
          {
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
          },
        );
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
      setEditorOpen(false);
    },
    onError: (error) =>
      toast({
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
    const defaultVariant =
      product.variants?.find((variant) => variant.isDefault) ?? product.variants?.[0];
    if (!defaultVariant?.trackInventory)
      return { label: "Not tracked", variant: "outline" as const };
    if (defaultVariant.inventoryQuantity <= 0) {
      return {
        label: defaultVariant.allowBackorder ? "Backordered" : "Out of stock",
        variant: "destructive" as const,
      };
    }
    if (
      defaultVariant.lowStockThreshold != null &&
      defaultVariant.inventoryQuantity <= defaultVariant.lowStockThreshold
    ) {
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
    const text =
      `${product.name} ${product.sku ?? ""} ${product.vendor ?? ""} ${product.tags.join(" ")}`.toLowerCase();
    if (term && !text.includes(term)) return false;
    if (statusFilter !== "all" && product.status !== statusFilter) return false;
    if (
      inventoryFilter !== "all" &&
      inventoryStatus(product).label.toLowerCase() !== inventoryFilter
    )
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Products</CardTitle>
            <CardDescription>Search, filter, and open a focused product workspace.</CardDescription>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New product
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, SKU, vendor, tag"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={inventoryFilter} onValueChange={setInventoryFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All inventory</SelectItem>
                <SelectItem value="in stock">In stock</SelectItem>
                <SelectItem value="low stock">Low stock</SelectItem>
                <SelectItem value="out of stock">Out of stock</SelectItem>
                <SelectItem value="backordered">Backordered</SelectItem>
                <SelectItem value="not tracked">Not tracked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Inventory</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const inventory = inventoryStatus(product);
                const defaultVariant =
                  product.variants?.find((variant) => variant.isDefault) ?? product.variants?.[0];
                return (
                  <TableRow
                    key={product.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onClick={() => openEdit(product)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openEdit(product);
                      }
                    }}
                  >
                    <TableCell>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {defaultVariant?.sku || product.sku || product.urlSlug}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.status === "published" ? "default" : "secondary"}>
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={inventory.variant}>{inventory.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {formatMoney(
                        defaultVariant?.salePrice ??
                          product.salePrice ??
                          defaultVariant?.price ??
                          product.price,
                      )}
                    </TableCell>
                    <TableCell>{product.vendor || "-"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          asChild
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Link href={`/products/${product.urlSlug}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEdit(product);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Sheet
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) resetForm();
        }}
      >
        <SheetContent side="right" size="full" className="p-0">
          <SheetHeader className="border-b p-6 pr-12">
            <SheetTitle>{editingId ? "Edit product" : "Create product"}</SheetTitle>
            <SheetDescription>
              Manage content, media, pricing, inventory, shipping, publishing, and SEO.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="p-0">
            <form id="ecommerce-product-form" onSubmit={submit}>
              <Tabs
                value={activeProductEditorTab}
                onValueChange={setActiveProductEditorTab}
                className="flex min-h-full flex-col"
              >
                <div className="border-b bg-muted/30 px-6 py-3">
                  <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
                    <TabsTrigger value="content">
                      <Package className="mr-1.5 h-4 w-4 text-emerald-600" />
                      Content
                    </TabsTrigger>
                    <TabsTrigger value="media">
                      <Image className="mr-1.5 h-4 w-4 text-sky-600" />
                      Media
                    </TabsTrigger>
                    <TabsTrigger value="pricing">
                      <Percent className="mr-1.5 h-4 w-4 text-amber-600" />
                      Pricing
                    </TabsTrigger>
                    <TabsTrigger value="inventory">
                      <ClipboardList className="mr-1.5 h-4 w-4 text-blue-600" />
                      Inventory
                    </TabsTrigger>
                    <TabsTrigger value="shipping">
                      <Truck className="mr-1.5 h-4 w-4 text-cyan-600" />
                      Shipping
                    </TabsTrigger>
                    <TabsTrigger value="settings">
                      <SlidersHorizontal className="mr-1.5 h-4 w-4 text-slate-600" />
                      Settings
                    </TabsTrigger>
                    <TabsTrigger value="seo">
                      <Search className="mr-1.5 h-4 w-4 text-violet-600" />
                      SEO
                    </TabsTrigger>
                  </TabsList>
                </div>
                <div className="p-6">
                  <TabsContent value="content" className="mt-0">
                    <ProductEditorSection title="Product content">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            value={form.name}
                            onChange={(e) =>
                              setForm((current) => ({ ...current, name: e.target.value }))
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Subtitle</Label>
                          <Input
                            value={form.tagline}
                            onChange={(e) =>
                              setForm((current) => ({ ...current, tagline: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Short description</Label>
                        <Textarea
                          value={form.shortDescription}
                          onChange={(e) =>
                            setForm((current) => ({ ...current, shortDescription: e.target.value }))
                          }
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <CmsRichTextEditor
                          value={form.description}
                          onChange={(description) =>
                            setForm((current) => ({ ...current, description }))
                          }
                          placeholder="Write the complete product description customers should see on the product detail page..."
                          data-testid="ecommerce-product-description-editor"
                        />
                      </div>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Product type</Label>
                          <Input
                            value={form.productType}
                            onChange={(e) =>
                              setForm((current) => ({ ...current, productType: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Vendor / brand</Label>
                          <Input
                            value={form.vendor}
                            onChange={(e) =>
                              setForm((current) => ({ ...current, vendor: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    </ProductEditorSection>
                    <ProductEditorSection title="Merchandising">
                      <div className="space-y-2">
                        <Label>Tags</Label>
                        <Input
                          value={form.tags}
                          onChange={(e) =>
                            setForm((current) => ({ ...current, tags: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Features</Label>
                        <Input
                          value={form.features}
                          onChange={(e) =>
                            setForm((current) => ({ ...current, features: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Included items</Label>
                        <Input
                          value={form.included}
                          onChange={(e) =>
                            setForm((current) => ({ ...current, included: e.target.value }))
                          }
                        />
                      </div>
                    </ProductEditorSection>
                  </TabsContent>
                  <TabsContent value="media" className="mt-0">
                    <ProductEditorSection title="Media">
                      <CmsImageUpload
                        label="Primary image"
                        value={form.primaryImage}
                        onChange={(primaryImage) =>
                          setForm((current) => ({ ...current, primaryImage }))
                        }
                        helpText="Upload, drop, or choose the main storefront image from the CMS media library."
                        data-testid="ecommerce-product-primary-image"
                      />
                      <div className="grid gap-4 lg:grid-cols-2">
                        <CmsImageUpload
                          label="Add gallery image"
                          value={form.mediaUrl}
                          onChange={(mediaUrl) => setForm((current) => ({ ...current, mediaUrl }))}
                          helpText="Adds a product gallery image when the product is saved."
                          data-testid="ecommerce-product-gallery-image"
                        />
                        <div className="space-y-2">
                          <Label>Gallery image alt text</Label>
                          <Input
                            value={form.mediaAltText}
                            onChange={(e) =>
                              setForm((current) => ({ ...current, mediaAltText: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    </ProductEditorSection>
                  </TabsContent>
                  <TabsContent value="pricing" className="mt-0">
                    <ProductEditorSection title="Pricing">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Base price</Label>
                          <Input
                            value={form.price}
                            onChange={(e) =>
                              setForm((current) => ({ ...current, price: e.target.value }))
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Sale price</Label>
                          <Input
                            value={form.salePrice}
                            onChange={(e) =>
                              setForm((current) => ({ ...current, salePrice: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Compare-at price</Label>
                          <Input
                            value={form.compareAtPrice}
                            onChange={(e) =>
                              setForm((current) => ({ ...current, compareAtPrice: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cost per item</Label>
                          <Input
                            value={form.costPerItem}
                            onChange={(e) =>
                              setForm((current) => ({ ...current, costPerItem: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Estimated margin:{" "}
                        {profitMargin == null ? "Add cost and price" : `${profitMargin}%`}
                      </p>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={form.taxable}
                          onCheckedChange={(taxable) =>
                            setForm((current) => ({ ...current, taxable }))
                          }
                        />
                        <Label>Taxable</Label>
                      </div>
                      <div className="space-y-2">
                        <Label>Tax category</Label>
                        <Input
                          value={form.taxCategory}
                          onChange={(e) =>
                            setForm((current) => ({ ...current, taxCategory: e.target.value }))
                          }
                        />
                      </div>
                    </ProductEditorSection>
                  </TabsContent>
                  <TabsContent value="inventory" className="mt-0">
                    <ProductEditorSection title="Inventory">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                          <Label>SKU</Label>
                          <Input
                            value={form.sku}
                            onChange={(e) =>
                              setForm((current) => ({ ...current, sku: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Barcode / UPC</Label>
                          <Input
                            value={form.barcode}
                            onChange={(e) =>
                              setForm((current) => ({ ...current, barcode: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            value={form.inventoryQuantity}
                            onChange={(e) =>
                              setForm((current) => ({
                                ...current,
                                inventoryQuantity: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Low stock threshold</Label>
                          <Input
                            type="number"
                            value={form.lowStockThreshold}
                            onChange={(e) =>
                              setForm((current) => ({
                                ...current,
                                lowStockThreshold: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={form.trackInventory}
                            onCheckedChange={(trackInventory) =>
                              setForm((current) => ({ ...current, trackInventory }))
                            }
                          />
                          <Label>Track inventory</Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={form.allowBackorder}
                            onCheckedChange={(allowBackorder) =>
                              setForm((current) => ({ ...current, allowBackorder }))
                            }
                          />
                          <Label>Allow backorders</Label>
                        </div>
                      </div>
                    </ProductEditorSection>
                  </TabsContent>
                  <TabsContent value="shipping" className="mt-0">
                    <ProductEditorSection title="Shipping">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={form.physicalProduct}
                            onCheckedChange={(physicalProduct) =>
                              setForm((current) => ({ ...current, physicalProduct }))
                            }
                          />
                          <Label>Physical product</Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={form.requiresShipping}
                            onCheckedChange={(requiresShipping) =>
                              setForm((current) => ({ ...current, requiresShipping }))
                            }
                          />
                          <Label>Requires shipping</Label>
                        </div>
                        <div className="space-y-2">
                          <Label>Weight</Label>
                          <Input
                            type="number"
                            value={form.weight}
                            onChange={(e) =>
                              setForm((current) => ({ ...current, weight: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Weight unit</Label>
                          <Select
                            value={form.weightUnit}
                            onValueChange={(weightUnit) =>
                              setForm((current) => ({ ...current, weightUnit }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="oz">oz</SelectItem>
                              <SelectItem value="lb">lb</SelectItem>
                              <SelectItem value="g">g</SelectItem>
                              <SelectItem value="kg">kg</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Length</Label>
                          <Input
                            type="number"
                            value={form.length}
                            onChange={(e) =>
                              setForm((current) => ({ ...current, length: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Width</Label>
                          <Input
                            type="number"
                            value={form.width}
                            onChange={(e) =>
                              setForm((current) => ({ ...current, width: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Height</Label>
                          <Input
                            type="number"
                            value={form.height}
                            onChange={(e) =>
                              setForm((current) => ({ ...current, height: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Shipping profile</Label>
                          <Input
                            value={form.shippingProfile}
                            onChange={(e) =>
                              setForm((current) => ({
                                ...current,
                                shippingProfile: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </ProductEditorSection>
                  </TabsContent>
                  <TabsContent value="settings" className="mt-0">
                    <ProductEditorSection title="Publishing and organization">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select
                            value={form.status}
                            onValueChange={(status) =>
                              setForm((current) => ({ ...current, status }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Visibility</Label>
                          <Select
                            value={form.visibility}
                            onValueChange={(visibility) =>
                              setForm((current) => ({ ...current, visibility }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="online">Online store</SelectItem>
                              <SelectItem value="hidden">Hidden</SelectItem>
                              <SelectItem value="admin">Admin only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Scheduled publish</Label>
                          <Input
                            type="datetime-local"
                            value={form.publishedAt}
                            onChange={(e) =>
                              setForm((current) => ({ ...current, publishedAt: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Badge text</Label>
                          <Input
                            value={form.badgeText}
                            onChange={(e) =>
                              setForm((current) => ({ ...current, badgeText: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={form.active}
                            onCheckedChange={(active) =>
                              setForm((current) => ({ ...current, active }))
                            }
                          />
                          <Label>Active</Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={form.featured}
                            onCheckedChange={(featured) =>
                              setForm((current) => ({ ...current, featured }))
                            }
                          />
                          <Label>Featured</Label>
                        </div>
                      </div>
                      {categories.length ? (
                        <div className="space-y-2">
                          <Label>Categories</Label>
                          <div className="max-h-48 overflow-auto rounded-md border p-2">
                            {categories.map((category) => (
                              <label
                                key={category.id}
                                className="flex items-center gap-2 rounded-md px-2 py-1 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={form.categoryIds.includes(category.id)}
                                  onChange={() => toggleCategory(category.id)}
                                />
                                <span>{category.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </ProductEditorSection>
                  </TabsContent>
                  <TabsContent value="seo" className="mt-0">
                    <ProductEditorSection title="SEO and social preview">
                      <div className="space-y-2">
                        <Label>URL slug</Label>
                        <Input
                          value={form.urlSlug}
                          onChange={(e) =>
                            setForm((current) => ({ ...current, urlSlug: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Meta title</Label>
                        <Input
                          value={form.metaTitle}
                          onChange={(e) =>
                            setForm((current) => ({ ...current, metaTitle: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Meta description</Label>
                        <Textarea
                          value={form.metaDescription}
                          onChange={(e) =>
                            setForm((current) => ({ ...current, metaDescription: e.target.value }))
                          }
                          rows={4}
                        />
                      </div>
                      <CmsImageUpload
                        label="OpenGraph image"
                        value={form.ogImage}
                        onChange={(ogImage) => setForm((current) => ({ ...current, ogImage }))}
                        helpText="Used when product links are shared on social platforms."
                        data-testid="ecommerce-product-og-image"
                      />
                    </ProductEditorSection>
                  </TabsContent>
                </div>
              </Tabs>
            </form>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="ecommerce-product-form" disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {editingId ? "Update product" : "Save product"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
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

function formatOrderNoteAuthor(note: NonNullable<Order["internalNotes"]>[number]) {
  const name = [note.author?.firstName, note.author?.lastName].filter(Boolean).join(" ").trim();
  return name || note.author?.email || "Unknown user";
}

function formatOrderPlacedDateTime(value: string | Date, timeZone = "America/New_York") {
  const date = new Date(value);
  const options = { timeZone };
  try {
    return {
      date: new Intl.DateTimeFormat("en-US", {
        ...options,
        month: "numeric",
        day: "numeric",
        year: "numeric",
      }).format(date),
      time: new Intl.DateTimeFormat("en-US", {
        ...options,
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(date),
    };
  } catch {
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    };
  }
}

function formatOptionalDateTime(
  value: string | Date | null | undefined,
  timeZone = "America/New_York",
) {
  if (!value) return "Not recorded";
  const formatted = formatOrderPlacedDateTime(value, timeZone);
  return `${formatted.date} · ${formatted.time}`;
}

function formatShippingAddress(order: Order) {
  const cityRegion = [
    order.shippingCity,
    [order.shippingState, order.shippingZip].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  return [
    order.shippingName,
    order.shippingCompany,
    order.shippingAddress,
    order.shippingLine2,
    cityRegion,
    order.shippingCountry,
  ].filter(Boolean);
}

function DetailLine({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">
        {value || <span className="text-muted-foreground">Not provided</span>}
      </div>
    </div>
  );
}

type ManualOrderMode = "order" | "payment_request";
type ManualCustomerMode = "existing" | "new";
type ManualPaymentAction = "save_draft" | "send_payment_link" | "mark_paid";

interface ManualOrderWizardForm {
  mode: ManualOrderMode;
  customerMode: ManualCustomerMode;
  customerId: string;
  customerSearch: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  line2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  productId: string;
  variantId: string;
  quantity: string;
  discountAmount: string;
  fulfillmentMode: "shipping" | "pickup" | "digital" | "custom";
  notes: string;
  customReason: string;
  paymentAction: ManualPaymentAction;
  manualPaymentMethod: "cash" | "external_card" | "check" | "other";
  manualPaymentReference: string;
  paymentTitle: string;
  paymentDescription: string;
  paymentAmount: string;
}

const defaultManualOrderWizardForm: ManualOrderWizardForm = {
  mode: "order",
  customerMode: "existing",
  customerId: "",
  customerSearch: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  address: "",
  line2: "",
  city: "",
  state: "",
  zipCode: "",
  country: "US",
  productId: "",
  variantId: "",
  quantity: "1",
  discountAmount: "0",
  fulfillmentMode: "shipping",
  notes: "",
  customReason: "",
  paymentAction: "send_payment_link",
  manualPaymentMethod: "external_card",
  manualPaymentReference: "",
  paymentTitle: "",
  paymentDescription: "",
  paymentAmount: "",
};

function dollarsToCents(value: string) {
  const normalized = value.trim().replace(/[$,]/g, "");
  if (!normalized) return 0;
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

function getProductEffectivePrice(product?: Product, variantId?: string) {
  if (!product) return 0;
  const variant =
    product.variants?.find((candidate) => candidate.id === variantId) ??
    product.variants?.find((candidate) => candidate.isDefault) ??
    product.variants?.[0];
  return variant?.salePrice ?? variant?.price ?? product.salePrice ?? product.price;
}

function ManualOrderWizard({
  open,
  onOpenChange,
  products,
  customers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  customers: Customer[];
}) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ManualOrderWizardForm>(defaultManualOrderWizardForm);
  const selectedProduct = products.find((product) => product.id === form.productId);
  const selectedCustomer = customers.find((customer) => customer.id === form.customerId);
  const selectedVariantId =
    form.variantId ||
    selectedProduct?.variants?.find((variant) => variant.isDefault)?.id ||
    selectedProduct?.variants?.[0]?.id ||
    "";
  const quantity = Math.max(1, Number.parseInt(form.quantity, 10) || 1);
  const productSubtotal =
    form.mode === "order"
      ? getProductEffectivePrice(selectedProduct, selectedVariantId) * quantity
      : 0;
  const discountAmount = Math.min(productSubtotal, dollarsToCents(form.discountAmount));
  const orderTotal = Math.max(0, productSubtotal - discountAmount);
  const paymentRequestAmount = dollarsToCents(form.paymentAmount);
  const canCreateNewCustomer = form.customerName.trim() && form.customerEmail.trim();
  const hasCustomer =
    form.customerMode === "existing" ? Boolean(form.customerId) : Boolean(canCreateNewCustomer);
  const hasOrderLine = form.mode === "payment_request" || Boolean(form.productId);
  const reasonRequired =
    form.mode === "payment_request" || discountAmount > 0 || form.fulfillmentMode === "custom";
  const hasReason = !reasonRequired || Boolean(form.customReason.trim() || form.notes.trim());
  const canSubmit =
    hasCustomer &&
    hasOrderLine &&
    hasReason &&
    (form.mode === "order"
      ? orderTotal > 0 || form.paymentAction === "save_draft"
      : paymentRequestAmount > 0 && form.paymentTitle.trim());

  const reset = () => {
    setStep(1);
    setForm(defaultManualOrderWizardForm);
  };

  const createCustomerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/ecommerce/customers", {
        email: form.customerEmail,
        name: form.customerName,
        phone: form.customerPhone || undefined,
        address: form.address || undefined,
        line2: form.line2 || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zipCode: form.zipCode || undefined,
        country: form.country || "US",
      });
      return response.json() as Promise<Customer>;
    },
  });

  const manualOrderMutation = useMutation({
    mutationFn: async () => {
      let customerId = form.customerId;
      if (form.customerMode === "new") {
        const customer = await createCustomerMutation.mutateAsync();
        customerId = customer.id;
      }
      const response = await apiRequest("POST", "/api/admin/ecommerce/orders/manual-draft", {
        customerId,
        items: [
          {
            productId: form.productId,
            variantId: selectedVariantId || undefined,
            quantity,
            discountAmount,
          },
        ],
        fulfillmentMode: form.fulfillmentMode,
        notes: form.notes || undefined,
        customReason: form.customReason || undefined,
        paymentAction: form.paymentAction,
        manualPaymentMethod:
          form.paymentAction === "mark_paid" ? form.manualPaymentMethod : undefined,
        manualPaymentReference:
          form.paymentAction === "mark_paid" ? form.manualPaymentReference : undefined,
      });
      return response.json() as Promise<
        Order & { paymentLink?: { paymentUrl?: string | null } | null }
      >;
    },
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/orders"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/customers"] });
      if (order.paymentLink?.paymentUrl) {
        await navigator.clipboard?.writeText(order.paymentLink.paymentUrl).catch(() => undefined);
      }
      toast({
        title: "Manual order created",
        description: order.paymentLink?.paymentUrl
          ? "The secure payment link was copied to your clipboard."
          : undefined,
      });
      onOpenChange(false);
      reset();
    },
    onError: (error) =>
      toast({
        title: "Manual order could not be created",
        description: error instanceof Error ? error.message : "Please review the order details.",
        variant: "destructive",
      }),
  });

  const paymentRequestMutation = useMutation({
    mutationFn: async () => {
      const customerId = form.customerId;
      let customerPayload: { email: string; name: string } | undefined;
      if (form.customerMode === "new") {
        customerPayload = { email: form.customerEmail, name: form.customerName };
      }
      const response = await apiRequest("POST", "/api/admin/ecommerce/payment-requests", {
        customerId: customerId || undefined,
        customer: customerPayload,
        title: form.paymentTitle,
        description: form.paymentDescription || undefined,
        amount: paymentRequestAmount,
        reason: form.customReason,
      });
      return response.json() as Promise<PaymentRequest>;
    },
    onSuccess: async (request) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/customers"] });
      if (request.paymentUrl) {
        await navigator.clipboard?.writeText(request.paymentUrl).catch(() => undefined);
      }
      toast({
        title: "Payment request created",
        description: request.paymentUrl
          ? "The secure payment link was copied to your clipboard."
          : "The payment request is ready.",
      });
      onOpenChange(false);
      reset();
    },
    onError: (error) =>
      toast({
        title: "Payment request could not be created",
        description: error instanceof Error ? error.message : "Please review the payment request.",
        variant: "destructive",
      }),
  });

  const submit = () => {
    if (!canSubmit) {
      toast({
        title: "Finish required details",
        description: "Customer, line items, totals, and reason fields are required.",
        variant: "destructive",
      });
      return;
    }
    if (form.mode === "payment_request") {
      paymentRequestMutation.mutate();
      return;
    }
    manualOrderMutation.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create order</DialogTitle>
          <DialogDescription>
            Create a manual order, send a payment link, or collect a standalone custom payment
            request.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <div className="space-y-2">
            {["Customer", "Items", "Fulfillment", "Review", "Payment"].map((label, index) => (
              <button
                key={label}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm",
                  step === index + 1 ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
                onClick={() => setStep(index + 1)}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs">
                  {index + 1}
                </span>
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            {step === 1 ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant={form.customerMode === "existing" ? "default" : "outline"}
                    onClick={() => setForm((current) => ({ ...current, customerMode: "existing" }))}
                  >
                    Select existing customer
                  </Button>
                  <Button
                    type="button"
                    variant={form.customerMode === "new" ? "default" : "outline"}
                    onClick={() => setForm((current) => ({ ...current, customerMode: "new" }))}
                  >
                    Create new customer
                  </Button>
                </div>
                {form.customerMode === "existing" ? (
                  <div className="space-y-3">
                    <Input
                      value={form.customerSearch}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, customerSearch: event.target.value }))
                      }
                      placeholder="Search customers by name, email, or phone"
                    />
                    <div className="grid max-h-72 gap-2 overflow-y-auto">
                      {customers
                        .filter((customer) => {
                          const query = form.customerSearch.trim().toLowerCase();
                          return (
                            !query ||
                            [customer.name, customer.email, customer.phone ?? ""].some((value) =>
                              value.toLowerCase().includes(query),
                            )
                          );
                        })
                        .map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            className={cn(
                              "rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
                              form.customerId === customer.id ? "border-primary bg-primary/5" : "",
                            )}
                            onClick={() =>
                              setForm((current) => ({ ...current, customerId: customer.id }))
                            }
                          >
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-muted-foreground">{customer.email}</div>
                          </button>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={form.customerName}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, customerName: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={form.customerEmail}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, customerEmail: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={form.customerPhone}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, customerPhone: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Address</Label>
                      <Input
                        value={form.address}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, address: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Address line 2</Label>
                      <Input
                        value={form.line2}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, line2: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={form.city}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, city: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State / region</Label>
                      <Input
                        value={form.state}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, state: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Postal code</Label>
                      <Input
                        value={form.zipCode}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, zipCode: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant={form.mode === "order" ? "default" : "outline"}
                    onClick={() => setForm((current) => ({ ...current, mode: "order" }))}
                  >
                    Manual order
                  </Button>
                  <Button
                    type="button"
                    variant={form.mode === "payment_request" ? "default" : "outline"}
                    onClick={() => setForm((current) => ({ ...current, mode: "payment_request" }))}
                  >
                    Custom payment request
                  </Button>
                </div>
                {form.mode === "order" ? (
                  <div className="grid gap-3 sm:grid-cols-[1fr_150px_150px]">
                    <div className="space-y-2">
                      <Label>Product</Label>
                      <Select
                        value={form.productId || "__none"}
                        onValueChange={(productId) =>
                          setForm((current) => ({
                            ...current,
                            productId: productId === "__none" ? "" : productId,
                            variantId: "",
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">Choose product</SelectItem>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.quantity}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, quantity: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Line discount</Label>
                      <Input
                        value={form.discountAmount}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, discountAmount: event.target.value }))
                        }
                        placeholder="0.00"
                      />
                    </div>
                    {selectedProduct && (selectedProduct.variants?.length ?? 0) > 1 ? (
                      <div className="space-y-2 sm:col-span-3">
                        <Label>Variant</Label>
                        <Select
                          value={selectedVariantId}
                          onValueChange={(variantId) =>
                            setForm((current) => ({ ...current, variantId }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedProduct.variants?.map((variant) => (
                              <SelectItem key={variant.id} value={variant.id}>
                                {variant.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Payment title</Label>
                      <Input
                        value={form.paymentTitle}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, paymentTitle: event.target.value }))
                        }
                        placeholder="Special in-person sale"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input
                        value={form.paymentAmount}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, paymentAmount: event.target.value }))
                        }
                        placeholder="125.00"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        value={form.paymentDescription}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            paymentDescription: event.target.value,
                          }))
                        }
                        rows={3}
                      />
                    </div>
                    <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2">
                      Custom payment requests do not create fulfillment, shipment, inventory, or
                      order records.
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["shipping", "Requires shipping"],
                  ["pickup", "Pickup / in-person"],
                  ["digital", "Digital or no fulfillment"],
                  ["custom", "Custom no-shipment case"],
                ].map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    variant={form.fulfillmentMode === value ? "default" : "outline"}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        fulfillmentMode: value as ManualOrderWizardForm["fulfillmentMode"],
                      }))
                    }
                    disabled={form.mode === "payment_request"}
                  >
                    {label}
                  </Button>
                ))}
                {form.mode === "payment_request" ? (
                  <p className="text-sm text-muted-foreground sm:col-span-2">
                    Standalone payment requests skip fulfillment by design.
                  </p>
                ) : null}
              </div>
            ) : null}

            {step === 4 ? (
              <div className="grid gap-4">
                <div className="rounded-lg border p-4">
                  <div className="font-medium">
                    {form.customerMode === "existing" ? selectedCustomer?.name : form.customerName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {form.customerMode === "existing"
                      ? selectedCustomer?.email
                      : form.customerEmail}
                  </div>
                </div>
                <div className="rounded-lg border p-4 text-sm">
                  {form.mode === "order" ? (
                    <>
                      <div className="flex justify-between">
                        <span>
                          {selectedProduct?.name || "No product selected"} x {quantity}
                        </span>
                        <span>{formatMoney(productSubtotal)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Manual discount</span>
                        <span>-{formatMoney(discountAmount)}</span>
                      </div>
                      <div className="mt-3 flex justify-between border-t pt-3 text-base font-semibold">
                        <span>Total</span>
                        <span>{formatMoney(orderTotal)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span>{form.paymentTitle || "Custom payment request"}</span>
                        <span>{formatMoney(paymentRequestAmount)}</span>
                      </div>
                      <p className="mt-2 text-muted-foreground">
                        No fulfillment or shipment will be created.
                      </p>
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{reasonRequired ? "Reason / internal note" : "Internal note"}</Label>
                  <Textarea
                    value={form.customReason}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, customReason: event.target.value }))
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Order notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, notes: event.target.value }))
                    }
                    rows={3}
                  />
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <div className="space-y-4">
                {form.mode === "order" ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Button
                        type="button"
                        variant={form.paymentAction === "send_payment_link" ? "default" : "outline"}
                        onClick={() =>
                          setForm((current) => ({ ...current, paymentAction: "send_payment_link" }))
                        }
                      >
                        Send payment link
                      </Button>
                      <Button
                        type="button"
                        variant={form.paymentAction === "mark_paid" ? "default" : "outline"}
                        onClick={() =>
                          setForm((current) => ({ ...current, paymentAction: "mark_paid" }))
                        }
                      >
                        Mark paid externally
                      </Button>
                      <Button
                        type="button"
                        variant={form.paymentAction === "save_draft" ? "default" : "outline"}
                        onClick={() =>
                          setForm((current) => ({ ...current, paymentAction: "save_draft" }))
                        }
                      >
                        Save draft
                      </Button>
                    </div>
                    {form.paymentAction === "mark_paid" ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Payment method</Label>
                          <Select
                            value={form.manualPaymentMethod}
                            onValueChange={(manualPaymentMethod) =>
                              setForm((current) => ({
                                ...current,
                                manualPaymentMethod:
                                  manualPaymentMethod as ManualOrderWizardForm["manualPaymentMethod"],
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="external_card">External card terminal</SelectItem>
                              <SelectItem value="check">Check</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Reference</Label>
                          <Input
                            value={form.manualPaymentReference}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                manualPaymentReference: event.target.value,
                              }))
                            }
                            placeholder="Receipt or terminal reference"
                          />
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                    A secure Stripe-hosted payment link will be generated and copied when possible.
                  </p>
                )}
                <Button
                  type="button"
                  className="w-full"
                  disabled={
                    !canSubmit ||
                    manualOrderMutation.isPending ||
                    paymentRequestMutation.isPending ||
                    createCustomerMutation.isPending
                  }
                  onClick={submit}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {manualOrderMutation.isPending || paymentRequestMutation.isPending
                    ? "Creating..."
                    : "Create"}
                </Button>
              </div>
            ) : null}

            <div className="flex items-center justify-between border-t pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={step === 1}
                onClick={() => setStep((current) => Math.max(1, current - 1))}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={step === 5}
                onClick={() => setStep((current) => Math.min(5, current + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function OrdersTab() {
  const { toast } = useToast();
  const trackingNumberInputRef = useRef<HTMLInputElement>(null);
  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ["/api/admin/ecommerce/orders"] });
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/admin/ecommerce/products"],
  });
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/admin/ecommerce/customers"],
  });
  const { data: storeSettings } = useQuery<EcommerceStoreSettings>({
    queryKey: ["/api/admin/ecommerce/settings/store"],
  });
  const { data: locations = [] } = useQuery<FulfillmentLocation[]>({
    queryKey: ["/api/admin/ecommerce/shipping/locations"],
  });
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [manualOrderOpen, setManualOrderOpen] = useState(false);
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
  const [trackingPromptAction, setTrackingPromptAction] = useState<"status" | "shipment" | null>(
    null,
  );
  const filteredOrders = orders.filter((order) => {
    const query = orderSearch.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [
        order.id,
        getOrderDisplayNumber(order.id),
        order.customer?.email,
        order.customer?.name,
        ...order.items.map((item) => item.productName),
        ...(order.shipments ?? []).map((shipment) => shipment.trackingNumber ?? ""),
      ].some((value) => value?.toLowerCase().includes(query));
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesPayment = paymentFilter === "all" || order.paymentStatus === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;
  const storeTimezone = storeSettings?.storeTimezone || "America/New_York";
  const selectedOrderPlacedAt = selectedOrder
    ? formatOrderPlacedDateTime(selectedOrder.createdAt, storeTimezone)
    : null;
  const selectedOrderShippingAddress = selectedOrder ? formatShippingAddress(selectedOrder) : [];
  const visibleRevenue = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const unfulfilledCount = orders.filter(
    (order) => !["shipped", "delivered", "cancelled"].includes(order.status),
  ).length;

  const copyOrderNumber = async (order: Order) => {
    const displayOrderNumber = getOrderDisplayNumber(order.id);
    try {
      await navigator.clipboard.writeText(displayOrderNumber);
      toast({ title: "Order number copied", description: displayOrderNumber });
    } catch {
      toast({
        title: "Unable to copy order number",
        description: "Please copy it manually.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (selectedOrder) {
      setStatusForm({ status: selectedOrder.status, notes: "" });
    }
  }, [selectedOrder?.id]);

  const openOrderDetail = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailOpen(true);
  };

  const hasTrackingData = Boolean(
    shipmentForm.trackingNumber.trim() ||
    shipmentForm.trackingUrl.trim() ||
    selectedOrder?.shipments?.some((shipment) => shipment.trackingNumber || shipment.trackingUrl),
  );

  const focusTrackingNumber = () => {
    setTrackingPromptAction(null);
    setTimeout(() => {
      trackingNumberInputRef.current?.focus();
      trackingNumberInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const submitStatusUpdate = (force = false) => {
    if (statusForm.status === "shipped" && !hasTrackingData && !force) {
      setTrackingPromptAction("status");
      return;
    }
    statusMutation.mutate();
  };

  const submitShipment = (force = false) => {
    if (!hasTrackingData && !force) {
      setTrackingPromptAction("shipment");
      return;
    }
    shipmentMutation.mutate();
  };

  const proceedWithoutTracking = () => {
    const action = trackingPromptAction;
    setTrackingPromptAction(null);
    if (action === "status") {
      submitStatusUpdate(true);
      return;
    }
    if (action === "shipment") {
      submitShipment(true);
    }
  };

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
    onError: (error) =>
      toast({
        title: "Order could not be updated",
        description: error instanceof Error ? error.message : "Please review the order status.",
        variant: "destructive",
      }),
  });

  const shipmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) throw new Error("Select an order first.");
      const shipmentResponse = await apiRequest(
        "POST",
        `/api/admin/ecommerce/orders/${selectedOrder.id}/shipments`,
        {
          carrier: shipmentForm.carrier.trim() || null,
          trackingNumber: shipmentForm.trackingNumber.trim() || null,
          trackingUrl: shipmentForm.trackingUrl.trim() || null,
          status: "shipped",
        },
      );
      const shipment = (await shipmentResponse.json()) as { id: string };
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
        items: selectedOrder.items.map((item) => ({
          orderItemId: item.id,
          quantity: item.quantity,
        })),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/orders"] });
      toast({ title: "Order marked shipped" });
      setShipmentForm({
        carrier: "",
        trackingNumber: "",
        trackingUrl: "",
        locationId: "",
        serviceLevel: "",
      });
    },
    onError: (error) =>
      toast({
        title: "Shipment could not be created",
        description:
          error instanceof Error ? error.message : "Please review the fulfillment details.",
        variant: "destructive",
      }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" /> Orders
            </CardTitle>
            <CardDescription>
              Select an order to review items and create a shipment.
            </CardDescription>
          </div>
          <Button type="button" onClick={() => setManualOrderOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create order
          </Button>
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="pending_payment">Pending payment</SelectItem>
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
                <OrderTableRow
                  key={order.id}
                  order={order}
                  selected={selectedOrder?.id === order.id}
                  onSelect={() => openOrderDetail(order.id)}
                  onCopy={copyOrderNumber}
                />
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

      <ManualOrderWizard
        open={manualOrderOpen}
        onOpenChange={setManualOrderOpen}
        products={products}
        customers={customers}
      />

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent size="full" className="w-[92vw] sm:max-w-[92vw]">
          {selectedOrder ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-2xl">
                  <ClipboardList className="h-5 w-5" />
                  Order detail
                </SheetTitle>
                <SheetDescription>
                  {getOrderDisplayNumber(selectedOrder.id)} ·{" "}
                  {selectedOrder.customer?.email || "No customer email"} ·{" "}
                  {selectedOrderPlacedAt?.date} · {selectedOrderPlacedAt?.time}
                </SheetDescription>
              </SheetHeader>
              <SheetBody className="space-y-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <Metric
                    label="Total"
                    value={formatMoney(selectedOrder.totalAmount)}
                    icon={DollarSign}
                    iconClassName="bg-emerald-50 text-emerald-600"
                  />
                  <Metric
                    label="Subtotal"
                    value={formatMoney(selectedOrder.subtotalAmount ?? 0)}
                    icon={ShoppingBag}
                    iconClassName="bg-blue-50 text-blue-600"
                  />
                  <Metric
                    label="Shipping"
                    value={formatMoney(selectedOrder.shippingAmount ?? 0)}
                    icon={Truck}
                    iconClassName="bg-amber-50 text-amber-600"
                  />
                  <Metric
                    label="Tax"
                    value={formatMoney(selectedOrder.taxAmount ?? 0)}
                    icon={Percent}
                    iconClassName="bg-violet-50 text-violet-600"
                  />
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Customer</CardTitle>
                      <CardDescription>Contact information attached to this order.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      <DetailLine
                        label="Name"
                        value={selectedOrder.customer?.name || selectedOrder.shippingName}
                      />
                      <DetailLine label="Email" value={selectedOrder.customer?.email} />
                      <DetailLine label="Phone" value={selectedOrder.customer?.phone} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Ship to</CardTitle>
                      <CardDescription>
                        Destination used for fulfillment and labels.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedOrderShippingAddress.length ? (
                        <div className="space-y-1 text-sm leading-6">
                          {selectedOrderShippingAddress.map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No shipping address was captured for this order.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Order timing</CardTitle>
                      <CardDescription>Shown in the store timezone.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      <DetailLine
                        label="Received"
                        value={
                          selectedOrderPlacedAt
                            ? `${selectedOrderPlacedAt.date} · ${selectedOrderPlacedAt.time}`
                            : undefined
                        }
                      />
                      <DetailLine label="Timezone" value={storeTimezone} />
                      {selectedOrder.isManualOrder ? (
                        <DetailLine label="Order source" value="Manual order" />
                      ) : null}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.25fr_0.9fr]">
                  <div className="space-y-5">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Items</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {selectedOrder.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start justify-between gap-4 rounded-lg border p-3 text-sm"
                          >
                            <div>
                              <div className="font-medium">
                                {item.productName} x {item.quantity}
                              </div>
                              <div className="text-xs text-muted-foreground">Line item</div>
                            </div>
                            <span className="font-medium">{formatMoney(item.lineTotal)}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Payment summary</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>{formatMoney(selectedOrder.subtotalAmount ?? 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Discount</span>
                          <span>-{formatMoney(selectedOrder.discountAmount ?? 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Shipping</span>
                          <span>{formatMoney(selectedOrder.shippingAmount ?? 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tax</span>
                          <span>{formatMoney(selectedOrder.taxAmount ?? 0)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 text-base font-semibold">
                          <span>Total</span>
                          <span>{formatMoney(selectedOrder.totalAmount)}</span>
                        </div>
                        {selectedOrder.manualPaymentMethod ? (
                          <div className="mt-3 grid gap-1 rounded-lg bg-muted/40 p-3 text-xs">
                            <div className="font-medium text-foreground">Manual payment</div>
                            <div className="text-muted-foreground">
                              Method: {selectedOrder.manualPaymentMethod.replace(/_/g, " ")}
                            </div>
                            {selectedOrder.manualPaymentReference ? (
                              <div className="text-muted-foreground">
                                Reference: {selectedOrder.manualPaymentReference}
                              </div>
                            ) : null}
                            {selectedOrder.manualPaymentMarkedAt ? (
                              <div className="text-muted-foreground">
                                Marked paid:{" "}
                                {formatOptionalDateTime(
                                  selectedOrder.manualPaymentMarkedAt,
                                  storeTimezone,
                                )}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Shipment history</CardTitle>
                        <CardDescription>
                          Carrier, tracking, fulfillment, and notification activity.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(selectedOrder.shipments ?? []).length ||
                        (selectedOrder.fulfillments ?? []).length ? (
                          <>
                            {(selectedOrder.shipments ?? []).map((shipment) => (
                              <div key={shipment.id} className="rounded-lg border p-3 text-sm">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium">
                                      {shipment.carrier || "Shipment"} · {shipment.status}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Shipped{" "}
                                      {formatOptionalDateTime(shipment.shippedAt, storeTimezone)}
                                    </p>
                                  </div>
                                  {shipment.trackingNumber ? (
                                    shipment.trackingUrl ? (
                                      <Button asChild size="sm" variant="outline">
                                        <a
                                          href={shipment.trackingUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          {shipment.trackingNumber}
                                        </a>
                                      </Button>
                                    ) : (
                                      <Badge variant="outline">{shipment.trackingNumber}</Badge>
                                    )
                                  ) : (
                                    <Badge variant="secondary">No tracking</Badge>
                                  )}
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  Notification:{" "}
                                  {shipment.emailSentAt
                                    ? formatOptionalDateTime(shipment.emailSentAt, storeTimezone)
                                    : "Not sent"}
                                </p>
                              </div>
                            ))}
                            {(selectedOrder.fulfillments ?? []).map((fulfillment) => (
                              <div
                                key={fulfillment.id}
                                className="rounded-lg border bg-muted/20 p-3 text-sm"
                              >
                                <p className="font-medium">Fulfillment · {fulfillment.status}</p>
                                <p className="text-xs text-muted-foreground">
                                  {fulfillment.carrier || "Manual"}
                                  {fulfillment.serviceLevel
                                    ? ` · ${fulfillment.serviceLevel}`
                                    : ""}{" "}
                                  · {formatOptionalDateTime(fulfillment.fulfilledAt, storeTimezone)}
                                </p>
                                {fulfillment.trackingNumber ? (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Tracking: {fulfillment.trackingNumber}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No shipments or fulfillment records yet.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid content-start gap-5 lg:grid-cols-2 xl:grid-cols-1">
                    <form
                      className="grid gap-4 rounded-lg border p-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        submitStatusUpdate();
                      }}
                    >
                      <div>
                        <h3 className="text-sm font-semibold">Status</h3>
                        <p className="text-xs text-muted-foreground">
                          Changing status sends the customer an order status email.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Order status</Label>
                        <Select
                          value={statusForm.status || selectedOrder.status}
                          onValueChange={(status) =>
                            setStatusForm((current) => ({ ...current, status }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
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
                        <Label>Add internal note</Label>
                        <Textarea
                          value={statusForm.notes}
                          onChange={(event) =>
                            setStatusForm((current) => ({ ...current, notes: event.target.value }))
                          }
                          rows={3}
                        />
                      </div>
                      <Button
                        type="submit"
                        variant="outline"
                        disabled={statusMutation.isPending || !statusForm.status}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Update order
                      </Button>
                    </form>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Internal notes</CardTitle>
                        <CardDescription>
                          Private order notes for admins and operators.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(selectedOrder.internalNotes ?? []).length > 0 ? (
                          selectedOrder.internalNotes?.map((note) => (
                            <div key={note.id} className="rounded-lg border p-3">
                              <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {formatOrderNoteAuthor(note)} ·{" "}
                                {formatOrderPlacedDateTime(note.createdAt, storeTimezone).date} ·{" "}
                                {formatOrderPlacedDateTime(note.createdAt, storeTimezone).time}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No internal notes have been added yet.
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <form
                      className="grid gap-4 rounded-lg border p-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        submitShipment();
                      }}
                    >
                      <div>
                        <h3 className="text-sm font-semibold">Fulfillment</h3>
                        <p className="text-xs text-muted-foreground">
                          Creates a shipment, fulfillment record, and customer shipping email.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Fulfillment location</Label>
                        <Select
                          value={shipmentForm.locationId || "__none"}
                          onValueChange={(locationId) =>
                            setShipmentForm((current) => ({
                              ...current,
                              locationId: locationId === "__none" ? "" : locationId,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none">No location</SelectItem>
                            {locations.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Carrier</Label>
                          <Input
                            value={shipmentForm.carrier}
                            onChange={(event) =>
                              setShipmentForm((current) => ({
                                ...current,
                                carrier: event.target.value,
                              }))
                            }
                            placeholder="UPS"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Service</Label>
                          <Input
                            value={shipmentForm.serviceLevel}
                            onChange={(event) =>
                              setShipmentForm((current) => ({
                                ...current,
                                serviceLevel: event.target.value,
                              }))
                            }
                            placeholder="Ground"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Tracking number</Label>
                        <Input
                          ref={trackingNumberInputRef}
                          value={shipmentForm.trackingNumber}
                          onChange={(event) =>
                            setShipmentForm((current) => ({
                              ...current,
                              trackingNumber: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tracking URL</Label>
                        <Input
                          value={shipmentForm.trackingUrl}
                          onChange={(event) =>
                            setShipmentForm((current) => ({
                              ...current,
                              trackingUrl: event.target.value,
                            }))
                          }
                          placeholder="https://..."
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={shipmentMutation.isPending || selectedOrder.items.length === 0}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Mark shipped
                      </Button>
                    </form>
                  </div>
                </div>
              </SheetBody>
            </>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>Order detail</SheetTitle>
                <SheetDescription>Select an order to manage.</SheetDescription>
              </SheetHeader>
              <SheetBody>
                <p className="text-sm text-muted-foreground">No order is selected.</p>
              </SheetBody>
            </>
          )}
        </SheetContent>
      </Sheet>
      <AlertDialog
        open={trackingPromptAction !== null}
        onOpenChange={(open) => {
          if (!open) setTrackingPromptAction(null);
        }}
      >
        <AlertDialogContent className="z-[1200]">
          <AlertDialogHeader>
            <AlertDialogTitle>Add tracking before marking shipped?</AlertDialogTitle>
            <AlertDialogDescription>
              This order does not have tracking information yet. Would you like to add a tracking
              number before marking it as shipped?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={focusTrackingNumber}>Yes, add tracking</AlertDialogCancel>
            <AlertDialogAction onClick={proceedWithoutTracking}>No, mark shipped</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const [providerCredentialForms, setProviderCredentialForms] = useState<
    Record<string, Record<string, string>>
  >({});

  useEffect(() => {
    if (!rateForm.zoneId && zones[0]?.id) {
      setRateForm((current) => ({ ...current, zoneId: zones[0].id }));
    }
  }, [rateForm.zoneId, zones]);

  const resetZoneForm = () =>
    setZoneForm({
      id: "",
      name: "",
      countries: "US",
      states: "",
      active: true,
    });

  const resetRateForm = () =>
    setRateForm({
      id: "",
      zoneId: zones[0]?.id ?? "",
      name: "",
      description: "",
      amount: "",
      minOrderAmount: "",
      maxOrderAmount: "",
      active: true,
    });

  const resetLocationForm = () =>
    setLocationForm({
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
    onError: (error) =>
      toast({
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
    onError: (error) =>
      toast({
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
      await queryClient.invalidateQueries({
        queryKey: ["/api/admin/ecommerce/shipping/locations"],
      });
      toast({
        title: locationForm.id ? "Fulfillment location updated" : "Fulfillment location created",
      });
      resetLocationForm();
    },
    onError: (error) =>
      toast({
        title: "Location could not be saved",
        description:
          error instanceof Error ? error.message : "Please review the fulfillment location.",
        variant: "destructive",
      }),
  });
  const providerMutation = useMutation({
    mutationFn: async ({
      provider,
      active,
      testMode,
    }: {
      provider: ShippingProvider;
      active: boolean;
      testMode: boolean;
    }) =>
      apiRequest("PUT", `/api/admin/ecommerce/shipping/providers/${provider.provider}`, {
        displayName: provider.displayName,
        type: provider.type,
        capabilities: provider.capabilities,
        settings: {},
        active,
        testMode,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["/api/admin/ecommerce/shipping/providers"],
      });
      toast({ title: "Shipping provider updated" });
    },
    onError: (error) =>
      toast({
        title: "Shipping provider could not be updated",
        description:
          error instanceof Error ? error.message : "Save provider credentials before enabling it.",
        variant: "destructive",
      }),
  });
  const credentialMutation = useMutation({
    mutationFn: async (provider: ShippingProvider) =>
      apiRequest(
        "PUT",
        `/api/admin/ecommerce/shipping/providers/${provider.provider}/credentials`,
        { credentials: providerCredentialForms[provider.provider] ?? {} },
      ),
    onSuccess: async (_response, provider) => {
      await queryClient.invalidateQueries({
        queryKey: ["/api/admin/ecommerce/shipping/providers"],
      });
      setProviderCredentialForms((current) => ({ ...current, [provider.provider]: {} }));
      toast({ title: `${provider.displayName} credentials saved` });
    },
    onError: (error) =>
      toast({
        title: "Credentials could not be saved",
        description:
          error instanceof Error ? error.message : "Please review the provider credentials.",
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

  const groupedProviders = providers.reduce<Record<string, ShippingProvider[]>>(
    (groups, provider) => {
      const key = provider.type.replace(/_/g, " ");
      groups[key] = [...(groups[key] ?? []), provider];
      return groups;
    },
    {},
  );
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
            <CardDescription>
              Define the countries and optional states a group of checkout rates applies to.
            </CardDescription>
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
                  onChange={(event) =>
                    setZoneForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="United States"
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Countries</Label>
                  <Input
                    value={zoneForm.countries}
                    onChange={(event) =>
                      setZoneForm((current) => ({ ...current, countries: event.target.value }))
                    }
                    placeholder="US, CA"
                  />
                </div>
                <div className="space-y-2">
                  <Label>States</Label>
                  <Input
                    value={zoneForm.states}
                    onChange={(event) =>
                      setZoneForm((current) => ({ ...current, states: event.target.value }))
                    }
                    placeholder="MI, OH"
                  />
                </div>
              </div>
              <label className="flex items-center gap-3 rounded-lg border p-3">
                <Switch
                  checked={zoneForm.active}
                  onCheckedChange={(active) => setZoneForm((current) => ({ ...current, active }))}
                />
                <span className="text-sm font-medium">Active</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={zoneMutation.isPending || !zoneForm.name.trim()}>
                  <Save className="mr-2 h-4 w-4" />
                  {zoneForm.id ? "Update zone" : "Create zone"}
                </Button>
                {zoneForm.id ? (
                  <Button type="button" variant="outline" onClick={resetZoneForm}>
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
              <Truck className="h-5 w-5" />
              Shipping zones
            </CardTitle>
            <CardDescription>
              Active zones determine which shipping rates can be selected at checkout.
            </CardDescription>
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
                    <TableRow
                      key={zone.id}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onClick={() =>
                        setZoneForm({
                          id: zone.id,
                          name: zone.name,
                          countries: zone.countries.join(", "),
                          states: zone.states.join(", "),
                          active: zone.active,
                        })
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setZoneForm({
                            id: zone.id,
                            name: zone.name,
                            countries: zone.countries.join(", "),
                            states: zone.states.join(", "),
                            active: zone.active,
                          });
                        }
                      }}
                    >
                      <TableCell className="font-medium">{zone.name}</TableCell>
                      <TableCell>
                        {zone.countries.length ? zone.countries.join(", ") : "All"}
                      </TableCell>
                      <TableCell>{zone.states.length ? zone.states.join(", ") : "All"}</TableCell>
                      <TableCell>
                        <Badge variant={zone.active ? "default" : "secondary"}>
                          {zone.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setZoneForm({
                              id: zone.id,
                              name: zone.name,
                              countries: zone.countries.join(", "),
                              states: zone.states.join(", "),
                              active: zone.active,
                            });
                          }}
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
              <p className="text-sm text-muted-foreground">
                No shipping zones have been added yet.
              </p>
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
            <CardDescription>
              Add flat rates and optional order thresholds for checkout.
            </CardDescription>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select a zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={rateForm.name}
                  onChange={(event) =>
                    setRateForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Standard shipping"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={rateForm.description}
                  onChange={(event) =>
                    setRateForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="3-5 business days"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={rateForm.amount}
                    onChange={(event) =>
                      setRateForm((current) => ({ ...current, amount: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min order</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={rateForm.minOrderAmount}
                    onChange={(event) =>
                      setRateForm((current) => ({ ...current, minOrderAmount: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max order</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={rateForm.maxOrderAmount}
                    onChange={(event) =>
                      setRateForm((current) => ({ ...current, maxOrderAmount: event.target.value }))
                    }
                  />
                </div>
              </div>
              <label className="flex items-center gap-3 rounded-lg border p-3">
                <Switch
                  checked={rateForm.active}
                  onCheckedChange={(active) => setRateForm((current) => ({ ...current, active }))}
                />
                <span className="text-sm font-medium">Active</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={
                    rateMutation.isPending ||
                    !rateForm.zoneId ||
                    !rateForm.name.trim() ||
                    !rateForm.amount.trim()
                  }
                >
                  <Save className="mr-2 h-4 w-4" />
                  {rateForm.id ? "Update rate" : "Create rate"}
                </Button>
                {rateForm.id ? (
                  <Button type="button" variant="outline" onClick={resetRateForm}>
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
              <Truck className="h-5 w-5" />
              Shipping rates
            </CardTitle>
            <CardDescription>
              These rates are returned to checkout when their zone and order thresholds match.
            </CardDescription>
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
                    <TableRow
                      key={rate.id}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onClick={() =>
                        setRateForm({
                          id: rate.id,
                          zoneId: rate.zoneId,
                          name: rate.name,
                          description: rate.description ?? "",
                          amount: String(rate.amount / 100),
                          minOrderAmount:
                            rate.minOrderAmount == null ? "" : String(rate.minOrderAmount / 100),
                          maxOrderAmount:
                            rate.maxOrderAmount == null ? "" : String(rate.maxOrderAmount / 100),
                          active: rate.active,
                        })
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setRateForm({
                            id: rate.id,
                            zoneId: rate.zoneId,
                            name: rate.name,
                            description: rate.description ?? "",
                            amount: String(rate.amount / 100),
                            minOrderAmount:
                              rate.minOrderAmount == null ? "" : String(rate.minOrderAmount / 100),
                            maxOrderAmount:
                              rate.maxOrderAmount == null ? "" : String(rate.maxOrderAmount / 100),
                            active: rate.active,
                          });
                        }
                      }}
                    >
                      <TableCell>
                        <div className="font-medium">{rate.name}</div>
                        {rate.description ? (
                          <div className="text-xs text-muted-foreground">{rate.description}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>{zoneMap.get(rate.zoneId)?.name ?? "Missing zone"}</TableCell>
                      <TableCell>{formatMoney(rate.amount)}</TableCell>
                      <TableCell>
                        {rate.minOrderAmount || rate.maxOrderAmount
                          ? `${rate.minOrderAmount ? formatMoney(rate.minOrderAmount) : "$0.00"} - ${rate.maxOrderAmount ? formatMoney(rate.maxOrderAmount) : "No max"}`
                          : "Any order"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={rate.active ? "default" : "secondary"}>
                          {rate.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setRateForm({
                              id: rate.id,
                              zoneId: rate.zoneId,
                              name: rate.name,
                              description: rate.description ?? "",
                              amount: String(rate.amount / 100),
                              minOrderAmount:
                                rate.minOrderAmount == null
                                  ? ""
                                  : String(rate.minOrderAmount / 100),
                              maxOrderAmount:
                                rate.maxOrderAmount == null
                                  ? ""
                                  : String(rate.maxOrderAmount / 100),
                              active: rate.active,
                            });
                          }}
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
              <p className="text-sm text-muted-foreground">
                No shipping rates have been added yet.
              </p>
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
            <CardDescription>
              Create merchant, store, warehouse, or future 3PL fulfillment locations.
            </CardDescription>
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
                  onChange={(event) =>
                    setLocationForm((current) => ({ ...current, name: event.target.value }))
                  }
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                  <Input
                    value={locationForm.city}
                    onChange={(event) =>
                      setLocationForm((current) => ({ ...current, city: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={locationForm.state}
                    onChange={(event) =>
                      setLocationForm((current) => ({ ...current, state: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    value={locationForm.country}
                    onChange={(event) =>
                      setLocationForm((current) => ({ ...current, country: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-lg border p-3">
                  <Switch
                    checked={locationForm.isPrimary}
                    onCheckedChange={(isPrimary) =>
                      setLocationForm((current) => ({ ...current, isPrimary }))
                    }
                  />
                  <span className="text-sm font-medium">Primary location</span>
                </label>
                <label className="flex items-center gap-3 rounded-lg border p-3">
                  <Switch
                    checked={locationForm.active}
                    onCheckedChange={(active) =>
                      setLocationForm((current) => ({ ...current, active }))
                    }
                  />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={locationMutation.isPending || !locationForm.name.trim()}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {locationForm.id ? "Update location" : "Create location"}
                </Button>
                {locationForm.id ? (
                  <Button type="button" variant="outline" onClick={resetLocationForm}>
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
              <Package className="h-5 w-5" />
              Fulfillment locations
            </CardTitle>
            <CardDescription>
              Locations are the foundation for future warehouse routing, local delivery, split
              shipments, and 3PL workflows.
            </CardDescription>
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
                    <TableRow
                      key={location.id}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onClick={() =>
                        setLocationForm({
                          id: location.id,
                          name: location.name,
                          type: location.type,
                          city: location.city ?? "",
                          state: location.state ?? "",
                          country: location.country,
                          isPrimary: location.isPrimary,
                          active: location.active,
                        })
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setLocationForm({
                            id: location.id,
                            name: location.name,
                            type: location.type,
                            city: location.city ?? "",
                            state: location.state ?? "",
                            country: location.country,
                            isPrimary: location.isPrimary,
                            active: location.active,
                          });
                        }
                      }}
                    >
                      <TableCell className="font-medium">{location.name}</TableCell>
                      <TableCell className="capitalize">
                        {location.type.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>
                        {[location.city, location.state, location.country]
                          .filter(Boolean)
                          .join(", ")}
                      </TableCell>
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
                          onClick={(event) => {
                            event.stopPropagation();
                            setLocationForm({
                              id: location.id,
                              name: location.name,
                              type: location.type,
                              city: location.city ?? "",
                              state: location.state ?? "",
                              country: location.country,
                              isPrimary: location.isPrimary,
                              active: location.active,
                            });
                          }}
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
              <p className="text-sm text-muted-foreground">
                No fulfillment locations have been added yet.
              </p>
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
          <CardDescription>
            Provider connections are modeled separately from zones so checkout, labels, tracking,
            and fulfillment automation can share the same engine.
          </CardDescription>
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
                          <p className="mt-1 text-sm text-muted-foreground">
                            {provider.recommendedFor}
                          </p>
                        </div>
                        <Badge variant={provider.active ? "default" : "secondary"}>
                          {provider.operational
                            ? "Operational"
                            : provider.active
                              ? "Needs setup"
                              : "Available"}
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
                            onCheckedChange={(active) =>
                              providerMutation.mutate({
                                provider,
                                active,
                                testMode: provider.testMode,
                              })
                            }
                            disabled={activationBlocked || providerMutation.isPending}
                          />
                        </label>
                        <label className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium">Test mode</span>
                          <Switch
                            checked={provider.testMode}
                            onCheckedChange={(testMode) =>
                              providerMutation.mutate({
                                provider,
                                active: provider.active,
                                testMode,
                              })
                            }
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
                                value={
                                  providerCredentialForms[provider.provider]?.[field.key] ?? ""
                                }
                                onChange={(event) =>
                                  updateProviderCredential(
                                    provider.provider,
                                    field.key,
                                    event.target.value,
                                  )
                                }
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
                                !Object.values(
                                  providerCredentialForms[provider.provider] ?? {},
                                ).some((value) => value.trim())
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

export default function AdminEcommercePage() {
  const [location] = useLocation();
  const view = (location.split("/").pop() || "products") as View;
  const activeView: View = nav.some((item) => item.view === view) ? view : "products";
  return (
    <AdminSidebar>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Ecommerce</h1>
          <p className="text-muted-foreground">
            Manage the storefront, checkout operations, fulfillment, and Stripe configuration.
          </p>
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

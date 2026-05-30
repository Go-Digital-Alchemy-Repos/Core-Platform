import { type ElementType, FormEvent, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ClipboardList,
  Package,
  Plug,
  Plus,
  Save,
  Settings,
  ShoppingBag,
  Tag,
  TicketPercent,
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
  active: boolean;
}

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  active: boolean;
  timesUsed: number;
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
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/admin/ecommerce/categories"] });
  const [name, setName] = useState("");
  const mutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/ecommerce/categories", {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      active: true,
      sortOrder: 0,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/categories"] }),
  });
  return <CrudList title="Categories" icon={<Package className="h-5 w-5" />} value={name} setValue={setName} onCreate={() => mutation.mutate()} rows={categories.map((c) => [c.name, c.slug, c.active ? "Active" : "Inactive"])} />;
}

function CouponsTab() {
  const { data: coupons = [] } = useQuery<Coupon[]>({ queryKey: ["/api/admin/ecommerce/coupons"] });
  const [code, setCode] = useState("");
  const [value, setValue] = useState("");
  const mutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/ecommerce/coupons", { code, type: "fixed", value: cents(value), active: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/coupons"] }),
  });
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><TicketPercent className="h-5 w-5" /> Coupons</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]"><Input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} /><Input placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} /><Button onClick={() => mutation.mutate()}>Create</Button></div>
        <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Type</TableHead><TableHead>Value</TableHead><TableHead>Used</TableHead></TableRow></TableHeader><TableBody>{coupons.map((coupon) => <TableRow key={coupon.id}><TableCell>{coupon.code}</TableCell><TableCell>{coupon.type}</TableCell><TableCell>{coupon.type === "percentage" ? `${coupon.value}%` : formatMoney(coupon.value)}</TableCell><TableCell>{coupon.timesUsed}</TableCell></TableRow>)}</TableBody></Table>
      </CardContent>
    </Card>
  );
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

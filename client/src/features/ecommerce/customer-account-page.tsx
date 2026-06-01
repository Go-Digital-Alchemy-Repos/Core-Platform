import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bell, Home, Lock, MapPin, Package, Settings, ShieldCheck, ShoppingBag, Truck, User } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "./cart-store";
import { getEcommerceOrderStatusBadge, getEcommercePaymentStatusBadge } from "./order-status-labels";

type AccountView = "dashboard" | "orders" | "order" | "profile" | "addresses" | "security" | "preferences";

interface AccountCustomer {
  email: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  marketingEmailOptIn: boolean;
  orderSmsOptIn: boolean;
}

interface AccountOrder {
  id: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  subtotalAmount?: number;
  discountAmount?: number;
  shippingAmount?: number;
  taxAmount?: number;
  createdAt?: string;
  items: Array<{ id: string; productName: string; variantTitle?: string | null; quantity: number; lineTotal: number }>;
  shipments: Array<{ id: string; carrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null; status: string; shippedAt?: string | null }>;
  refunds?: Array<{ id: string; amount: number; status: string; createdAt?: string }>;
}

interface AccountOverview {
  customer: AccountCustomer;
  recentOrders: AccountOrder[];
  orderCount: number;
  openShipmentCount: number;
}

function accountPath(view: AccountView) {
  if (view === "dashboard") return "/account";
  if (view === "order") return "/account/orders";
  return `/account/${view}`;
}

function AccountShell({ view, children }: { view: AccountView; children: React.ReactNode }) {
  const links: Array<{ view: AccountView; label: string; icon: React.ElementType }> = [
    { view: "dashboard", label: "Overview", icon: Home },
    { view: "orders", label: "Orders", icon: Package },
    { view: "addresses", label: "Addresses", icon: MapPin },
    { view: "profile", label: "Profile", icon: User },
    { view: "security", label: "Security", icon: ShieldCheck },
    { view: "preferences", label: "Preferences", icon: Bell },
  ];
  return (
    <PageLayout>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="font-heading text-4xl font-semibold">My account</h1>
          <p className="mt-2 text-muted-foreground">Manage orders, shipping details, profile, and account preferences.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <Card className="h-fit">
            <CardContent className="grid gap-1 p-3">
              {links.map((item) => {
                const Icon = item.icon;
                const active = view === item.view || (view === "order" && item.view === "orders");
                return (
                  <Button key={item.view} asChild variant={active ? "secondary" : "ghost"} className="justify-start">
                    <Link href={accountPath(item.view)}>
                      <Icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
            </CardContent>
          </Card>
          {children}
        </div>
      </div>
    </PageLayout>
  );
}

function OrderBadges({ order }: { order: AccountOrder }) {
  const orderStatus = getEcommerceOrderStatusBadge(order.status);
  const payment = getEcommercePaymentStatusBadge(order.paymentStatus);
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant={orderStatus.variant} className={orderStatus.className}>{orderStatus.label}</Badge>
      <Badge variant={payment.variant} className={payment.className}>{payment.label}</Badge>
    </div>
  );
}

function OrderList({ orders }: { orders: AccountOrder[] }) {
  if (!orders.length) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">No orders yet.</p>
          <Button asChild className="mt-5"><Link href="/shop">Shop products</Link></Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Card key={order.id} className="transition-colors hover:border-primary/40 hover:bg-muted/30">
          <Link
            href={`/account/orders/${order.id}`}
            className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-mono text-xs text-muted-foreground">#{order.id}</p>
                <p className="font-semibold">{formatMoney(order.totalAmount)}</p>
                {order.createdAt ? <p className="text-sm text-muted-foreground">Placed {new Date(order.createdAt).toLocaleDateString()}</p> : null}
              </div>
              <OrderBadges order={order} />
              <span className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors group-hover:bg-accent">
                View order
              </span>
            </CardContent>
          </Link>
        </Card>
      ))}
    </div>
  );
}

function OrderDetail({ orderId }: { orderId: string }) {
  const { data: order } = useQuery<AccountOrder>({ queryKey: ["/api/ecommerce/account/orders", orderId] });
  if (!order) return <Card><CardContent className="p-8 text-muted-foreground">Loading order...</CardContent></Card>;
  return (
    <Card>
      <CardHeader className="gap-4">
        <Button asChild variant="ghost" className="w-fit px-0 text-muted-foreground hover:bg-transparent hover:text-foreground">
          <Link href="/account/orders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to orders
          </Link>
        </Button>
        <div>
          <CardTitle>Order #{order.id.slice(0, 8)}</CardTitle>
          <CardDescription>{order.createdAt ? `Placed ${new Date(order.createdAt).toLocaleDateString()}` : "Order details"}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <OrderBadges order={order} />
        <div className="grid gap-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between rounded-lg border p-3">
              <span>
                <span className="block font-medium">{item.productName} x {item.quantity}</span>
                {item.variantTitle ? <span className="text-sm text-muted-foreground">{item.variantTitle}</span> : null}
              </span>
              <span>{formatMoney(item.lineTotal)}</span>
            </div>
          ))}
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(order.subtotalAmount ?? 0)}</span></div>
          <div className="mt-2 flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatMoney(order.discountAmount ?? 0)}</span></div>
          <div className="mt-2 flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatMoney(order.shippingAmount ?? 0)}</span></div>
          <div className="mt-2 flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatMoney(order.taxAmount ?? 0)}</span></div>
          <div className="mt-3 flex justify-between border-t pt-3 font-semibold"><span>Total</span><span>{formatMoney(order.totalAmount)}</span></div>
        </div>
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 font-semibold"><Truck className="h-4 w-4" /> Shipments</h3>
          {order.shipments.length ? order.shipments.map((shipment) => (
            <div key={shipment.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{shipment.carrier || "Carrier pending"}</p>
                  {shipment.trackingNumber ? <p className="font-mono text-sm text-muted-foreground">{shipment.trackingNumber}</p> : null}
                </div>
                <Badge variant="outline">{shipment.status}</Badge>
              </div>
              {shipment.trackingUrl ? <Button asChild variant="outline" className="mt-4"><a href={shipment.trackingUrl} target="_blank" rel="noreferrer">Track package</a></Button> : null}
            </div>
          )) : <p className="rounded-lg border p-4 text-sm text-muted-foreground">Tracking will appear here once the order ships.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CustomerAccountPage({ view }: { view: AccountView }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { data: overview } = useQuery<AccountOverview>({ queryKey: ["/api/ecommerce/account"] });
  const { data: orders = [] } = useQuery<AccountOrder[]>({ queryKey: ["/api/ecommerce/account/orders"], enabled: view === "orders" });
  const orderId = useMemo(() => location.split("/").at(-1) ?? "", [location]);
  const customer = overview?.customer;
  const [profile, setProfile] = useState({ firstName: "", lastName: "", phone: "" });
  const [address, setAddress] = useState({ address: "", line2: "", city: "", state: "", zipCode: "", country: "US" });
  const [preferences, setPreferences] = useState({ marketingEmailOptIn: false, orderSmsOptIn: false });

  useEffect(() => {
    if (!customer) return;
    const [firstName, ...rest] = customer.name.split(" ");
    setProfile({ firstName: firstName || "", lastName: rest.join(" "), phone: customer.phone ?? "" });
    setAddress({
      address: customer.address ?? "",
      line2: customer.line2 ?? "",
      city: customer.city ?? "",
      state: customer.state ?? "",
      zipCode: customer.zipCode ?? "",
      country: customer.country ?? "US",
    });
    setPreferences({
      marketingEmailOptIn: customer.marketingEmailOptIn,
      orderSmsOptIn: customer.orderSmsOptIn,
    });
  }, [customer]);

  const saveMutation = useMutation({
    mutationFn: async ({ path, body }: { path: string; body: unknown }) => {
      const res = await apiRequest("PUT", path, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/account"] });
      toast({ title: "Account updated" });
    },
  });

  const submit = (path: string, body: unknown) => (event: FormEvent) => {
    event.preventDefault();
    saveMutation.mutate({ path, body });
  };

  if (!overview || !user) {
    return <AccountShell view={view}><Card><CardContent className="p-8 text-muted-foreground">Loading account...</CardContent></Card></AccountShell>;
  }
  const activeCustomer = overview.customer;

  return (
    <AccountShell view={view}>
      {view === "dashboard" ? (
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>Recent orders</CardTitle></CardHeader><CardContent><OrderList orders={overview.recentOrders} /></CardContent></Card>
        </div>
      ) : null}
      {view === "orders" ? <OrderList orders={orders} /> : null}
      {view === "order" ? <OrderDetail orderId={orderId} /> : null}
      {view === "profile" ? (
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Update your customer contact details.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={submit("/api/ecommerce/account/profile", profile)} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>First name</Label><Input value={profile.firstName} onChange={(e) => setProfile((current) => ({ ...current, firstName: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Last name</Label><Input value={profile.lastName} onChange={(e) => setProfile((current) => ({ ...current, lastName: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={user.email} disabled /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={profile.phone} onChange={(e) => setProfile((current) => ({ ...current, phone: e.target.value }))} /></div>
              <Button type="submit" className="w-fit">Save profile</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
      {view === "addresses" ? (
        <Card>
          <CardHeader><CardTitle>Addresses</CardTitle><CardDescription>Save the shipping address used for future orders.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={submit("/api/ecommerce/account/address", address)} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><Label>Address</Label><Input value={address.address} onChange={(e) => setAddress((current) => ({ ...current, address: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Address line 2</Label><Input value={address.line2} onChange={(e) => setAddress((current) => ({ ...current, line2: e.target.value }))} /></div>
              <div className="space-y-2"><Label>City</Label><Input value={address.city} onChange={(e) => setAddress((current) => ({ ...current, city: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>State</Label><Input value={address.state} onChange={(e) => setAddress((current) => ({ ...current, state: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>ZIP</Label><Input value={address.zipCode} onChange={(e) => setAddress((current) => ({ ...current, zipCode: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Country</Label><Input value={address.country} onChange={(e) => setAddress((current) => ({ ...current, country: e.target.value }))} required /></div>
              <Button type="submit" className="w-fit">Save address</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
      {view === "security" ? (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Security</CardTitle><CardDescription>Manage sign-in access for your customer account.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <Button asChild variant="outline"><Link href="/auth/forgot-password">Reset password</Link></Button>
            <Button variant="outline" onClick={() => logout.mutate()}>Log out</Button>
          </CardContent>
        </Card>
      ) : null}
      {view === "preferences" ? (
        <Card>
          <CardHeader><CardTitle>Preferences</CardTitle><CardDescription>Choose how you want to hear from this store.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={submit("/api/ecommerce/account/preferences", preferences)} className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4"><div><Label>Marketing emails</Label><p className="text-sm text-muted-foreground">Receive product updates and store announcements.</p></div><Switch checked={preferences.marketingEmailOptIn} onCheckedChange={(marketingEmailOptIn) => setPreferences((current) => ({ ...current, marketingEmailOptIn }))} /></div>
              <div className="flex items-center justify-between rounded-lg border p-4"><div><Label>SMS order updates</Label><p className="text-sm text-muted-foreground">Allow text updates when SMS notifications are connected.</p></div><Switch checked={preferences.orderSmsOptIn} onCheckedChange={(orderSmsOptIn) => setPreferences((current) => ({ ...current, orderSmsOptIn }))} /></div>
              <Button type="submit">Save preferences</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </AccountShell>
  );
}

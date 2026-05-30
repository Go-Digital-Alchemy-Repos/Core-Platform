import { FormEvent, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Clock3, ExternalLink, Package, Truck } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { formatMoney } from "./cart-store";

interface OrderDetails {
  id: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  subtotalAmount?: number;
  discountAmount?: number;
  shippingAmount?: number;
  taxAmount?: number;
  createdAt?: string;
  items: Array<{ id: string; productName: string; variantTitle?: string | null; quantity: number; unitPrice?: number; lineTotal: number }>;
  shipments: Array<{
    id: string;
    carrier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    status: string;
    shippedAt?: string;
    emailSentAt?: string | null;
  }>;
}

const ORDER_STEPS = [
  { key: "pending", label: "Received" },
  { key: "paid", label: "Paid" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

function orderStepIndex(status: string): number {
  if (status === "cancelled") return -1;
  const index = ORDER_STEPS.findIndex((step) => step.key === status);
  return index >= 0 ? index : 0;
}

export default function OrderStatusPage() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const [orderId, setOrderId] = useState(params.get("orderId") || "");
  const [email, setEmail] = useState(params.get("email") || "");
  const [token, setToken] = useState(params.get("token") || "");
  const [order, setOrder] = useState<OrderDetails | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ecommerce/orders/status", { orderId, email, token: token || undefined });
      return res.json() as Promise<OrderDetails>;
    },
    onSuccess: setOrder,
  });

  useEffect(() => {
    if (orderId && email) mutation.mutate();
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <PageLayout>
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-4xl font-semibold">Order status</h1>
          <p className="text-muted-foreground">Track fulfillment, shipment details, and order totals.</p>
        </div>
        <Card className="mt-8">
          <CardHeader><CardTitle>Look up an order</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-2"><Label>Order ID</Label><Input value={orderId} onChange={(e) => setOrderId(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Token</Label><Input value={token} onChange={(e) => setToken(e.target.value)} /></div>
              <Button type="submit" disabled={mutation.isPending} className="sm:col-span-3">Find order</Button>
            </form>
          </CardContent>
        </Card>
        {order ? (
          <Card className="mt-6">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-sm text-muted-foreground">#{order.id}</p>
                  <h2 className="text-2xl font-semibold">Order details</h2>
                  {order.createdAt ? <p className="text-sm text-muted-foreground">Placed {new Date(order.createdAt).toLocaleDateString()}</p> : null}
                </div>
                <div className="flex gap-2"><Badge>{order.status}</Badge><Badge variant="outline">{order.paymentStatus}</Badge></div>
              </div>

              {order.status === "cancelled" ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                  This order has been cancelled.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-4">
                  {ORDER_STEPS.map((step, index) => {
                    const complete = index <= orderStepIndex(order.status);
                    return (
                      <div key={step.key} className="rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          {complete ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock3 className="h-4 w-4 text-muted-foreground" />}
                          <span className="font-medium">{step.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between rounded-md border p-3">
                      <span>
                        <span className="block font-medium">{item.productName} x {item.quantity}</span>
                        {item.variantTitle ? <span className="text-sm text-muted-foreground">{item.variantTitle}</span> : null}
                      </span>
                      <span>{formatMoney(item.lineTotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="h-fit rounded-lg border p-4 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(order.subtotalAmount ?? order.items.reduce((sum, item) => sum + item.lineTotal, 0))}</span></div>
                  <div className="mt-2 flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatMoney(order.discountAmount ?? 0)}</span></div>
                  <div className="mt-2 flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatMoney(order.shippingAmount ?? 0)}</span></div>
                  <div className="mt-2 flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatMoney(order.taxAmount ?? 0)}</span></div>
                  <div className="mt-3 flex justify-between border-t pt-3 text-base font-semibold"><span>Total</span><span>{formatMoney(order.totalAmount)}</span></div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-semibold"><Package className="h-4 w-4" /> Shipments</h3>
                {order.shipments.length ? order.shipments.map((shipment) => (
                  <div key={shipment.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 font-medium">
                          <Truck className="h-4 w-4" />
                          {shipment.carrier || "Carrier pending"}
                        </div>
                        {shipment.shippedAt ? <p className="mt-1 text-sm text-muted-foreground">Shipped {new Date(shipment.shippedAt).toLocaleDateString()}</p> : null}
                        {shipment.trackingNumber ? <p className="mt-1 font-mono text-sm">{shipment.trackingNumber}</p> : null}
                      </div>
                      <Badge variant="outline">{shipment.status}</Badge>
                    </div>
                    {shipment.trackingUrl ? (
                      <Button asChild variant="outline" className="mt-4">
                        <a href={shipment.trackingUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Track package
                        </a>
                      </Button>
                    ) : null}
                  </div>
                )) : <p className="rounded-lg border p-4 text-sm text-muted-foreground">No shipments yet. Tracking details will appear here once your order ships.</p>}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageLayout>
  );
}

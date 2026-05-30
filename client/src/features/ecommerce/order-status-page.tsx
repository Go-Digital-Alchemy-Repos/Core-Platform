import { FormEvent, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Package } from "lucide-react";
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
  items: Array<{ id: string; productName: string; quantity: number; lineTotal: number }>;
  shipments: Array<{ id: string; carrier?: string; trackingNumber?: string; trackingUrl?: string; status: string }>;
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
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="font-heading text-4xl font-semibold">Order status</h1>
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
                <div><p className="font-mono text-sm text-muted-foreground">#{order.id}</p><h2 className="text-2xl font-semibold">Order details</h2></div>
                <div className="flex gap-2"><Badge>{order.status}</Badge><Badge variant="outline">{order.paymentStatus}</Badge></div>
              </div>
              <div className="space-y-2">
                {order.items.map((item) => <div key={item.id} className="flex justify-between rounded-md border p-3"><span>{item.productName} x {item.quantity}</span><span>{formatMoney(item.lineTotal)}</span></div>)}
              </div>
              <div className="flex justify-between border-t pt-4 text-lg font-semibold"><span>Total</span><span>{formatMoney(order.totalAmount)}</span></div>
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-semibold"><Package className="h-4 w-4" /> Shipments</h3>
                {order.shipments.length ? order.shipments.map((shipment) => <p key={shipment.id} className="text-sm text-muted-foreground">{shipment.carrier || "Carrier"} {shipment.trackingNumber || ""} {shipment.status}</p>) : <p className="text-sm text-muted-foreground">No shipments yet.</p>}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageLayout>
  );
}

import { Link } from "wouter";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CartItem, formatMoney, readCart, writeCart } from "./cart-store";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => setItems(readCart()), []);
  const update = (next: CartItem[]) => {
    setItems(next);
    writeCart(next);
  };
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return (
    <PageLayout>
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="font-heading text-4xl font-semibold">Cart</h1>
        {items.length === 0 ? (
          <Card className="mt-8"><CardContent className="p-10 text-center"><p className="text-muted-foreground">Your cart is empty.</p><Button asChild className="mt-6"><Link href="/shop">Shop products</Link></Button></CardContent></Card>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {items.map((item) => {
                const lineKey = `${item.productId}:${item.variantId ?? "default"}`;
                return (
                <Card key={lineKey}>
                  <CardContent className="flex gap-4 p-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/products/${item.slug}`} className="font-medium hover:text-primary">{item.name}</Link>
                      <p className="mt-1 text-sm text-muted-foreground">{formatMoney(item.unitPrice)}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          value={item.quantity}
                          onChange={(event) => update(items.map((line) => line.productId === item.productId && (line.variantId ?? null) === (item.variantId ?? null) ? { ...line, quantity: Math.max(1, Number(event.target.value) || 1) } : line))}
                          className="h-9 w-20"
                        />
                        <Button variant="ghost" size="icon" onClick={() => update(items.filter((line) => !(line.productId === item.productId && (line.variantId ?? null) === (item.variantId ?? null))))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="font-semibold">{formatMoney(item.unitPrice * item.quantity)}</div>
                  </CardContent>
                </Card>
              );
              })}
            </div>
            <Card className="h-fit">
              <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between"><span>Subtotal</span><span className="font-semibold">{formatMoney(total)}</span></div>
                <Button asChild className="w-full"><Link href="/checkout">Checkout</Link></Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

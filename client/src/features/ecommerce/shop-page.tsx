import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { addCartItem, formatMoney } from "./cart-store";

interface Product {
  id: string;
  name: string;
  tagline?: string | null;
  price: number;
  salePrice?: number | null;
  primaryImage?: string | null;
  urlSlug: string;
  tags: string[];
}

export default function ShopPage() {
  const { data: products = [], isLoading } = useQuery<Product[]>({ queryKey: ["/api/ecommerce/products"] });

  return (
    <PageLayout>
      <section className="border-b bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-heading text-4xl font-semibold tracking-normal">Shop</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">Browse products and checkout securely.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/cart"><ShoppingCart className="mr-2 h-4 w-4" /> Cart</Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">No products are published yet.</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const price = product.salePrice ?? product.price;
              return (
                <Card key={product.id} className="overflow-hidden">
                  <Link href={`/products/${product.urlSlug}`}>
                    <div className="aspect-[4/3] bg-muted">
                      {product.primaryImage ? (
                        <img src={product.primaryImage} alt={product.name} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                  </Link>
                  <CardContent className="space-y-4 p-5">
                    <div>
                      <Link href={`/products/${product.urlSlug}`} className="text-lg font-semibold hover:text-primary">
                        {product.name}
                      </Link>
                      {product.tagline ? <p className="mt-1 text-sm text-muted-foreground">{product.tagline}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {product.tags.slice(0, 3).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="font-semibold">{formatMoney(price)}</span>
                        {product.salePrice != null ? <span className="ml-2 text-sm text-muted-foreground line-through">{formatMoney(product.price)}</span> : null}
                      </div>
                      <Button size="sm" onClick={() => addCartItem({
                        productId: product.id,
                        name: product.name,
                        slug: product.urlSlug,
                        unitPrice: price,
                        quantity: 1,
                        image: product.primaryImage,
                      })}>
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </PageLayout>
  );
}

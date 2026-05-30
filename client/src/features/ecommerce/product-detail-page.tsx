import { Link, useRoute } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Minus, Plus, ShoppingCart } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { addCartItem, formatMoney } from "./cart-store";

interface Product {
  id: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  price: number;
  salePrice?: number | null;
  primaryImage?: string | null;
  secondaryImages: string[];
  features: string[];
  included: string[];
  tags: string[];
  urlSlug: string;
}

export default function ProductDetailPage() {
  const [, params] = useRoute("/products/:slug");
  const slug = params?.slug || "";
  const [quantity, setQuantity] = useState(1);
  const [image, setImage] = useState<string | null>(null);
  const { data: product, isLoading } = useQuery<Product>({ queryKey: ["/api/ecommerce/products", slug], enabled: !!slug });

  if (isLoading) return <PageLayout><div className="py-20"><LoadingSpinner /></div></PageLayout>;
  if (!product) {
    return <PageLayout><div className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-3xl font-semibold">Product not found</h1><Button asChild className="mt-6"><Link href="/shop">Back to shop</Link></Button></div></PageLayout>;
  }
  const selectedImage = image || product.primaryImage;
  const price = product.salePrice ?? product.price;
  const gallery = [product.primaryImage, ...product.secondaryImages].filter(Boolean) as string[];

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/shop"><ArrowLeft className="mr-2 h-4 w-4" /> Shop</Link>
        </Button>
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <div className="aspect-[4/3] overflow-hidden rounded-lg bg-muted">
              {selectedImage ? <img src={selectedImage} alt={product.name} className="h-full w-full object-cover" /> : null}
            </div>
            {gallery.length > 1 ? (
              <div className="grid grid-cols-5 gap-3">
                {gallery.map((src) => (
                  <button key={src} type="button" onClick={() => setImage(src)} className="aspect-square overflow-hidden rounded-md border bg-muted">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap gap-2">{product.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div>
              <h1 className="mt-4 font-heading text-4xl font-semibold">{product.name}</h1>
              {product.tagline ? <p className="mt-2 text-lg text-muted-foreground">{product.tagline}</p> : null}
            </div>
            <div className="text-2xl font-semibold">
              {formatMoney(price)}
              {product.salePrice != null ? <span className="ml-3 text-base text-muted-foreground line-through">{formatMoney(product.price)}</span> : null}
            </div>
            {product.description ? <p className="leading-7 text-muted-foreground">{product.description}</p> : null}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-10 items-center rounded-md border">
                <Button type="button" variant="ghost" size="icon" onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus className="h-4 w-4" /></Button>
                <span className="w-10 text-center text-sm font-medium">{quantity}</span>
                <Button type="button" variant="ghost" size="icon" onClick={() => setQuantity((value) => value + 1)}><Plus className="h-4 w-4" /></Button>
              </div>
              <Button onClick={() => addCartItem({ productId: product.id, name: product.name, slug: product.urlSlug, unitPrice: price, quantity, image: product.primaryImage })}>
                <ShoppingCart className="mr-2 h-4 w-4" /> Add to cart
              </Button>
            </div>
            {product.features.length ? <div><h2 className="font-semibold">Features</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{product.features.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
            {product.included.length ? <div><h2 className="font-semibold">Included</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{product.included.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

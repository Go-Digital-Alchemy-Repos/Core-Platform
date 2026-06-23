import { Link, useRoute } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Minus, Plus, ShoppingCart } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useFrontendEditTarget } from "@/features/frontend-edit/frontend-edit";
import { useToast } from "@/hooks/use-toast";
import { addCartItem, formatMoney } from "./cart-store";
import { useSeo } from "@/hooks/use-seo";
import { JsonLd } from "@/components/shared/json-ld";
import { buildBreadcrumbLd, buildProductLd } from "@/lib/structured-data";
import { stripHtml } from "@/lib/html";
import type { SeoSettings } from "@shared/schema";

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
  categories?: Array<{ id: string; name: string; slug: string }>;
  urlSlug: string;
  sku?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
}

function absoluteStoreUrl(path: string | null | undefined, siteUrl: string) {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${siteUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}

export default function ProductDetailPage() {
  const [, params] = useRoute("/products/:slug");
  const slug = params?.slug || "";
  const [quantity, setQuantity] = useState(1);
  const [image, setImage] = useState<string | null>(null);
  const { toast } = useToast();
  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/ecommerce/products", slug],
    enabled: !!slug,
  });
  const { data: globalSeo } = useQuery<SeoSettings>({ queryKey: ["/api/seo/global"] });

  useFrontendEditTarget(
    product
      ? {
          kind: "product",
          id: product.id,
          label: `Edit ${product.name}`,
        }
      : null,
  );

  if (isLoading)
    return (
      <PageLayout>
        <div className="py-20">
          <LoadingSpinner />
        </div>
      </PageLayout>
    );
  if (!product) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h1 className="text-3xl font-semibold">Product not found</h1>
          <Button asChild className="mt-6">
            <Link href="/shop">Back to shop</Link>
          </Button>
        </div>
      </PageLayout>
    );
  }
  const selectedImage = image || product.primaryImage;
  const price = product.salePrice ?? product.price;
  const gallery = [product.primaryImage, ...product.secondaryImages].filter(Boolean) as string[];
  const addToCart = () => {
    addCartItem({
      productId: product.id,
      name: product.name,
      slug: product.urlSlug,
      unitPrice: price,
      quantity,
      image: product.primaryImage,
    });
    toast({
      title: "Added to cart",
      description: `${quantity} ${quantity === 1 ? "item" : "items"} added. Use the cart icon to checkout.`,
    });
  };

  return (
    <PageLayout>
      <ProductSeo product={product} globalSeo={globalSeo} price={price} />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/shop">
            <ArrowLeft className="mr-2 h-4 w-4" /> Shop
          </Link>
        </Button>
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <div className="aspect-[4/3] overflow-hidden rounded-lg bg-muted">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            {gallery.length > 1 ? (
              <div className="grid grid-cols-5 gap-3">
                {gallery.map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setImage(src)}
                    className="aspect-square overflow-hidden rounded-md border bg-muted"
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
              <h1 className="mt-4 font-heading text-4xl font-semibold">{product.name}</h1>
              {product.tagline ? (
                <p className="mt-2 text-lg text-muted-foreground">{product.tagline}</p>
              ) : null}
            </div>
            <div className="text-2xl font-semibold">
              {formatMoney(price)}
              {product.salePrice != null ? (
                <span className="ml-3 text-base text-muted-foreground line-through">
                  {formatMoney(product.price)}
                </span>
              ) : null}
            </div>
            {product.description ? (
              <div
                className="prose prose-slate max-w-none leading-7 text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-10 items-center rounded-md border">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-10 text-center text-sm font-medium">{quantity}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity((value) => value + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={addToCart}>
                <ShoppingCart className="mr-2 h-4 w-4" /> Add to cart
              </Button>
            </div>
            {product.features.length ? (
              <div>
                <h2 className="font-semibold">Features</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {product.features.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {product.included.length ? (
              <div>
                <h2 className="font-semibold">Included</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {product.included.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function ProductSeo({
  product,
  globalSeo,
  price,
}: {
  product: Product;
  globalSeo?: SeoSettings;
  price: number;
}) {
  const siteUrl =
    globalSeo?.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const canonical = product.canonicalUrl || `${siteUrl}/products/${product.urlSlug}`;
  const seoTitle = product.metaTitle || product.ogTitle || product.name;
  const seoDescription =
    product.metaDescription ||
    product.ogDescription ||
    product.tagline ||
    (product.description ? stripHtml(product.description) : undefined);
  const seoImage = absoluteStoreUrl(product.ogImage || product.primaryImage, siteUrl);

  useSeo({
    title: seoTitle,
    description: seoDescription,
    ogImage: seoImage,
    canonical,
    ogType: "product",
    extraMeta: [
      { name: "og:url", content: canonical, property: true },
      { name: "product:price:amount", content: (price / 100).toFixed(2), property: true },
      { name: "product:price:currency", content: "USD", property: true },
      { name: "product:availability", content: "in stock", property: true },
      { name: "twitter:label1", content: "Price" },
      { name: "twitter:data1", content: formatMoney(price) },
    ],
  });

  const productLd = buildProductLd(
    {
      id: product.id,
      name: product.name,
      description: seoDescription,
      slug: product.urlSlug,
      image: product.primaryImage,
      gallery: product.secondaryImages,
      sku: product.sku,
      categories: product.categories ?? [],
      tags: product.tags,
      price: product.price,
      salePrice: product.salePrice,
      active: true,
    },
    globalSeo,
  );
  const breadcrumbs = buildBreadcrumbLd([
    { name: "Home", url: siteUrl || "/" },
    { name: "Shop", url: `${siteUrl}/shop` },
    { name: product.name, url: canonical },
  ]);

  return <JsonLd schemas={[productLd, breadcrumbs]} />;
}

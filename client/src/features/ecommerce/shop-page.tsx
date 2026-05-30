import { Link } from "wouter";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ShoppingCart, SlidersHorizontal, Star } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  categories?: Array<{ id: string; name: string; slug: string }>;
}

export default function ShopPage() {
  const { data: products = [], isLoading } = useQuery<Product[]>({ queryKey: ["/api/ecommerce/products"] });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [tag, setTag] = useState("all");
  const [showSaleOnly, setShowSaleOnly] = useState(false);

  const featuredProduct = useMemo(
    () => products.find((product) => product.tags.includes("Featured")) ?? products[0],
    [products],
  );
  const categories = useMemo(() => {
    const map = new Map<string, { name: string; slug: string; count: number }>();
    for (const product of products) {
      for (const item of product.categories ?? []) {
        const existing = map.get(item.slug);
        map.set(item.slug, { name: item.name, slug: item.slug, count: (existing?.count ?? 0) + 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);
  const tags = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      for (const item of product.tags) map.set(item, (map.get(item) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [products]);
  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((product) => {
      if (product.id === featuredProduct?.id) return false;
      if (showSaleOnly && product.salePrice == null) return false;
      if (category !== "all" && !(product.categories ?? []).some((item) => item.slug === category)) return false;
      if (tag !== "all" && !product.tags.includes(tag)) return false;
      if (!normalized) return true;
      return [
        product.name,
        product.tagline ?? "",
        product.tags.join(" "),
        (product.categories ?? []).map((item) => item.name).join(" "),
      ].join(" ").toLowerCase().includes(normalized);
    });
  }, [category, featuredProduct?.id, products, query, showSaleOnly, tag]);

  const resetFilters = () => {
    setQuery("");
    setCategory("all");
    setTag("all");
    setShowSaleOnly(false);
  };

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
          <div className="space-y-10">
            {featuredProduct ? <FeaturedProduct product={featuredProduct} /> : null}
            <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
              <aside className="space-y-5 rounded-lg border bg-background p-5 lg:sticky lg:top-24 lg:h-fit">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                  </h2>
                  <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>Reset</Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop-search">Search</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="shop-search" value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Workbook, family, training..." />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label>Categories</Label>
                  <FilterButton active={category === "all"} onClick={() => setCategory("all")} label={`All (${products.length})`} />
                  {categories.map((item) => (
                    <FilterButton key={item.slug} active={category === item.slug} onClick={() => setCategory(item.slug)} label={`${item.name} (${item.count})`} />
                  ))}
                </div>
                <div className="space-y-3">
                  <Label>Popular Tags</Label>
                  <FilterButton active={tag === "all"} onClick={() => setTag("all")} label="All topics" />
                  {tags.slice(0, 8).map(([name, count]) => (
                    <FilterButton key={name} active={tag === name} onClick={() => setTag(name)} label={`${name} (${count})`} />
                  ))}
                </div>
                <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm">
                  <Checkbox checked={showSaleOnly} onCheckedChange={(checked) => setShowSaleOnly(checked === true)} />
                  Sale pricing only
                </label>
              </aside>
              <div className="space-y-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-xl font-semibold">All Products</h2>
                  <p className="text-sm text-muted-foreground">{filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"}</p>
                </div>
                {filteredProducts.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">No products match those filters.</div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </PageLayout>
  );
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
        active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

function FeaturedProduct({ product }: { product: Product }) {
  const price = product.salePrice ?? product.price;
  return (
    <Card className="overflow-hidden border-primary/20">
      <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
        <Link href={`/products/${product.urlSlug}`} className="min-h-[320px] bg-muted">
          {product.primaryImage ? <img src={product.primaryImage} alt={product.name} className="h-full w-full object-cover" /> : null}
        </Link>
        <CardContent className="flex flex-col justify-center space-y-5 p-6 sm:p-8">
          <Badge className="w-fit"><Star className="mr-1 h-3 w-3" /> Featured Product</Badge>
          <div>
            <Link href={`/products/${product.urlSlug}`} className="font-heading text-3xl font-semibold hover:text-primary">
              {product.name}
            </Link>
            {product.tagline ? <p className="mt-3 text-muted-foreground">{product.tagline}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {(product.categories ?? []).map((item) => <Badge key={item.slug} variant="outline">{item.name}</Badge>)}
            {product.tags.slice(0, 3).map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-2xl font-semibold">
              {formatMoney(price)}
              {product.salePrice != null ? <span className="ml-2 text-base text-muted-foreground line-through">{formatMoney(product.price)}</span> : null}
            </div>
            <Button onClick={() => addCartItem({ productId: product.id, name: product.name, slug: product.urlSlug, unitPrice: price, quantity: 1, image: product.primaryImage })}>
              Add to cart
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

function ProductCard({ product }: { product: Product }) {
  const price = product.salePrice ?? product.price;
  return (
    <Card className="overflow-hidden">
      <Link href={`/products/${product.urlSlug}`}>
        <div className="aspect-[4/3] bg-muted">
          {product.primaryImage ? <img src={product.primaryImage} alt={product.name} className="h-full w-full object-cover" /> : null}
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
          {(product.categories ?? []).slice(0, 2).map((item) => <Badge key={item.slug} variant="outline">{item.name}</Badge>)}
          {product.tags.slice(0, 2).map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="font-semibold">{formatMoney(price)}</span>
            {product.salePrice != null ? <span className="ml-2 text-sm text-muted-foreground line-through">{formatMoney(product.price)}</span> : null}
          </div>
          <Button size="sm" onClick={() => addCartItem({ productId: product.id, name: product.name, slug: product.urlSlug, unitPrice: price, quantity: 1, image: product.primaryImage })}>
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import type { EcommerceProduct, SeoSettings } from "@shared/schema";

interface ProductFeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink?: string | null;
  additionalImageLinks: string[];
  availability: "in stock" | "out of stock";
  price: string;
  salePrice?: string;
  brand: string;
  condition: "new";
  productType?: string | null;
  sku?: string | null;
}

const DEFAULT_DESCRIPTION = "Product available from the Core Platform store.";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function absoluteUrl(path: string | null | undefined, siteUrl: string): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${siteUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}

function money(cents: number): string {
  return `${(cents / 100).toFixed(2)} USD`;
}

export async function isEcommerceProductFeedEnabled(): Promise<boolean> {
  const { storage } = await import("../storage/index");
  const settings = await storage.settings.getDecryptedCategory("google_merchant_center");
  return ["true", "1", "yes", "on"].includes((settings.product_feed_enabled ?? "").trim().toLowerCase());
}

export function buildProductFeedItems(
  products: EcommerceProduct[],
  seo: SeoSettings | null,
): ProductFeedItem[] {
  const siteUrl = (seo?.siteUrl || "").replace(/\/$/, "");
  const brand = seo?.organizationName || seo?.siteName || "Core Platform";
  return products
    .filter((product) => product.active && product.status === "published" && product.robotsIndex !== false)
    .map((product) => {
      const link = absoluteUrl(`/products/${product.urlSlug}`, siteUrl) || `/products/${product.urlSlug}`;
      return {
        id: product.sku || product.id,
        title: product.name,
        description: product.metaDescription || product.tagline || product.description || DEFAULT_DESCRIPTION,
        link,
        imageLink: absoluteUrl(product.primaryImage || product.ogImage, siteUrl),
        additionalImageLinks: (product.secondaryImages ?? [])
          .map((image) => absoluteUrl(image, siteUrl))
          .filter((image): image is string => Boolean(image)),
        availability: "in stock",
        price: money(product.price),
        salePrice: product.salePrice != null ? money(product.salePrice) : undefined,
        brand,
        condition: "new",
        productType: product.productType,
        sku: product.sku,
      };
    });
}

export function buildProductFeedXml(input: {
  products: EcommerceProduct[];
  seo: SeoSettings | null;
}): string {
  const siteUrl = (input.seo?.siteUrl || "").replace(/\/$/, "");
  const items = buildProductFeedItems(input.products, input.seo);
  const title = input.seo?.siteName || "Core Platform";
  const description = input.seo?.defaultMetaDescription || "Core Platform product feed";

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "  <channel>",
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(siteUrl || "/")}</link>`,
    `    <description>${escapeXml(description)}</description>`,
    ...items.flatMap((item) => [
      "    <item>",
      `      <g:id>${escapeXml(item.id)}</g:id>`,
      `      <title>${escapeXml(item.title)}</title>`,
      `      <description>${escapeXml(item.description)}</description>`,
      `      <link>${escapeXml(item.link)}</link>`,
      item.imageLink ? `      <g:image_link>${escapeXml(item.imageLink)}</g:image_link>` : "",
      ...item.additionalImageLinks.map((image) => `      <g:additional_image_link>${escapeXml(image)}</g:additional_image_link>`),
      `      <g:availability>${item.availability}</g:availability>`,
      `      <g:price>${item.price}</g:price>`,
      item.salePrice ? `      <g:sale_price>${item.salePrice}</g:sale_price>` : "",
      `      <g:brand>${escapeXml(item.brand)}</g:brand>`,
      `      <g:condition>${item.condition}</g:condition>`,
      item.productType ? `      <g:product_type>${escapeXml(item.productType)}</g:product_type>` : "",
      item.sku ? `      <g:mpn>${escapeXml(item.sku)}</g:mpn>` : "",
      "    </item>",
    ].filter(Boolean)),
    "  </channel>",
    "</rss>",
  ].join("\n");
}

export async function buildCurrentProductFeedXml(): Promise<string> {
  const { storage } = await import("../storage/index");
  const [seo, products] = await Promise.all([
    storage.seoSettings.get(),
    storage.ecommerce.getProducts({ publicOnly: true }),
  ]);
  return buildProductFeedXml({ products, seo: seo ?? null });
}

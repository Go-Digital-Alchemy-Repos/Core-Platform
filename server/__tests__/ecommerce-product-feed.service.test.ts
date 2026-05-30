import { describe, expect, it } from "vitest";
import type { EcommerceProduct, SeoSettings } from "@shared/schema";
import { buildProductFeedItems, buildProductFeedXml } from "../services/ecommerce-product-feed.service";

const seo = {
  siteUrl: "https://example.com",
  siteName: "Core Platform",
  organizationName: "Digital Alchemy",
  defaultMetaDescription: "Store feed",
} as SeoSettings;

const baseProduct = {
  id: "product-1",
  name: "Identity Workbook",
  tagline: "Guided support",
  description: "A practical workbook.",
  price: 4900,
  salePrice: 3900,
  primaryImage: "/media/workbook.jpg",
  secondaryImages: ["/media/workbook-2.jpg"],
  active: true,
  status: "published",
  sku: "WORKBOOK-1",
  productType: "Guides > Workbooks",
  tags: [],
  features: [],
  included: [],
  urlSlug: "identity-workbook",
  robotsIndex: true,
  createdAt: new Date(),
  updatedAt: new Date(),
} as EcommerceProduct;

describe("ecommerce product feed", () => {
  it("builds merchant-ready product feed items from published products", () => {
    const [item] = buildProductFeedItems([baseProduct], seo);
    expect(item).toMatchObject({
      id: "WORKBOOK-1",
      title: "Identity Workbook",
      link: "https://example.com/products/identity-workbook",
      imageLink: "https://example.com/media/workbook.jpg",
      price: "49.00 USD",
      salePrice: "39.00 USD",
      brand: "Digital Alchemy",
      productType: "Guides > Workbooks",
    });
  });

  it("excludes noindex products from public product feeds", () => {
    const items = buildProductFeedItems([{ ...baseProduct, robotsIndex: false }], seo);
    expect(items).toHaveLength(0);
  });

  it("renders escaped Google Merchant RSS XML", () => {
    const xml = buildProductFeedXml({
      products: [{ ...baseProduct, name: "Identity & Belonging Workbook" }],
      seo,
    });

    expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"');
    expect(xml).toContain("<title>Identity &amp; Belonging Workbook</title>");
    expect(xml).toContain("<g:sale_price>39.00 USD</g:sale_price>");
    expect(xml).toContain("<g:mpn>WORKBOOK-1</g:mpn>");
  });
});

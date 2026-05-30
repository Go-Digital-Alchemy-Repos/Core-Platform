import { describe, expect, it } from "vitest";
import { buildItemListLd, buildProductLd } from "./structured-data";

describe("ecommerce structured data", () => {
  it("builds rich product JSON-LD for ecommerce product pages", () => {
    const schema = buildProductLd({
      id: "product-1",
      name: "Identity Workbook",
      description: "Guided workbook",
      slug: "identity-workbook",
      image: "/media/workbook.jpg",
      gallery: ["/media/workbook-2.jpg"],
      sku: "WORKBOOK-1",
      categories: [{ name: "Guides", slug: "guides" }],
      tags: ["Workbook", "Featured"],
      price: 4900,
      salePrice: 3900,
      inventoryQuantity: 12,
    }, {
      siteUrl: "https://example.com",
      siteName: "Core Platform",
      organizationName: "Digital Alchemy",
    } as never);

    expect(schema).toMatchObject({
      "@type": "Product",
      "@id": "https://example.com/products/identity-workbook#product",
      url: "https://example.com/products/identity-workbook",
      productID: "product-1",
      category: "Guides",
      keywords: "Workbook, Featured",
      offers: {
        price: "39.00",
        availability: "https://schema.org/InStock",
      },
    });
  });

  it("builds shop ItemList JSON-LD for product index pages", () => {
    const schema = buildItemListLd([
      { name: "Product A", url: "https://example.com/products/a", image: "https://example.com/a.jpg" },
      { name: "Product B", url: "https://example.com/products/b" },
    ]);

    expect(schema).toMatchObject({
      "@type": "ItemList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Product A", url: "https://example.com/products/a" },
        { "@type": "ListItem", position: 2, name: "Product B", url: "https://example.com/products/b" },
      ],
    });
  });
});

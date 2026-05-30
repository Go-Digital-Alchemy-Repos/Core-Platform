import { describe, expect, it } from "vitest";
import type { EcommerceCategory, EcommerceProduct, EcommerceProductMedia, EcommerceProductVariant } from "@shared/schema";
import {
  getPublicProductCategories,
  getPublicProductVariants,
  toPublicEcommerceProduct,
} from "../services/ecommerce-public-product.service";

describe("ecommerce public product filters", () => {
  it("hides inactive categories from public product payloads", () => {
    const now = new Date();
    const categories = [
      { id: "cat-active", name: "Active", slug: "active", description: null, parentId: null, image: null, sortOrder: 0, active: true, createdAt: now, updatedAt: now },
      { id: "cat-inactive", name: "Inactive", slug: "inactive", description: null, parentId: null, image: null, sortOrder: 1, active: false, createdAt: now, updatedAt: now },
    ] as EcommerceCategory[];

    expect(getPublicProductCategories(categories).map((category) => category.id)).toEqual(["cat-active"]);
  });

  it("hides inactive and non-active variants from public product payloads", () => {
    const now = new Date();
    const variants = [
      { id: "variant-active", productId: "p1", title: "Active", optionSignature: "active", optionValues: {}, sku: null, barcode: null, price: 1000, salePrice: null, compareAtPrice: null, costPerItem: null, inventoryQuantity: 0, trackInventory: false, lowStockThreshold: null, allowBackorder: false, weight: null, weightUnit: "oz", image: null, status: "active", active: true, sortOrder: 0, isDefault: true, createdAt: now, updatedAt: now },
      { id: "variant-hidden", productId: "p1", title: "Hidden", optionSignature: "hidden", optionValues: {}, sku: null, barcode: null, price: 1000, salePrice: null, compareAtPrice: null, costPerItem: null, inventoryQuantity: 0, trackInventory: false, lowStockThreshold: null, allowBackorder: false, weight: null, weightUnit: "oz", image: null, status: "inactive", active: true, sortOrder: 1, isDefault: false, createdAt: now, updatedAt: now },
      { id: "variant-disabled", productId: "p1", title: "Disabled", optionSignature: "disabled", optionValues: {}, sku: null, barcode: null, price: 1000, salePrice: null, compareAtPrice: null, costPerItem: null, inventoryQuantity: 0, trackInventory: false, lowStockThreshold: null, allowBackorder: false, weight: null, weightUnit: "oz", image: null, status: "active", active: false, sortOrder: 2, isDefault: false, createdAt: now, updatedAt: now },
    ] as EcommerceProductVariant[];

    expect(getPublicProductVariants(variants).map((variant) => variant.id)).toEqual(["variant-active"]);
  });

  it("removes admin-only product, variant, category, and media fields from public payloads", () => {
    const now = new Date();
    const product = {
      id: "prod-1",
      name: "Guide",
      tagline: "Helpful guide",
      description: "Long description",
      shortDescription: "Short description",
      productType: "physical",
      vendor: "Core",
      price: 2500,
      compareAtPrice: 3000,
      costPerItem: 700,
      taxable: true,
      taxCategory: "books",
      featured: true,
      visibility: "online",
      publishedAt: now,
      archivedAt: now,
      primaryImage: "/uploads/guide.jpg",
      secondaryImages: ["/uploads/guide-2.jpg"],
      features: ["Feature"],
      included: ["Workbook"],
      active: true,
      status: "published",
      sku: "GUIDE-1",
      tags: ["Featured"],
      salePrice: 2000,
      discountType: "PERCENT",
      discountValue: 20,
      saleStartAt: now,
      saleEndAt: now,
      metaTitle: "Guide",
      metaDescription: "Guide meta",
      metaKeywords: "guide",
      urlSlug: "guide",
      canonicalUrl: null,
      robotsIndex: true,
      robotsFollow: true,
      ogTitle: "Guide OG",
      ogDescription: "Guide OG description",
      ogImage: "/uploads/guide-og.jpg",
      physicalProduct: true,
      requiresShipping: true,
      weight: 16,
      weightUnit: "oz",
      length: 10,
      width: 8,
      height: 1,
      dimensionUnit: "in",
      shippingProfile: "standard",
      fulfillmentType: "merchant",
      relatedProductIds: ["prod-2"],
      upsellProductIds: ["prod-3"],
      badgeText: "New",
      mediaId: "cms-media-1",
      createdAt: now,
      updatedAt: now,
    } as EcommerceProduct;
    const categories = [
      { id: "cat-active", name: "Active", slug: "active", description: null, parentId: null, image: null, sortOrder: 0, active: true, createdAt: now, updatedAt: now },
    ] as EcommerceCategory[];
    const variants = [
      { id: "variant-active", productId: "prod-1", title: "Active", optionSignature: "active", optionValues: {}, sku: "GUIDE-1", barcode: "hidden-barcode", price: 2500, salePrice: 2000, compareAtPrice: 3000, costPerItem: 700, inventoryQuantity: 12, trackInventory: true, lowStockThreshold: 2, allowBackorder: false, weight: 16, weightUnit: "oz", image: null, status: "active", active: true, sortOrder: 0, isDefault: true, createdAt: now, updatedAt: now },
    ] as EcommerceProductVariant[];
    const media = [
      { id: "media-link-1", productId: "prod-1", variantId: "variant-active", mediaId: "cms-media-1", url: "/uploads/guide.jpg", type: "image", altText: "Guide", sortOrder: 0, primary: true, createdAt: now, updatedAt: now },
    ] as EcommerceProductMedia[];

    const publicProduct = toPublicEcommerceProduct({ product, categories, variants, media });

    expect(publicProduct.name).toBe("Guide");
    expect(publicProduct.categories[0]).toEqual({
      id: "cat-active",
      name: "Active",
      slug: "active",
      description: null,
      parentId: null,
      image: null,
      sortOrder: 0,
    });
    expect(publicProduct.variants[0]).toMatchObject({
      id: "variant-active",
      sku: "GUIDE-1",
      price: 2500,
      salePrice: 2000,
    });
    expect(publicProduct.media[0]).toEqual({
      id: "media-link-1",
      productId: "prod-1",
      variantId: "variant-active",
      url: "/uploads/guide.jpg",
      type: "image",
      altText: "Guide",
      sortOrder: 0,
      primary: true,
    });
    expect(publicProduct).not.toHaveProperty("costPerItem");
    expect(publicProduct).not.toHaveProperty("taxCategory");
    expect(publicProduct).not.toHaveProperty("archivedAt");
    expect(publicProduct).not.toHaveProperty("mediaId");
    expect(publicProduct).not.toHaveProperty("createdAt");
    expect(publicProduct).not.toHaveProperty("updatedAt");
    expect(publicProduct.variants[0]).not.toHaveProperty("costPerItem");
    expect(publicProduct.variants[0]).not.toHaveProperty("barcode");
    expect(publicProduct.variants[0]).not.toHaveProperty("inventoryQuantity");
    expect(publicProduct.variants[0]).not.toHaveProperty("trackInventory");
    expect(publicProduct.variants[0]).not.toHaveProperty("lowStockThreshold");
    expect(publicProduct.variants[0]).not.toHaveProperty("allowBackorder");
    expect(publicProduct.media[0]).not.toHaveProperty("mediaId");
    expect(publicProduct.media[0]).not.toHaveProperty("createdAt");
    expect(publicProduct.categories[0]).not.toHaveProperty("active");
    expect(publicProduct.categories[0]).not.toHaveProperty("createdAt");
  });
});

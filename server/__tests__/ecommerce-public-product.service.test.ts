import { describe, expect, it } from "vitest";
import type { EcommerceCategory, EcommerceProductVariant } from "@shared/schema";
import {
  getPublicProductCategories,
  getPublicProductVariants,
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
});

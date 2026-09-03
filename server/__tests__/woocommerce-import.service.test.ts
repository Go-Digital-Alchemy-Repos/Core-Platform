import { describe, expect, it } from "vitest";
import {
  assertWooCommercePlanCanApply,
  buildWooCommerceCatalogPlan,
  deterministicWooCommerceId,
} from "../services/woocommerce-import.service";

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: 101,
    name: "Migration-safe mug",
    slug: "migration-safe-mug",
    permalink: "https://store.example.test/product/migration-safe-mug/",
    type: "simple",
    status: "publish",
    description: '<p>Useful <strong>mug</strong>.</p><script>alert("x")</script>',
    short_description: '<p>A <a href="https://example.test">short description</a>.</p>',
    sku: "MUG-101",
    price: "12.50",
    regular_price: "15.00",
    sale_price: "12.50",
    on_sale: true,
    tax_status: "taxable",
    manage_stock: true,
    stock_quantity: 7,
    backorders: "notify",
    categories: [{ id: 9, name: "Drinkware", slug: "drinkware" }],
    tags: [{ id: 1, name: "Featured", slug: "featured" }],
    images: [
      { id: 501, src: "https://cdn.example.test/mug.jpg", alt: "A mug" },
      { id: 502, src: "https://cdn.example.test/mug-side.jpg", alt: "Side view" },
    ],
    date_created: "2026-08-01T12:00:00Z",
    ...overrides,
  };
}

function bundle(productOverrides: Record<string, unknown> = {}) {
  return {
    categories: [
      {
        id: 9,
        name: "Drinkware",
        slug: "drinkware",
        description: "<p>Cups and mugs.</p>",
        parent: 0,
        image: { id: 900, src: "https://cdn.example.test/drinkware.jpg" },
        menu_order: 3,
      },
    ],
    products: [product(productOverrides)],
  };
}

describe("WooCommerce catalog import planning", () => {
  it("maps a simple catalog into deterministic, sanitized target records", () => {
    const plan = buildWooCommerceCatalogPlan(bundle());

    expect(plan.issues).toHaveLength(3);
    expect(plan.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "backorder_notification_not_imported" }),
        expect.objectContaining({ code: "html_sanitized", field: "description" }),
        expect.objectContaining({ code: "html_sanitized", field: "short_description" }),
      ]),
    );
    expect(() => assertWooCommercePlanCanApply(plan)).not.toThrow();
    expect(plan.categories[0]).toMatchObject({
      targetId: deterministicWooCommerceId("category", "9"),
      slug: "drinkware",
      sortOrder: 3,
    });
    expect(plan.products[0]).toMatchObject({
      targetId: deterministicWooCommerceId("product", "101"),
      defaultVariantId: deterministicWooCommerceId("product-variant", "101"),
      price: 1500,
      salePrice: 1250,
      compareAtPrice: 1500,
      inventoryQuantity: 7,
      trackInventory: true,
      allowBackorder: true,
      sourcePermalink: "https://store.example.test/product/migration-safe-mug/",
      categoryIds: [deterministicWooCommerceId("category", "9")],
    });
    expect(plan.products[0].description).toBe("<p>Useful <strong>mug</strong>.</p>");
    expect(plan.products[0].shortDescription).toContain('rel="noopener noreferrer"');
    expect(plan.products[0].media).toHaveLength(2);
    expect(plan.reconciliation).toEqual({
      source: { categories: 1, products: 1, productPriceTotal: 1500 },
      planned: { categories: 1, products: 1, productPriceTotal: 1500 },
      unsupported: { customers: 0, orders: 0 },
    });
  });

  it("produces the same ids and fingerprint for semantically identical key ordering", () => {
    const first = buildWooCommerceCatalogPlan(bundle());
    const reorderedProduct = Object.fromEntries(Object.entries(product()).reverse());
    const second = buildWooCommerceCatalogPlan({
      products: [reorderedProduct],
      categories: bundle().categories,
    });

    expect(second.products[0].targetId).toBe(first.products[0].targetId);
    expect(second.fingerprint).toBe(first.fingerprint);
  });

  it("reports represented-data gaps explicitly without including customer or order payloads", () => {
    const plan = buildWooCommerceCatalogPlan({
      ...bundle({ weight: "2.5", mystery_plugin_setting: { secret: "do-not-report" } }),
      customers: [{ id: 77, email: "private@example.test", first_name: "Private" }],
      orders: [{ id: 88, billing: { email: "private@example.test" }, total: "12.50" }],
    });
    const serializedIssues = JSON.stringify(plan.issues);

    expect(plan.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "customer_import_not_enabled", entity: "customer" }),
        expect.objectContaining({ code: "order_import_not_enabled", entity: "order" }),
        expect.objectContaining({ code: "unsupported_field", field: "weight" }),
        expect.objectContaining({ code: "unsupported_field", field: "mystery_plugin_setting" }),
      ]),
    );
    expect(serializedIssues).not.toContain("private@example.test");
    expect(serializedIssues).not.toContain("do-not-report");
    expect(() => assertWooCommercePlanCanApply(plan)).toThrow(/validation error/);
  });

  it("blocks product types and references that cannot be represented faithfully", () => {
    const plan = buildWooCommerceCatalogPlan({
      categories: [],
      products: [product({ type: "variable", categories: [{ id: 999 }] })],
    });

    expect(plan.products).toHaveLength(0);
    expect(plan.issues).toContainEqual(
      expect.objectContaining({ code: "unsupported_product_type", severity: "error" }),
    );
  });

  it("blocks invalid precision, unsafe image protocols, and source duplicates", () => {
    const plan = buildWooCommerceCatalogPlan({
      categories: bundle().categories,
      products: [
        product({ id: 101, slug: "bad-money", sku: "BAD-MONEY", price: "12.345" }),
        product({
          id: 102,
          slug: "duplicate-slug",
          sku: "UNSAFE-IMAGE",
          images: [{ src: "file:///tmp/private.jpg" }],
        }),
        product({ id: 103, slug: "duplicate-slug", sku: "DUPLICATE-SLUG" }),
      ],
    });

    expect(plan.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "invalid_money" }),
        expect.objectContaining({ code: "invalid_media_url" }),
        expect.objectContaining({ code: "duplicate_source_slug" }),
      ]),
    );
  });
});

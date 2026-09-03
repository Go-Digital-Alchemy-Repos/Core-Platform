import { describe, expect, it } from "vitest";
import {
  assertWooCommercePlanCanApply,
  buildWooCommerceDryRunReport,
  buildWooCommerceCatalogPlan,
  deterministicWooCommerceId,
  inspectWooCommerceTarget,
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

function envelope(productOverrides: Record<string, unknown> = {}) {
  return {
    contract: "core.woocommerce-import",
    contractVersion: "1.0.0",
    source: {
      system: "woocommerce",
      storeId: "better-farms-woo",
      baseUrl: "https://store.example.test",
      woocommerceVersion: "9.0.0",
      wordpressTimezone: "America/New_York",
      currency: "USD",
      currencyMinorUnits: 2,
      exportedAt: "2026-09-03T12:00:00Z",
      highWaterMark: "2026-09-03T12:00:00Z:101",
    },
    entities: {
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
      customers: [],
      orders: [],
    },
  };
}

describe("WooCommerce catalog import planning", () => {
  it("maps a simple catalog into deterministic, sanitized target records", () => {
    const plan = buildWooCommerceCatalogPlan(envelope());

    expect(plan.issues).toHaveLength(3);
    expect(plan.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "backorder_notification_not_imported" }),
        expect.objectContaining({ code: "html_sanitized", field: "description" }),
        expect.objectContaining({ code: "html_sanitized", field: "short_description" }),
      ]),
    );
    expect(() => assertWooCommercePlanCanApply(plan)).toThrow(/undispositioned warning/);
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
    expect(plan.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: "category",
          externalId: "9",
          normalizedSourceHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
        expect.objectContaining({
          entityType: "product",
          externalId: "101",
          dependencies: [deterministicWooCommerceId("category", "9")],
        }),
      ]),
    );
    expect(plan.reconciliation).toEqual({
      source: { categories: 1, products: 1, productPriceTotal: 1500 },
      planned: { categories: 1, products: 1, productPriceTotal: 1500 },
      unsupported: { customers: 0, orders: 0 },
    });
  });

  it("produces the same ids and fingerprint for semantically identical key ordering", () => {
    const first = buildWooCommerceCatalogPlan(envelope());
    const reorderedProduct = Object.fromEntries(Object.entries(product()).reverse());
    const reorderedEnvelope = envelope();
    reorderedEnvelope.entities.products = [reorderedProduct];
    const second = buildWooCommerceCatalogPlan(reorderedEnvelope);

    expect(second.products[0].targetId).toBe(first.products[0].targetId);
    expect(second.fingerprint).toBe(first.fingerprint);
  });

  it("reports represented-data gaps explicitly without including customer or order payloads", () => {
    const input = envelope({ weight: "2.5", mystery_plugin_setting: { secret: "do-not-report" } });
    input.entities.customers = [{ id: 77, email: "private@example.test", first_name: "Private" }];
    input.entities.orders = [
      { id: 88, billing: { email: "private@example.test" }, total: "12.50" },
    ];
    const plan = buildWooCommerceCatalogPlan(input);
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
    const report = JSON.stringify(buildWooCommerceDryRunReport(plan));
    expect(report).not.toContain("private@example.test");
    expect(report).not.toContain("do-not-report");
    expect(report).not.toContain("first_name");
  });

  it("blocks product types and references that cannot be represented faithfully", () => {
    const input = envelope({ type: "variable", categories: [{ id: 999 }] });
    input.entities.categories = [];
    const plan = buildWooCommerceCatalogPlan(input);

    expect(plan.products).toHaveLength(0);
    expect(plan.issues).toContainEqual(
      expect.objectContaining({ code: "unsupported_product_type", severity: "error" }),
    );
  });

  it("blocks invalid precision, unsafe image protocols, and source duplicates", () => {
    const input = envelope();
    input.entities.products = [
      product({ id: 101, slug: "bad-money", sku: "BAD-MONEY", price: "12.345" }),
      product({
        id: 102,
        slug: "duplicate-slug",
        sku: "UNSAFE-IMAGE",
        images: [{ src: "file:///tmp/private.jpg" }],
      }),
      product({ id: 103, slug: "duplicate-slug", sku: "DUPLICATE-SLUG" }),
    ];
    const plan = buildWooCommerceCatalogPlan(input);

    expect(plan.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "invalid_money" }),
        expect.objectContaining({ code: "invalid_media_url" }),
        expect.objectContaining({ code: "duplicate_source_slug" }),
      ]),
    );
  });

  it("requires the versioned source envelope and blocks unknown catalog semantics", () => {
    expect(buildWooCommerceCatalogPlan({ products: [] }).issues).toContainEqual(
      expect.objectContaining({ code: "invalid_envelope", severity: "error" }),
    );

    const input = envelope({ status: "private" });
    const plan = buildWooCommerceCatalogPlan(input);
    expect(plan.products).toHaveLength(0);
    expect(plan.issues).toContainEqual(
      expect.objectContaining({ code: "unsupported_product_status", severity: "error" }),
    );
  });

  it("blocks cyclic category ownership graphs", () => {
    const input = envelope();
    input.entities.categories = [
      { id: 1, name: "One", slug: "one", parent: 2 },
      { id: 2, name: "Two", slug: "two", parent: 1 },
    ];
    input.entities.products = [];

    expect(buildWooCommerceCatalogPlan(input).issues).toContainEqual(
      expect.objectContaining({ code: "category_parent_cycle", severity: "error" }),
    );
  });

  it("uses durable mappings as ownership evidence and detects target edits", () => {
    const plan = buildWooCommerceCatalogPlan(envelope());
    const productOperation = plan.operations.find(
      (operation) => operation.entityType === "product",
    )!;
    const categoryOperation = plan.operations.find(
      (operation) => operation.entityType === "category",
    )!;
    const targetHash = "b".repeat(64);
    const inspection = inspectWooCommerceTarget(plan, {
      mappings: [
        {
          entityType: "product",
          externalId: productOperation.externalId,
          targetType: "ecommerce_product",
          targetId: productOperation.targetId,
          normalizedSourceHash: productOperation.normalizedSourceHash,
          targetBaselineHash: "a".repeat(64),
          lifecycleState: "active",
        },
      ],
      categories: [
        {
          id: categoryOperation.targetId,
          slug: categoryOperation.targetRecord.slug,
          targetHash,
        },
      ],
      products: [
        {
          id: productOperation.targetId,
          urlSlug: productOperation.targetRecord.urlSlug,
          sku: productOperation.targetRecord.sku,
          targetHash,
        },
      ],
    });

    expect(inspection.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unowned_target_identity", entity: "category" }),
        expect.objectContaining({ code: "target_edited_since_import", entity: "product" }),
      ]),
    );
    expect(JSON.stringify(inspection.issues)).not.toContain("Migration-safe mug");
  });

  it("recognizes an unchanged mapped target as an idempotent match", () => {
    const plan = buildWooCommerceCatalogPlan(envelope());
    const mappings = plan.operations.map((operation) => ({
      entityType: operation.entityType,
      externalId: operation.externalId,
      targetType: operation.targetType,
      targetId: operation.targetId,
      normalizedSourceHash: operation.normalizedSourceHash,
      targetBaselineHash: "a".repeat(64),
      lifecycleState: "active" as const,
    }));
    const inspection = inspectWooCommerceTarget(plan, {
      mappings,
      categories: plan.categories.map((category) => ({
        id: category.targetId,
        slug: category.slug,
        targetHash: "a".repeat(64),
      })),
      products: plan.products.map((product) => ({
        id: product.targetId,
        urlSlug: product.urlSlug,
        sku: product.sku,
        targetHash: "a".repeat(64),
      })),
    });

    expect(inspection.issues).toEqual([]);
    expect(inspection.matchedExternalIds).toEqual(["category:9", "product:101"]);
  });
});

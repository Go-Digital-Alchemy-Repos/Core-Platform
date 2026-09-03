import { and, eq, inArray, sql } from "drizzle-orm";
import {
  ecommerceCategories,
  ecommerceProductCategories,
  ecommerceProductMedia,
  ecommerceProducts,
  ecommerceProductVariants,
} from "@shared/schema";
import type { WooImportIssue, WooImportPlan } from "./woocommerce-import.service";
import { assertWooCommercePlanCanApply, wooSourceRef } from "./woocommerce-import.service";
import { db } from "../db";

export interface WooTargetReconciliation {
  categories: number;
  products: number;
  productPriceTotal: number;
  media: number;
  categoryAssignments: number;
}

function chunks<T>(values: T[], size = 500) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

export async function inspectWooCommerceTargetConflicts(
  plan: WooImportPlan,
): Promise<WooImportIssue[]> {
  const issues: WooImportIssue[] = [];
  const existingCategories: Array<{ id: string; slug: string }> = [];
  for (const slugs of chunks([...new Set(plan.categories.map((category) => category.slug))])) {
    existingCategories.push(
      ...(await db
        .select({ id: ecommerceCategories.id, slug: ecommerceCategories.slug })
        .from(ecommerceCategories)
        .where(inArray(ecommerceCategories.slug, slugs))),
    );
  }
  const categoryIdsBySlug = new Map(
    existingCategories.map((category) => [category.slug, category.id]),
  );

  for (const category of plan.categories) {
    const existingId = categoryIdsBySlug.get(category.slug);
    if (existingId && existingId !== category.targetId) {
      issues.push({
        severity: "error",
        code: "target_slug_conflict",
        entity: "category",
        sourceRef: wooSourceRef("category", category.sourceId),
        field: "slug",
        message: "The target already contains a different category with this slug.",
      });
    }
  }

  const existingProducts: Array<{ id: string; urlSlug: string }> = [];
  for (const slugs of chunks([...new Set(plan.products.map((product) => product.urlSlug))])) {
    existingProducts.push(
      ...(await db
        .select({ id: ecommerceProducts.id, urlSlug: ecommerceProducts.urlSlug })
        .from(ecommerceProducts)
        .where(inArray(ecommerceProducts.urlSlug, slugs))),
    );
  }
  const productIdsBySlug = new Map(
    existingProducts.map((product) => [product.urlSlug, product.id]),
  );

  const existingVariants: Array<{ id: string; sku: string | null }> = [];
  const skus = plan.products
    .map((product) => product.sku)
    .filter((sku): sku is string => Boolean(sku));
  for (const skuChunk of chunks([...new Set(skus)])) {
    existingVariants.push(
      ...(await db
        .select({ id: ecommerceProductVariants.id, sku: ecommerceProductVariants.sku })
        .from(ecommerceProductVariants)
        .where(inArray(ecommerceProductVariants.sku, skuChunk))),
    );
  }
  const variantIdsBySku = new Map(existingVariants.map((variant) => [variant.sku, variant.id]));
  const defaultVariants: Array<{ id: string; productId: string }> = [];
  for (const productIdChunk of chunks(plan.products.map((product) => product.targetId))) {
    defaultVariants.push(
      ...(await db
        .select({ id: ecommerceProductVariants.id, productId: ecommerceProductVariants.productId })
        .from(ecommerceProductVariants)
        .where(
          and(
            inArray(ecommerceProductVariants.productId, productIdChunk),
            eq(ecommerceProductVariants.optionSignature, "default"),
          ),
        )),
    );
  }
  const defaultVariantIdsByProduct = new Map(
    defaultVariants.map((variant) => [variant.productId, variant.id]),
  );

  for (const product of plan.products) {
    const existingProductId = productIdsBySlug.get(product.urlSlug);
    if (existingProductId && existingProductId !== product.targetId) {
      issues.push({
        severity: "error",
        code: "target_slug_conflict",
        entity: "product",
        sourceRef: wooSourceRef("product", product.sourceId),
        field: "slug",
        message: "The target already contains a different product with this slug.",
      });
    }

    if (product.sku) {
      const existingVariantId = variantIdsBySku.get(product.sku);
      if (existingVariantId && existingVariantId !== product.defaultVariantId) {
        issues.push({
          severity: "error",
          code: "target_sku_conflict",
          entity: "product",
          sourceRef: wooSourceRef("product", product.sourceId),
          field: "sku",
          message: "The target already contains a different product variant with this SKU.",
        });
      }
    }
    const existingDefaultVariantId = defaultVariantIdsByProduct.get(product.targetId);
    if (existingDefaultVariantId && existingDefaultVariantId !== product.defaultVariantId) {
      issues.push({
        severity: "error",
        code: "target_default_variant_conflict",
        entity: "product",
        sourceRef: wooSourceRef("product", product.sourceId),
        field: "defaultVariant",
        message:
          "The imported target product has a non-importer default variant and cannot be synchronized safely.",
      });
    }
  }

  return issues;
}

export async function applyWooCommerceCatalogPlan(plan: WooImportPlan) {
  assertWooCommercePlanCanApply(plan);

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(2026090301)`);
    for (const category of plan.categories) {
      await tx
        .insert(ecommerceCategories)
        .values({
          id: category.targetId,
          name: category.name,
          slug: category.slug,
          description: category.description,
          parentId: category.parentId,
          image: category.image,
          sortOrder: category.sortOrder,
          active: category.active,
        })
        .onConflictDoUpdate({
          target: ecommerceCategories.id,
          set: {
            name: category.name,
            slug: category.slug,
            description: category.description,
            parentId: category.parentId,
            image: category.image,
            sortOrder: category.sortOrder,
            active: category.active,
            updatedAt: new Date(),
          },
        });
    }

    for (const product of plan.products) {
      await tx
        .insert(ecommerceProducts)
        .values({
          id: product.targetId,
          name: product.name,
          description: product.description,
          shortDescription: product.shortDescription,
          productType: "simple",
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          taxable: product.taxable,
          taxCategory: product.taxCategory,
          featured: product.featured,
          visibility: product.visibility,
          publishedAt: product.publishedAt,
          primaryImage: product.primaryImage,
          secondaryImages: product.secondaryImages,
          active: product.active,
          status: product.status,
          sku: product.sku,
          tags: product.tags,
          salePrice: product.salePrice,
          discountType: "NONE",
          saleStartAt: product.saleStartAt,
          saleEndAt: product.saleEndAt,
          urlSlug: product.urlSlug,
          physicalProduct: true,
          requiresShipping: true,
        })
        .onConflictDoUpdate({
          target: ecommerceProducts.id,
          set: {
            name: product.name,
            description: product.description,
            shortDescription: product.shortDescription,
            productType: "simple",
            price: product.price,
            compareAtPrice: product.compareAtPrice,
            taxable: product.taxable,
            taxCategory: product.taxCategory,
            featured: product.featured,
            visibility: product.visibility,
            publishedAt: product.publishedAt,
            primaryImage: product.primaryImage,
            secondaryImages: product.secondaryImages,
            active: product.active,
            status: product.status,
            sku: product.sku,
            tags: product.tags,
            salePrice: product.salePrice,
            discountType: "NONE",
            saleStartAt: product.saleStartAt,
            saleEndAt: product.saleEndAt,
            urlSlug: product.urlSlug,
            physicalProduct: true,
            requiresShipping: true,
            updatedAt: new Date(),
          },
        });

      await tx
        .insert(ecommerceProductVariants)
        .values({
          id: product.defaultVariantId,
          productId: product.targetId,
          title: "Default",
          optionSignature: "default",
          optionValues: {},
          sku: product.sku,
          price: product.price,
          salePrice: product.salePrice,
          compareAtPrice: product.compareAtPrice,
          inventoryQuantity: product.inventoryQuantity,
          trackInventory: product.trackInventory,
          allowBackorder: product.allowBackorder,
          image: product.primaryImage,
          status: product.active ? "active" : "inactive",
          active: product.active,
          sortOrder: 0,
          isDefault: true,
        })
        .onConflictDoUpdate({
          target: ecommerceProductVariants.id,
          set: {
            sku: product.sku,
            price: product.price,
            salePrice: product.salePrice,
            compareAtPrice: product.compareAtPrice,
            inventoryQuantity: product.inventoryQuantity,
            trackInventory: product.trackInventory,
            allowBackorder: product.allowBackorder,
            image: product.primaryImage,
            status: product.active ? "active" : "inactive",
            active: product.active,
            updatedAt: new Date(),
          },
        });

      await tx
        .delete(ecommerceProductCategories)
        .where(eq(ecommerceProductCategories.productId, product.targetId));
      if (product.categoryIds.length) {
        await tx.insert(ecommerceProductCategories).values(
          product.categoryIds.map((categoryId) => ({
            productId: product.targetId,
            categoryId,
          })),
        );
      }

      await tx
        .delete(ecommerceProductMedia)
        .where(eq(ecommerceProductMedia.productId, product.targetId));
      if (product.media.length) {
        await tx.insert(ecommerceProductMedia).values(
          product.media.map((media) => ({
            id: media.targetId,
            productId: product.targetId,
            url: media.url,
            altText: media.altText,
            sortOrder: media.sortOrder,
            primary: media.primary,
          })),
        );
      }
    }
  });
}

export async function reconcileWooCommerceCatalogPlan(
  plan: WooImportPlan,
): Promise<WooTargetReconciliation> {
  const productIds = plan.products.map((product) => product.targetId);
  const categoryIds = plan.categories.map((category) => category.targetId);
  const targetProducts = productIds.length
    ? await db
        .select({ id: ecommerceProducts.id, price: ecommerceProducts.price })
        .from(ecommerceProducts)
        .where(inArray(ecommerceProducts.id, productIds))
    : [];
  const targetCategories = categoryIds.length
    ? await db
        .select({ id: ecommerceCategories.id })
        .from(ecommerceCategories)
        .where(inArray(ecommerceCategories.id, categoryIds))
    : [];
  const targetMedia = productIds.length
    ? await db
        .select({ id: ecommerceProductMedia.id })
        .from(ecommerceProductMedia)
        .where(inArray(ecommerceProductMedia.productId, productIds))
    : [];
  const targetAssignments = productIds.length
    ? await db
        .select({ productId: ecommerceProductCategories.productId })
        .from(ecommerceProductCategories)
        .where(inArray(ecommerceProductCategories.productId, productIds))
    : [];

  return {
    categories: targetCategories.length,
    products: targetProducts.length,
    productPriceTotal: targetProducts.reduce((total, product) => total + product.price, 0),
    media: targetMedia.length,
    categoryAssignments: targetAssignments.length,
  };
}

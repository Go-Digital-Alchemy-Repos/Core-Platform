import { createHash } from "node:crypto";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import {
  ecommerceCategories,
  ecommerceProductCategories,
  ecommerceProductMedia,
  ecommerceProductVariants,
  ecommerceProducts,
} from "@shared/schema/ecommerce";
import {
  wooImportAuditEntries,
  wooImportMappings,
  wooImportQuarantineRecords,
  wooImportRuns,
  type EcommerceProduct,
  type EcommerceProductMedia,
  type EcommerceProductVariant,
  type WooImportRun,
} from "@shared/schema";
import { db } from "../db";
import {
  assertWooImportCanComplete,
  assertWooImportRunTransition,
  sanitizeWooImportFailureCode,
  validateBeginWooImportRun,
  wooImportSourceRef,
  type BeginWooImportRun,
  type WooImportReconciliationSummary,
  type WooImportRunStatus,
} from "./woocommerce-import-lifecycle.service";
import {
  type WooImportOperation,
  type WooImportProduct,
  type WooImportTargetSnapshot,
} from "./woocommerce-import.service";
import {
  WooImportManualReviewError,
  type WooImportBatchRequest,
  type WooImportBatchResult,
  type WooImportQuarantineRequest,
  type WooImportRepositoryV1,
  type WooImportRunEvidence,
} from "./woocommerce-import-repository.service";

function canonical(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
    .join(",")}}`;
}

function hash(value: unknown) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function iso(value: Date | null | undefined) {
  return value?.toISOString() ?? null;
}

function productBaseline(
  product: Pick<
    EcommerceProduct,
    | "id"
    | "name"
    | "description"
    | "shortDescription"
    | "price"
    | "compareAtPrice"
    | "taxable"
    | "taxCategory"
    | "featured"
    | "visibility"
    | "publishedAt"
    | "primaryImage"
    | "secondaryImages"
    | "active"
    | "status"
    | "sku"
    | "tags"
    | "salePrice"
    | "saleStartAt"
    | "saleEndAt"
    | "urlSlug"
  >,
  variant: Pick<
    EcommerceProductVariant,
    | "id"
    | "sku"
    | "price"
    | "salePrice"
    | "compareAtPrice"
    | "inventoryQuantity"
    | "trackInventory"
    | "allowBackorder"
    | "image"
    | "status"
    | "active"
    | "sortOrder"
    | "isDefault"
  > | null,
  categoryIds: string[],
  media: Array<Pick<EcommerceProductMedia, "id" | "url" | "altText" | "sortOrder" | "primary">>,
) {
  return {
    product: {
      id: product.id,
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      taxable: product.taxable,
      taxCategory: product.taxCategory,
      featured: product.featured,
      visibility: product.visibility,
      publishedAt: iso(product.publishedAt),
      primaryImage: product.primaryImage,
      secondaryImages: [...product.secondaryImages],
      active: product.active,
      status: product.status,
      sku: product.sku,
      tags: [...product.tags],
      salePrice: product.salePrice,
      saleStartAt: iso(product.saleStartAt),
      saleEndAt: iso(product.saleEndAt),
      urlSlug: product.urlSlug,
    },
    defaultVariant: variant
      ? {
          id: variant.id,
          sku: variant.sku,
          price: variant.price,
          salePrice: variant.salePrice,
          compareAtPrice: variant.compareAtPrice,
          inventoryQuantity: variant.inventoryQuantity,
          trackInventory: variant.trackInventory,
          allowBackorder: variant.allowBackorder,
          image: variant.image,
          status: variant.status,
          active: variant.active,
          sortOrder: variant.sortOrder,
          isDefault: variant.isDefault,
        }
      : null,
    categoryIds: [...categoryIds].sort(),
    media: media
      .map((item) => ({
        id: item.id,
        url: item.url,
        altText: item.altText,
        sortOrder: item.sortOrder,
        primary: item.primary,
      }))
      .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id)),
  };
}

function expectedProductBaseline(product: WooImportProduct) {
  return productBaseline(
    {
      id: product.targetId,
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription,
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
      saleStartAt: product.saleStartAt,
      saleEndAt: product.saleEndAt,
      urlSlug: product.urlSlug,
    },
    {
      id: product.defaultVariantId,
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
    },
    product.categoryIds,
    product.media.map((item) => ({ ...item, id: item.targetId })),
  );
}

function targetHashForOperation(operation: WooImportOperation) {
  if (operation.entityType === "category") {
    const category = operation.targetRecord;
    return hash({
      id: category.targetId,
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentId: category.parentId,
      image: category.image,
      sortOrder: category.sortOrder,
      active: category.active,
    });
  }
  return hash(expectedProductBaseline(operation.targetRecord));
}

function assertRunStatus(value: string): asserts value is WooImportRunStatus {
  if (
    ![
      "planned",
      "applying",
      "completed",
      "failed",
      "rollback_pending",
      "rolled_back",
      "manual_review",
    ].includes(value)
  ) {
    throw new Error("WooCommerce import run has an invalid persisted status");
  }
}

export class DrizzleWooImportRepository implements WooImportRepositoryV1 {
  async beginRun(request: BeginWooImportRun): Promise<WooImportRun> {
    const valid = validateBeginWooImportRun(request);
    const [run] = await db.insert(wooImportRuns).values(valid).returning();
    return run;
  }

  async resumeRun(runId: string, request: BeginWooImportRun): Promise<WooImportRun> {
    const valid = validateBeginWooImportRun(request);
    return db.transaction(async (tx) => {
      const [run] = await tx
        .select()
        .from(wooImportRuns)
        .where(eq(wooImportRuns.id, runId))
        .for("update");
      if (!run) throw new Error("WooCommerce import run was not found");
      const matchesIdentity =
        run.contractVersion === valid.contractVersion &&
        run.sourceStoreId === valid.sourceStoreId &&
        run.targetStackId === valid.targetStackId &&
        run.sourceFingerprint === valid.sourceFingerprint &&
        run.highWaterMark === valid.highWaterMark &&
        run.mode === valid.mode &&
        JSON.stringify([...run.enabledPhases].sort()) === JSON.stringify(valid.enabledPhases);
      if (!matchesIdentity) {
        throw new Error("WooCommerce resume request does not match the original run identity");
      }
      assertRunStatus(run.status);
      if (run.status !== "failed") {
        throw new Error("Only failed WooCommerce import runs may be resumed");
      }
      assertWooImportRunTransition(run.status, "applying");
      const [resumed] = await tx
        .update(wooImportRuns)
        .set({ status: "applying", failureCode: null, updatedAt: new Date() })
        .where(eq(wooImportRuns.id, run.id))
        .returning();
      return resumed;
    });
  }

  async inspect(request: {
    sourceStoreId: string;
    operations: WooImportOperation[];
  }): Promise<WooImportTargetSnapshot> {
    const [mappings, categories, products, variants, assignments, media] = await Promise.all([
      db
        .select()
        .from(wooImportMappings)
        .where(
          and(
            eq(wooImportMappings.sourceSystem, "woocommerce"),
            eq(wooImportMappings.sourceStoreId, request.sourceStoreId),
          ),
        ),
      db.select().from(ecommerceCategories),
      db.select().from(ecommerceProducts),
      db.select().from(ecommerceProductVariants),
      db.select().from(ecommerceProductCategories),
      db.select().from(ecommerceProductMedia),
    ]);

    const variantsByProduct = new Map<string, EcommerceProductVariant>();
    for (const variant of variants) {
      if (variant.isDefault) variantsByProduct.set(variant.productId, variant);
    }
    const categoriesByProduct = new Map<string, string[]>();
    for (const assignment of assignments) {
      const current = categoriesByProduct.get(assignment.productId) ?? [];
      current.push(assignment.categoryId);
      categoriesByProduct.set(assignment.productId, current);
    }
    const mediaByProduct = new Map<string, EcommerceProductMedia[]>();
    for (const item of media) {
      const current = mediaByProduct.get(item.productId) ?? [];
      current.push(item);
      mediaByProduct.set(item.productId, current);
    }

    return {
      mappings: mappings.map((mapping) => ({
        entityType: mapping.entityType as "category" | "product",
        externalId: mapping.externalId,
        targetType: mapping.targetType as "ecommerce_category" | "ecommerce_product",
        targetId: mapping.targetId,
        normalizedSourceHash: mapping.normalizedSourceHash,
        targetBaselineHash: mapping.targetBaselineHash,
        lifecycleState: mapping.lifecycleState as "active" | "manual_review" | "rolled_back",
      })),
      categories: categories.map((category) => ({
        id: category.id,
        slug: category.slug,
        targetHash: hash({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          parentId: category.parentId,
          image: category.image,
          sortOrder: category.sortOrder,
          active: category.active,
        }),
      })),
      products: products.map((product) => ({
        id: product.id,
        urlSlug: product.urlSlug,
        sku: product.sku,
        targetHash: hash(
          productBaseline(
            product,
            variantsByProduct.get(product.id) ?? null,
            categoriesByProduct.get(product.id) ?? [],
            mediaByProduct.get(product.id) ?? [],
          ),
        ),
      })),
    };
  }

  async applyBatch(request: WooImportBatchRequest): Promise<WooImportBatchResult> {
    if (!request.operations.length) {
      throw new Error("WooCommerce apply batches must contain at least one operation");
    }
    if (request.operations.some((operation) => !operation.targetId || !operation.externalId)) {
      throw new Error("WooCommerce apply batch contains an invalid operation identity");
    }

    return db.transaction(async (tx) => {
      const [run] = await tx
        .select()
        .from(wooImportRuns)
        .where(eq(wooImportRuns.id, request.runId))
        .for("update");
      if (!run) throw new Error("WooCommerce import run was not found");
      if (run.sourceStoreId !== request.sourceStoreId) {
        throw new Error("WooCommerce import run source store does not match the batch");
      }
      assertRunStatus(run.status);
      if (run.status !== "applying") {
        assertWooImportRunTransition(run.status, "applying");
        await tx
          .update(wooImportRuns)
          .set({ status: "applying", updatedAt: new Date(), failureCode: null })
          .where(eq(wooImportRuns.id, run.id));
      }

      const existingAudit = await tx
        .select()
        .from(wooImportAuditEntries)
        .where(
          and(
            eq(wooImportAuditEntries.runId, request.runId),
            eq(wooImportAuditEntries.batchKey, request.batchKey),
          ),
        );
      if (existingAudit.length) {
        const expectedRefs = new Set(
          request.operations.map((operation) =>
            wooImportSourceRef(operation.entityType, operation.externalId),
          ),
        );
        if (
          existingAudit.length !== expectedRefs.size ||
          existingAudit.some((entry) => !expectedRefs.has(entry.sourceRef))
        ) {
          throw new WooImportManualReviewError("incomplete_or_mismatched_batch_replay");
        }
        return {
          applied: existingAudit.filter((entry) => entry.outcome === "applied").length,
          matched: existingAudit.filter((entry) => entry.outcome === "matched").length,
          checkpoint: request.nextCheckpoint,
        };
      }

      let applied = 0;
      let matched = 0;
      for (const operation of request.operations) {
        const sourceRef = wooImportSourceRef(operation.entityType, operation.externalId);
        const [mapping] = await tx
          .select()
          .from(wooImportMappings)
          .where(
            and(
              eq(wooImportMappings.sourceSystem, "woocommerce"),
              eq(wooImportMappings.sourceStoreId, request.sourceStoreId),
              eq(wooImportMappings.entityType, operation.entityType),
              eq(wooImportMappings.externalId, operation.externalId),
            ),
          )
          .limit(1);

        let actualTargetHash: string | null = null;
        if (operation.entityType === "category") {
          const [target] = await tx
            .select()
            .from(ecommerceCategories)
            .where(eq(ecommerceCategories.id, operation.targetId))
            .limit(1);
          if (target) {
            actualTargetHash = hash({
              id: target.id,
              name: target.name,
              slug: target.slug,
              description: target.description,
              parentId: target.parentId,
              image: target.image,
              sortOrder: target.sortOrder,
              active: target.active,
            });
          }
        } else {
          const [target] = await tx
            .select()
            .from(ecommerceProducts)
            .where(eq(ecommerceProducts.id, operation.targetId))
            .limit(1);
          if (target) {
            const [variant] = await tx
              .select()
              .from(ecommerceProductVariants)
              .where(
                and(
                  eq(ecommerceProductVariants.productId, target.id),
                  eq(ecommerceProductVariants.isDefault, true),
                ),
              )
              .limit(1);
            const [targetAssignments, targetMedia] = await Promise.all([
              tx
                .select()
                .from(ecommerceProductCategories)
                .where(eq(ecommerceProductCategories.productId, target.id)),
              tx
                .select()
                .from(ecommerceProductMedia)
                .where(eq(ecommerceProductMedia.productId, target.id)),
            ]);
            actualTargetHash = hash(
              productBaseline(
                target,
                variant ?? null,
                targetAssignments.map((item) => item.categoryId),
                targetMedia,
              ),
            );
          }
        }

        if (mapping) {
          if (
            mapping.targetId !== operation.targetId ||
            mapping.targetType !== operation.targetType ||
            mapping.lifecycleState !== "active"
          ) {
            throw new WooImportManualReviewError("mapping_ownership_conflict");
          }
          if (!actualTargetHash || actualTargetHash !== mapping.targetBaselineHash) {
            throw new WooImportManualReviewError("target_edited_since_import");
          }
        } else if (actualTargetHash) {
          throw new WooImportManualReviewError("unowned_target_identity");
        }

        const nextTargetHash = targetHashForOperation(operation);
        const isMatch = mapping?.normalizedSourceHash === operation.normalizedSourceHash;
        if (!isMatch) {
          if (operation.entityType === "category") {
            const category = operation.targetRecord;
            if (mapping) {
              await tx
                .update(ecommerceCategories)
                .set({
                  name: category.name,
                  slug: category.slug,
                  description: category.description,
                  parentId: category.parentId,
                  image: category.image,
                  sortOrder: category.sortOrder,
                  active: category.active,
                  updatedAt: new Date(),
                })
                .where(eq(ecommerceCategories.id, category.targetId));
            } else {
              await tx.insert(ecommerceCategories).values({
                id: category.targetId,
                name: category.name,
                slug: category.slug,
                description: category.description,
                parentId: category.parentId,
                image: category.image,
                sortOrder: category.sortOrder,
                active: category.active,
              });
            }
          } else {
            const product = operation.targetRecord;
            const productValues = {
              name: product.name,
              description: product.description,
              shortDescription: product.shortDescription,
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
              saleStartAt: product.saleStartAt,
              saleEndAt: product.saleEndAt,
              urlSlug: product.urlSlug,
              updatedAt: new Date(),
            };
            if (mapping) {
              await tx
                .update(ecommerceProducts)
                .set(productValues)
                .where(eq(ecommerceProducts.id, product.targetId));
            } else {
              await tx.insert(ecommerceProducts).values({ id: product.targetId, ...productValues });
            }
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
                active: product.active,
                status: product.active ? "active" : "inactive",
                isDefault: true,
              })
              .onConflictDoUpdate({
                target: [
                  ecommerceProductVariants.productId,
                  ecommerceProductVariants.optionSignature,
                ],
                set: {
                  sku: product.sku,
                  price: product.price,
                  salePrice: product.salePrice,
                  compareAtPrice: product.compareAtPrice,
                  inventoryQuantity: product.inventoryQuantity,
                  trackInventory: product.trackInventory,
                  allowBackorder: product.allowBackorder,
                  image: product.primaryImage,
                  active: product.active,
                  status: product.active ? "active" : "inactive",
                  updatedAt: new Date(),
                },
              });
            await tx
              .delete(ecommerceProductCategories)
              .where(eq(ecommerceProductCategories.productId, product.targetId));
            if (product.categoryIds.length) {
              await tx
                .insert(ecommerceProductCategories)
                .values(
                  product.categoryIds.map((categoryId) => ({
                    productId: product.targetId,
                    categoryId,
                  })),
                )
                .onConflictDoNothing();
            }
            await tx
              .delete(ecommerceProductMedia)
              .where(eq(ecommerceProductMedia.productId, product.targetId));
            if (product.media.length) {
              await tx.insert(ecommerceProductMedia).values(
                product.media.map((item) => ({
                  id: item.targetId,
                  productId: product.targetId,
                  url: item.url,
                  altText: item.altText,
                  sortOrder: item.sortOrder,
                  primary: item.primary,
                })),
              );
            }
          }

          if (mapping) {
            await tx
              .update(wooImportMappings)
              .set({
                latestRunId: run.id,
                normalizedSourceHash: operation.normalizedSourceHash,
                targetBaselineHash: nextTargetHash,
                latestImportedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(wooImportMappings.id, mapping.id));
          } else {
            await tx.insert(wooImportMappings).values({
              sourceSystem: "woocommerce",
              sourceStoreId: request.sourceStoreId,
              entityType: operation.entityType,
              externalId: operation.externalId,
              targetType: operation.targetType,
              targetId: operation.targetId,
              firstRunId: run.id,
              latestRunId: run.id,
              normalizedSourceHash: operation.normalizedSourceHash,
              targetBaselineHash: nextTargetHash,
            });
          }
          applied += 1;
        } else {
          matched += 1;
        }

        await tx.insert(wooImportAuditEntries).values({
          runId: run.id,
          batchKey: request.batchKey,
          entityType: operation.entityType,
          sourceRef,
          targetType: operation.targetType,
          targetId: operation.targetId,
          action: isMatch ? "matched" : mapping ? "updated" : "created",
          priorSourceHash: mapping?.normalizedSourceHash ?? null,
          nextSourceHash: operation.normalizedSourceHash,
          priorTargetHash: actualTargetHash,
          nextTargetHash,
          outcome: isMatch ? "matched" : "applied",
        });
      }

      await tx
        .update(wooImportRuns)
        .set({ latestCheckpoint: request.nextCheckpoint, updatedAt: new Date() })
        .where(eq(wooImportRuns.id, run.id));
      return { applied, matched, checkpoint: request.nextCheckpoint };
    });
  }

  async completeRun(runId: string, reconciliation: WooImportReconciliationSummary): Promise<void> {
    assertWooImportCanComplete(reconciliation);
    await db.transaction(async (tx) => {
      const [run] = await tx
        .select()
        .from(wooImportRuns)
        .where(eq(wooImportRuns.id, runId))
        .for("update");
      if (!run) throw new Error("WooCommerce import run was not found");
      assertRunStatus(run.status);
      assertWooImportRunTransition(run.status, "completed");
      const [quarantine] = await tx
        .select({ total: count() })
        .from(wooImportQuarantineRecords)
        .where(
          and(
            eq(wooImportQuarantineRecords.runId, runId),
            eq(wooImportQuarantineRecords.retryDisposition, "unresolved"),
          ),
        );
      if ((quarantine?.total ?? 0) !== reconciliation.unresolvedQuarantine) {
        throw new Error(
          "WooCommerce import quarantine reconciliation does not match persisted records",
        );
      }
      await tx
        .update(wooImportRuns)
        .set({
          status: "completed",
          reconciliation,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(wooImportRuns.id, run.id));
    });
  }

  async failRun(runId: string, failureCode: string): Promise<void> {
    await db.transaction(async (tx) => {
      const [run] = await tx
        .select()
        .from(wooImportRuns)
        .where(eq(wooImportRuns.id, runId))
        .for("update");
      if (!run) return;
      assertRunStatus(run.status);
      if (run.status === "failed" || run.status === "completed" || run.status === "rolled_back")
        return;
      assertWooImportRunTransition(run.status, "failed");
      await tx
        .update(wooImportRuns)
        .set({
          status: "failed",
          failureCode: sanitizeWooImportFailureCode(failureCode),
          updatedAt: new Date(),
        })
        .where(eq(wooImportRuns.id, run.id));
    });
  }

  async markRunManualReview(runId: string, reasonCode: string): Promise<void> {
    await db.transaction(async (tx) => {
      const [run] = await tx
        .select()
        .from(wooImportRuns)
        .where(eq(wooImportRuns.id, runId))
        .for("update");
      if (!run) return;
      assertRunStatus(run.status);
      if (run.status === "manual_review") return;
      if (run.status === "completed") {
        assertWooImportRunTransition(run.status, "rollback_pending");
        await tx
          .update(wooImportRuns)
          .set({ status: "rollback_pending", updatedAt: new Date() })
          .where(eq(wooImportRuns.id, run.id));
        assertWooImportRunTransition("rollback_pending", "manual_review");
      } else {
        assertWooImportRunTransition(run.status, "manual_review");
      }
      await tx
        .update(wooImportRuns)
        .set({
          status: "manual_review",
          failureCode: sanitizeWooImportFailureCode(reasonCode),
          updatedAt: new Date(),
        })
        .where(eq(wooImportRuns.id, run.id));
    });
  }

  async quarantine(records: WooImportQuarantineRequest[]): Promise<void> {
    if (!records.length) return;
    await db.transaction(async (tx) => {
      for (const record of records) {
        await tx
          .insert(wooImportQuarantineRecords)
          .values({
            ...record,
            retryDisposition: record.retryDisposition ?? "unresolved",
          })
          .onConflictDoUpdate({
            target: [
              wooImportQuarantineRecords.runId,
              wooImportQuarantineRecords.entityType,
              wooImportQuarantineRecords.sourceRef,
              wooImportQuarantineRecords.reasonCode,
            ],
            set: {
              fieldNames: record.fieldNames,
              sourceHash: record.sourceHash,
              retryDisposition: record.retryDisposition ?? "unresolved",
              updatedAt: new Date(),
            },
          });
      }
    });
  }

  async rollbackRun(runId: string): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        const [run] = await tx
          .select()
          .from(wooImportRuns)
          .where(eq(wooImportRuns.id, runId))
          .for("update");
        if (!run) throw new Error("WooCommerce import run was not found");
        assertRunStatus(run.status);
        assertWooImportRunTransition(run.status, "rollback_pending");
        await tx
          .update(wooImportRuns)
          .set({ status: "rollback_pending", updatedAt: new Date() })
          .where(eq(wooImportRuns.id, run.id));

        const createdMappings = await tx
          .select()
          .from(wooImportMappings)
          .where(eq(wooImportMappings.firstRunId, run.id));
        for (const mapping of createdMappings) {
          const [audit] = await tx
            .select()
            .from(wooImportAuditEntries)
            .where(
              and(
                eq(wooImportAuditEntries.runId, run.id),
                eq(wooImportAuditEntries.targetType, mapping.targetType),
                eq(wooImportAuditEntries.targetId, mapping.targetId),
              ),
            )
            .orderBy(desc(wooImportAuditEntries.createdAt))
            .limit(1);
          if (!audit || audit.action !== "created") {
            throw new WooImportManualReviewError("rollback_requires_preexisting_target_restore");
          }
          let currentTargetHash: string | null = null;
          if (mapping.targetType === "ecommerce_category") {
            const [target] = await tx
              .select()
              .from(ecommerceCategories)
              .where(eq(ecommerceCategories.id, mapping.targetId))
              .limit(1);
            if (target) {
              currentTargetHash = hash({
                id: target.id,
                name: target.name,
                slug: target.slug,
                description: target.description,
                parentId: target.parentId,
                image: target.image,
                sortOrder: target.sortOrder,
                active: target.active,
              });
            }
          } else {
            const [target] = await tx
              .select()
              .from(ecommerceProducts)
              .where(eq(ecommerceProducts.id, mapping.targetId))
              .limit(1);
            if (target) {
              const [variant] = await tx
                .select()
                .from(ecommerceProductVariants)
                .where(
                  and(
                    eq(ecommerceProductVariants.productId, target.id),
                    eq(ecommerceProductVariants.isDefault, true),
                  ),
                )
                .limit(1);
              const [targetAssignments, targetMedia] = await Promise.all([
                tx
                  .select()
                  .from(ecommerceProductCategories)
                  .where(eq(ecommerceProductCategories.productId, target.id)),
                tx
                  .select()
                  .from(ecommerceProductMedia)
                  .where(eq(ecommerceProductMedia.productId, target.id)),
              ]);
              currentTargetHash = hash(
                productBaseline(
                  target,
                  variant ?? null,
                  targetAssignments.map((item) => item.categoryId),
                  targetMedia,
                ),
              );
            }
          }
          if (!currentTargetHash || currentTargetHash !== audit.nextTargetHash) {
            throw new WooImportManualReviewError("rollback_target_edited_since_import");
          }
        }

        const products = createdMappings
          .filter((mapping) => mapping.targetType === "ecommerce_product")
          .map((mapping) => mapping.targetId);
        const categories = createdMappings
          .filter((mapping) => mapping.targetType === "ecommerce_category")
          .map((mapping) => mapping.targetId);
        if (products.length) {
          await tx.delete(ecommerceProducts).where(inArray(ecommerceProducts.id, products));
        }
        if (categories.length) {
          await tx.delete(ecommerceCategories).where(inArray(ecommerceCategories.id, categories));
        }
        if (createdMappings.length) {
          await tx
            .update(wooImportMappings)
            .set({ lifecycleState: "rolled_back", latestRunId: run.id, updatedAt: new Date() })
            .where(
              inArray(
                wooImportMappings.id,
                createdMappings.map((mapping) => mapping.id),
              ),
            );
        }
        await tx
          .update(wooImportRuns)
          .set({ status: "rolled_back", completedAt: new Date(), updatedAt: new Date() })
          .where(eq(wooImportRuns.id, run.id));
      });
    } catch (error) {
      if (error instanceof WooImportManualReviewError) {
        await this.markRunManualReview(runId, error.reasonCode);
      }
      throw error;
    }
  }

  async inspectRun(runId: string): Promise<WooImportRunEvidence | undefined> {
    const [run, audit, applied, matched, quarantine] = await Promise.all([
      db.select().from(wooImportRuns).where(eq(wooImportRuns.id, runId)).limit(1),
      db
        .select({ total: count() })
        .from(wooImportAuditEntries)
        .where(eq(wooImportAuditEntries.runId, runId)),
      db
        .select({ total: count() })
        .from(wooImportAuditEntries)
        .where(
          and(eq(wooImportAuditEntries.runId, runId), eq(wooImportAuditEntries.outcome, "applied")),
        ),
      db
        .select({ total: count() })
        .from(wooImportAuditEntries)
        .where(
          and(eq(wooImportAuditEntries.runId, runId), eq(wooImportAuditEntries.outcome, "matched")),
        ),
      db
        .select({ total: count() })
        .from(wooImportQuarantineRecords)
        .where(
          and(
            eq(wooImportQuarantineRecords.runId, runId),
            eq(wooImportQuarantineRecords.retryDisposition, "unresolved"),
          ),
        ),
    ]);
    if (!run[0]) return undefined;
    return {
      run: run[0],
      auditCount: audit[0]?.total ?? 0,
      appliedCount: applied[0]?.total ?? 0,
      matchedCount: matched[0]?.total ?? 0,
      unresolvedQuarantineCount: quarantine[0]?.total ?? 0,
    };
  }
}

export function createDrizzleWooImportRepository() {
  return new DrizzleWooImportRepository();
}

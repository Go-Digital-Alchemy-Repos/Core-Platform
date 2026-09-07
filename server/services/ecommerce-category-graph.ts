import { sql } from "drizzle-orm";
import { ecommerceCategories } from "@shared/schema/ecommerce";
import type { db } from "../db";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// parent_id is not a foreign key. Fence all category writes before acquiring
// category/mapping row locks; a parent-row lock cannot fence incoming children.
export async function lockEcommerceCategoryGraph(tx: Transaction): Promise<void> {
  await tx.execute(sql`LOCK TABLE ecommerce_categories IN SHARE ROW EXCLUSIVE MODE`);
}

function invalidParent(message: string): never {
  throw Object.assign(new Error(message), { statusCode: 400 });
}

/** Caller must hold the graph write lock through validation and mutation. */
export async function validateEcommerceCategoryParent(
  tx: Transaction,
  categoryId: string | null,
  requestedParent: string | null | undefined,
): Promise<string | null> {
  const parentId = requestedParent === "" ? null : (requestedParent ?? null);
  if (parentId === null) return null;
  if (categoryId === parentId) invalidParent("A category cannot be its own parent");
  const categories = await tx
    .select({ id: ecommerceCategories.id, parentId: ecommerceCategories.parentId })
    .from(ecommerceCategories);
  const byId = new Map(categories.map((category) => [category.id, category.parentId]));
  assertParent(byId, categoryId, parentId);
  return parentId;
}

function assertParent(
  byId: Map<string, string | null>,
  categoryId: string | null,
  parentId: string | null,
): void {
  if (parentId === null) return;
  if (categoryId === parentId) invalidParent("A category cannot be its own parent");
  if (!byId.has(parentId)) invalidParent("Parent category not found");
  const visited = new Set<string>();
  let current: string | null = parentId;
  while (current) {
    if (current === categoryId)
      invalidParent("A category cannot be moved under one of its subcategories");
    if (visited.has(current) || !byId.has(current))
      invalidParent("Parent category hierarchy is invalid");
    visited.add(current);
    current = byId.get(current) ?? null;
  }
}

/** Validate the final current-batch graph, including parents inserted later in
 * this same transaction, against current ancestors from earlier batches. */
export async function validateEcommerceCategoryBatchParents(
  tx: Transaction,
  changes: Array<{ id: string; parentId: string | null }>,
): Promise<void> {
  const categories = await tx
    .select({ id: ecommerceCategories.id, parentId: ecommerceCategories.parentId })
    .from(ecommerceCategories);
  const byId = new Map(categories.map((category) => [category.id, category.parentId]));
  for (const change of changes) byId.set(change.id, change.parentId);
  for (const change of changes) assertParent(byId, change.id, change.parentId);
}

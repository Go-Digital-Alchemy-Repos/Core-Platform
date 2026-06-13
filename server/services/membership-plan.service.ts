import { z } from "zod";
import { storage } from "../storage/index";
import {
  insertMembershipPlanEntitlementSchema,
  insertMembershipPlanPriceSchema,
  insertMembershipPlanSchema,
} from "@shared/schema";

export const membershipPlanPayloadSchema = insertMembershipPlanSchema.extend({
  prices: z.array(insertMembershipPlanPriceSchema.omit({ planId: true })).default([]),
  entitlements: z.array(z.object({
    entitlement: z.string().min(1),
    label: z.string().optional().nullable(),
  })).default([]),
});

export function normalizeMembershipSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function assertPlanCanBeActive(planId: string): Promise<void> {
  const plan = await storage.membership.getPlanWithDetails(planId);
  if (plan.isFree) return;
  const hasActivePrice = plan.prices.some((price) => price.active && price.amount > 0);
  if (!hasActivePrice) {
    throw Object.assign(new Error("Paid membership plans require at least one active paid price before they can be published."), {
      statusCode: 400,
    });
  }
}

export async function createMembershipPlan(payload: unknown) {
  const parsed = membershipPlanPayloadSchema.parse(payload);
  const slug = normalizeMembershipSlug(parsed.slug);
  if (!slug) throw Object.assign(new Error("Plan slug is required"), { statusCode: 400 });
  const existing = await storage.membership.getPlanBySlug(slug);
  if (existing) throw Object.assign(new Error("A membership plan with this slug already exists"), { statusCode: 409 });

  const { prices, entitlements, ...planData } = parsed;
  const plan = await storage.membership.createPlan({ ...planData, slug, status: "draft" });
  await Promise.all(prices.map((price) => storage.membership.createPrice({ ...price, planId: plan.id })));
  await storage.membership.replacePlanEntitlements(
    plan.id,
    entitlements.map((entitlement) => insertMembershipPlanEntitlementSchema.parse({ ...entitlement, planId: plan.id })),
  );
  if (parsed.status === "active") {
    await assertPlanCanBeActive(plan.id);
    await storage.membership.updatePlan(plan.id, { status: "active" });
  }
  return storage.membership.getPlanWithDetails(plan.id);
}

export async function updateMembershipPlan(id: string, payload: unknown) {
  const parsed = membershipPlanPayloadSchema.partial().parse(payload);
  if (parsed.slug) {
    const slug = normalizeMembershipSlug(parsed.slug);
    const existing = await storage.membership.getPlanBySlug(slug);
    if (existing && existing.id !== id) throw Object.assign(new Error("A membership plan with this slug already exists"), { statusCode: 409 });
    parsed.slug = slug;
  }
  const { prices: _prices, entitlements, ...planData } = parsed;
  const plan = await storage.membership.updatePlan(id, planData);
  if (!plan) throw Object.assign(new Error("Membership plan not found"), { statusCode: 404 });
  if (entitlements) {
    await storage.membership.replacePlanEntitlements(
      id,
      entitlements.map((entitlement) => insertMembershipPlanEntitlementSchema.parse({ ...entitlement, planId: id })),
    );
  }
  if (parsed.status === "active") await assertPlanCanBeActive(id);
  return storage.membership.getPlanWithDetails(id);
}

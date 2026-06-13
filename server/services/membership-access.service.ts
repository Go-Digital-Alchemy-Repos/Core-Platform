import type { MembershipAccessRule, MembershipSubscription, User } from "@shared/schema";
import { storage } from "../storage/index";

export const ACTIVE_MEMBERSHIP_STATUSES = new Set(["active", "trialing", "manual", "past_due"]);

export interface MembershipAccessResult {
  allowed: boolean;
  reason: "public" | "admin_preview" | "logged_in" | "membership" | "plan" | "entitlement" | "login_required" | "upgrade_required";
  rule: MembershipAccessRule | null;
  teaser?: string | null;
}

export function isAdminPreviewUser(user: Pick<User, "role"> | undefined | null): boolean {
  return user?.role === "admin" || user?.role === "editor";
}

export function isSubscriptionCurrentlyActive(subscription: MembershipSubscription | undefined | null, now = new Date()): boolean {
  if (!subscription) return false;
  if (!ACTIVE_MEMBERSHIP_STATUSES.has(subscription.status)) return false;
  if (subscription.suspendedAt) return false;
  if (subscription.expiresAt && subscription.expiresAt < now) return false;
  if (subscription.currentPeriodEnd && subscription.status !== "manual" && subscription.currentPeriodEnd < now) return false;
  return true;
}

export async function getUserEntitlements(userId: string): Promise<string[]> {
  const subscription = await storage.membership.getActiveSubscriptionForUser(userId);
  if (!isSubscriptionCurrentlyActive(subscription) || !subscription?.planId) return [];
  const entitlements = await storage.membership.getPlanEntitlements(subscription.planId);
  return entitlements.map((entitlement) => entitlement.entitlement);
}

export async function canAccessResource(
  user: Pick<User, "id" | "role"> | undefined | null,
  resourceType: string,
  resourceId: string,
): Promise<MembershipAccessResult> {
  const rule = await storage.membership.getAccessRule(resourceType, resourceId);
  if (!rule || rule.accessLevel === "public") {
    return { allowed: true, reason: "public", rule: rule ?? null, teaser: rule?.teaser };
  }

  if (isAdminPreviewUser(user)) {
    return { allowed: true, reason: "admin_preview", rule, teaser: rule.teaser };
  }

  if (!user) {
    return { allowed: false, reason: "login_required", rule, teaser: rule.teaser };
  }

  if (rule.accessLevel === "logged_in") {
    return { allowed: true, reason: "logged_in", rule, teaser: rule.teaser };
  }

  const subscription = await storage.membership.getActiveSubscriptionForUser(user.id);
  if (!isSubscriptionCurrentlyActive(subscription)) {
    return { allowed: false, reason: "upgrade_required", rule, teaser: rule.teaser };
  }

  if (rule.accessLevel === "any_member") {
    return { allowed: true, reason: "membership", rule, teaser: rule.teaser };
  }

  if (rule.accessLevel === "plans") {
    const requiredPlanIds = Array.isArray(rule.planIds) ? rule.planIds : [];
    if (subscription?.planId && requiredPlanIds.includes(subscription.planId)) {
      return { allowed: true, reason: "plan", rule, teaser: rule.teaser };
    }
    return { allowed: false, reason: "upgrade_required", rule, teaser: rule.teaser };
  }

  if (rule.accessLevel === "entitlements") {
    const requiredEntitlements = Array.isArray(rule.entitlements) ? rule.entitlements : [];
    const entitlements = await getUserEntitlements(user.id);
    if (requiredEntitlements.some((required) => entitlements.includes(required))) {
      return { allowed: true, reason: "entitlement", rule, teaser: rule.teaser };
    }
  }

  return { allowed: false, reason: "upgrade_required", rule, teaser: rule.teaser };
}

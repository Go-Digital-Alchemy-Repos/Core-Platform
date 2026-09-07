import { z } from "zod";
import { storage } from "../storage/index";
import {
  insertMembershipSubscriptionSchema,
  type InsertMembershipSubscription,
  type MembershipSubscriptionStatus,
} from "@shared/schema";

export const manualMembershipSubscriptionSchema = insertMembershipSubscriptionSchema.extend({
  status: z
    .enum([
      "trialing",
      "active",
      "past_due",
      "canceled",
      "expired",
      "suspended",
      "manual",
      "incomplete",
    ])
    .default("manual"),
});

export async function assignManualMembership(actorUserId: string | undefined, payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw Object.assign(new Error("Membership subscription payload is required"), {
      statusCode: 400,
    });
  }
  const parsed = manualMembershipSubscriptionSchema.parse({
    source: "manual",
    ...payload,
  });
  const { userId, ...subscriptionData } = parsed;
  return storage.membership.upsertSubscriptionForUserWithAudit({
    userId,
    data: subscriptionData,
    audit: {
      actorUserId: actorUserId ?? null,
      action: "membership_assigned",
      note: parsed.adminNotes ?? null,
      metadata: { planId: parsed.planId ?? null, status: parsed.status },
    },
  });
}

export async function updateMembershipSubscriptionStatus(
  actorUserId: string | undefined,
  subscriptionId: string,
  status: MembershipSubscriptionStatus,
  note?: string,
) {
  const data: Record<string, unknown> = { status };
  if (status === "canceled") data.canceledAt = new Date();
  if (status === "suspended") data.suspendedAt = new Date();
  const subscription = await storage.membership.updateSubscriptionWithAudit({
    subscriptionId,
    data: data as Partial<InsertMembershipSubscription>,
    audit: {
      actorUserId: actorUserId ?? null,
      action: `membership_${status}`,
      note: note ?? null,
      metadata: { status },
    },
  });
  if (!subscription)
    throw Object.assign(new Error("Membership subscription not found"), { statusCode: 404 });
  return subscription;
}

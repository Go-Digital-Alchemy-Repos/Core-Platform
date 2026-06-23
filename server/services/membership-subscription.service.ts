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
  const subscription = await storage.membership.upsertSubscriptionForUser(parsed.userId, parsed);
  await storage.membership.createAuditEvent({
    userId: parsed.userId,
    actorUserId: actorUserId ?? null,
    subscriptionId: subscription.id,
    action: "membership_assigned",
    note: parsed.adminNotes ?? null,
    metadata: { planId: parsed.planId, status: parsed.status },
  });
  return subscription;
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
  const subscription = await storage.membership.updateSubscription(
    subscriptionId,
    data as Partial<InsertMembershipSubscription>,
  );
  if (!subscription)
    throw Object.assign(new Error("Membership subscription not found"), { statusCode: 404 });
  await storage.membership.createAuditEvent({
    userId: subscription.userId,
    actorUserId: actorUserId ?? null,
    subscriptionId: subscription.id,
    action: `membership_${status}`,
    note: note ?? null,
    metadata: { status },
  });
  return subscription;
}

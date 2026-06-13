import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "../db";
import {
  membershipAccessRules,
  membershipAuditEvents,
  membershipPlanEntitlements,
  membershipPlanPrices,
  membershipPlans,
  membershipProcessedWebhookEvents,
  membershipSubscriptions,
  users,
  type InsertMembershipAccessRule,
  type InsertMembershipAuditEvent,
  type InsertMembershipPlan,
  type InsertMembershipPlanEntitlement,
  type InsertMembershipPlanPrice,
  type InsertMembershipSubscription,
  type MembershipAccessRule,
  type MembershipAuditEvent,
  type MembershipPlan,
  type MembershipPlanEntitlement,
  type MembershipPlanPrice,
  type MembershipSubscription,
  type User,
} from "@shared/schema";

export interface MembershipPlanWithDetails extends MembershipPlan {
  prices: MembershipPlanPrice[];
  entitlements: MembershipPlanEntitlement[];
}

export interface MembershipSubscriptionWithDetails extends MembershipSubscription {
  plan: MembershipPlan | null;
  price: MembershipPlanPrice | null;
  user: Pick<User, "id" | "email" | "firstName" | "lastName" | "role"> | null;
}

export class MembershipStorage {
  async getPlans(options: { publicOnly?: boolean; includeInactive?: boolean } = {}): Promise<MembershipPlanWithDetails[]> {
    const clauses = [];
    if (!options.includeInactive) clauses.push(eq(membershipPlans.status, "active"));
    if (options.publicOnly) clauses.push(eq(membershipPlans.visibility, "public"));

    const query = db.select().from(membershipPlans).orderBy(membershipPlans.sortOrder, membershipPlans.name);
    const plans = clauses.length ? await query.where(and(...clauses)) : await query;
    return Promise.all(plans.map((plan) => this.getPlanWithDetails(plan)));
  }

  async getPlan(id: string): Promise<MembershipPlan | undefined> {
    const [plan] = await db.select().from(membershipPlans).where(eq(membershipPlans.id, id));
    return plan;
  }

  async getPlanBySlug(slug: string): Promise<MembershipPlan | undefined> {
    const [plan] = await db.select().from(membershipPlans).where(eq(membershipPlans.slug, slug));
    return plan;
  }

  async getPlanWithDetails(planOrId: MembershipPlan | string): Promise<MembershipPlanWithDetails> {
    const plan = typeof planOrId === "string" ? await this.getPlan(planOrId) : planOrId;
    if (!plan) throw Object.assign(new Error("Membership plan not found"), { statusCode: 404 });
    const [prices, entitlements] = await Promise.all([
      this.getPlanPrices(plan.id),
      this.getPlanEntitlements(plan.id),
    ]);
    return { ...plan, prices, entitlements };
  }

  async createPlan(data: InsertMembershipPlan): Promise<MembershipPlan> {
    const [plan] = await db.insert(membershipPlans).values(data).returning();
    return plan;
  }

  async updatePlan(id: string, data: Partial<InsertMembershipPlan>): Promise<MembershipPlan | undefined> {
    const [plan] = await db
      .update(membershipPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(membershipPlans.id, id))
      .returning();
    return plan;
  }

  async deletePlan(id: string): Promise<void> {
    await db.update(membershipPlans).set({ status: "archived", updatedAt: new Date() }).where(eq(membershipPlans.id, id));
  }

  async getPlanPrices(planId: string): Promise<MembershipPlanPrice[]> {
    return db
      .select()
      .from(membershipPlanPrices)
      .where(eq(membershipPlanPrices.planId, planId))
      .orderBy(membershipPlanPrices.sortOrder, membershipPlanPrices.amount);
  }

  async getPrice(id: string): Promise<MembershipPlanPrice | undefined> {
    const [price] = await db.select().from(membershipPlanPrices).where(eq(membershipPlanPrices.id, id));
    return price;
  }

  async createPrice(data: InsertMembershipPlanPrice): Promise<MembershipPlanPrice> {
    const [price] = await db.insert(membershipPlanPrices).values(data).returning();
    return price;
  }

  async updatePrice(id: string, data: Partial<InsertMembershipPlanPrice>): Promise<MembershipPlanPrice | undefined> {
    const [price] = await db
      .update(membershipPlanPrices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(membershipPlanPrices.id, id))
      .returning();
    return price;
  }

  async deletePrice(id: string): Promise<void> {
    await db.update(membershipPlanPrices).set({ active: false, updatedAt: new Date() }).where(eq(membershipPlanPrices.id, id));
  }

  async getPlanEntitlements(planId: string): Promise<MembershipPlanEntitlement[]> {
    return db
      .select()
      .from(membershipPlanEntitlements)
      .where(eq(membershipPlanEntitlements.planId, planId))
      .orderBy(membershipPlanEntitlements.entitlement);
  }

  async replacePlanEntitlements(planId: string, entitlements: InsertMembershipPlanEntitlement[]): Promise<MembershipPlanEntitlement[]> {
    return db.transaction(async (tx) => {
      await tx.delete(membershipPlanEntitlements).where(eq(membershipPlanEntitlements.planId, planId));
      if (!entitlements.length) return [];
      return tx.insert(membershipPlanEntitlements).values(entitlements).returning();
    });
  }

  async getSubscriptions(options: { search?: string } = {}): Promise<MembershipSubscriptionWithDetails[]> {
    const clauses = [];
    if (options.search) {
      clauses.push(or(ilike(users.email, `%${options.search}%`), ilike(users.firstName, `%${options.search}%`), ilike(users.lastName, `%${options.search}%`)));
    }
    const rows = await db
      .select({
        subscription: membershipSubscriptions,
        plan: membershipPlans,
        price: membershipPlanPrices,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        },
      })
      .from(membershipSubscriptions)
      .leftJoin(membershipPlans, eq(membershipSubscriptions.planId, membershipPlans.id))
      .leftJoin(membershipPlanPrices, eq(membershipSubscriptions.priceId, membershipPlanPrices.id))
      .leftJoin(users, eq(membershipSubscriptions.userId, users.id))
      .where(clauses.length ? and(...clauses) : undefined)
      .orderBy(desc(membershipSubscriptions.updatedAt));
    return rows.map((row) => ({ ...row.subscription, plan: row.plan, price: row.price, user: row.user }));
  }

  async getSubscription(id: string): Promise<MembershipSubscription | undefined> {
    const [subscription] = await db.select().from(membershipSubscriptions).where(eq(membershipSubscriptions.id, id));
    return subscription;
  }

  async getActiveSubscriptionForUser(userId: string): Promise<MembershipSubscription | undefined> {
    const [subscription] = await db
      .select()
      .from(membershipSubscriptions)
      .where(eq(membershipSubscriptions.userId, userId))
      .orderBy(desc(membershipSubscriptions.updatedAt))
      .limit(1);
    return subscription;
  }

  async getSubscriptionByProviderSubscriptionId(providerSubscriptionId: string): Promise<MembershipSubscription | undefined> {
    const [subscription] = await db
      .select()
      .from(membershipSubscriptions)
      .where(eq(membershipSubscriptions.providerSubscriptionId, providerSubscriptionId));
    return subscription;
  }

  async getSubscriptionByProviderCustomerId(providerCustomerId: string): Promise<MembershipSubscription | undefined> {
    const [subscription] = await db
      .select()
      .from(membershipSubscriptions)
      .where(eq(membershipSubscriptions.providerCustomerId, providerCustomerId))
      .orderBy(desc(membershipSubscriptions.updatedAt))
      .limit(1);
    return subscription;
  }

  async createSubscription(data: InsertMembershipSubscription): Promise<MembershipSubscription> {
    const [subscription] = await db.insert(membershipSubscriptions).values(data).returning();
    return subscription;
  }

  async updateSubscription(id: string, data: Partial<InsertMembershipSubscription>): Promise<MembershipSubscription | undefined> {
    const [subscription] = await db
      .update(membershipSubscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(membershipSubscriptions.id, id))
      .returning();
    return subscription;
  }

  async upsertSubscriptionForUser(userId: string, data: Partial<InsertMembershipSubscription>): Promise<MembershipSubscription> {
    const existing = await this.getActiveSubscriptionForUser(userId);
    if (existing) {
      const updated = await this.updateSubscription(existing.id, data);
      if (updated) return updated;
    }
    return this.createSubscription({
      userId,
      status: "manual",
      source: "manual",
      ...data,
    } as InsertMembershipSubscription);
  }

  async getAccessRule(resourceType: string, resourceId: string): Promise<MembershipAccessRule | undefined> {
    const [rule] = await db
      .select()
      .from(membershipAccessRules)
      .where(and(eq(membershipAccessRules.resourceType, resourceType), eq(membershipAccessRules.resourceId, resourceId)));
    return rule;
  }

  async getAccessRules(resourceType?: string): Promise<MembershipAccessRule[]> {
    const query = db.select().from(membershipAccessRules).orderBy(desc(membershipAccessRules.updatedAt));
    return resourceType ? query.where(eq(membershipAccessRules.resourceType, resourceType)) : query;
  }

  async upsertAccessRule(data: InsertMembershipAccessRule): Promise<MembershipAccessRule> {
    const normalized = {
      ...data,
      planIds: Array.isArray(data.planIds) ? data.planIds.map(String) : [],
      entitlements: Array.isArray(data.entitlements) ? data.entitlements.map(String) : [],
    };
    const existing = await this.getAccessRule(normalized.resourceType, normalized.resourceId);
    if (existing) {
      const [updated] = await db
        .update(membershipAccessRules)
        .set({ ...normalized, updatedAt: new Date() })
        .where(eq(membershipAccessRules.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(membershipAccessRules).values(normalized).returning();
    return created;
  }

  async deleteAccessRule(id: string): Promise<void> {
    await db.delete(membershipAccessRules).where(eq(membershipAccessRules.id, id));
  }

  async hasProcessedWebhook(provider: string, eventId: string): Promise<boolean> {
    const [event] = await db
      .select()
      .from(membershipProcessedWebhookEvents)
      .where(and(eq(membershipProcessedWebhookEvents.provider, provider), eq(membershipProcessedWebhookEvents.eventId, eventId)));
    return !!event;
  }

  async markWebhookProcessed(provider: string, eventId: string, eventType: string): Promise<boolean> {
    const existing = await this.hasProcessedWebhook(provider, eventId);
    if (existing) return false;
    await db.insert(membershipProcessedWebhookEvents).values({ provider, eventId, eventType });
    return true;
  }

  async createAuditEvent(data: InsertMembershipAuditEvent): Promise<MembershipAuditEvent> {
    const [event] = await db.insert(membershipAuditEvents).values(data).returning();
    return event;
  }

  async getAuditEvents(limit = 100): Promise<MembershipAuditEvent[]> {
    return db.select().from(membershipAuditEvents).orderBy(desc(membershipAuditEvents.createdAt)).limit(limit);
  }
}

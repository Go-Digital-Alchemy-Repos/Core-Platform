import { eq, desc, sql, and } from "drizzle-orm";
import { db } from "../db";
import {
  providerApplications,
  providerApplicationTimeline,
  providerApplicationCredentials,
  providerApplicationReferences,
  providerBackgroundChecks,
  providerInterviews,
  providerApplicationDecisions,
  type ProviderApplication,
  type InsertProviderApplication,
  type ProviderApplicationTimeline,
  type ProviderApplicationCredential,
  type ProviderApplicationReference,
  type ProviderBackgroundCheck,
  type ProviderInterview,
  type ProviderApplicationDecision,
} from "@shared/schema";
import { users } from "@shared/schema";

export class ApplicationStorage {
  async getById(id: string): Promise<ProviderApplication | undefined> {
    const [app] = await db.select().from(providerApplications).where(eq(providerApplications.id, id));
    return app;
  }

  async getByUserId(userId: string): Promise<ProviderApplication | undefined> {
    const [app] = await db
      .select()
      .from(providerApplications)
      .where(eq(providerApplications.userId, userId))
      .orderBy(desc(providerApplications.createdAt))
      .limit(1);
    return app;
  }

  async create(data: InsertProviderApplication): Promise<ProviderApplication> {
    const [app] = await db.insert(providerApplications).values(data).returning();
    return app;
  }

  async update(id: string, data: Partial<InsertProviderApplication>): Promise<ProviderApplication | undefined> {
    const [app] = await db
      .update(providerApplications)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(providerApplications.id, id))
      .returning();
    return app;
  }

  async getAll(status?: string): Promise<(ProviderApplication & { userName: string; userEmail: string })[]> {
    let query = db
      .select({
        id: providerApplications.id,
        userId: providerApplications.userId,
        status: providerApplications.status,
        paymentStatus: providerApplications.paymentStatus,
        referencesStatus: providerApplications.referencesStatus,
        backgroundCheckStatus: providerApplications.backgroundCheckStatus,
        interviewStatus: providerApplications.interviewStatus,
        decisionStatus: providerApplications.decisionStatus,
        submittedAt: providerApplications.submittedAt,
        decidedAt: providerApplications.decidedAt,
        createdAt: providerApplications.createdAt,
        updatedAt: providerApplications.updatedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(providerApplications)
      .innerJoin(users, eq(providerApplications.userId, users.id))
      .orderBy(desc(providerApplications.createdAt))
      .$dynamic();

    if (status) {
      query = query.where(eq(providerApplications.status, status));
    }

    const rows = await query;
    return rows.map((r) => ({
      ...r,
      userName: [r.userFirstName, r.userLastName].filter(Boolean).join(" ") || r.userEmail,
    }));
  }

  async countByStatus(): Promise<Record<string, number>> {
    const results = await db
      .select({
        status: providerApplications.status,
        count: sql<number>`count(*)`,
      })
      .from(providerApplications)
      .groupBy(providerApplications.status);

    const counts: Record<string, number> = {};
    for (const r of results) {
      counts[r.status] = Number(r.count);
    }
    return counts;
  }

  async addTimelineEntry(data: {
    applicationId: string;
    action: string;
    fromStatus?: string;
    toStatus?: string;
    note?: string;
    performedBy?: string;
  }): Promise<ProviderApplicationTimeline> {
    const [entry] = await db.insert(providerApplicationTimeline).values(data).returning();
    return entry;
  }

  async getTimeline(applicationId: string): Promise<ProviderApplicationTimeline[]> {
    return db
      .select()
      .from(providerApplicationTimeline)
      .where(eq(providerApplicationTimeline.applicationId, applicationId))
      .orderBy(desc(providerApplicationTimeline.createdAt));
  }

  async addCredential(data: {
    applicationId: string;
    credentialType: string;
    issuer?: string;
    licenseNumber?: string;
    stateOrCountry?: string;
    issuedAt?: Date;
    expiresAt?: Date;
    documentUrl?: string;
  }): Promise<ProviderApplicationCredential> {
    const [cred] = await db.insert(providerApplicationCredentials).values(data).returning();
    return cred;
  }

  async getCredentials(applicationId: string): Promise<ProviderApplicationCredential[]> {
    return db
      .select()
      .from(providerApplicationCredentials)
      .where(eq(providerApplicationCredentials.applicationId, applicationId));
  }

  async updateCredential(id: string, data: Partial<{ verificationStatus: string; documentUrl: string }>): Promise<ProviderApplicationCredential | undefined> {
    const [cred] = await db
      .update(providerApplicationCredentials)
      .set(data)
      .where(eq(providerApplicationCredentials.id, id))
      .returning();
    return cred;
  }

  async addReference(data: {
    applicationId: string;
    refereeName: string;
    refereeEmail: string;
    refereePhone?: string;
    relationship?: string;
  }): Promise<ProviderApplicationReference> {
    const [ref] = await db.insert(providerApplicationReferences).values(data).returning();
    return ref;
  }

  async getReferences(applicationId: string): Promise<ProviderApplicationReference[]> {
    return db
      .select()
      .from(providerApplicationReferences)
      .where(eq(providerApplicationReferences.applicationId, applicationId));
  }

  async updateReference(id: string, data: Partial<{ status: string; responseReceivedAt: Date; responseData: unknown }>): Promise<ProviderApplicationReference | undefined> {
    const [ref] = await db
      .update(providerApplicationReferences)
      .set(data)
      .where(eq(providerApplicationReferences.id, id))
      .returning();
    return ref;
  }

  async addBackgroundCheck(data: {
    applicationId: string;
    provider?: string;
    externalId?: string;
  }): Promise<ProviderBackgroundCheck> {
    const [check] = await db.insert(providerBackgroundChecks).values(data).returning();
    return check;
  }

  async getBackgroundCheck(applicationId: string): Promise<ProviderBackgroundCheck | undefined> {
    const [check] = await db
      .select()
      .from(providerBackgroundChecks)
      .where(eq(providerBackgroundChecks.applicationId, applicationId));
    return check;
  }

  async updateBackgroundCheck(id: string, data: Partial<{ status: string; result: string; completedAt: Date; reportUrl: string }>): Promise<ProviderBackgroundCheck | undefined> {
    const [check] = await db
      .update(providerBackgroundChecks)
      .set(data)
      .where(eq(providerBackgroundChecks.id, id))
      .returning();
    return check;
  }

  async addInterview(data: {
    applicationId: string;
    scheduledAt?: Date;
    interviewerUserId?: string;
    format?: string;
    meetingUrl?: string;
  }): Promise<ProviderInterview> {
    const [interview] = await db.insert(providerInterviews).values(data).returning();
    return interview;
  }

  async getInterview(applicationId: string): Promise<ProviderInterview | undefined> {
    const [interview] = await db
      .select()
      .from(providerInterviews)
      .where(eq(providerInterviews.applicationId, applicationId));
    return interview;
  }

  async updateInterview(id: string, data: Partial<{ scheduledAt: Date; completedAt: Date; notes: string; outcome: string; meetingUrl: string }>): Promise<ProviderInterview | undefined> {
    const [interview] = await db
      .update(providerInterviews)
      .set(data)
      .where(eq(providerInterviews.id, id))
      .returning();
    return interview;
  }

  async addDecision(data: {
    applicationId: string;
    decision: string;
    reason?: string;
    decidedBy?: string;
  }): Promise<ProviderApplicationDecision> {
    const [decision] = await db.insert(providerApplicationDecisions).values(data).returning();
    return decision;
  }

  async getDecision(applicationId: string): Promise<ProviderApplicationDecision | undefined> {
    const [decision] = await db
      .select()
      .from(providerApplicationDecisions)
      .where(eq(providerApplicationDecisions.applicationId, applicationId));
    return decision;
  }
}

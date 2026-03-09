import { eq, and, ilike, or, sql } from "drizzle-orm";
import { db } from "../db";
import { therapistProfiles, type TherapistProfile, type InsertTherapistProfile } from "@shared/schema";
import { users } from "@shared/schema";

export interface TherapistSearchParams {
  search?: string;
  specialization?: string;
  practiceMode?: string;
  language?: string;
  acceptingClients?: boolean;
  limit?: number;
  offset?: number;
}

export interface TherapistWithUser extends TherapistProfile {
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    profileImageUrl: string | null;
  };
}

export class TherapistStorage {
  async getProfile(id: string): Promise<TherapistProfile | undefined> {
    const [profile] = await db.select().from(therapistProfiles).where(eq(therapistProfiles.id, id));
    return profile;
  }

  async getProfileByUserId(userId: string): Promise<TherapistProfile | undefined> {
    const [profile] = await db.select().from(therapistProfiles).where(eq(therapistProfiles.userId, userId));
    return profile;
  }

  async createProfile(data: InsertTherapistProfile): Promise<TherapistProfile> {
    const [profile] = await db.insert(therapistProfiles).values(data).returning();
    return profile;
  }

  async updateProfile(id: string, data: Partial<InsertTherapistProfile>): Promise<TherapistProfile | undefined> {
    const [profile] = await db
      .update(therapistProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(therapistProfiles.id, id))
      .returning();
    return profile;
  }

  async listProfiles(params: TherapistSearchParams = {}): Promise<TherapistWithUser[]> {
    const conditions = [
      eq(therapistProfiles.isApproved, true),
      eq(therapistProfiles.isActive, true),
    ];

    if (params.practiceMode) {
      conditions.push(eq(therapistProfiles.practiceMode, params.practiceMode));
    }

    if (params.acceptingClients !== undefined) {
      conditions.push(eq(therapistProfiles.acceptingClients, params.acceptingClients));
    }

    const results = await db
      .select({
        profile: therapistProfiles,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(therapistProfiles)
      .innerJoin(users, eq(therapistProfiles.userId, users.id))
      .where(and(...conditions))
      .limit(params.limit || 50)
      .offset(params.offset || 0);

    return results.map((r) => ({
      ...r.profile,
      user: r.user,
    }));
  }

  async getProfileWithUser(id: string): Promise<TherapistWithUser | undefined> {
    const results = await db
      .select({
        profile: therapistProfiles,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(therapistProfiles)
      .innerJoin(users, eq(therapistProfiles.userId, users.id))
      .where(eq(therapistProfiles.id, id));

    if (results.length === 0) return undefined;
    return { ...results[0].profile, user: results[0].user };
  }

  async getAllProfiles(): Promise<TherapistWithUser[]> {
    const results = await db
      .select({
        profile: therapistProfiles,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(therapistProfiles)
      .innerJoin(users, eq(therapistProfiles.userId, users.id));

    return results.map((r) => ({ ...r.profile, user: r.user }));
  }

  async countProfiles(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(therapistProfiles);
    return Number(result[0].count);
  }

  async countApproved(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(therapistProfiles)
      .where(eq(therapistProfiles.isApproved, true));
    return Number(result[0].count);
  }

  async listFeatured(): Promise<TherapistWithUser[]> {
    const results = await db
      .select({
        profile: therapistProfiles,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(therapistProfiles)
      .innerJoin(users, eq(therapistProfiles.userId, users.id))
      .where(
        and(
          eq(therapistProfiles.isFeatured, true),
          eq(therapistProfiles.isApproved, true),
          eq(therapistProfiles.isActive, true)
        )
      )
      .limit(6);

    return results.map((r) => ({ ...r.profile, user: r.user }));
  }

  async countPending(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(therapistProfiles)
      .where(
        and(
          eq(therapistProfiles.isApproved, false),
          eq(therapistProfiles.isActive, true),
          sql`${therapistProfiles.rejectionReason} IS NULL`
        )
      );
    return Number(result[0].count);
  }
}

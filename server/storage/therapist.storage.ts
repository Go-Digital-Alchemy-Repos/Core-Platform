import { eq, and, ilike, or, sql, SQL } from "drizzle-orm";
import { db } from "../db";
import { therapistProfiles, type TherapistProfile, type InsertTherapistProfile } from "@shared/schema";
import { users } from "@shared/schema";

export interface TherapistSearchParams {
  search?: string;
  specialization?: string;
  practiceMode?: string;
  language?: string;
  country?: string;
  acceptingClients?: boolean;
  page?: number;
  pageSize?: number;
}

export interface TherapistWithUser extends TherapistProfile {
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    profileImageUrl: string | null;
  };
}

export interface PaginatedTherapists {
  items: TherapistWithUser[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DirectoryFilterOptions {
  languages: string[];
  countries: string[];
}

function buildFilterConditions(params: TherapistSearchParams): SQL[] {
  const conditions: SQL[] = [
    eq(therapistProfiles.isApproved, true),
    eq(therapistProfiles.isActive, true),
  ];

  if (params.practiceMode) {
    conditions.push(eq(therapistProfiles.practiceMode, params.practiceMode));
  }

  if (params.acceptingClients !== undefined) {
    conditions.push(eq(therapistProfiles.acceptingClients, params.acceptingClients));
  }

  if (params.specialization) {
    conditions.push(
      sql`${therapistProfiles.specializations} @> ARRAY[${params.specialization}]::text[]`
    );
  }

  if (params.language) {
    conditions.push(
      sql`${therapistProfiles.languages} @> ARRAY[${params.language}]::text[]`
    );
  }

  if (params.country) {
    conditions.push(eq(therapistProfiles.country, params.country));
  }

  if (params.search) {
    const term = `%${params.search}%`;
    conditions.push(
      or(
        sql`concat(${users.firstName}, ' ', ${users.lastName}) ILIKE ${term}`,
        ilike(therapistProfiles.title, term),
        ilike(therapistProfiles.city, term),
        ilike(therapistProfiles.country, term),
        sql`EXISTS (SELECT 1 FROM unnest(${therapistProfiles.specializations}) s WHERE s ILIKE ${term})`,
        sql`EXISTS (SELECT 1 FROM unnest(${therapistProfiles.languages}) l WHERE l ILIKE ${term})`,
      )!
    );
  }

  return conditions;
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
    const conditions = buildFilterConditions(params);

    const page = params.page || 1;
    const pageSize = params.pageSize || 200;

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
      .orderBy(users.firstName, users.lastName)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return results.map((r) => ({
      ...r.profile,
      user: r.user,
    }));
  }

  async listProfilesPaginated(params: TherapistSearchParams = {}): Promise<PaginatedTherapists> {
    const conditions = buildFilterConditions(params);
    const page = params.page || 1;
    const pageSize = params.pageSize || 200;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(therapistProfiles)
      .innerJoin(users, eq(therapistProfiles.userId, users.id))
      .where(and(...conditions));

    const total = Number(countResult.count);

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
      .orderBy(users.firstName, users.lastName)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      items: results.map((r) => ({
        ...r.profile,
        user: r.user,
      })),
      total,
      page,
      pageSize,
    };
  }

  async getFilterOptions(): Promise<DirectoryFilterOptions> {
    const results = await db
      .select({
        languages: therapistProfiles.languages,
        country: therapistProfiles.country,
      })
      .from(therapistProfiles)
      .where(
        and(
          eq(therapistProfiles.isApproved, true),
          eq(therapistProfiles.isActive, true)
        )
      );

    const langSet = new Set<string>();
    const countrySet = new Set<string>();

    for (const r of results) {
      if (r.languages) {
        for (const l of r.languages) langSet.add(l);
      }
      if (r.country) countrySet.add(r.country);
    }

    return {
      languages: Array.from(langSet).sort(),
      countries: Array.from(countrySet).sort(),
    };
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

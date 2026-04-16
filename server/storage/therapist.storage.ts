import { eq, and, ilike, or, sql, type SQL, desc } from "drizzle-orm";
import { db } from "../db";
import { therapistProfiles, type TherapistProfile, type InsertTherapistProfile } from "@shared/schema";
import { users } from "@shared/schema";
import { savedProfessionals } from "@shared/schema/saved-professionals";
import { profileViews } from "@shared/schema/profile-views";
import { MemoryCache } from "../lib/cache";
import { isSearchIndexReady } from "../lib/search-index";
import type {
  TherapistWithUser,
  PaginatedTherapists,
  DirectoryFilterOptions,
  TherapistSearchParams,
  SortOption,
} from "@shared/types/directory";

interface InternalSearchParams {
  search?: string;
  specializations?: string[];
  practiceMode?: string;
  language?: string;
  country?: string;
  acceptingClients?: boolean;
  willingToTravel?: boolean;
  page?: number;
  pageSize?: number;
  sort?: SortOption;
  latitude?: number;
  longitude?: number;
}

const FILTER_CACHE_TTL = parseInt(process.env.FILTER_OPTIONS_CACHE_TTL || "300", 10);
const filterOptionsCache = new MemoryCache<DirectoryFilterOptions>(FILTER_CACHE_TTL);
const FILTER_OPTIONS_KEY = "filter_options";

function buildFilterConditions(params: InternalSearchParams): SQL[] {
  const conditions: SQL[] = [
    eq(therapistProfiles.isApproved, true),
    eq(therapistProfiles.isActive, true),
    eq(users.isSuspended, false),
  ];

  if (params.practiceMode) {
    conditions.push(eq(therapistProfiles.practiceMode, params.practiceMode));
  }

  if (params.acceptingClients !== undefined) {
    conditions.push(eq(therapistProfiles.acceptingClients, params.acceptingClients));
  }

  if (params.willingToTravel !== undefined) {
    conditions.push(eq(therapistProfiles.willingToTravel, params.willingToTravel));
  }

  if (params.specializations && params.specializations.length > 0) {
    for (const spec of params.specializations) {
      conditions.push(
        sql`${therapistProfiles.specializations} @> ARRAY[${spec}]::text[]`
      );
    }
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
    const trimmed = params.search.trim();
    if (trimmed.length > 0) {
      const sanitized = trimmed.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
      if (sanitized.length > 0) {
        if (isSearchIndexReady()) {
          const searchTerms = sanitized.split(" ");
          const tsQuery = searchTerms.map((t) => t + ":*").join(" & ");
          conditions.push(
            sql`${therapistProfiles.id} IN (
              SELECT id FROM therapist_profiles
              WHERE search_vector @@ to_tsquery('simple', ${tsQuery})
            )`
          );
        } else {
          const term = `%${sanitized}%`;
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
      }
    }
  }

  return conditions;
}

function buildOrderBy(sort: SortOption = "name", _latitude?: number, _longitude?: number) {
  switch (sort) {
    case "newest":
      return [desc(therapistProfiles.createdAt), users.firstName, users.lastName];
    case "name":
    default:
      return [users.firstName, users.lastName];
  }
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
    filterOptionsCache.invalidate();
    return profile;
  }

  async updateProfile(id: string, data: Partial<InsertTherapistProfile>): Promise<TherapistProfile | undefined> {
    const [profile] = await db
      .update(therapistProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(therapistProfiles.id, id))
      .returning();
    filterOptionsCache.invalidate();
    return profile;
  }

  async deleteProfile(id: string): Promise<boolean> {
    const deleted = await db.transaction(async (tx) => {
      await tx.delete(savedProfessionals).where(eq(savedProfessionals.profileId, id));
      await tx.delete(profileViews).where(eq(profileViews.profileId, id));
      const [profile] = await tx
        .delete(therapistProfiles)
        .where(eq(therapistProfiles.id, id))
        .returning({ id: therapistProfiles.id });
      return Boolean(profile);
    });
    filterOptionsCache.invalidate();
    return deleted;
  }

  async listProfilesPaginated(params: InternalSearchParams = {}): Promise<PaginatedTherapists> {
    const conditions = buildFilterConditions(params);
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const orderBy = buildOrderBy(params.sort, params.latitude, params.longitude);

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
      .orderBy(...orderBy)
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
      hasMore: page * pageSize < total,
    };
  }

  async getFilterOptions(): Promise<DirectoryFilterOptions> {
    const cached = filterOptionsCache.get(FILTER_OPTIONS_KEY);
    if (cached) return cached;

    const langResult = await db.execute(
      sql`SELECT DISTINCT unnest(${therapistProfiles.languages}) AS lang
          FROM ${therapistProfiles}
          INNER JOIN ${users} ON ${therapistProfiles.userId} = ${users.id}
          WHERE ${therapistProfiles.isApproved} = true AND ${therapistProfiles.isActive} = true
            AND ${users.isSuspended} = false
          ORDER BY lang`
    );

    const countryResult = await db.execute(
      sql`SELECT DISTINCT ${therapistProfiles.country} AS country
          FROM ${therapistProfiles}
          INNER JOIN ${users} ON ${therapistProfiles.userId} = ${users.id}
          WHERE ${therapistProfiles.isApproved} = true
            AND ${therapistProfiles.isActive} = true
            AND ${users.isSuspended} = false
            AND ${therapistProfiles.country} IS NOT NULL
          ORDER BY country`
    );

    const result: DirectoryFilterOptions = {
      languages: (langResult.rows as Array<{ lang: string }>).map((r) => r.lang),
      countries: (countryResult.rows as Array<{ country: string }>).map((r) => r.country),
    };

    filterOptionsCache.set(FILTER_OPTIONS_KEY, result);
    return result;
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
      .where(and(eq(therapistProfiles.id, id), eq(users.isSuspended, false)));

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
          eq(therapistProfiles.isActive, true),
          eq(users.isSuspended, false)
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

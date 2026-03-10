import { eq, desc, sql, and, gte } from "drizzle-orm";
import { db } from "../db";
import { profileViews, type ProfileView } from "@shared/schema";

export class ProfileViewStorage {
  async record(profileId: string, viewerId?: string, source?: string): Promise<void> {
    await db.insert(profileViews).values({ profileId, viewerId, source });
  }

  async countByProfile(profileId: string, since?: Date): Promise<number> {
    const conditions = [eq(profileViews.profileId, profileId)];
    if (since) {
      conditions.push(gte(profileViews.createdAt, since));
    }
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(profileViews)
      .where(and(...conditions));
    return Number(result[0].count);
  }

  async getRecentByProfile(profileId: string, limit = 50): Promise<ProfileView[]> {
    return db
      .select()
      .from(profileViews)
      .where(eq(profileViews.profileId, profileId))
      .orderBy(desc(profileViews.createdAt))
      .limit(limit);
  }

  async getViewCountsByProfile(profileId: string): Promise<{ total: number; last7d: number; last30d: number }> {
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const result = await db
      .select({
        total: sql<number>`count(*)`,
        last7d: sql<number>`count(*) filter (where ${profileViews.createdAt} >= ${d7})`,
        last30d: sql<number>`count(*) filter (where ${profileViews.createdAt} >= ${d30})`,
      })
      .from(profileViews)
      .where(eq(profileViews.profileId, profileId));

    return {
      total: Number(result[0].total),
      last7d: Number(result[0].last7d),
      last30d: Number(result[0].last30d),
    };
  }
}

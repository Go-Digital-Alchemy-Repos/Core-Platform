import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { savedCounselors, type SavedCounselor } from "@shared/schema";

export class SavedCounselorStorage {
  async save(userId: string, profileId: string): Promise<SavedCounselor> {
    const [row] = await db
      .insert(savedCounselors)
      .values({ userId, profileId })
      .onConflictDoNothing()
      .returning();
    if (row) return row;
    const [existing] = await db
      .select()
      .from(savedCounselors)
      .where(and(eq(savedCounselors.userId, userId), eq(savedCounselors.profileId, profileId)))
      .limit(1);
    if (!existing) throw new Error("Failed to save counselor");
    return existing;
  }

  async unsave(userId: string, profileId: string): Promise<void> {
    await db
      .delete(savedCounselors)
      .where(and(eq(savedCounselors.userId, userId), eq(savedCounselors.profileId, profileId)));
  }

  async listByUser(userId: string): Promise<SavedCounselor[]> {
    return db
      .select()
      .from(savedCounselors)
      .where(eq(savedCounselors.userId, userId))
      .orderBy(desc(savedCounselors.createdAt));
  }

  async isSaved(userId: string, profileId: string): Promise<boolean> {
    const rows = await db
      .select()
      .from(savedCounselors)
      .where(and(eq(savedCounselors.userId, userId), eq(savedCounselors.profileId, profileId)))
      .limit(1);
    return rows.length > 0;
  }
}

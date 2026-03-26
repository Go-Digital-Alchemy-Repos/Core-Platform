import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { savedProfessionals, type SavedProfessional } from "@shared/schema";

export class SavedProfessionalStorage {
  async save(userId: string, profileId: string): Promise<SavedProfessional> {
    const [row] = await db
      .insert(savedProfessionals)
      .values({ userId, profileId })
      .onConflictDoNothing()
      .returning();
    if (row) return row;
    const [existing] = await db
      .select()
      .from(savedProfessionals)
      .where(and(eq(savedProfessionals.userId, userId), eq(savedProfessionals.profileId, profileId)))
      .limit(1);
    if (!existing) throw new Error("Failed to save professional");
    return existing;
  }

  async unsave(userId: string, profileId: string): Promise<void> {
    await db
      .delete(savedProfessionals)
      .where(and(eq(savedProfessionals.userId, userId), eq(savedProfessionals.profileId, profileId)));
  }

  async listByUser(userId: string): Promise<SavedProfessional[]> {
    return db
      .select()
      .from(savedProfessionals)
      .where(eq(savedProfessionals.userId, userId))
      .orderBy(desc(savedProfessionals.createdAt));
  }

  async isSaved(userId: string, profileId: string): Promise<boolean> {
    const rows = await db
      .select()
      .from(savedProfessionals)
      .where(and(eq(savedProfessionals.userId, userId), eq(savedProfessionals.profileId, profileId)))
      .limit(1);
    return rows.length > 0;
  }
}

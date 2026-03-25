import { eq, desc, and } from "drizzle-orm";
import { db } from "../db";
import { guestMessages, type GuestMessage, type InsertGuestMessage } from "@shared/schema";

export class GuestMessageStorage {
  async create(data: InsertGuestMessage): Promise<GuestMessage> {
    const [msg] = await db.insert(guestMessages).values(data).returning();
    return msg;
  }

  async getByCounselorId(counselorId: string): Promise<GuestMessage[]> {
    return db
      .select()
      .from(guestMessages)
      .where(eq(guestMessages.counselorId, counselorId))
      .orderBy(desc(guestMessages.createdAt));
  }

  async getById(id: string): Promise<GuestMessage | undefined> {
    const [msg] = await db.select().from(guestMessages).where(eq(guestMessages.id, id));
    return msg;
  }

  async markRead(id: string): Promise<void> {
    await db.update(guestMessages).set({ isRead: true }).where(eq(guestMessages.id, id));
  }

  async getUnreadCountForCounselor(counselorId: string): Promise<number> {
    const rows = await db
      .select()
      .from(guestMessages)
      .where(and(eq(guestMessages.counselorId, counselorId), eq(guestMessages.isRead, false)));
    return rows.length;
  }

  async delete(id: string): Promise<void> {
    await db.delete(guestMessages).where(eq(guestMessages.id, id));
  }
}

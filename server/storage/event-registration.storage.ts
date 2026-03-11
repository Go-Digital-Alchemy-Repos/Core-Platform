import { eq, and, count, asc } from "drizzle-orm";
import { db } from "../db";
import { eventRegistrations, type EventRegistration, type InsertEventRegistration } from "@shared/schema";

export class EventRegistrationStorage {
  async getRegistration(id: string): Promise<EventRegistration | undefined> {
    const [reg] = await db.select().from(eventRegistrations).where(eq(eventRegistrations.id, id));
    return reg;
  }

  async getRegistrationByEventAndUser(eventId: string, userId: string): Promise<EventRegistration | undefined> {
    const [reg] = await db
      .select()
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId)));
    return reg;
  }

  async getRegistrationsByEvent(eventId: string): Promise<EventRegistration[]> {
    return db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, eventId))
      .orderBy(asc(eventRegistrations.registeredAt));
  }

  async getRegistrationsByUser(userId: string): Promise<EventRegistration[]> {
    return db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.userId, userId))
      .orderBy(asc(eventRegistrations.registeredAt));
  }

  async getConfirmedCount(eventId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "confirmed")));
    return result?.count ?? 0;
  }

  async getFirstWaitlisted(eventId: string): Promise<EventRegistration | undefined> {
    const [reg] = await db
      .select()
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "waitlisted")))
      .orderBy(asc(eventRegistrations.registeredAt))
      .limit(1);
    return reg;
  }

  async createRegistration(data: InsertEventRegistration): Promise<EventRegistration> {
    const [reg] = await db.insert(eventRegistrations).values(data).returning();
    return reg;
  }

  async cancelRegistration(id: string): Promise<EventRegistration | undefined> {
    const [reg] = await db
      .update(eventRegistrations)
      .set({ status: "canceled", canceledAt: new Date() })
      .where(eq(eventRegistrations.id, id))
      .returning();
    return reg;
  }

  async updateRegistrationStatus(id: string, status: string): Promise<EventRegistration | undefined> {
    const updates: Record<string, any> = { status };
    if (status !== "canceled") {
      updates.canceledAt = null;
    }
    const [reg] = await db
      .update(eventRegistrations)
      .set(updates)
      .where(eq(eventRegistrations.id, id))
      .returning();
    return reg;
  }

  async deleteRegistration(id: string): Promise<boolean> {
    await db.delete(eventRegistrations).where(eq(eventRegistrations.id, id));
    return true;
  }
}

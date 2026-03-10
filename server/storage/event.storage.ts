import { eq, gte, lt, asc, desc, and } from "drizzle-orm";
import { db } from "../db";
import { events, type Event, type InsertEvent } from "@shared/schema";

export class EventStorage {
  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getAllEvents(): Promise<Event[]> {
    return db.select().from(events).orderBy(asc(events.date));
  }

  async getPublishedEvents(): Promise<Event[]> {
    return db
      .select()
      .from(events)
      .where(
        and(
          eq(events.status, "published"),
          eq(events.visibility, "public")
        )
      )
      .orderBy(asc(events.date));
  }

  async getUpcomingEvents(): Promise<Event[]> {
    return db
      .select()
      .from(events)
      .where(
        and(
          gte(events.date, new Date()),
          eq(events.status, "published")
        )
      )
      .orderBy(asc(events.date));
  }

  async createEvent(data: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(data).returning();
    return event;
  }

  async updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db
      .update(events)
      .set(data)
      .where(eq(events.id, id))
      .returning();
    return event;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id));
    return true;
  }
}

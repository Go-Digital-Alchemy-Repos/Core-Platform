import { db } from "../db";
import { specializations } from "../../shared/schema/specializations";
import { eq, asc } from "drizzle-orm";
import type { Specialization, InsertSpecialization } from "../../shared/schema/specializations";

const SEED_SPECIALIZATIONS = [
  "Anxiety", "Depression", "Trauma & PTSD", "Grief & Loss",
  "Identity & Belonging", "Cross-Cultural Transitions", "Third Culture Kids (Core Platform)",
  "Expatriate Adjustment", "Relationship Issues", "Family Therapy",
  "Couples Counseling", "Child & Adolescent", "Substance Abuse",
  "Eating Disorders", "Career Counseling", "Mindfulness & Meditation",
  "CBT", "EMDR", "Art Therapy", "Play Therapy", "Group Therapy",
];

export class SpecializationStorage {
  async ensureSeeded(): Promise<void> {
    const existing = await db.select().from(specializations).limit(1);
    if (existing.length > 0) return;
    await db.insert(specializations).values(
      SEED_SPECIALIZATIONS.map((name, i) => ({ name, sortOrder: i }))
    );
  }

  async getAll(): Promise<Specialization[]> {
    await this.ensureSeeded();
    return db.select().from(specializations).orderBy(asc(specializations.sortOrder), asc(specializations.name));
  }

  async create(data: InsertSpecialization): Promise<Specialization> {
    const all = await this.getAll();
    const maxSort = all.reduce((m, s) => Math.max(m, s.sortOrder), -1);
    const [created] = await db
      .insert(specializations)
      .values({ ...data, sortOrder: data.sortOrder ?? maxSort + 1 })
      .returning();
    return created;
  }

  async update(id: number, data: Partial<InsertSpecialization>): Promise<Specialization | undefined> {
    const [updated] = await db
      .update(specializations)
      .set(data)
      .where(eq(specializations.id, id))
      .returning();
    return updated;
  }

  async delete(id: number): Promise<void> {
    await db.delete(specializations).where(eq(specializations.id, id));
  }
}

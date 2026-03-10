import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { therapistProfiles } from "./therapist-profiles";

export const savedCounselors = pgTable("saved_counselors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  profileId: varchar("profile_id").notNull().references(() => therapistProfiles.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_sc_user_id").on(table.userId),
  index("idx_sc_profile_id").on(table.profileId),
  unique("uq_sc_user_profile").on(table.userId, table.profileId),
]);

export const insertSavedCounselorSchema = createInsertSchema(savedCounselors).omit({
  id: true,
  createdAt: true,
});

export type InsertSavedCounselor = z.infer<typeof insertSavedCounselorSchema>;
export type SavedCounselor = typeof savedCounselors.$inferSelect;

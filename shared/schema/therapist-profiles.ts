import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

export const therapistProfiles = pgTable("therapist_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title"),
  bio: text("bio"),
  specializations: text("specializations").array(),
  languages: text("languages").array(),
  credentials: text("credentials"),
  licenseNumber: text("license_number"),
  practiceMode: text("practice_mode").default("both"),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  zipCode: text("zip_code"),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  phone: text("phone"),
  website: text("website"),
  acceptingClients: boolean("accepting_clients").default(true),
  isApproved: boolean("is_approved").default(false),
  isActive: boolean("is_active").default(true),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTherapistProfileSchema = createInsertSchema(therapistProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTherapistProfile = z.infer<typeof insertTherapistProfileSchema>;
export type TherapistProfile = typeof therapistProfiles.$inferSelect;

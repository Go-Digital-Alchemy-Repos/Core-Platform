import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, numeric, index, customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

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
  instagramHandle: text("instagram_handle"),
  facebookHandle: text("facebook_handle"),
  twitterHandle: text("twitter_handle"),
  linkedinHandle: text("linkedin_handle"),
  youtubeHandle: text("youtube_handle"),
  tiktokHandle: text("tiktok_handle"),
  acceptingClients: boolean("accepting_clients").default(true),
  willingToTravel: boolean("willing_to_travel").default(false),
  isFeatured: boolean("is_featured").default(false),
  featuredUntil: timestamp("featured_until"),
  isApproved: boolean("is_approved").default(false),
  isActive: boolean("is_active").default(true),
  rejectionReason: text("rejection_reason"),
  searchVector: tsvector("search_vector"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tp_user_id").on(table.userId),
  index("idx_tp_visibility").on(table.isApproved, table.isActive),
  index("idx_tp_country").on(table.country),
  index("idx_tp_practice_mode").on(table.practiceMode),
  index("idx_tp_featured").on(table.isFeatured),
  index("idx_tp_specializations_gin").using("gin", table.specializations),
  index("idx_tp_languages_gin").using("gin", table.languages),
  index("idx_tp_directory_filter").on(table.isApproved, table.isActive, table.practiceMode, table.acceptingClients),
]);

export const insertTherapistProfileSchema = createInsertSchema(therapistProfiles).omit({
  id: true,
  searchVector: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTherapistProfile = z.infer<typeof insertTherapistProfileSchema>;
export type TherapistProfile = typeof therapistProfiles.$inferSelect;

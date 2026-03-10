import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  endDate: timestamp("end_date"),
  location: text("location"),
  isVirtual: boolean("is_virtual").default(false),
  zoomLink: text("zoom_link"),
  memberOnly: boolean("member_only").default(false),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),

  virtualJoinUrl: text("virtual_join_url"),
  virtualDialInInfo: text("virtual_dial_in_info"),
  recordingUrl: text("recording_url"),

  registrationEnabled: boolean("registration_enabled").default(false),
  registrationType: text("registration_type").default("free"),
  registrationFee: integer("registration_fee"),
  registrationCurrency: text("registration_currency").default("usd"),
  registrationOpensAt: timestamp("registration_opens_at"),
  registrationClosesAt: timestamp("registration_closes_at"),
  capacity: integer("capacity"),
  waitlistEnabled: boolean("waitlist_enabled").default(false),

  status: text("status").default("published"),
  visibility: text("visibility").default("public"),

  timezone: text("timezone"),
  locationName: text("location_name"),
  locationAddress: text("location_address"),
  latitude: text("latitude"),
  longitude: text("longitude"),

  speakerName: text("speaker_name"),
  speakerBio: text("speaker_bio"),
  speakerImageUrl: text("speaker_image_url"),
}, (table) => [
  index("idx_events_date").on(table.date),
]);

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

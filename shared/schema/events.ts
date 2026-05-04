import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, index, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  date: timestamp("date").notNull(),
  endDate: timestamp("end_date"),
  location: text("location"),
  isVirtual: boolean("is_virtual").default(false),
  zoomLink: text("zoom_link"),
  memberOnly: boolean("member_only").default(false),
  imageUrl: text("image_url"),
  imagePositionX: integer("image_position_x").default(50),
  imagePositionY: integer("image_position_y").default(50),
  createdAt: timestamp("created_at").defaultNow(),

  virtualJoinUrl: text("virtual_join_url"),
  virtualDialInInfo: text("virtual_dial_in_info"),
  recordingUrl: text("recording_url"),
  showInArchives: boolean("show_in_archives").default(false),
  recordingAccess: text("recording_access").default("free"),
  recordingPrice: integer("recording_price"),

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

  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: text("recurrence_pattern"),
  recurrenceInterval: integer("recurrence_interval"),
  recurrenceDaysOfWeek: text("recurrence_days_of_week"),
  recurrenceEndDate: timestamp("recurrence_end_date"),
  recurrenceCount: integer("recurrence_count"),
  parentEventId: varchar("parent_event_id"),
}, (table) => [
  index("idx_events_date").on(table.date),
  index("idx_events_slug").on(table.slug),
  index("idx_events_status_visibility").on(table.status, table.visibility),
  foreignKey({
    columns: [table.parentEventId],
    foreignColumns: [table.id],
    name: "events_parent_event_id_events_id_fk",
  }),
]);

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

import { sql } from "drizzle-orm";
import { pgTable, varchar, text, integer, timestamp, index, check } from "drizzle-orm/pg-core";
import { events } from "./events";

export const eventAttachments = pgTable(
  "event_attachments",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    eventId: varchar("event_id").references(() => events.id, { onDelete: "set null" }),
    ownerId: varchar("owner_id").notNull(),
    objectKey: text("object_key").notNull().unique(),
    originalName: text("original_name").notNull(),
    displayName: text("display_name").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    position: integer("position").notNull().default(0),
    state: text("state").notNull().default("uploading"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    detachedAt: timestamp("detached_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_event_attachments_event").on(table.eventId),
    index("idx_event_attachments_cleanup").on(table.detachedAt),
    check("event_attachments_size_check", sql`${table.size} > 0 AND ${table.size} <= 26214400`),
    check(
      "event_attachments_position_check",
      sql`${table.position} >= 0 AND ${table.position} < 20`,
    ),
    check(
      "event_attachments_state_check",
      sql`${table.state} IN ('uploading', 'ready', 'deleting')`,
    ),
  ],
);

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const MENU_LOCATIONS = ["header", "footer", "unassigned"] as const;
export type MenuLocation = (typeof MENU_LOCATIONS)[number];

export const menuItemSchema: z.ZodType<MenuItem> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string().min(1),
    url: z.string().min(1),
    openInNewTab: z.boolean().default(false),
    children: z.array(menuItemSchema).default([]),
  })
);

export interface MenuItem {
  id: string;
  label: string;
  url: string;
  openInNewTab: boolean;
  children: MenuItem[];
}

export const cmsMenus = pgTable("cms_menus", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location: text("location").notNull().default("unassigned"),
  items: jsonb("items").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCmsMenuSchema = createInsertSchema(cmsMenus).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCmsMenu = z.infer<typeof insertCmsMenuSchema>;
export type CmsMenu = typeof cmsMenus.$inferSelect;

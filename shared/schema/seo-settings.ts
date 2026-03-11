import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const seoSettings = pgTable("seo_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteName: text("site_name").default("TCK Wellness"),
  titleSuffix: text("title_suffix").default(" | TCK Wellness"),
  defaultMetaDescription: text("default_meta_description"),
  siteUrl: text("site_url"),
  defaultOgImageUrl: text("default_og_image_url"),
  organizationName: text("organization_name").default("TCK Wellness"),
  organizationLogoUrl: text("organization_logo_url"),
  facebookUrl: text("facebook_url"),
  twitterHandle: text("twitter_handle"),
  linkedinUrl: text("linkedin_url"),
  instagramUrl: text("instagram_url"),
  defaultRobotsNoindex: boolean("default_robots_noindex").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSeoSettingsSchema = createInsertSchema(seoSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSeoSettings = z.infer<typeof insertSeoSettingsSchema>;
export type SeoSettings = typeof seoSettings.$inferSelect;

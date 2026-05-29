import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { cmsFormSubmissions } from "./forms";
import { users } from "./users";

export const CRM_LEAD_STAGES = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;
export type CrmLeadStage = (typeof CRM_LEAD_STAGES)[number];

export const CRM_LEAD_STAGE_LABELS: Record<CrmLeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export const CRM_CLIENT_STATUSES = ["onboarding", "active", "inactive"] as const;
export type CrmClientStatus = (typeof CRM_CLIENT_STATUSES)[number];

export const CRM_CLIENT_STATUS_LABELS: Record<CrmClientStatus, string> = {
  onboarding: "Onboarding",
  active: "Active",
  inactive: "Inactive",
};

export const crmLeads = pgTable("crm_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  message: text("message"),
  stage: text("stage").$type<CrmLeadStage>().notNull().default("new"),
  source: text("source").notNull().default("manual"),
  externalId: text("external_id"),
  formSubmissionId: varchar("form_submission_id").references(() => cmsFormSubmissions.id, { onDelete: "set null" }),
  formData: jsonb("form_data").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  ownerId: varchar("owner_id").references(() => users.id, { onDelete: "set null" }),
  nextFollowUpAt: timestamp("next_follow_up_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_crm_leads_stage").on(table.stage),
  index("idx_crm_leads_email").on(table.email),
  index("idx_crm_leads_phone").on(table.phone),
  index("idx_crm_leads_source").on(table.source),
  index("idx_crm_leads_created_at").on(table.createdAt),
  index("idx_crm_leads_owner").on(table.ownerId),
]);

export const crmClients = pgTable("crm_clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceLeadId: varchar("source_lead_id").references(() => crmLeads.id, { onDelete: "set null" }).unique(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  status: text("status").$type<CrmClientStatus>().notNull().default("onboarding"),
  source: text("source").notNull().default("manual"),
  formData: jsonb("form_data").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  ownerId: varchar("owner_id").references(() => users.id, { onDelete: "set null" }),
  nextFollowUpAt: timestamp("next_follow_up_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_crm_clients_source_lead").on(table.sourceLeadId),
  index("idx_crm_clients_status").on(table.status),
  index("idx_crm_clients_email").on(table.email),
  index("idx_crm_clients_phone").on(table.phone),
  index("idx_crm_clients_owner").on(table.ownerId),
  index("idx_crm_clients_created_at").on(table.createdAt),
]);

export const crmClientNotes = pgTable("crm_client_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => crmClients.id, { onDelete: "cascade" }).notNull(),
  body: text("body").notNull(),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_crm_client_notes_client_id").on(table.clientId),
  index("idx_crm_client_notes_created_at").on(table.createdAt),
]);

export const crmClientTasks = pgTable("crm_client_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => crmClients.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  dueAt: timestamp("due_at"),
  completed: boolean("completed").notNull().default(false),
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_crm_client_tasks_client_id").on(table.clientId),
  index("idx_crm_client_tasks_due_at").on(table.dueAt),
  index("idx_crm_client_tasks_completed").on(table.completed),
]);

export const crmLeadNotes = pgTable("crm_lead_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => crmLeads.id, { onDelete: "cascade" }).notNull(),
  body: text("body").notNull(),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_crm_lead_notes_lead_id").on(table.leadId),
  index("idx_crm_lead_notes_created_at").on(table.createdAt),
]);

export const crmLeadTasks = pgTable("crm_lead_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => crmLeads.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  dueAt: timestamp("due_at"),
  completed: boolean("completed").notNull().default(false),
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_crm_lead_tasks_lead_id").on(table.leadId),
  index("idx_crm_lead_tasks_due_at").on(table.dueAt),
  index("idx_crm_lead_tasks_completed").on(table.completed),
]);

export const crmLeadInputSchema = z.object({
  name: z.string().trim().min(1, "Lead name is required"),
  email: z.string().trim().email().optional().or(z.literal("")).nullable(),
  phone: z.string().trim().optional().nullable(),
  company: z.string().trim().optional().nullable(),
  message: z.string().trim().optional().nullable(),
  stage: z.enum(CRM_LEAD_STAGES).optional().default("new"),
  source: z.string().trim().min(1).optional().default("manual"),
  externalId: z.string().trim().optional().nullable(),
  ownerId: z.string().trim().optional().nullable(),
  nextFollowUpAt: z.coerce.date().optional().nullable(),
  formSubmissionId: z.string().trim().optional().nullable(),
  formData: z.record(z.unknown()).optional().default({}),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const insertCrmLeadSchema = createInsertSchema(crmLeads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCrmLeadNoteSchema = createInsertSchema(crmLeadNotes).omit({
  id: true,
  createdAt: true,
});
export const insertCrmLeadTaskSchema = createInsertSchema(crmLeadTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCrmClientSchema = createInsertSchema(crmClients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCrmClientNoteSchema = createInsertSchema(crmClientNotes).omit({
  id: true,
  createdAt: true,
});
export const insertCrmClientTaskSchema = createInsertSchema(crmClientTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const crmClientUpdateSchema = z.object({
  name: z.string().trim().min(1, "Client name is required").optional(),
  email: z.string().trim().email().optional().or(z.literal("")).nullable(),
  phone: z.string().trim().optional().nullable(),
  company: z.string().trim().optional().nullable(),
  status: z.enum(CRM_CLIENT_STATUSES).optional(),
  ownerId: z.string().trim().optional().nullable(),
  nextFollowUpAt: z.coerce.date().optional().nullable(),
  formData: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CrmLead = typeof crmLeads.$inferSelect;
export type InsertCrmLead = typeof crmLeads.$inferInsert;
export type CrmLeadNote = typeof crmLeadNotes.$inferSelect;
export type InsertCrmLeadNote = typeof crmLeadNotes.$inferInsert;
export type CrmLeadTask = typeof crmLeadTasks.$inferSelect;
export type InsertCrmLeadTask = typeof crmLeadTasks.$inferInsert;
export type CrmLeadInput = z.infer<typeof crmLeadInputSchema>;
export type CrmClient = typeof crmClients.$inferSelect;
export type InsertCrmClient = typeof crmClients.$inferInsert;
export type CrmClientNote = typeof crmClientNotes.$inferSelect;
export type InsertCrmClientNote = typeof crmClientNotes.$inferInsert;
export type CrmClientTask = typeof crmClientTasks.$inferSelect;
export type InsertCrmClientTask = typeof crmClientTasks.$inferInsert;
export type CrmClientUpdate = z.infer<typeof crmClientUpdateSchema>;

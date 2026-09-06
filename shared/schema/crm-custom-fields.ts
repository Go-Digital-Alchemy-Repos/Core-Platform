import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { z } from "zod";
import type { crmCustomFieldConfigSchema, CrmCustomFieldScalar } from "../crm-custom-fields";
import { crmLeads, crmClients } from "./crm";
import { users } from "./users";
export const crmCustomFieldDefinitions = pgTable(
  "crm_custom_field_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull().unique(),
    entityScope: text("entity_scope").$type<"lead" | "client" | "both">().notNull(),
    type: text("type").$type<"text" | "number" | "date" | "choice" | "boolean">().notNull(),
    revision: integer("revision").notNull().default(1),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("crm_custom_field_key_check", sql`${table.key} ~ '^[a-z][a-z0-9_]{1,47}$'`),
    check("crm_custom_field_scope_check", sql`${table.entityScope} IN ('lead','client','both')`),
    check(
      "crm_custom_field_type_check",
      sql`${table.type} IN ('text','number','date','choice','boolean')`,
    ),
    check("crm_custom_field_revision_check", sql`${table.revision} > 0`),
  ],
);
export const crmCustomFieldRevisions = pgTable(
  "crm_custom_field_revisions",
  {
    definitionId: uuid("definition_id")
      .notNull()
      .references(() => crmCustomFieldDefinitions.id, { onDelete: "restrict" }),
    revision: integer("revision").notNull(),
    config: jsonb("config").$type<z.infer<typeof crmCustomFieldConfigSchema>>().notNull(),
    createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.definitionId, table.revision] }),
    check(
      "crm_custom_field_config_check",
      sql`(jsonb_typeof(${table.config}) = 'object' AND ${table.config}->'version' = '1'::jsonb) IS TRUE`,
    ),
    check("crm_custom_field_history_revision_check", sql`${table.revision} > 0`),
  ],
);
const valueColumns = () => ({
  definitionId: uuid("definition_id").notNull(),
  definitionRevision: integer("definition_revision").notNull(),
  value: jsonb("value").$type<CrmCustomFieldScalar>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const crmLeadCustomFieldValues = pgTable(
  "crm_lead_custom_field_values",
  {
    leadId: varchar("lead_id")
      .notNull()
      .references(() => crmLeads.id, { onDelete: "cascade" }),
    ...valueColumns(),
  },
  (table) => [
    primaryKey({ columns: [table.leadId, table.definitionId] }),
    foreignKey({
      columns: [table.definitionId, table.definitionRevision],
      foreignColumns: [crmCustomFieldRevisions.definitionId, crmCustomFieldRevisions.revision],
    }).onDelete("restrict"),
    check(
      "crm_lead_custom_field_scalar_check",
      sql`jsonb_typeof(${table.value}) IN ('string','number','boolean','null')`,
    ),
  ],
);
export const crmClientCustomFieldValues = pgTable(
  "crm_client_custom_field_values",
  {
    clientId: varchar("client_id")
      .notNull()
      .references(() => crmClients.id, { onDelete: "cascade" }),
    ...valueColumns(),
  },
  (table) => [
    primaryKey({ columns: [table.clientId, table.definitionId] }),
    foreignKey({
      columns: [table.definitionId, table.definitionRevision],
      foreignColumns: [crmCustomFieldRevisions.definitionId, crmCustomFieldRevisions.revision],
    }).onDelete("restrict"),
    check(
      "crm_client_custom_field_scalar_check",
      sql`jsonb_typeof(${table.value}) IN ('string','number','boolean','null')`,
    ),
  ],
);

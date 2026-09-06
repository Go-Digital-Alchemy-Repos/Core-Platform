import { and, asc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "../db";
import {
  crmClients,
  crmLeads,
  crmCustomFieldDefinitions as definitions,
  crmCustomFieldRevisions as revisions,
  crmLeadCustomFieldValues as leadValues,
  crmClientCustomFieldValues as clientValues,
} from "@shared/schema";
import {
  assertCrmCustomFieldDefinitionLimits,
  assertCrmCustomFieldRevisionTransition,
  crmCustomFieldDefinitionSchema,
  crmCustomFieldConfigSchema,
  crmCustomFieldKeySchema,
  crmCustomFieldScopeSchema,
  crmCustomFieldTypeSchema,
  normalizeCrmCustomFieldValues,
  normalizeCrmCustomFieldValue,
  type CrmCustomFieldDefinition,
} from "@shared/crm-custom-fields";
export type CrmCustomFieldsTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const crmCustomFieldCreateSchema = z
  .object({
    key: crmCustomFieldKeySchema,
    entityScope: crmCustomFieldScopeSchema,
    type: crmCustomFieldTypeSchema,
    config: crmCustomFieldConfigSchema,
  })
  .strict();
export const crmCustomFieldRevisionSchema = z
  .object({
    expectedRevision: z.number().int().min(1).max(2147483646),
    config: crmCustomFieldConfigSchema,
    archived: z.boolean(),
  })
  .strict();
const entityIdSchema = z.string().min(1);
const conflict = (code: string) => Object.assign(new Error(code), { statusCode: 409 });
const notFound = () => Object.assign(new Error("crm_custom_field_not_found"), { statusCode: 404 });
/** All composed transactions must acquire this lock BEFORE any lead/client row lock.
 * Shared for values/conversion/intake; exclusive only for definition changes.
 * Never upgrade a shared lock to exclusive within a composed transaction.
 */
export async function lockCrmCustomFieldDefinitions(
  tx: CrmCustomFieldsTransaction,
  mode: "read" | "write" = "read",
) {
  await tx.execute(
    mode === "write"
      ? sql`SELECT pg_advisory_xact_lock(724932, 2)`
      : sql`SELECT pg_advisory_xact_lock_shared(724932, 2)`,
  );
}
function transact<T>(
  tx: CrmCustomFieldsTransaction | undefined,
  work: (tx: CrmCustomFieldsTransaction) => Promise<T>,
): Promise<T> {
  return tx ? work(tx) : db.transaction(work);
}
export class CrmCustomFieldsStorage {
  async listDefinitions(
    transaction?: CrmCustomFieldsTransaction,
  ): Promise<CrmCustomFieldDefinition[]> {
    const conn = transaction ?? db;
    const rows = await conn
      .select({ definition: definitions, config: revisions.config })
      .from(definitions)
      .leftJoin(
        revisions,
        and(
          eq(revisions.definitionId, definitions.id),
          eq(revisions.revision, definitions.revision),
        ),
      )
      .orderBy(asc(definitions.key));
    return rows.map(({ definition, config }) =>
      crmCustomFieldDefinitionSchema.parse({
        id: definition.id,
        key: definition.key,
        type: definition.type,
        entityScope: definition.entityScope,
        revision: definition.revision,
        archivedAt: definition.archivedAt?.toISOString() ?? null,
        config,
      }),
    );
  }
  async createDefinition(
    input: unknown,
    actorId?: string | null,
    transaction?: CrmCustomFieldsTransaction,
  ) {
    const data = crmCustomFieldCreateSchema.parse(input);
    return transact(transaction, async (tx) => {
      await lockCrmCustomFieldDefinitions(tx, "write");
      const inventory = await this.listDefinitions(tx);
      const definition = crmCustomFieldDefinitionSchema.parse({
        ...data,
        id: randomUUID(),
        revision: 1,
        archivedAt: null,
      });
      assertCrmCustomFieldDefinitionLimits([...inventory, definition]);
      await tx.insert(definitions).values({
        id: definition.id,
        key: definition.key,
        type: definition.type,
        entityScope: definition.entityScope,
      });
      await tx.insert(revisions).values({
        definitionId: definition.id,
        revision: 1,
        config: definition.config,
        createdById: actorId ?? null,
      });
      return definition;
    });
  }
  /** Archive/unarchive is a revision, never deletion; caller supplies complete config. */
  async reviseDefinition(
    id: string,
    input: unknown,
    actorId?: string | null,
    transaction?: CrmCustomFieldsTransaction,
  ) {
    z.string().uuid().parse(id);
    const data = crmCustomFieldRevisionSchema.parse(input);
    return transact(transaction, async (tx) => {
      await lockCrmCustomFieldDefinitions(tx, "write");
      const inventory = await this.listDefinitions(tx),
        previous = inventory.find((field) => field.id === id);
      if (!previous) throw notFound();
      if (previous.revision !== data.expectedRevision) throw conflict("stale_definition_revision");
      const next = crmCustomFieldDefinitionSchema.parse({
        ...previous,
        revision: previous.revision + 1,
        config: data.config,
        archivedAt: data.archived ? (previous.archivedAt ?? new Date().toISOString()) : null,
      });
      assertCrmCustomFieldRevisionTransition(previous, next);
      assertCrmCustomFieldDefinitionLimits(
        inventory.map((field) => (field.id === id ? next : field)),
      );
      await tx.insert(revisions).values({
        definitionId: id,
        revision: next.revision,
        config: next.config,
        createdById: actorId ?? null,
      });
      const changed = await tx
        .update(definitions)
        .set({
          revision: next.revision,
          archivedAt: next.archivedAt ? new Date(next.archivedAt) : null,
          updatedAt: new Date(),
        })
        .where(and(eq(definitions.id, id), eq(definitions.revision, data.expectedRevision)))
        .returning({ id: definitions.id });
      if (!changed.length) throw conflict("stale_definition_revision");
      return next;
    });
  }
  async writeValues(
    scope: "lead" | "client",
    entityId: string,
    input: unknown,
    mode: "patch" | "manual_create" = "patch",
    transaction?: CrmCustomFieldsTransaction,
  ) {
    z.enum(["lead", "client"]).parse(scope);
    entityIdSchema.parse(entityId);
    return transact(transaction, async (tx) => {
      await lockCrmCustomFieldDefinitions(tx);
      const entity = scope === "lead" ? crmLeads : crmClients;
      const [record] = await tx
        .select({ revision: entity.customValuesRevision })
        .from(entity)
        .where(eq(entity.id, entityId))
        .for("update");
      if (!record) throw notFound();
      const parsed = normalizeCrmCustomFieldValues(
        input,
        await this.listDefinitions(tx),
        scope,
        mode,
      );
      if (parsed.expectedRevision !== record.revision)
        throw conflict("stale_custom_values_revision");
      for (const value of parsed.values) {
        // JSON null must be stored as JSON null, not SQL NULL.
        const payload = {
          ...value,
          value: sql`${JSON.stringify(value.value)}::jsonb`,
          updatedAt: new Date(),
        };
        if (scope === "lead")
          await tx
            .insert(leadValues)
            .values({ ...payload, leadId: entityId })
            .onConflictDoUpdate({
              target: [leadValues.leadId, leadValues.definitionId],
              set: {
                definitionRevision: value.definitionRevision,
                value: payload.value,
                updatedAt: payload.updatedAt,
              },
            });
        else
          await tx
            .insert(clientValues)
            .values({ ...payload, clientId: entityId })
            .onConflictDoUpdate({
              target: [clientValues.clientId, clientValues.definitionId],
              set: {
                definitionRevision: value.definitionRevision,
                value: payload.value,
                updatedAt: payload.updatedAt,
              },
            });
      }
      const revision = record.revision + 1;
      await tx
        .update(entity)
        .set({ customValuesRevision: revision, updatedAt: new Date() })
        .where(eq(entity.id, entityId));
      return { revision, values: parsed.values };
    });
  }
  /** Caller owns the conversion transaction and has not exposed the newly inserted client. */
  async copyLeadValuesToNewClient(
    leadId: string,
    clientId: string,
    tx: CrmCustomFieldsTransaction,
  ) {
    const lead = await this.readValues("lead", leadId, tx);
    const copied = lead.values.filter(
      (row) =>
        !row.current.archivedAt &&
        row.current.entityScope === "both" &&
        row.current.config.copyOnConversion &&
        row.value !== null,
    );
    for (const row of copied) {
      const value = normalizeCrmCustomFieldValue(
        { ...row.current, revision: row.definitionRevision, config: row.acceptedConfig },
        row.value,
        "accepted_revision",
      );
      await tx.insert(clientValues).values({
        clientId,
        definitionId: row.definitionId,
        definitionRevision: row.definitionRevision,
        value: sql`${JSON.stringify(value)}::jsonb`,
      });
    }
    if (copied.length)
      await tx
        .update(crmClients)
        .set({ customValuesRevision: 1, updatedAt: new Date() })
        .where(eq(crmClients.id, clientId));
  }
  /** Returns retained revision config as well as current presentation; no current validation rewrites history. */
  async readValues(
    scope: "lead" | "client",
    entityId: string,
    transaction?: CrmCustomFieldsTransaction,
  ) {
    z.enum(["lead", "client"]).parse(scope);
    entityIdSchema.parse(entityId);
    return transact(transaction, async (tx) => {
      await lockCrmCustomFieldDefinitions(tx);
      const entity = scope === "lead" ? crmLeads : crmClients;
      const [record] = await tx
        .select({ revision: entity.customValuesRevision })
        .from(entity)
        .where(eq(entity.id, entityId))
        .for("share");
      if (!record) throw notFound();
      const rows =
        scope === "lead"
          ? await tx
              .select({ value: leadValues, accepted: revisions })
              .from(leadValues)
              .leftJoin(
                revisions,
                and(
                  eq(revisions.definitionId, leadValues.definitionId),
                  eq(revisions.revision, leadValues.definitionRevision),
                ),
              )
              .where(eq(leadValues.leadId, entityId))
          : await tx
              .select({ value: clientValues, accepted: revisions })
              .from(clientValues)
              .leftJoin(
                revisions,
                and(
                  eq(revisions.definitionId, clientValues.definitionId),
                  eq(revisions.revision, clientValues.definitionRevision),
                ),
              )
              .where(eq(clientValues.clientId, entityId));
      const inventory = await this.listDefinitions(tx);
      const values = [];
      for (const { value, accepted } of rows) {
        const current = inventory.find((field) => field.id === value.definitionId);
        if (!accepted || !current) throw new Error("crm_custom_field_revision_missing");
        values.push({
          definitionId: value.definitionId,
          definitionRevision: value.definitionRevision,
          value: value.value,
          acceptedConfig: crmCustomFieldConfigSchema.parse(accepted.config),
          current,
        });
      }
      return { revision: record.revision, values };
    });
  }
}

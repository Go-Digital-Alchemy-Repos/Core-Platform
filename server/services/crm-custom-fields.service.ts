import { crmCustomFieldValuesPatchSchema } from "@shared/crm-custom-fields";
import { ZodError } from "zod";
import { db } from "../db";
import { AppError } from "../middleware/error-handler";
import {
  CrmCustomFieldsStorage,
  crmCustomFieldCreateSchema,
  crmCustomFieldRevisionSchema,
} from "../storage/crm-custom-fields.storage";
import { logger } from "../utils/logger";
const fields = new CrmCustomFieldsStorage();
const validationCodes = new Set([
  "field_archived",
  "invalid_text",
  "invalid_field_value",
  "immutable_field_identity",
  "invalid_revision_transition",
  "choice_keys_must_be_retained",
  "duplicate_field_identity",
  "active_field_limit",
  "unknown_or_wrong_scope_field",
  "required_custom_field",
]);
/** Do not forward raw database errors or Zod issue messages containing input keys/values. */
async function safeOperation<T>(operation: () => Promise<T>, write = false): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "stale_definition_revision" || code === "stale_custom_values_revision")
      throw new AppError("CRM fields changed. Reload and try again.", 409);
    if (code === "crm_custom_field_not_found")
      throw new AppError("CRM record or field not found", 404);
    if (write && (error instanceof ZodError || validationCodes.has(code)))
      throw new AppError("Invalid CRM custom field request", 400);
    throw new AppError("CRM custom fields are temporarily unavailable", 500);
  }
}
export async function getCrmCustomFieldDefinitions() {
  return safeOperation(async () => ({ definitions: await fields.listDefinitions() }));
}
export async function createCrmCustomFieldDefinition(input: unknown, actorId: string) {
  const data = await safeOperation(async () => crmCustomFieldCreateSchema.parse(input), true);
  const result = await safeOperation(
    () =>
      db.transaction(async (tx) => {
        await fields.createDefinition(data, actorId, tx);
        return { definitions: await fields.listDefinitions(tx) };
      }),
    true,
  );
  logger.app.info("CRM custom field definition created", { actorId });
  return result;
}
export async function reviseCrmCustomFieldDefinition(id: string, input: unknown, actorId: string) {
  const data = await safeOperation(async () => crmCustomFieldRevisionSchema.parse(input), true);
  const result = await safeOperation(
    () =>
      db.transaction(async (tx) => {
        await fields.reviseDefinition(id, data, actorId, tx);
        return { definitions: await fields.listDefinitions(tx) };
      }),
    true,
  );
  logger.app.info("CRM custom field definition revised", { actorId, definitionId: id });
  return result;
}
export async function getCrmCustomFieldValues(scope: "lead" | "client", id: string) {
  return safeOperation(() => fields.readValues(scope, id));
}
export async function patchCrmCustomFieldValues(
  scope: "lead" | "client",
  id: string,
  input: unknown,
  actorId: string,
) {
  const data = await safeOperation(async () => crmCustomFieldValuesPatchSchema.parse(input), true);
  const result = await safeOperation(
    () =>
      db.transaction(async (tx) => {
        await fields.writeValues(scope, id, data, "patch", tx);
        return fields.readValues(scope, id, tx);
      }),
    true,
  );
  logger.app.info("CRM custom field values updated", { actorId, entityScope: scope, entityId: id });
  return result;
}

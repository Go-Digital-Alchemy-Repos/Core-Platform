import { runCrmCustomFieldsOperation } from "./crm-custom-fields.errors";
import { crmCustomFieldValuesPatchSchema } from "@shared/crm-custom-fields";
import { db } from "../db";
import {
  CrmCustomFieldsStorage,
  crmCustomFieldCreateSchema,
  crmCustomFieldRevisionSchema,
} from "../storage/crm-custom-fields.storage";
import { logger } from "../utils/logger";
const fields = new CrmCustomFieldsStorage();
export async function getCrmCustomFieldDefinitions() {
  return runCrmCustomFieldsOperation(async () => ({ definitions: await fields.listDefinitions() }));
}
export async function createCrmCustomFieldDefinition(input: unknown, actorId: string) {
  const data = await runCrmCustomFieldsOperation(
    async () => crmCustomFieldCreateSchema.parse(input),
    true,
  );
  const result = await runCrmCustomFieldsOperation(
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
  const data = await runCrmCustomFieldsOperation(
    async () => crmCustomFieldRevisionSchema.parse(input),
    true,
  );
  const result = await runCrmCustomFieldsOperation(
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
  return runCrmCustomFieldsOperation(() => fields.readValues(scope, id));
}
export async function patchCrmCustomFieldValues(
  scope: "lead" | "client",
  id: string,
  input: unknown,
  actorId: string,
) {
  const data = await runCrmCustomFieldsOperation(
    async () => crmCustomFieldValuesPatchSchema.parse(input),
    true,
  );
  const result = await runCrmCustomFieldsOperation(
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

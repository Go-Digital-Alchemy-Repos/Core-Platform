import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  CRM_CUSTOM_FIELD_LIMITS,
  crmCustomFieldConfigSchema,
  crmCustomFieldDefinitionSchema,
  crmCustomFieldScalarSchema,
} from "@shared/crm-custom-fields";
import { requestCrmCustomFields } from "./use-crm-custom-fields";
export type CrmScope = "lead" | "client";
export const valuesPath = (scope: CrmScope, id: string) =>
  `/api/admin/crm/${scope === "lead" ? "leads" : "clients"}/${encodeURIComponent(id)}/custom-fields`;
const valuesSchema = z
  .object({
    revision: z.number().int().min(0),
    values: z
      .array(
        z
          .object({
            definitionId: z.string().uuid(),
            definitionRevision: z.number().int().positive(),
            value: crmCustomFieldScalarSchema,
            acceptedConfig: crmCustomFieldConfigSchema,
            current: crmCustomFieldDefinitionSchema,
          })
          .strict(),
      )
      .max(CRM_CUSTOM_FIELD_LIMITS.total),
  })
  .strict();
export async function requestCrmRecordFields(scope: CrmScope, id: string, body?: unknown) {
  const response = await fetch(valuesPath(scope, id), {
    method: body ? "PATCH" : "GET",
    credentials: "include",
    ...(body
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  });
  if (!response.ok)
    throw new Error(
      response.status === 409
        ? "Custom fields changed. Your edits are retained; reload saved values before retrying."
        : "Unable to load or save custom fields. Your edits are retained.",
    );
  try {
    return valuesSchema.parse(await response.json());
  } catch {
    throw new Error("Unsupported custom field data. Editing is disabled until reloaded.");
  }
}
export function useCrmRecordFields(scope: CrmScope, id: string) {
  return useQuery({
    queryKey: [valuesPath(scope, id)],
    retry: false,
    queryFn: async () => {
      const [record, definitions] = await Promise.all([
        requestCrmRecordFields(scope, id),
        requestCrmCustomFields(),
      ]);
      return { ...record, definitions: definitions.definitions };
    },
  });
}

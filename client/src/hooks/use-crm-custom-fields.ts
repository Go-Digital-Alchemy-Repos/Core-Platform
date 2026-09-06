import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  assertCrmCustomFieldDefinitionLimits,
  crmCustomFieldDefinitionSchema,
} from "@shared/crm-custom-fields";
export const CRM_CUSTOM_FIELDS_QUERY_KEY = ["/api/admin/crm/settings/custom-fields"] as const;
const responseSchema = z.object({ definitions: z.array(crmCustomFieldDefinitionSchema) }).strict();
export async function requestCrmCustomFields(method = "GET", id?: string, body?: unknown) {
  const response = await fetch(
    CRM_CUSTOM_FIELDS_QUERY_KEY[0] + (id ? `/${encodeURIComponent(id)}` : ""),
    {
      method,
      credentials: "include",
      ...(body
        ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        : {}),
    },
  );
  if (!response.ok)
    throw new Error(
      response.status === 409
        ? method === "POST"
          ? "Custom field settings changed. Your entries are retained. Refresh the field list before trying again."
          : "This field changed. Your edits are retained. Reload the saved field before trying again."
        : response.status === 403 || response.status === 401
          ? "You do not have permission to manage custom fields."
          : method === "GET"
            ? "Unable to load custom fields."
            : "Unable to save custom fields. Your edits are retained.",
    );
  try {
    const data = responseSchema.parse(await response.json());
    assertCrmCustomFieldDefinitionLimits(data.definitions);
    return data;
  } catch {
    throw new Error(
      "Custom field data is unavailable or unsupported. Editing is disabled until it can be loaded.",
    );
  }
}
export function useCrmCustomFields(enabled = true) {
  return useQuery({
    queryKey: CRM_CUSTOM_FIELDS_QUERY_KEY,
    queryFn: () => requestCrmCustomFields(),
    enabled,
    retry: false,
  });
}

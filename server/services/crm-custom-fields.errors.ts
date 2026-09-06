import { ZodError } from "zod";
import { AppError } from "../middleware/error-handler";
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
export async function runCrmCustomFieldsOperation<T>(
  operation: () => Promise<T>,
  write = false,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "stale_definition_revision" || code === "stale_custom_values_revision")
      throw new AppError("CRM fields changed. Reload and try again.", 409);
    if (code === "duplicate_lead_custom_fields")
      throw new AppError(
        "Existing lead matched. Open that lead and edit custom fields using its current revision.",
        409,
      );
    if (code === "crm_custom_field_not_found")
      throw new AppError("CRM record or field not found", 404);
    if (write && (error instanceof ZodError || validationCodes.has(code)))
      throw new AppError("Invalid CRM custom field request", 400);
    throw new AppError("CRM custom fields are temporarily unavailable", 500);
  }
}

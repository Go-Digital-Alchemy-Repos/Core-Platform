import { z } from "zod";
import { crmFormMappingSchema } from "./crm-form-mapping";
import {
  assertCrmCustomFieldDefinitionLimits,
  crmCustomFieldDefinitionSchema,
  normalizeCrmCustomFieldValue,
  crmCustomFieldValuesPatchSchema,
  type CrmCustomFieldScalar,
} from "./crm-custom-fields";
import { cmsFormFieldSchema, type CmsFormField } from "./schema/forms";

export type CrmMappingErrorCode =
  | "invalid_configuration"
  | "mapping_revision_mismatch"
  | "crm_disabled"
  | "duplicate_source_identity"
  | "unknown_source"
  | "unsupported_source"
  | "unavailable_target"
  | "incompatible_target"
  | "invalid_options"
  | "invalid_value"
  | "required_value";
export type CrmMappingError = { sourceFieldId: string | null; code: CrmMappingErrorCode };
type Builtins = Partial<Record<"name" | "email" | "phone" | "company" | "message", string | null>>;
export type CrmMappingResolution =
  | { ok: true; mode: "legacy" }
  | {
      ok: true;
      mode: "explicit";
      mappingRevision: number;
      normalizedBuiltins: Builtins;
      customValues: Array<{
        definitionId: string;
        definitionRevision: number;
        value: CrmCustomFieldScalar;
      }>;
    }
  | { ok: false; kind: "configuration_unavailable" | "invalid_values"; errors: CrmMappingError[] };
const textTypes = new Set(["text", "email", "tel", "textarea", "hidden"]);
const choiceTypes = new Set(["select", "radio", "image-choice"]);
function sourceType(field: CmsFormField) {
  if (textTypes.has(field.type)) return "text";
  if (choiceTypes.has(field.type))
    return field.type === "image-choice" && field.config.selectionMode !== "single"
      ? null
      : "choice";
  if (field.type === "checkbox") return field.options.length === 1 ? "boolean" : null;
  if (field.type === "consent") return "boolean";
  if (field.type === "number" || field.type === "date") return field.type;
  return null;
}
function adapt(field: CmsFormField, input: unknown): unknown {
  if (field.type === "checkbox") {
    if (
      !Array.isArray(input) ||
      input.length > 1 ||
      (input.length === 1 && input[0] !== field.options[0].value)
    )
      throw new Error("invalid_value");
    return input.length === 1;
  }
  if (input === undefined || input === null || (typeof input === "string" && input.trim() === ""))
    return null;
  if (
    choiceTypes.has(field.type) &&
    (typeof input !== "string" || !field.options.some((option) => option.value === input))
  )
    throw new Error("invalid_value");
  return input;
}
/** Pure adapter for ordinary form-validation output; preview and intake must validate first.
 * Caller supplies a transaction-consistent current definition inventory and mapping revision.
 * Null output values must not erase existing inbound CRM values; persistence owns that merge.
 */
export function resolveCrmFormMapping(input: {
  mapping: unknown;
  mappingRevision: number;
  createCrmLead: boolean;
  fields: unknown;
  definitions: unknown;
  validatedData: Record<string, unknown>;
}): CrmMappingResolution {
  if (input.mapping === null) return { ok: true, mode: "legacy" };
  const fail = (code: CrmMappingErrorCode): CrmMappingResolution => ({
    ok: false,
    kind: "configuration_unavailable",
    errors: [{ sourceFieldId: null, code }],
  });
  const mappingResult = crmFormMappingSchema.safeParse(input.mapping);
  if (!mappingResult.success) return fail("invalid_configuration");
  const mapping = mappingResult.data;
  if (mapping.revision !== input.mappingRevision) return fail("mapping_revision_mismatch");
  if (input.createCrmLead !== true) return fail("crm_disabled");
  let fields: CmsFormField[];
  let definitions: z.infer<typeof crmCustomFieldDefinitionSchema>[];
  try {
    fields = z.array(cmsFormFieldSchema).parse(input.fields);
    assertCrmCustomFieldDefinitionLimits(input.definitions);
    definitions = z.array(crmCustomFieldDefinitionSchema).parse(input.definitions);
  } catch {
    return fail("invalid_configuration");
  }
  if (
    new Set(fields.map((field) => field.id)).size !== fields.length ||
    new Set(fields.map((field) => field.key)).size !== fields.length
  )
    return fail("duplicate_source_identity");
  const errors: CrmMappingError[] = [];
  const resolved = mapping.bindings.map((binding) => {
    const error = (code: CrmMappingErrorCode) =>
      errors.push({ sourceFieldId: binding.sourceFieldId, code });
    const field = fields.find((field) => field.id === binding.sourceFieldId);
    if (!field) {
      error("unknown_source");
      return null;
    }
    const type = sourceType(field);
    if (!type) {
      error("unsupported_source");
      return null;
    }
    if (
      (type === "choice" || field.type === "checkbox") &&
      (!field.options.length ||
        new Set(field.options.map((option) => option.value)).size !== field.options.length)
    ) {
      error("invalid_options");
      return null;
    }
    const target = binding.target;
    const definition =
      target.kind === "custom"
        ? definitions.find((definition) => definition.id === target.definitionId)
        : undefined;
    if (
      binding.target.kind === "custom" &&
      (!definition || definition.archivedAt || definition.entityScope === "client")
    ) {
      error("unavailable_target");
      return null;
    }
    if (type !== (definition?.type ?? "text")) {
      error("incompatible_target");
      return null;
    }
    if (
      definition?.type === "choice" &&
      field.options.some(
        (option) =>
          !definition.config.choices.some(
            (choice) => choice.key === option.value && !choice.archived,
          ),
      )
    ) {
      error("invalid_options");
      return null;
    }
    return { binding, field, definition };
  });
  if (errors.length) return { ok: false, kind: "configuration_unavailable", errors };
  const normalizedBuiltins: Builtins = {};
  const customValues: Array<{
    definitionId: string;
    definitionRevision: number;
    value: CrmCustomFieldScalar;
  }> = [];
  for (const entry of resolved) {
    if (!entry) continue;
    const { binding, field, definition } = entry;
    try {
      const raw = Object.prototype.hasOwnProperty.call(input.validatedData, field.key)
        ? input.validatedData[field.key]
        : undefined;
      const adapted = adapt(field, raw);
      let value: CrmCustomFieldScalar;
      if (definition) value = normalizeCrmCustomFieldValue(definition, adapted);
      else {
        if (
          adapted !== null &&
          (typeof adapted !== "string" ||
            [...adapted].some((char) => {
              const code = char.charCodeAt(0);
              return (code < 32 && char !== "\n" && char !== "\t") || (code >= 127 && code <= 159);
            }))
        )
          throw new Error("invalid_value");
        value = typeof adapted === "string" ? adapted.trim() || null : null;
        if (
          binding.target.kind === "builtin" &&
          binding.target.key === "email" &&
          value !== null &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        )
          throw new Error("invalid_value");
      }
      if (binding.required && value === null) {
        errors.push({ sourceFieldId: binding.sourceFieldId, code: "required_value" });
        continue;
      }
      if (definition)
        customValues.push({
          definitionId: definition.id,
          definitionRevision: definition.revision,
          value,
        });
      else if (binding.target.kind === "builtin")
        normalizedBuiltins[binding.target.key] = value as string | null;
    } catch {
      errors.push({ sourceFieldId: binding.sourceFieldId, code: "invalid_value" });
    }
  }
  if (errors.length) return { ok: false, kind: "invalid_values", errors };
  if (
    !crmCustomFieldValuesPatchSchema.safeParse({ expectedRevision: 0, values: customValues })
      .success
  )
    return {
      ok: false,
      kind: "invalid_values",
      errors: [{ sourceFieldId: null, code: "invalid_value" }],
    };
  normalizedBuiltins.name ||= "Website Lead";
  const result = {
    ok: true as const,
    mode: "explicit" as const,
    mappingRevision: mapping.revision,
    normalizedBuiltins,
    customValues,
  };
  if (new TextEncoder().encode(JSON.stringify(result)).length > 65536)
    return {
      ok: false,
      kind: "invalid_values",
      errors: [{ sourceFieldId: null, code: "invalid_value" }],
    };
  return result;
}

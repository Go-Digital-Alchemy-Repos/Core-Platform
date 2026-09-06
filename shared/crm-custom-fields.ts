import { z } from "zod";

export const CRM_CUSTOM_FIELD_LIMITS = {
  activePerScope: 50,
  total: 200,
  configBytes: 16384,
  valuesBytes: 65536,
  values: 50,
} as const;
const reserved = new Set(
  `__proto__ prototype constructor id name email phone company message stage status source externalId formSubmissionId formData metadata ownerId nextFollowUpAt createdAt updatedAt sourceLeadId clientType primaryEmail secondaryEmail primaryPhone alternatePhone preferredContactMethod addressLine1 addressLine2 city region postalCode country companyName legalName website industry companySize businessType companyPhone companyEmail billingContactName billingEmail billingPhone accountOwnerId onboardingStatus serviceStartDate renewalDate clientSince internalTags permissions role customFields customValuesRevision`
    .split(" ")
    .map((key) => key.replaceAll("_", "").toLowerCase()),
);
export const crmCustomFieldKeySchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{1,47}$/)
  .refine((key) => !reserved.has(key.replaceAll("_", "").toLowerCase()), "Reserved field key");
const optionKey = z.string().regex(/^[a-z][a-z0-9_]{1,47}$/);
const label = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine(
    (value) =>
      [...value].every(
        (char) =>
          char.charCodeAt(0) >= 32 && (char.charCodeAt(0) < 127 || char.charCodeAt(0) > 159),
      ),
    "Control characters are not allowed",
  );
export const crmCustomFieldTypeSchema = z.enum(["text", "number", "date", "choice", "boolean"]);
export const crmCustomFieldScopeSchema = z.enum(["lead", "client", "both"]);
const revision = z.number().int().min(1).max(2147483647);
export const crmCustomFieldScalarSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);
export type CrmCustomFieldScalar = z.infer<typeof crmCustomFieldScalarSchema>;
export const crmCustomFieldChoiceSchema = z
  .object({ key: optionKey, label, archived: z.boolean() })
  .strict();
export const crmCustomFieldConfigSchema = z
  .object({
    version: z.literal(1),
    label,
    description: z
      .string()
      .max(300)
      .refine(
        (value) =>
          [...value].every((char) => {
            const code = char.charCodeAt(0);
            return char === "\n" || char === "\t" || (code >= 32 && (code < 127 || code > 159));
          }),
        "Control characters are not allowed",
      )
      .default(""),
    order: z.number().int().min(0).max(999).default(0),
    requiredOnManualCreate: z.boolean().default(false),
    defaultValue: crmCustomFieldScalarSchema.default(null),
    copyOnConversion: z.boolean().default(false),
    choices: z.array(crmCustomFieldChoiceSchema).max(50).default([]),
  })
  .strict()
  .superRefine((config, ctx) => {
    if (
      new TextEncoder().encode(JSON.stringify(config)).length > CRM_CUSTOM_FIELD_LIMITS.configBytes
    )
      ctx.addIssue({ code: "custom", message: "Configuration too large" });
    if (new Set(config.choices.map((choice) => choice.key)).size !== config.choices.length)
      ctx.addIssue({ code: "custom", message: "Duplicate choice key" });
  });
export const crmCustomFieldDefinitionSchema = z
  .object({
    id: z.string().uuid(),
    key: crmCustomFieldKeySchema,
    entityScope: crmCustomFieldScopeSchema,
    type: crmCustomFieldTypeSchema,
    revision,
    archivedAt: z.string().datetime({ offset: true }).nullable(),
    config: crmCustomFieldConfigSchema,
  })
  .strict()
  .superRefine((field, ctx) => {
    if (field.config.copyOnConversion && field.entityScope !== "both")
      ctx.addIssue({ code: "custom", message: "Conversion copy requires both scopes" });
    if (
      (field.type === "choice" && field.config.choices.length === 0) ||
      (field.type !== "choice" && field.config.choices.length !== 0)
    )
      ctx.addIssue({ code: "custom", message: "Choices must match field type" });
    try {
      normalizeCrmCustomFieldValueUnchecked(field, field.config.defaultValue, "assignment", true);
    } catch {
      ctx.addIssue({
        code: "custom",
        path: ["config", "defaultValue"],
        message: "Invalid default value",
      });
    }
  });
export type CrmCustomFieldDefinition = z.infer<typeof crmCustomFieldDefinitionSchema>;
export function isCrmCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return (
    year >= 1 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
  );
}
function normalizeCrmCustomFieldValueUnchecked(
  field: CrmCustomFieldDefinition,
  input: unknown,
  mode: "assignment" | "accepted_revision",
  ignoreArchive = false,
): CrmCustomFieldScalar {
  if (input === null) return null;
  if (mode === "assignment" && field.archivedAt && !ignoreArchive)
    throw new Error("field_archived");
  switch (field.type) {
    case "text": {
      if (
        typeof input !== "string" ||
        [...input].some(
          (char) =>
            (char.charCodeAt(0) < 32 && char !== "\n" && char !== "\t") ||
            (char.charCodeAt(0) >= 127 && char.charCodeAt(0) <= 159),
        )
      )
        throw new Error("invalid_text");
      const value = input.trim();
      if (value.length > 2000) throw new Error("invalid_text");
      return value || null;
    }
    case "number":
      if (typeof input === "number" && Number.isFinite(input) && Math.abs(input) <= 1e12)
        return input;
      break;
    case "boolean":
      if (typeof input === "boolean") return input;
      break;
    case "date":
      if (typeof input === "string" && isCrmCalendarDate(input)) return input;
      break;
    case "choice":
      if (
        typeof input === "string" &&
        field.config.choices.some(
          (choice) => choice.key === input && (mode === "accepted_revision" || !choice.archived),
        )
      )
        return input;
      break;
  }
  throw new Error("invalid_field_value");
}
/** accepted_revision requires the exact retained definition revision, never the current replacement. */
export function normalizeCrmCustomFieldValue(
  definition: unknown,
  input: unknown,
  mode: "assignment" | "accepted_revision" = "assignment",
) {
  return normalizeCrmCustomFieldValueUnchecked(
    crmCustomFieldDefinitionSchema.parse(definition),
    input,
    mode,
  );
}
export function assertCrmCustomFieldRevisionTransition(previous: unknown, next: unknown): void {
  const before = crmCustomFieldDefinitionSchema.parse(previous),
    after = crmCustomFieldDefinitionSchema.parse(next);
  if (
    ["id", "key", "entityScope", "type"].some(
      (key) => before[key as keyof typeof before] !== after[key as keyof typeof after],
    )
  )
    throw new Error("immutable_field_identity");
  if (after.revision !== before.revision + 1) throw new Error("invalid_revision_transition");
  if (
    before.config.choices.some(
      (choice) => !after.config.choices.some((candidate) => candidate.key === choice.key),
    )
  )
    throw new Error("choice_keys_must_be_retained");
}
export function assertCrmCustomFieldDefinitionLimits(input: unknown): void {
  const fields = z.array(crmCustomFieldDefinitionSchema).max(200).parse(input);
  if (
    new Set(fields.map((field) => field.id)).size !== fields.length ||
    new Set(fields.map((field) => field.key)).size !== fields.length
  )
    throw new Error("duplicate_field_identity");
  for (const scope of ["lead", "client"] as const)
    if (
      fields.filter(
        (field) =>
          !field.archivedAt && (field.entityScope === scope || field.entityScope === "both"),
      ).length > 50
    )
      throw new Error("active_field_limit");
}
export const crmCustomFieldValuesPatchSchema = z
  .object({
    expectedRevision: z.number().int().min(0).max(2147483646),
    values: z
      .array(
        z
          .object({
            definitionId: z.string().uuid(),
            definitionRevision: revision,
            value: crmCustomFieldScalarSchema,
          })
          .strict(),
      )
      .max(50),
  })
  .strict()
  .superRefine((request, ctx) => {
    if (new Set(request.values.map((value) => value.definitionId)).size !== request.values.length)
      ctx.addIssue({ code: "custom", message: "Duplicate definition ID" });
    if (new TextEncoder().encode(JSON.stringify(request)).length > 65536)
      ctx.addIssue({ code: "custom", message: "Values request too large" });
  });
/** Pass the transaction-consistent definition inventory; persistence enforces expectedRevision. */
export function normalizeCrmCustomFieldValues(
  input: unknown,
  definitions: unknown,
  scope: "lead" | "client",
  mode: "patch" | "manual_create" = "patch",
) {
  const request = crmCustomFieldValuesPatchSchema.parse(input);
  assertCrmCustomFieldDefinitionLimits(definitions);
  const fields = z.array(crmCustomFieldDefinitionSchema).parse(definitions);
  const values = request.values.map((entry) => {
    const field = fields.find((candidate) => candidate.id === entry.definitionId);
    if (!field || (field.entityScope !== scope && field.entityScope !== "both"))
      throw new Error("unknown_or_wrong_scope_field");
    if (field.revision !== entry.definitionRevision) throw new Error("stale_definition_revision");
    return {
      ...entry,
      value: normalizeCrmCustomFieldValueUnchecked(field, entry.value, "assignment"),
    };
  });
  if (mode === "manual_create")
    for (const field of fields.filter(
      (field) => !field.archivedAt && (field.entityScope === scope || field.entityScope === "both"),
    )) {
      let entry = values.find((value) => value.definitionId === field.id);
      if (!entry) {
        entry = {
          definitionId: field.id,
          definitionRevision: field.revision,
          value: normalizeCrmCustomFieldValueUnchecked(
            field,
            field.config.defaultValue,
            "assignment",
          ),
        };
        values.push(entry);
      }
      if (field.config.requiredOnManualCreate && entry.value === null)
        throw new Error("required_custom_field");
    }
  return crmCustomFieldValuesPatchSchema.parse({ ...request, values });
}

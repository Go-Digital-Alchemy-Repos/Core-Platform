import { crmMappedFormIntakeSchema } from "@shared/crm-form-intake";
import { z } from "zod";
import { CrmFormMappingStorage } from "../storage/crm-form-mapping.storage";
import { CrmCustomFieldsStorage } from "../storage/crm-custom-fields.storage";
import { crmFormMappingSaveSchema } from "@shared/crm-form-mapping";
import { resolveCrmFormMapping } from "@shared/crm-form-mapping-resolver";
import { validateSubmissionData } from "@shared/managed-form-validation";
import { AppError } from "../middleware/error-handler";
import { logger } from "../utils/logger";
const mappings = new CrmFormMappingStorage();
async function safe<T>(work: () => Promise<T>) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof z.ZodError) throw new AppError("Invalid CRM mapping request", 400);
    const status = (error as { statusCode?: number })?.statusCode;
    if (status === 404) throw new AppError("Form not found", 404);
    if (status === 409)
      throw new AppError(
        "CRM mapping changed or is incompatible. Reload and repair the mapping.",
        409,
      );
    if (status === 400) throw new AppError("Invalid form sample", 400);
    throw new AppError("CRM mapping is temporarily unavailable", 503);
  }
}
export const getCrmFormMapping = (id: string) => safe(() => mappings.get(id));
export async function saveCrmFormMapping(id: string, input: unknown, actorId: string) {
  const result = await safe(() => mappings.save(id, crmFormMappingSaveSchema.parse(input)));
  logger.app.info("CRM form mapping saved", { actorId, formId: id, revision: result.revision });
  return result;
}
const previewSchema = z
  .object({
    expectedRevision: z.number().int().min(0).max(2147483646),
    mapping: crmFormMappingSaveSchema.innerType().shape.mapping,
    sample: z.record(z.unknown()),
  })
  .strict();
export async function previewCrmFormMapping(id: string, input: unknown) {
  return safe(async () => {
    if (Buffer.byteLength(JSON.stringify(input) ?? "", "utf8") > 65536)
      throw new AppError("Invalid form sample", 400);
    const parsed = previewSchema.parse(input);
    crmFormMappingSaveSchema.parse({
      expectedRevision: parsed.expectedRevision,
      mapping: parsed.mapping,
    });
    return mappings.withForm(id, false, async (form, tx) => {
      if (form.crmMappingRevision !== parsed.expectedRevision)
        throw new AppError("Stale mapping", 409);
      const validated = validateSubmissionData(form, parsed.sample);
      const result = resolveCrmFormMapping({
        mapping: parsed.mapping,
        mappingRevision: parsed.expectedRevision + 1,
        createCrmLead: form.settings.createCrmLead === true,
        fields: form.fields,
        definitions: await new CrmCustomFieldsStorage().listDefinitions(tx),
        validatedData: validated,
      });
      if (
        result.ok &&
        result.mode === "explicit" &&
        !crmMappedFormIntakeSchema.safeParse({
          kind: "crm_intake",
          version: 1,
          formId: form.id,
          formName: form.name,
          mappingRevision: result.mappingRevision,
          normalizedBuiltins: result.normalizedBuiltins,
          customValues: result.customValues,
        }).success
      )
        return {
          ok: false as const,
          kind: "invalid_values" as const,
          errors: [{ sourceFieldId: null, code: "invalid_value" as const }],
        };
      return result;
    });
  });
}

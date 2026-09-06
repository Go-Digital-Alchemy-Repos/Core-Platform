import { z } from "zod";
import { crmCustomFieldValuesPatchSchema } from "./crm-custom-fields";
export const crmMappedFormIntakeSchema = z
  .object({
    kind: z.literal("crm_intake"),
    version: z.literal(1),
    formId: z.string().min(1),
    formName: z.string(),
    mappingRevision: z.number().int().min(1).max(2147483647),
    normalizedBuiltins: z
      .object({
        name: z.string().trim().min(1),
        email: z.string().email().nullable().optional(),
        phone: z.string().nullable().optional(),
        company: z.string().nullable().optional(),
        message: z.string().nullable().optional(),
      })
      .strict(),
    customValues: crmCustomFieldValuesPatchSchema.innerType().shape.values,
  })
  .strict()
  .superRefine((payload, ctx) => {
    if (
      !crmCustomFieldValuesPatchSchema.safeParse({
        expectedRevision: 0,
        values: payload.customValues,
      }).success ||
      new TextEncoder().encode(JSON.stringify(payload)).length > 65536
    )
      ctx.addIssue({ code: "custom", message: "Invalid mapped form payload" });
  });
export type CrmMappedFormIntake = z.infer<typeof crmMappedFormIntakeSchema>;

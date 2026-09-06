import { z } from "zod";
const mappingRevision = z.number().int().min(0).max(2147483647);
export const crmFormMappingSchema = z
  .object({
    version: z.literal(1),
    revision: mappingRevision.min(1),
    mode: z.literal("explicit"),
    bindings: z
      .array(
        z
          .object({
            sourceFieldId: z.string().min(1).max(128),
            target: z.discriminatedUnion("kind", [
              z
                .object({
                  kind: z.literal("builtin"),
                  key: z.enum(["name", "email", "phone", "company", "message"]),
                })
                .strict(),
              z.object({ kind: z.literal("custom"), definitionId: z.string().uuid() }).strict(),
            ]),
            required: z.boolean(),
          })
          .strict(),
      )
      .max(55),
  })
  .strict()
  .superRefine((mapping, ctx) => {
    const targets = mapping.bindings.map((binding) =>
      binding.target.kind === "builtin"
        ? `builtin:${binding.target.key}`
        : `custom:${binding.target.definitionId}`,
    );
    if (new Set(targets).size !== targets.length)
      ctx.addIssue({ code: "custom", message: "Duplicate mapping target" });
  });
/** expectedRevision is the form column even when mapping is null; never reset it on removal. */
export const crmFormMappingSaveSchema = z
  .object({ expectedRevision: mappingRevision, mapping: crmFormMappingSchema.nullable() })
  .strict()
  .superRefine((save, ctx) => {
    if (
      save.expectedRevision === 2147483647 ||
      (save.mapping && save.mapping.revision !== save.expectedRevision + 1)
    )
      ctx.addIssue({ code: "custom", message: "Invalid mapping revision transition" });
  });
export type CrmFormMappingV1 = z.infer<typeof crmFormMappingSchema>;

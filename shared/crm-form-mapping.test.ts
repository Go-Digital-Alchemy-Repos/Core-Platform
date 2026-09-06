import { expect, it } from "vitest";
import { crmFormMappingSchema, crmFormMappingSaveSchema } from "./crm-form-mapping";
const mapping = {
  version: 1,
  revision: 3,
  mode: "explicit",
  bindings: [
    { sourceFieldId: "field-1", target: { kind: "builtin", key: "name" }, required: true },
  ],
};
it("requires allowlisted unique targets and strict shape", () => {
  expect(crmFormMappingSchema.safeParse(mapping).success).toBe(true);
  for (const bad of [
    { ...mapping, version: 2 },
    { ...mapping, bindings: [...mapping.bindings, ...mapping.bindings] },
    {
      ...mapping,
      bindings: [{ ...mapping.bindings[0], target: { kind: "builtin", key: "ownerId" } }],
    },
  ])
    expect(crmFormMappingSchema.safeParse(bad).success).toBe(false);
});
it("preserves monotonic revision across removal and recreation", () => {
  expect(crmFormMappingSaveSchema.safeParse({ expectedRevision: 2, mapping }).success).toBe(true);
  expect(crmFormMappingSaveSchema.safeParse({ expectedRevision: 3, mapping: null }).success).toBe(
    true,
  );
  expect(crmFormMappingSaveSchema.safeParse({ expectedRevision: 4, mapping }).success).toBe(false);
  expect(
    crmFormMappingSaveSchema.safeParse({
      expectedRevision: 4,
      mapping: { ...mapping, revision: 5 },
    }).success,
  ).toBe(true);
  expect(
    crmFormMappingSaveSchema.safeParse({ expectedRevision: 2147483647, mapping: null }).success,
  ).toBe(false);
});

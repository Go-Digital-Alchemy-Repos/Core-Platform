import { expect, it } from "vitest";
import { crmMappedFormIntakeSchema } from "./crm-form-intake";
import { validateSubmissionData } from "./managed-form-validation";
import { cmsFormFieldSchema } from "./schema/forms";
const payload = {
  kind: "crm_intake",
  version: 1,
  formId: "form",
  formName: "Form",
  mappingRevision: 1,
  normalizedBuiltins: { name: "Visitor" },
  customValues: [],
};
it("accepts only a bounded strict V1 mapped envelope", () => {
  expect(crmMappedFormIntakeSchema.safeParse(payload).success).toBe(true);
  for (const bad of [
    { ...payload, version: 2 },
    { ...payload, extra: "data" },
    { ...payload, normalizedBuiltins: { name: "V", ownerId: "admin" } },
    { ...payload, normalizedBuiltins: { name: "x".repeat(65536) } },
    { ...payload, normalizedBuiltins: { name: "V", email: "invalid" } },
  ])
    expect(crmMappedFormIntakeSchema.safeParse(bad).success).toBe(false);
});
it("preserves ordinary checkbox arrays, consent booleans and blank numbers for the resolver", () => {
  const form = {
    fields: [
      cmsFormFieldSchema.parse({
        id: "box",
        key: "box",
        label: "Box",
        type: "checkbox",
        options: [{ label: "Yes", value: "yes" }],
      }),
      cmsFormFieldSchema.parse({
        id: "consent",
        key: "consent",
        label: "Consent",
        type: "consent",
      }),
      cmsFormFieldSchema.parse({ id: "number", key: "number", label: "Number", type: "number" }),
    ],
  };
  expect(validateSubmissionData(form, { box: ["yes"], consent: "on", number: "12" })).toEqual({
    box: ["yes"],
    consent: true,
    number: 12,
  });
  expect(validateSubmissionData(form, {})).toEqual({ box: [], consent: false, number: "" });
  expect(() => validateSubmissionData(form, { box: ["unknown"] })).toThrow();
});

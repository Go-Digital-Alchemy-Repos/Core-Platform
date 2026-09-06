import { describe, expect, it } from "vitest";
import { resolveCrmFormMapping } from "./crm-form-mapping-resolver";
import { crmCustomFieldDefinitionSchema } from "./crm-custom-fields";

const id = "11111111-1111-4111-8111-111111111111";
function fixture(type = "text", sourceType = type) {
  const options =
    type === "choice" || sourceType === "checkbox" ? [{ label: "One", value: "option_one" }] : [];
  return {
    mapping: {
      version: 1,
      revision: 3,
      mode: "explicit",
      bindings: [
        {
          sourceFieldId: "stable-id",
          target: { kind: "custom", definitionId: id },
          required: false,
        },
      ],
    },
    mappingRevision: 3,
    createCrmLead: true,
    fields: [
      { id: "stable-id", key: "actual_key", label: "Cosmetic label", type: sourceType, options },
    ],
    definitions: [
      crmCustomFieldDefinitionSchema.parse({
        id,
        key: "custom_field",
        entityScope: "both",
        type,
        revision: 4,
        archivedAt: null,
        config: {
          version: 1,
          label: "Custom",
          choices: type === "choice" ? [{ key: "option_one", label: "One", archived: false }] : [],
        },
      }),
    ],
    validatedData: {} as Record<string, unknown>,
  };
}
function value(type: string, sourceType: string, input: unknown) {
  const f = fixture(type, sourceType);
  f.validatedData.actual_key = input;
  return resolveCrmFormMapping(f);
}
function invalid(
  result: ReturnType<typeof resolveCrmFormMapping>,
  kind = "invalid_values",
  code = "invalid_value",
) {
  expect(result).toMatchObject({ ok: false, kind, errors: [{ code }] });
}
describe("current CRM mapping resolver", () => {
  it.each([
    ["text", "textarea", "  Hello  ", "Hello"],
    ["number", "number", 0, 0],
    ["date", "date", "2024-02-29", "2024-02-29"],
    ["choice", "select", "option_one", "option_one"],
    ["boolean", "consent", false, false],
    ["boolean", "checkbox", [], false],
    ["boolean", "checkbox", ["option_one"], true],
    ["number", "number", "", null],
    ["text", "text", " ", null],
  ])("normalizes %s from %s without losing false/zero", (type, source, input, expected) => {
    expect(value(type as string, source as string, input)).toMatchObject({
      ok: true,
      mode: "explicit",
      mappingRevision: 3,
      normalizedBuiltins: { name: "Website Lead" },
      customValues: [{ definitionId: id, definitionRevision: 4, value: expected }],
    });
  });
  it.each([
    ["number", "number", "0"],
    ["number", "number", Infinity],
    ["number", "number", 1e13],
    ["date", "date", "2023-02-29"],
    ["date", "date", "0000-01-01"],
    ["text", "text", {}],
    ["text", "text", false],
    ["text", "text", "bad\u0085"],
    ["boolean", "consent", "false"],
    ["boolean", "checkbox", false],
    ["boolean", "checkbox", ""],
    ["boolean", "checkbox", null],
    ["boolean", "checkbox", ["option_one", "option_one"]],
    ["boolean", "checkbox", ["unknown"]],
    ["choice", "radio", "One"],
    ["choice", "select", ["option_one"]],
  ])("rejects invalid %s/%s without leaking values", (type, source, input) => {
    invalid(value(type as string, source as string, input));
  });
  it("null mapping preserves legacy independently of definitions/settings", () => {
    expect(
      resolveCrmFormMapping({
        mapping: null,
        mappingRevision: -1,
        createCrmLead: false,
        fields: null,
        definitions: null,
        validatedData: {},
      }),
    ).toEqual({ ok: true, mode: "legacy" });
  });
  it("required means non-null, including false and zero", () => {
    for (const [type, source, input] of [
      ["boolean", "consent", false],
      ["number", "number", 0],
    ] as const) {
      const f = fixture(type, source);
      f.mapping.bindings[0].required = true;
      f.validatedData.actual_key = input;
      expect(resolveCrmFormMapping(f).ok).toBe(true);
      delete f.validatedData.actual_key;
      invalid(resolveCrmFormMapping(f), "invalid_values", "required_value");
    }
  });
  it("uses current accepting revision, actual key and no manual defaults", () => {
    const f = fixture();
    f.definitions[0].config.defaultValue = "default";
    f.definitions[0].config.requiredOnManualCreate = true;
    f.validatedData["stable-id"] = "do not read id";
    expect(resolveCrmFormMapping(f)).toMatchObject({
      customValues: [{ definitionRevision: 4, value: null }],
    });
    f.fields[0].label = "Renamed label";
    f.validatedData.actual_key = "actual";
    expect(resolveCrmFormMapping(f)).toMatchObject({ customValues: [{ value: "actual" }] });
  });
  it.each(["name", "email", "phone", "company", "message"])(
    "supports allowed builtin %s with no heuristic fallthrough",
    (key) => {
      const f = fixture();
      const mapping = {
        ...f.mapping,
        bindings: [
          { sourceFieldId: "stable-id", target: { kind: "builtin", key }, required: false },
        ],
      };
      f.validatedData = {
        actual_key: key === "email" ? "person@example.test" : "hello",
        email: "ignored@example.test",
      };
      const result = resolveCrmFormMapping({ ...f, mapping });
      expect(result).toMatchObject({
        ok: true,
        customValues: [],
        normalizedBuiltins: { [key]: f.validatedData.actual_key },
      });
      if (key !== "email") expect(result).not.toHaveProperty("normalizedBuiltins.email");
    },
  );
  it("validates mapped email with the ordinary email rule and returns only source/code", () => {
    const f = fixture();
    const result = resolveCrmFormMapping({
      ...f,
      mapping: {
        ...f.mapping,
        bindings: [
          {
            sourceFieldId: "stable-id",
            target: { kind: "builtin", key: "email" },
            required: false,
          },
        ],
      },
      validatedData: { actual_key: "secret invalid value" },
    });
    expect(result).toEqual({
      ok: false,
      kind: "invalid_values",
      errors: [{ sourceFieldId: "stable-id", code: "invalid_value" }],
    });
  });
  it("rejects malformed mapping, revision mismatch, disabled CRM and protected targets", () => {
    const f = fixture();
    invalid(
      resolveCrmFormMapping({ ...f, mappingRevision: 2 }),
      "configuration_unavailable",
      "mapping_revision_mismatch",
    );
    invalid(
      resolveCrmFormMapping({ ...f, createCrmLead: false }),
      "configuration_unavailable",
      "crm_disabled",
    );
    for (const key of [
      "stage",
      "status",
      "ownerId",
      "source",
      "permissions",
      "externalId",
      "metadata",
      "__proto__",
    ]) {
      invalid(
        resolveCrmFormMapping({
          ...f,
          mapping: {
            ...f.mapping,
            bindings: [
              { sourceFieldId: "stable-id", target: { kind: "builtin", key }, required: false },
            ],
          },
        }),
        "configuration_unavailable",
        "invalid_configuration",
      );
    }
    invalid(
      resolveCrmFormMapping({ ...f, mapping: { ...f.mapping, version: 99 } }),
      "configuration_unavailable",
      "invalid_configuration",
    );
    invalid(
      resolveCrmFormMapping({
        ...f,
        mapping: { ...f.mapping, bindings: Array(56).fill(f.mapping.bindings[0]) },
      }),
      "configuration_unavailable",
      "invalid_configuration",
    );
  });
  it("rejects unknown/duplicate form source identities and duplicate targets", () => {
    const f = fixture();
    invalid(
      resolveCrmFormMapping({ ...f, fields: [] }),
      "configuration_unavailable",
      "unknown_source",
    );
    for (const second of [
      { ...f.fields[0], key: "different" },
      { ...f.fields[0], id: "different" },
    ])
      invalid(
        resolveCrmFormMapping({ ...f, fields: [...f.fields, second] }),
        "configuration_unavailable",
        "duplicate_source_identity",
      );
    invalid(
      resolveCrmFormMapping({
        ...f,
        mapping: { ...f.mapping, bindings: [...f.mapping.bindings, ...f.mapping.bindings] },
      }),
      "configuration_unavailable",
      "invalid_configuration",
    );
  });
  it.each(["name", "address", "html", "section", "page", "multiselect", "list", "website", "time"])(
    "rejects unsupported source %s",
    (source) => {
      invalid(
        resolveCrmFormMapping(fixture("text", source)),
        "configuration_unavailable",
        "unsupported_source",
      );
    },
  );
  it("rejects archived, missing, client-only or invalid target definitions", () => {
    const f = fixture();
    for (const definitions of [
      [],
      [{ ...f.definitions[0], archivedAt: "2026-09-06T00:00:00Z" }],
      [{ ...f.definitions[0], entityScope: "client" }],
    ])
      invalid(
        resolveCrmFormMapping({ ...f, definitions }),
        "configuration_unavailable",
        "unavailable_target",
      );
    for (const definitions of [
      [{ ...f.definitions[0], revision: 0 }],
      [{ ...f.definitions[0], config: { ...f.definitions[0].config, version: 2 } }],
      [...f.definitions, ...f.definitions],
    ])
      invalid(
        resolveCrmFormMapping({ ...f, definitions }),
        "configuration_unavailable",
        "invalid_configuration",
      );
    invalid(
      resolveCrmFormMapping(fixture("number", "text")),
      "configuration_unavailable",
      "incompatible_target",
    );
  });
  it("requires strict active option correspondence and single selection", () => {
    const f = fixture("choice", "select");
    f.definitions[0].config.choices[0].archived = true;
    invalid(resolveCrmFormMapping(f), "configuration_unavailable", "invalid_options");
    f.definitions[0].config.choices[0].archived = false;
    f.fields[0].options.push({ label: "Other", value: "other" });
    invalid(resolveCrmFormMapping(f), "configuration_unavailable", "invalid_options");
    f.fields[0].options = [f.fields[0].options[0], f.fields[0].options[0]];
    invalid(resolveCrmFormMapping(f), "configuration_unavailable", "invalid_options");
    invalid(
      resolveCrmFormMapping({
        ...fixture("choice", "image-choice"),
        fields: [
          { ...fixture("choice", "image-choice").fields[0], config: { selectionMode: "multiple" } },
        ],
      }),
      "configuration_unavailable",
      "unsupported_source",
    );
    const checkbox = fixture("boolean", "checkbox");
    checkbox.fields[0].options.push({ label: "Two", value: "two" });
    invalid(resolveCrmFormMapping(checkbox), "configuration_unavailable", "unsupported_source");
  });
  it("allows source fanout to distinct targets and never inherits prototype data", () => {
    const f = fixture();
    const mapping = {
      ...f.mapping,
      bindings: [
        ...f.mapping.bindings,
        {
          sourceFieldId: "stable-id",
          target: { kind: "builtin", key: "company" },
          required: false,
        },
      ],
    };
    expect(
      resolveCrmFormMapping({
        ...f,
        mapping,
        validatedData: Object.create({ actual_key: "not own" }),
      }),
    ).toMatchObject({
      normalizedBuiltins: { name: "Website Lead", company: null },
      customValues: [{ value: null }],
    });
  });
  it("bounds normalized custom values at the shared 64KiB limit", () => {
    const f = fixture();
    const definitions = Array.from({ length: 40 }, (_, index) => ({
      ...f.definitions[0],
      id: `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`,
      key: `field_${index}`,
    }));
    const bindings = definitions.map((definition) => ({
      sourceFieldId: "stable-id",
      target: { kind: "custom", definitionId: definition.id },
      required: false,
    }));
    invalid(
      resolveCrmFormMapping({
        ...f,
        definitions,
        mapping: { ...f.mapping, bindings },
        validatedData: { actual_key: "a".repeat(2000) },
      }),
    );
  });
  it("includes builtins in the total normalized output size bound", () => {
    const f = fixture();
    invalid(
      resolveCrmFormMapping({
        ...f,
        mapping: {
          ...f.mapping,
          bindings: [
            {
              sourceFieldId: "stable-id",
              target: { kind: "builtin", key: "message" },
              required: false,
            },
          ],
        },
        validatedData: { actual_key: "a".repeat(65536) },
      }),
    );
  });
});

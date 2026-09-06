import { describe, expect, it } from "vitest";
import {
  assertCrmCustomFieldDefinitionLimits,
  assertCrmCustomFieldRevisionTransition,
  crmCustomFieldDefinitionSchema,
  crmCustomFieldKeySchema,
  crmCustomFieldValuesPatchSchema,
  isCrmCalendarDate,
  normalizeCrmCustomFieldValue,
  normalizeCrmCustomFieldValues,
} from "./crm-custom-fields";
const id = "00000000-0000-4000-8000-000000000001";
function field(type = "text", config = {}) {
  return {
    id,
    key: "favorite_color",
    type,
    entityScope: "both",
    revision: 1,
    archivedAt: null,
    config: { version: 1, label: " Favorite color ", ...config },
  };
}
describe("CRM custom fields", () => {
  it("strictly parses definitions and defaults without promoting metadata", () => {
    expect(crmCustomFieldDefinitionSchema.parse(field()).config).toMatchObject({
      label: "Favorite color",
      defaultValue: null,
      copyOnConversion: false,
    });
    for (const bad of [
      { ...field(), metadata: {} },
      field("unknown"),
      field("text", { version: 2 }),
      field("text", { extra: true }),
      {
        ...field(),
        entityScope: "lead",
        config: { version: 1, label: "X", copyOnConversion: true },
      },
    ])
      expect(crmCustomFieldDefinitionSchema.safeParse(bad).success).toBe(false);
  });
  it.each([
    "id",
    "owner_id",
    "form_data",
    "constructor",
    "prototype",
    "__proto__",
    "permissions",
    "A_field",
    "x",
    "a".repeat(49),
  ])("rejects reserved/malformed key %s", (key) =>
    expect(crmCustomFieldKeySchema.safeParse(key).success).toBe(false),
  );
  it.each(["0001-01-01", "2000-02-29", "2024-02-29", "9999-12-31"])(
    "accepts calendar date %s",
    (date) => expect(isCrmCalendarDate(date)).toBe(true),
  );
  it.each([
    "0000-01-01",
    "1900-02-29",
    "2025-02-29",
    "2024-04-31",
    "2024-00-01",
    "2024-01-00",
    "2024-1-01",
    "2024-01-01T00:00:00Z",
  ])("rejects impossible date %s", (date) => expect(isCrmCalendarDate(date)).toBe(false));
  it("distinguishes false, zero, null and absent without coercion", () => {
    expect(normalizeCrmCustomFieldValue(field("boolean"), false)).toBe(false);
    expect(normalizeCrmCustomFieldValue(field("number"), 0)).toBe(0);
    expect(normalizeCrmCustomFieldValue(field(), "   ")).toBeNull();
    expect(normalizeCrmCustomFieldValue(field(), null)).toBeNull();
    for (const value of ["0", "", NaN, Infinity, 1e12 + 1, undefined])
      expect(() => normalizeCrmCustomFieldValue(field("number"), value)).toThrow();
    expect(() => normalizeCrmCustomFieldValue(field("boolean"), "false")).toThrow();
    expect(normalizeCrmCustomFieldValue(field("number"), -1e12)).toBe(-1e12);
  });
  it("bounds and sanitizes text", () => {
    expect(normalizeCrmCustomFieldValue(field(), "a".repeat(2000))).toHaveLength(2000);
    expect(() => normalizeCrmCustomFieldValue(field(), "a".repeat(2001))).toThrow();
    expect(() => normalizeCrmCustomFieldValue(field(), "a\0")).toThrow();
    expect(normalizeCrmCustomFieldValue(field(), " a\nb\tc ")).toBe("a\nb\tc");
  });
  it("preserves archived accepted values while rejecting new assignments", () => {
    const old = field("choice", { choices: [{ key: "blue", label: "Blue", archived: true }] });
    expect(() => normalizeCrmCustomFieldValue(old, "blue")).toThrow();
    expect(normalizeCrmCustomFieldValue(old, "blue", "accepted_revision")).toBe("blue");
    const archived = { ...field(), archivedAt: "2026-09-06T00:00:00Z" };
    expect(() => normalizeCrmCustomFieldValue(archived, "value")).toThrow();
    expect(normalizeCrmCustomFieldValue(archived, null)).toBeNull();
    expect(normalizeCrmCustomFieldValue(archived, "value", "accepted_revision")).toBe("value");
  });
  it("rejects invalid defaults, choice structure and duplicate choices", () => {
    for (const bad of [
      field("number", { defaultValue: "1" }),
      field("choice"),
      field("text", { choices: [{ key: "xx", label: "X", archived: false }] }),
      field("choice", { choices: [{ key: "xx", label: "X", archived: true }], defaultValue: "xx" }),
      field("choice", { choices: Array(2).fill({ key: "xx", label: "X", archived: false }) }),
    ])
      expect(crmCustomFieldDefinitionSchema.safeParse(bad).success).toBe(false);
  });
  it("requires immutable identity, monotonic revisions and retained option keys", () => {
    const old = field("choice", { choices: [{ key: "xx", label: "X", archived: false }] });
    expect(() =>
      assertCrmCustomFieldRevisionTransition(old, {
        ...old,
        revision: 2,
        config: { ...old.config, choices: [{ key: "xx", label: "Renamed", archived: true }] },
      }),
    ).not.toThrow();
    for (const next of [
      { ...old, revision: 3 },
      { ...old, revision: 2, key: "renamed" },
      {
        ...old,
        revision: 2,
        config: { ...old.config, choices: [{ key: "yy", label: "Y", archived: false }] },
      },
    ])
      expect(() => assertCrmCustomFieldRevisionTransition(old, next)).toThrow();
  });
  it("applies defaults only on manual create and never replaces explicit null", () => {
    const definition = field("number", { defaultValue: 0, requiredOnManualCreate: true });
    expect(
      normalizeCrmCustomFieldValues({ expectedRevision: 0, values: [] }, [definition], "lead")
        .values,
    ).toEqual([]);
    expect(
      normalizeCrmCustomFieldValues(
        { expectedRevision: 0, values: [] },
        [definition],
        "lead",
        "manual_create",
      ).values[0].value,
    ).toBe(0);
    expect(() =>
      normalizeCrmCustomFieldValues(
        { expectedRevision: 0, values: [{ definitionId: id, definitionRevision: 1, value: null }] },
        [definition],
        "lead",
        "manual_create",
      ),
    ).toThrow("required_custom_field");
  });
  it("rejects scope/revision/duplicate/size violations", () => {
    const entry = { definitionId: id, definitionRevision: 1, value: "x" };
    expect(
      crmCustomFieldValuesPatchSchema.safeParse({ expectedRevision: 0, values: [entry, entry] })
        .success,
    ).toBe(false);
    expect(
      crmCustomFieldValuesPatchSchema.safeParse({
        expectedRevision: 0,
        values: [{ ...entry, value: "x".repeat(65536) }],
      }).success,
    ).toBe(false);
    expect(() =>
      normalizeCrmCustomFieldValues(
        { expectedRevision: 0, values: [entry] },
        [{ ...field(), entityScope: "client" }],
        "lead",
      ),
    ).toThrow();
    expect(() =>
      normalizeCrmCustomFieldValues(
        { expectedRevision: 0, values: [{ ...entry, definitionRevision: 2 }] },
        [field()],
        "lead",
      ),
    ).toThrow();
  });
  it("counts both-scope fields against each active limit and retains archived identities", () => {
    const fields = Array.from({ length: 51 }, (_, n) => ({
      ...field(),
      id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
      key: `field_${n}`,
    }));
    expect(() => assertCrmCustomFieldDefinitionLimits(fields)).toThrow();
    fields[50].archivedAt = "2026-09-06T00:00:00Z" as never;
    expect(() => assertCrmCustomFieldDefinitionLimits(fields)).not.toThrow();
    expect(() =>
      assertCrmCustomFieldDefinitionLimits([
        field(),
        { ...field(), archivedAt: "2026-09-06T00:00:00Z" },
      ]),
    ).toThrow();
  });
});

it("enforces serialized UTF-8 config and collection boundaries", () => {
  const choices = Array.from({ length: 50 }, (_, n) => ({
    key: `option_${n}`,
    label: "🙂".repeat(40),
    archived: false,
  }));
  expect(crmCustomFieldDefinitionSchema.safeParse(field("choice", { choices })).success).toBe(true);
  expect(
    crmCustomFieldDefinitionSchema.safeParse(
      field("choice", { choices: [...choices, { key: "extra", label: "Extra", archived: false }] }),
    ).success,
  ).toBe(false);
  const large = choices.map((choice) => ({
    ...choice,
    key: choice.key.padEnd(48, "x"),
    label: "界".repeat(80),
  }));
  expect(
    crmCustomFieldDefinitionSchema.safeParse(
      field("choice", {
        choices: large,
        description: "界".repeat(300),
        defaultValue: large[0].key,
      }),
    ).success,
  ).toBe(false);
  const entries = Array.from({ length: 51 }, (_, n) => ({
    definitionId: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    definitionRevision: 1,
    value: false,
  }));
  expect(
    crmCustomFieldValuesPatchSchema.safeParse({ expectedRevision: 0, values: entries }).success,
  ).toBe(false);
  expect(() => assertCrmCustomFieldDefinitionLimits(Array(201).fill(field()))).toThrow();
});
it("treats false as satisfying required manual input and rejects object values", () => {
  const definition = field("boolean", { requiredOnManualCreate: true, defaultValue: false });
  expect(
    normalizeCrmCustomFieldValues(
      { expectedRevision: 0, values: [] },
      [definition],
      "client",
      "manual_create",
    ).values[0].value,
  ).toBe(false);
  expect(() => normalizeCrmCustomFieldValue(field(), {})).toThrow();
});

it("rejects exhausted values revisions before a write", () => {
  expect(
    crmCustomFieldValuesPatchSchema.safeParse({ expectedRevision: 2147483646, values: [] }).success,
  ).toBe(true);
  expect(
    crmCustomFieldValuesPatchSchema.safeParse({ expectedRevision: 2147483647, values: [] }).success,
  ).toBe(false);
});
it.each(["\u0080", "\u0085", "\u009f", "\u007f", "\u0000", "\r"])(
  "rejects control %j in text, labels and descriptions",
  (control) => {
    expect(() => normalizeCrmCustomFieldValue(field(), `a${control}b`)).toThrow();
    expect(
      crmCustomFieldDefinitionSchema.safeParse(field("text", { label: `a${control}b` })).success,
    ).toBe(false);
    expect(
      crmCustomFieldDefinitionSchema.safeParse(field("text", { description: `a${control}b` }))
        .success,
    ).toBe(false);
  },
);
it("retains newline and tab in text/description but not labels", () => {
  const value = "first\nsecond\tthird";
  expect(normalizeCrmCustomFieldValue(field(), value)).toBe(value);
  expect(
    crmCustomFieldDefinitionSchema.parse(field("text", { description: value })).config.description,
  ).toBe(value);
  expect(crmCustomFieldDefinitionSchema.safeParse(field("text", { label: value })).success).toBe(
    false,
  );
});

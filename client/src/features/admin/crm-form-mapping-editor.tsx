import { useEffect, useState } from "react";
import { resolveCrmFormMapping } from "@shared/crm-form-mapping-resolver";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { crmFormMappingSchema, type CrmFormMappingV1 } from "@shared/crm-form-mapping";
import type { CmsFormField } from "@shared/schema";
import { useCrmCustomFields } from "@/hooks/use-crm-custom-fields";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const responseSchema = z
  .object({
    mapping: crmFormMappingSchema.nullable(),
    revision: z.number().int().min(0).max(2147483647),
  })
  .strict()
  .refine((value) => !value.mapping || value.mapping.revision === value.revision);
const previewSchema = z.union([
  z.object({ ok: z.literal(true), mode: z.literal("legacy") }).strict(),
  z
    .object({
      ok: z.literal(true),
      mode: z.literal("explicit"),
      mappingRevision: z.number().int().positive(),
      normalizedBuiltins: z
        .object({
          name: z.string().nullable().optional(),
          email: z.string().nullable().optional(),
          phone: z.string().nullable().optional(),
          company: z.string().nullable().optional(),
          message: z.string().nullable().optional(),
        })
        .strict(),
      customValues: z
        .array(
          z
            .object({
              definitionId: z.string().uuid(),
              definitionRevision: z.number().int().positive(),
              value: z.union([z.string(), z.number().finite(), z.boolean(), z.null()]),
            })
            .strict(),
        )
        .max(50),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      kind: z.enum(["configuration_unavailable", "invalid_values"]),
      errors: z
        .array(
          z
            .object({
              sourceFieldId: z.string().nullable(),
              code: z.enum([
                "invalid_configuration",
                "mapping_revision_mismatch",
                "crm_disabled",
                "duplicate_source_identity",
                "unknown_source",
                "unsupported_source",
                "unavailable_target",
                "incompatible_target",
                "invalid_options",
                "invalid_value",
                "required_value",
              ]),
            })
            .strict(),
        )
        .max(100),
    })
    .strict(),
]);
type Saved = z.infer<typeof responseSchema>;
async function request(url: string, method = "GET", body?: unknown) {
  const response = await fetch(url, {
    method,
    credentials: "include",
    ...(body !== undefined
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  });
  if (!response.ok)
    throw new Error(
      response.status === 409
        ? "Mapping changed or is incompatible. Your edits are retained. Reload saved mapping before trying again."
        : response.status === 400
          ? "Invalid mapping or sample. Check the fields and try again."
          : "CRM mapping is unavailable. Your edits are retained. Retry before saving.",
    );
  return response.json();
}
const builtins = ["name", "email", "phone", "company", "message"] as const;
function sourceType(field: CmsFormField) {
  if (["text", "email", "tel", "textarea", "hidden"].includes(field.type)) return "text";
  if (
    ["select", "radio"].includes(field.type) ||
    (field.type === "image-choice" && field.config.selectionMode === "single")
  )
    return "choice";
  if (field.type === "consent" || (field.type === "checkbox" && field.options.length === 1))
    return "boolean";
  return field.type === "number" || field.type === "date" ? field.type : null;
}
export function CrmFormMappingEditor({
  formId,
  fields,
  createCrmLead,
  hasUnsavedFormChanges,
  readOnly,
  onDirtyChange,
}: {
  formId: string;
  fields: CmsFormField[];
  createCrmLead: boolean;
  hasUnsavedFormChanges: boolean;
  readOnly: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const persisted = !formId.startsWith("draft-");
  const url = `/api/admin/forms/${encodeURIComponent(formId)}/crm-mapping`;
  const query = useQuery({
    queryKey: [url],
    queryFn: async () => responseSchema.parse(await request(url)),
    enabled: persisted,
    retry: false,
  });
  const definitions = useCrmCustomFields(persisted);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [mapping, setMapping] = useState<CrmFormMappingV1 | null>(null);
  const [busy, setBusy] = useState(false);
  const [unsupportedResponse, setUnsupportedResponse] = useState(false);
  const [message, setMessage] = useState("");
  const [sample, setSample] = useState("{}");
  const [preview, setPreview] = useState<z.infer<typeof previewSchema> | null>(null);
  useEffect(() => {
    if (query.data && !saved) {
      setSaved(query.data);
      setMapping(query.data.mapping);
    }
  }, [query.data, saved]);
  const dirty = !!saved && JSON.stringify(mapping) !== JSON.stringify(saved.mapping);
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  const blocked =
    readOnly || busy || unsupportedResponse || !saved || !query.isSuccess || !definitions.isSuccess;
  const incompatibleDraft = !!mapping && (hasUnsavedFormChanges || !createCrmLead);
  const bindings = mapping?.bindings ?? [];
  const configuration =
    mapping && saved && definitions.data
      ? resolveCrmFormMapping({
          mapping: { ...mapping, revision: saved.revision + 1 },
          mappingRevision: saved.revision + 1,
          createCrmLead,
          fields,
          definitions: definitions.data.definitions,
          validatedData: {},
        })
      : null;
  const invalidConfiguration =
    !!configuration && !configuration.ok && configuration.kind === "configuration_unavailable";
  function update(next: CrmFormMappingV1 | null) {
    setMapping(next);
    setPreview(null);
    setMessage("");
  }
  async function act(action: "save" | "preview" | "reload") {
    if (busy || readOnly) return;
    setBusy(true);
    setMessage("");
    setPreview(null);
    try {
      if (action === "reload") {
        const result = await query.refetch();
        await definitions.refetch();
        if (!result.data || result.isError)
          throw new Error("Unable to reload CRM mapping. Your edits are retained.");
        setUnsupportedResponse(false);
        setSaved(result.data);
        setMapping(result.data.mapping);
        setPreview(null);
      } else {
        if (blocked || incompatibleDraft || invalidConfiguration || !saved) return;
        const body = {
          expectedRevision: saved.revision,
          mapping: mapping ? { ...mapping, revision: saved.revision + 1 } : null,
        };
        if (action === "save") {
          const result = responseSchema.parse(await request(url, "PUT", body));
          setSaved(result);
          setMapping(result.mapping);
          setPreview(null);
          setMessage("CRM mapping saved.");
        } else {
          const parsed: unknown = JSON.parse(sample);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
            throw new Error("Sample must be a JSON object keyed by form field keys.");
          setPreview(
            previewSchema.parse(
              await request(`${url}/preview`, "POST", { ...body, sample: parsed }),
            ),
          );
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) setUnsupportedResponse(true);
      setMessage(
        error instanceof SyntaxError
          ? "Sample must be valid JSON."
          : error instanceof z.ZodError
            ? "Unsupported mapping data. Editing is unavailable until reloaded."
            : error instanceof Error
              ? error.message
              : "CRM mapping is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">CRM field mapping</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4">
        {!persisted ? (
          <p>Save this form before configuring CRM mapping.</p>
        ) : (
          <>
            {(!query.isSuccess || !definitions.isSuccess) && (
              <div role={query.isError || definitions.isError ? "alert" : "status"}>
                {query.isError || definitions.isError
                  ? "CRM mapping could not be loaded. Retry before editing or saving."
                  : "Loading CRM mapping…"}
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void query.refetch();
                    void definitions.refetch();
                  }}
                >
                  Retry CRM mapping
                </Button>
              </div>
            )}
            {saved && (
              <>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!mapping}
                    disabled={blocked || (!mapping && (!createCrmLead || hasUnsavedFormChanges))}
                    onChange={(event) =>
                      update(
                        event.target.checked
                          ? {
                              version: 1,
                              mode: "explicit",
                              revision: saved.revision + 1,
                              bindings: [],
                            }
                          : null,
                      )
                    }
                  />
                  Enable explicit CRM mapping
                </label>
                <p className="text-sm text-muted-foreground">
                  Disabled mapping uses the existing automatic lead matching. Explicit mapping uses
                  only the selected fields. Save mapping separately from form settings.
                </p>
                {(!createCrmLead || hasUnsavedFormChanges) && (
                  <p>
                    Save form settings and enable Create CRM lead before configuring mapping. To
                    turn off lead creation, disable and save mapping first.
                  </p>
                )}
                {mapping && (
                  <div className="space-y-3">
                    {bindings.map((binding, index) => {
                      const field = fields.find((item) => item.id === binding.sourceFieldId);
                      const type = field && sourceType(field);
                      const targetValue =
                        binding.target.kind === "builtin"
                          ? `builtin:${binding.target.key}`
                          : `custom:${binding.target.definitionId}`;
                      const targets = [
                        ...(type === "text"
                          ? builtins.map((key) => ({
                              value: `builtin:${key}`,
                              label: `Lead ${key}`,
                            }))
                          : []),
                        ...(definitions.data?.definitions ?? [])
                          .filter(
                            (definition) =>
                              !definition.archivedAt &&
                              definition.entityScope !== "client" &&
                              definition.type === type &&
                              (type !== "choice" ||
                                field?.options.every((option) =>
                                  definition.config.choices.some(
                                    (choice) => !choice.archived && choice.key === option.value,
                                  ),
                                )),
                          )
                          .map((definition) => ({
                            value: `custom:${definition.id}`,
                            label: definition.config.label,
                          })),
                      ];
                      return (
                        <fieldset
                          key={index}
                          disabled={blocked}
                          className="min-w-0 space-y-2 rounded border p-3"
                        >
                          <legend>Mapping {index + 1}</legend>
                          <label className="block">
                            Source field
                            <select
                              className="block w-full min-w-0 rounded border bg-background p-2"
                              aria-label={`Source field ${index + 1}`}
                              value={binding.sourceFieldId}
                              onChange={(event) =>
                                update({
                                  ...mapping,
                                  bindings: bindings.map((item, i) =>
                                    i === index
                                      ? { ...item, sourceFieldId: event.target.value }
                                      : item,
                                  ),
                                })
                              }
                            >
                              <option value="">Choose source field</option>
                              {!fields.some((item) => item.id === binding.sourceFieldId) &&
                                binding.sourceFieldId && (
                                  <option value={binding.sourceFieldId}>Unavailable source</option>
                                )}
                              {fields
                                .filter((item) => sourceType(item))
                                .map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.label} ({item.key})
                                  </option>
                                ))}
                            </select>
                          </label>
                          <label className="block">
                            CRM target
                            <select
                              className="block w-full min-w-0 rounded border bg-background p-2"
                              aria-label={`CRM target ${index + 1}`}
                              value={targetValue}
                              onChange={(event) => {
                                const [kind, key] = event.target.value.split(":");
                                update({
                                  ...mapping,
                                  bindings: bindings.map((item, i) =>
                                    i === index
                                      ? {
                                          ...item,
                                          target:
                                            kind === "builtin"
                                              ? { kind, key: key as (typeof builtins)[number] }
                                              : { kind: "custom", definitionId: key },
                                        }
                                      : item,
                                  ),
                                });
                              }}
                            >
                              <option
                                value={targetValue}
                                disabled={!targets.some((target) => target.value === targetValue)}
                              >
                                {targets.find((target) => target.value === targetValue)?.label ??
                                  "Choose a compatible target"}
                              </option>
                              {targets
                                .filter((target) => target.value !== targetValue)
                                .map((target) => (
                                  <option key={target.value} value={target.value}>
                                    {target.label}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <label className="flex gap-2">
                            <input
                              type="checkbox"
                              checked={binding.required}
                              onChange={(event) =>
                                update({
                                  ...mapping,
                                  bindings: bindings.map((item, i) =>
                                    i === index
                                      ? { ...item, required: event.target.checked }
                                      : item,
                                  ),
                                })
                              }
                            />
                            Require mapped value {index + 1}
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              update({
                                ...mapping,
                                bindings: bindings.filter((_, i) => i !== index),
                              })
                            }
                          >
                            Remove mapping {index + 1}
                          </Button>
                        </fieldset>
                      );
                    })}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={blocked || bindings.length >= 55}
                      onClick={() =>
                        update({
                          ...mapping,
                          bindings: [
                            ...bindings,
                            {
                              sourceFieldId: "",
                              target: { kind: "builtin", key: "name" },
                              required: false,
                            },
                          ],
                        })
                      }
                    >
                      Add field mapping
                    </Button>
                  </div>
                )}
                {invalidConfiguration && (
                  <p role="alert">
                    Mapping configuration is unavailable or incomplete. Choose compatible sources
                    and unique active targets before saving.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={
                      blocked ||
                      incompatibleDraft ||
                      invalidConfiguration ||
                      !dirty ||
                      saved.revision === 2147483647
                    }
                    onClick={() => void act("save")}
                  >
                    Save CRM mapping
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || readOnly}
                    onClick={() => {
                      if (
                        !dirty ||
                        window.confirm("Discard mapping edits and reload the saved mapping?")
                      )
                        void act("reload");
                    }}
                  >
                    Reload saved mapping
                  </Button>
                </div>
                <label className="block">
                  Sample form data (JSON)
                  <Textarea
                    value={sample}
                    disabled={blocked}
                    onChange={(event) => {
                      setSample(event.target.value);
                      setPreview(null);
                    }}
                  />
                </label>
                <p className="text-sm text-muted-foreground">
                  Use sample data with form field keys. Preview validates without creating a
                  submission or lead.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    blocked ||
                    incompatibleDraft ||
                    invalidConfiguration ||
                    saved.revision === 2147483647
                  }
                  onClick={() => void act("preview")}
                >
                  Preview CRM mapping
                </Button>
                {preview && !preview.ok && (
                  <div role="alert">
                    <p>
                      {preview.kind === "configuration_unavailable"
                        ? "Mapping configuration is unavailable. Repair the selected fields and targets."
                        : "Sample values are invalid."}
                    </p>
                    <ul>
                      {preview.errors.map((error, index) => (
                        <li key={index}>
                          {fields.find((field) => field.id === error.sourceFieldId)?.label ??
                            "Form"}
                          : {error.code.replaceAll("_", " ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {preview?.ok && (
                  <pre
                    aria-label="CRM mapping preview"
                    className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-3 text-sm"
                  >
                    {JSON.stringify(preview, null, 2)}
                  </pre>
                )}
              </>
            )}
            {message && <p role="status">{message}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

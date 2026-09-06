import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  normalizeCrmCustomFieldValues,
  type CrmCustomFieldDefinition,
  type CrmCustomFieldScalar,
} from "@shared/crm-custom-fields";
import { useCrmCustomFields } from "@/hooks/use-crm-custom-fields";
import {
  requestCrmRecordFields,
  useCrmRecordFields,
  type CrmScope,
} from "@/hooks/use-crm-record-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Entry = { definitionId: string; definitionRevision: number; value: CrmCustomFieldScalar };
export type ManualFieldsState = { ready: boolean; values: Entry[] };
const relevant = (fields: CrmCustomFieldDefinition[], scope: CrmScope) =>
  fields
    .filter((f) => f.entityScope === scope || f.entityScope === "both")
    .sort((a, b) => a.config.order - b.config.order || a.key.localeCompare(b.key));
const value = (field: CrmCustomFieldDefinition, raw: CrmCustomFieldScalar) =>
  field.type === "number" && typeof raw === "string"
    ? raw === ""
      ? null
      : Number(raw)
    : raw === ""
      ? null
      : raw;
function parse(
  fields: CrmCustomFieldDefinition[],
  raw: Record<string, CrmCustomFieldScalar>,
  scope: CrmScope,
  revision: number,
  manual = false,
) {
  try {
    return normalizeCrmCustomFieldValues(
      {
        expectedRevision: revision,
        values: Object.entries(raw).map(([id, input]) => {
          const field = fields.find((f) => f.id === id)!;
          return {
            definitionId: id,
            definitionRevision: field.revision,
            value: value(field, input),
          };
        }),
      },
      fields,
      scope,
      manual ? "manual_create" : "patch",
    );
  } catch {
    return null;
  }
}
function TypedField({
  field,
  raw,
  onChange,
  manual = false,
}: {
  field: CrmCustomFieldDefinition;
  raw: CrmCustomFieldScalar;
  onChange: (value: CrmCustomFieldScalar) => void;
  manual?: boolean;
}) {
  const id = `record-field-${field.id}`;
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>
        {field.config.label}
        {manual && field.config.requiredOnManualCreate ? " (required)" : ""}
      </Label>
      {field.type === "boolean" || field.type === "choice" ? (
        <select
          id={id}
          className="h-10 w-full rounded-md border bg-background px-3"
          value={raw === null ? "" : String(raw)}
          onChange={(e) =>
            onChange(
              e.target.value === ""
                ? null
                : field.type === "boolean"
                  ? e.target.value === "true"
                  : e.target.value,
            )
          }
        >
          <option value="">No value</option>
          {field.type === "boolean" ? (
            <>
              <option value="true">True</option>
              <option value="false">False</option>
            </>
          ) : (
            field.config.choices.map((choice) => (
              <option key={choice.key} value={choice.key} disabled={choice.archived}>
                {choice.label}
                {choice.archived ? " (archived)" : ""}
              </option>
            ))
          )}
        </select>
      ) : (
        <Input
          id={id}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          step={field.type === "number" ? "any" : undefined}
          value={raw === null ? "" : String(raw)}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.config.description && (
        <p className="text-sm text-muted-foreground">{field.config.description}</p>
      )}
    </div>
  );
}
export function ManualCrmCustomFields({
  scope,
  onChange,
  disabled = false,
}: {
  scope: CrmScope;
  onChange: (state: ManualFieldsState) => void;
  disabled?: boolean;
}) {
  const query = useCrmCustomFields();
  const [reloading, setReloading] = useState(false);
  const [fields, setFields] = useState<CrmCustomFieldDefinition[] | null>(null);
  const [raw, setRaw] = useState<Record<string, CrmCustomFieldScalar>>({});
  useEffect(() => {
    if (!fields && query.data && !query.isFetching && !query.isError) {
      const initial = relevant(query.data.definitions, scope).filter((f) => !f.archivedAt);
      setFields(query.data.definitions);
      setRaw(Object.fromEntries(initial.map((f) => [f.id, f.config.defaultValue])));
    }
  }, [fields, query.data, query.isFetching, query.isError, scope]);
  const parsed = useMemo(
    () => (fields ? parse(fields, raw, scope, 0, true) : null),
    [fields, raw, scope],
  );
  useEffect(() => {
    onChange({ ready: !!parsed && !query.isError && !reloading, values: parsed?.values ?? [] });
  }, [parsed, query.isError, onChange, reloading]);
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">Custom fields</h3>
      {!fields && !query.isError && <p role="status">Loading custom fields…</p>}
      {query.isError && (
        <p role="alert">
          Unable to load custom fields. Creation is disabled.{" "}
          <Button type="button" onClick={() => void query.refetch()}>
            Retry custom fields
          </Button>
        </p>
      )}
      <fieldset disabled={disabled || query.isError || reloading} className="space-y-3">
        {fields &&
          relevant(fields, scope)
            .filter((f) => !f.archivedAt)
            .map((field) => (
              <TypedField
                key={field.id}
                field={field}
                raw={raw[field.id] ?? null}
                manual
                onChange={(v) => setRaw((current) => ({ ...current, [field.id]: v }))}
              />
            ))}
      </fieldset>
      {fields && (
        <div>
          <p className="text-sm">
            Reloading definitions discards these custom entries and restores current defaults.
          </p>
          <Button
            type="button"
            disabled={disabled || reloading}
            onClick={async () => {
              setReloading(true);
              try {
                const result = await query.refetch();
                if (!result.isError && result.data) {
                  setFields(result.data.definitions);
                  setRaw(
                    Object.fromEntries(
                      relevant(result.data.definitions, scope)
                        .filter((f) => !f.archivedAt)
                        .map((f) => [f.id, f.config.defaultValue]),
                    ),
                  );
                }
              } finally {
                setReloading(false);
              }
            }}
          >
            Reload custom field defaults
          </Button>
        </div>
      )}
      {fields && !parsed && (
        <p role="alert">
          Enter valid values for all required custom fields. Clearing a value does not request its
          default.
        </p>
      )}
    </section>
  );
}

export function CrmRecordCustomFields({ scope, id }: { scope: CrmScope; id: string }) {
  const query = useCrmRecordFields(scope, id);
  const [snapshot, setSnapshot] = useState<typeof query.data>();
  const [dirty, setDirty] = useState<Record<string, CrmCustomFieldScalar>>({});
  const [reloadError, setReloadError] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!snapshot && query.data && !query.isFetching && !query.isError) setSnapshot(query.data);
  }, [snapshot, query.data, query.isFetching, query.isError]);
  const parsed = snapshot ? parse(snapshot.definitions, dirty, scope, snapshot.revision) : null;
  const mutation = useMutation({
    mutationFn: async () => {
      if (!parsed || query.isError || reloading)
        throw new Error("Load valid custom fields before saving.");
      return requestCrmRecordFields(scope, id, parsed);
    },
    onSuccess: (data) => {
      setSnapshot((previous) => (previous ? { ...previous, ...data } : previous));
      setDirty({});
      setSaved(true);
    },
  });
  const locked = !snapshot || query.isError || mutation.isPending || reloading;
  return (
    <section className="space-y-3 rounded-md border p-4">
      <h3 className="font-semibold">Custom fields</h3>
      {!snapshot && !query.isError && <p role="status">Loading custom fields…</p>}
      {query.isError && <p role="alert">Unable to load custom fields. Saving is disabled.</p>}
      <fieldset disabled={locked} className="space-y-3">
        {snapshot &&
          relevant(snapshot.definitions, scope)
            .filter(
              (field) =>
                !field.archivedAt || snapshot.values.some((v) => v.definitionId === field.id),
            )
            .map((field) => {
              const accepted = snapshot.values.find((v) => v.definitionId === field.id);
              const raw = Object.hasOwn(dirty, field.id)
                ? dirty[field.id]
                : (accepted?.value ?? null);
              const acceptedLabel =
                accepted?.current.type === "choice"
                  ? (accepted.acceptedConfig.choices.find((c) => c.key === accepted.value)?.label ??
                    String(accepted.value ?? "No value"))
                  : String(accepted?.value ?? "No value");
              return (
                <div key={field.id}>
                  {field.archivedAt ? (
                    <p>
                      {field.config.label} (archived, read-only): {acceptedLabel}
                    </p>
                  ) : (
                    <TypedField
                      field={field}
                      raw={raw}
                      onChange={(v) => {
                        setDirty((current) => ({ ...current, [field.id]: v }));
                        setSaved(false);
                      }}
                    />
                  )}
                  {accepted && (
                    <p className="text-sm text-muted-foreground">
                      Accepted value: {acceptedLabel} (revision {accepted.definitionRevision})
                    </p>
                  )}
                </div>
              );
            })}
      </fieldset>
      {snapshot && !parsed && (
        <p role="alert">Correct the typed custom field values before saving.</p>
      )}
      <Button
        type="button"
        disabled={locked || !parsed || Object.keys(dirty).length === 0}
        onClick={() => mutation.mutate()}
      >
        Save custom values
      </Button>
      {mutation.isError && <p role="alert">{mutation.error.message}</p>}
      {(mutation.isError || query.isError) && (
        <div>
          <p>Reloading saved values discards your current custom field edits.</p>
          <Button
            type="button"
            disabled={reloading || mutation.isPending}
            onClick={async () => {
              setReloadError(false);
              setReloading(true);
              try {
                const result = await query.refetch();
                if (result.isError || !result.data) setReloadError(true);
                else {
                  setSnapshot(result.data);
                  setDirty({});
                  mutation.reset();
                  setSaved(false);
                }
              } finally {
                setReloading(false);
              }
            }}
          >
            Reload saved custom values
          </Button>
        </div>
      )}
      {reloadError && <p role="alert">Reload failed. Your edits are retained.</p>}
      {saved && <p role="status">Custom values saved.</p>}
    </section>
  );
}

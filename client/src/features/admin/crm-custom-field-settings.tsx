import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  crmCustomFieldDefinitionSchema,
  type CrmCustomFieldDefinition,
} from "@shared/crm-custom-fields";
import {
  CRM_CUSTOM_FIELDS_QUERY_KEY,
  requestCrmCustomFields,
  useCrmCustomFields,
} from "@/hooks/use-crm-custom-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Draft = Pick<CrmCustomFieldDefinition, "key" | "entityScope" | "type" | "config"> & {
  id?: string;
  revision?: number;
  archived: boolean;
};
// Empty label is intentionally an invalid editing state, not a saved definition.
const newDraft = (): Draft => ({
  key: "",
  entityScope: "lead",
  type: "text",
  archived: false,
  config: {
    version: 1,
    label: "",
    description: "",
    order: 0,
    requiredOnManualCreate: false,
    defaultValue: null,
    copyOnConversion: false,
    choices: [],
  },
});
const fromDefinition = (field: CrmCustomFieldDefinition): Draft => ({
  ...structuredClone(field),
  archived: !!field.archivedAt,
});
const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

export function CrmCustomFieldSettings({ canEdit = false }: { canEdit?: boolean }) {
  const query = useCrmCustomFields(canEdit);
  const cache = useQueryClient();
  const [draft, setDraft] = useState<Draft>(newDraft);
  const [defaultText, setDefaultText] = useState("");
  const [saved, setSaved] = useState(false);
  const [reloadError, setReloadError] = useState(false);
  const [reloading, setReloading] = useState(false);
  const normalizedDefault =
    draft.type === "number"
      ? defaultText === ""
        ? null
        : Number(defaultText)
      : draft.type === "text" || draft.type === "date"
        ? defaultText || null
        : draft.config.defaultValue;
  const parsed = crmCustomFieldDefinitionSchema.safeParse({
    id: draft.id ?? "00000000-0000-4000-8000-000000000001",
    key: draft.key,
    entityScope: draft.entityScope,
    type: draft.type,
    revision: draft.revision ?? 1,
    archivedAt: draft.archived ? "2000-01-01T00:00:00Z" : null,
    config: { ...draft.config, defaultValue: normalizedDefault },
  });
  const mutation = useMutation({
    mutationFn: async () => {
      if (!canEdit || !query.data || query.isError || reloading || !parsed.success)
        throw new Error("Load valid custom field settings before saving.");
      const field = parsed.data;
      return requestCrmCustomFields(
        draft.id ? "PATCH" : "POST",
        draft.id,
        draft.id
          ? { expectedRevision: draft.revision, config: field.config, archived: draft.archived }
          : {
              key: field.key,
              entityScope: field.entityScope,
              type: field.type,
              config: field.config,
            },
      );
    },
    onSuccess: (data) => {
      cache.setQueryData(CRM_CUSTOM_FIELDS_QUERY_KEY, data);
      const field = data.definitions.find((field) =>
        draft.id ? field.id === draft.id : field.key === draft.key,
      );
      if (field) {
        setDraft(fromDefinition(field));
        setDefaultText(
          typeof field.config.defaultValue === "string" ||
            typeof field.config.defaultValue === "number"
            ? String(field.config.defaultValue)
            : "",
        );
      }
      setSaved(true);
    },
  });
  const locked = !canEdit || !query.data || query.isError || mutation.isPending || reloading;
  const original = query.data?.definitions.find((field) => field.id === draft.id);
  function update(next: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...next }));
    setSaved(false);
  }
  function config(next: Partial<Draft["config"]>) {
    update({ config: { ...draft.config, ...next } });
  }
  function select(field?: CrmCustomFieldDefinition) {
    setDraft(field ? fromDefinition(field) : newDraft());
    setDefaultText(
      field &&
        (typeof field.config.defaultValue === "string" ||
          typeof field.config.defaultValue === "number")
        ? String(field.config.defaultValue)
        : "",
    );
    mutation.reset();
    setSaved(false);
    setReloadError(false);
  }
  if (!canEdit) return <p role="alert">Only administrators can manage custom field definitions.</p>;
  return (
    <section className="max-w-4xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">CRM custom fields</h1>
        <p>Add typed fields to leads and clients. Field identity stays fixed after creation.</p>
      </div>
      {query.isLoading && <p role="status">Loading custom fields…</p>}
      {query.isError && (
        <div role="alert">
          Unable to load custom fields. Saving is disabled.{" "}
          <Button variant="outline" onClick={() => void query.refetch()}>
            Retry loading custom fields
          </Button>
        </div>
      )}
      {!query.isError && query.data && (
        <nav aria-label="Custom field definitions" className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={locked} onClick={() => select()}>
            New custom field
          </Button>
          {[...query.data.definitions]
            .sort((a, b) => a.config.order - b.config.order || a.key.localeCompare(b.key))
            .map((field) => (
              <Button
                key={field.id}
                variant={draft.id === field.id ? "secondary" : "outline"}
                disabled={locked}
                onClick={() => select(field)}
              >
                {field.config.label}
                {field.archivedAt ? " (archived)" : ""}
              </Button>
            ))}
        </nav>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!locked && parsed.success) mutation.mutate();
        }}
      >
        <fieldset disabled={locked} className="space-y-4 rounded-lg border p-4">
          <legend className="px-2 font-semibold">
            {draft.id ? "Edit custom field" : "Create custom field"}
          </legend>
          <p className="text-sm text-muted-foreground">
            Key, entity scope and type cannot change after creation. Archived field and option keys
            cannot be reused.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cf-key">Field key</Label>
              <Input
                id="cf-key"
                value={draft.key}
                disabled={!!draft.id}
                onChange={(e) => update({ key: e.target.value })}
                placeholder="farm_size"
              />
            </div>
            <div>
              <Label htmlFor="cf-label">Label</Label>
              <Input
                id="cf-label"
                value={draft.config.label}
                maxLength={80}
                onChange={(e) => config({ label: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cf-scope">Entity scope</Label>
              <select
                id="cf-scope"
                className={selectClass}
                value={draft.entityScope}
                disabled={!!draft.id}
                onChange={(e) =>
                  update({
                    entityScope: e.target.value as Draft["entityScope"],
                    config: { ...draft.config, copyOnConversion: false },
                  })
                }
              >
                <option value="lead">Lead</option>
                <option value="client">Client</option>
                <option value="both">Lead and client</option>
              </select>
            </div>
            <div>
              <Label htmlFor="cf-type">Field type</Label>
              <select
                id="cf-type"
                className={selectClass}
                value={draft.type}
                disabled={!!draft.id}
                onChange={(e) => {
                  update({
                    type: e.target.value as Draft["type"],
                    config: { ...draft.config, defaultValue: null, choices: [] },
                  });
                  setDefaultText("");
                }}
              >
                {["text", "number", "date", "choice", "boolean"].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="cf-description">Description</Label>
              <Input
                id="cf-description"
                value={draft.config.description}
                maxLength={300}
                onChange={(e) => config({ description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cf-order">Display order</Label>
              <Input
                id="cf-order"
                type="number"
                min={0}
                max={999}
                step={1}
                value={draft.config.order}
                onChange={(e) => config({ order: e.target.valueAsNumber })}
              />
            </div>
          </div>
          {draft.type === "choice" && (
            <fieldset className="space-y-3 rounded-md border p-3">
              <legend>Choice options</legend>
              <p className="text-sm">
                Saved option keys remain fixed. Archive an option to stop new assignments while
                retaining existing values.
              </p>
              {draft.config.choices.map((choice, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <Label htmlFor={`cf-choice-key-${index}`}>Option {index + 1} key</Label>
                    <Input
                      id={`cf-choice-key-${index}`}
                      value={choice.key}
                      disabled={index < (original?.config.choices.length ?? 0)}
                      onChange={(e) =>
                        config({
                          choices: draft.config.choices.map((item, i) =>
                            i === index ? { ...item, key: e.target.value } : item,
                          ),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`cf-choice-label-${index}`}>Option {index + 1} label</Label>
                    <Input
                      id={`cf-choice-label-${index}`}
                      value={choice.label}
                      onChange={(e) =>
                        config({
                          choices: draft.config.choices.map((item, i) =>
                            i === index ? { ...item, label: e.target.value } : item,
                          ),
                        })
                      }
                    />
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={choice.archived}
                      onChange={(e) =>
                        config({
                          choices: draft.config.choices.map((item, i) =>
                            i === index ? { ...item, archived: e.target.checked } : item,
                          ),
                        })
                      }
                    />
                    Archive option {index + 1}
                  </label>
                  {index >= (original?.config.choices.length ?? 0) && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        config({ choices: draft.config.choices.filter((_, i) => i !== index) })
                      }
                    >
                      Remove unsaved option {index + 1}
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                disabled={draft.config.choices.length >= 50}
                onClick={() =>
                  config({
                    choices: [...draft.config.choices, { key: "", label: "", archived: false }],
                  })
                }
              >
                Add option
              </Button>
            </fieldset>
          )}
          <div>
            <Label htmlFor="cf-default">Default for new manual records</Label>
            {draft.type === "boolean" ? (
              <select
                id="cf-default"
                className={selectClass}
                value={draft.config.defaultValue === null ? "" : String(draft.config.defaultValue)}
                onChange={(e) =>
                  config({ defaultValue: e.target.value === "" ? null : e.target.value === "true" })
                }
              >
                <option value="">No default</option>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            ) : draft.type === "choice" ? (
              <select
                id="cf-default"
                className={selectClass}
                value={String(draft.config.defaultValue ?? "")}
                onChange={(e) => config({ defaultValue: e.target.value || null })}
              >
                <option value="">No default</option>
                {draft.config.choices.map((choice, index) => (
                  <option key={index} value={choice.key} disabled={choice.archived || !choice.key}>
                    {choice.label || "Unnamed option"}
                    {choice.archived ? " (archived)" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id="cf-default"
                type={draft.type === "date" ? "date" : draft.type === "number" ? "number" : "text"}
                step={draft.type === "number" ? "any" : undefined}
                value={defaultText}
                onChange={(e) => {
                  setDefaultText(e.target.value);
                  setSaved(false);
                }}
              />
            )}
            <p className="text-sm text-muted-foreground">
              Blank means no default. Defaults apply once to new manual records; they do not change
              existing values or form intake.
            </p>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.config.requiredOnManualCreate}
              onChange={(e) => config({ requiredOnManualCreate: e.target.checked })}
            />
            Required for new manual records
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              disabled={draft.entityScope !== "both"}
              checked={draft.config.copyOnConversion}
              onChange={(e) => config({ copyOnConversion: e.target.checked })}
            />
            Copy lead value when first converted to a client
          </label>
          {draft.id && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.archived}
                onChange={(e) => update({ archived: e.target.checked })}
              />
              Archived field
            </label>
          )}
          <p className="text-sm text-muted-foreground">
            Archiving preserves existing values and their accepted revisions. Unarchiving restores
            the same identity.
          </p>
          {!parsed.success && (
            <p role="status">
              Complete the field configuration with valid keys, typed defaults and unique choice
              options before saving.
            </p>
          )}
          <Button type="submit" disabled={locked || !parsed.success}>
            {mutation.isPending
              ? "Saving…"
              : draft.id
                ? "Save custom field"
                : "Create custom field"}
          </Button>
        </fieldset>
      </form>
      {mutation.isError && (
        <div role="alert">
          {mutation.error.message}
          <p>Your current entries remain in the editor. Reloading discards them.</p>
          {draft.id && (
            <Button
              variant="outline"
              disabled={reloading}
              onClick={async () => {
                setReloadError(false);
                setReloading(true);
                try {
                  const result = await query.refetch();
                  const field = result.data?.definitions.find((field) => field.id === draft.id);
                  if (result.isError || !field) setReloadError(true);
                  else select(field);
                } finally {
                  setReloading(false);
                }
              }}
            >
              Reload saved field
            </Button>
          )}
        </div>
      )}
      {reloadError && <p role="alert">Unable to reload this field. Your edits are retained.</p>}
      {saved && <p role="status">Custom field saved.</p>}
    </section>
  );
}

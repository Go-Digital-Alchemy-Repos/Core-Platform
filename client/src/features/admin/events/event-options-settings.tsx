import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  type EventConfiguration,
  optionGroups,
  type OptionGroup,
  eventConfigurationSchema,
} from "@shared/event-configuration";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export function EventOptionsSettings() {
  const query = useQuery<EventConfiguration>({ queryKey: ["/api/admin/events/configuration"] });
  const [draft, setDraft] = useState<EventConfiguration | null>(null);
  const [error, setError] = useState("");
  const config = draft ?? query.data;
  const save = useMutation({
    mutationFn: async () => {
      const candidate = structuredClone(config);
      if (candidate)
        for (const preset of Object.values(candidate.presets))
          preset.tags = preset.tags.filter(Boolean);
      const parsed = eventConfigurationSchema.safeParse(candidate);
      if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
      return (await apiRequest("PUT", "/api/admin/events/configuration", parsed.data)).json();
    },
    onSuccess: async (data: EventConfiguration) => {
      queryClient.setQueryData(["/api/admin/events/configuration"], data);
      await queryClient.invalidateQueries({ queryKey: ["/api/events/configuration"] });
      setDraft(null);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });
  if (!config)
    return (
      <p role="status">
        {query.isError
          ? "Unable to load event settings. Please reload."
          : "Loading event settings…"}
      </p>
    );
  const update = (fn: (next: EventConfiguration) => void) => {
    const next = structuredClone(config);
    fn(next);
    setDraft(next);
  };
  const move = (group: OptionGroup, index: number, direction: number) =>
    update((next) => {
      const other = index + direction;
      if (other < 0 || other >= next[group].length) return;
      [next[group][index], next[group][other]] = [next[group][other], next[group][index]];
    });
  return (
    <fieldset disabled={save.isPending} className="min-w-0 space-y-5">
      <p>
        Rename, reorder, or archive reusable choices. Existing events retain saved values. Replace
        active preset references before archiving choices.
      </p>
      {optionGroups.map((group) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="capitalize">
              {group === "types"
                ? "Event types"
                : group === "delivery"
                  ? "Delivery choices"
                  : group}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {config[group].map((o, index) => (
              <div key={o.id} className="flex flex-wrap items-center gap-2">
                <Input
                  aria-label={`${group} name ${index + 1}`}
                  className="max-w-xs"
                  value={o.label}
                  onChange={(e) =>
                    update((n) => {
                      n[group][index].label = e.target.value;
                    })
                  }
                />
                {group === "delivery" && (
                  <select
                    aria-label={`Delivery behavior for ${o.label}`}
                    value={o.behavior}
                    disabled={!!query.data?.delivery.some((old) => old.id === o.id)}
                    onChange={(e) =>
                      update((n) => {
                        n.delivery[index].behavior = e.target.value as
                          | "virtual"
                          | "hybrid"
                          | "in_person";
                      })
                    }
                  >
                    {["in_person", "virtual", "hybrid"].map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                )}
                <Button
                  variant="outline"
                  disabled={index === 0}
                  onClick={() => move(group, index, -1)}
                  aria-label={`Move ${o.label} up`}
                >
                  ↑
                </Button>
                <Button
                  variant="outline"
                  disabled={index === config[group].length - 1}
                  onClick={() => move(group, index, 1)}
                  aria-label={`Move ${o.label} down`}
                >
                  ↓
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    update((n) => {
                      n[group][index].archived = !o.archived;
                    })
                  }
                >
                  {o.archived ? "Restore" : "Archive"}
                </Button>
                {o.archived && <span>Archived</span>}
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() =>
                update((n) => {
                  const id = crypto.randomUUID();
                  n[group].push({
                    id,
                    label: "New option",
                    archived: false,
                    ...(group === "delivery" ? { behavior: "in_person" as const } : {}),
                  });
                  if (group === "types") n.presets[id] = structuredClone(n.presets[n.defaultType]);
                })
              }
            >
              Add {group === "tags" ? "suggested tag" : "option"}
            </Button>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader>
          <CardTitle>Presets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block">
            Default event preset{" "}
            <select
              value={config.defaultType}
              onChange={(e) =>
                update((n) => {
                  n.defaultType = e.target.value;
                })
              }
            >
              {config.types
                .filter((o) => !o.archived)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
            </select>
          </label>
          {config.types
            .filter((o) => !o.archived)
            .map((type) => {
              const p = config.presets[type.id];
              if (!p) return null;
              return (
                <fieldset key={type.id} className="space-y-2 rounded border p-4">
                  <legend>{type.label}</legend>
                  {(
                    [
                      ["categories", "category"],
                      ["audiences", "audience"],
                      ["formats", "format"],
                      ["delivery", "deliveryOptionId"],
                    ] as const
                  ).map(([group, field]) => (
                    <label key={field} className="block capitalize">
                      {group}{" "}
                      <select
                        value={p[field]}
                        onChange={(e) =>
                          update((n) => {
                            n.presets[type.id][field] = e.target.value;
                          })
                        }
                      >
                        {config[group].map((o) => (
                          <option key={o.id} value={o.id} disabled={o.archived}>
                            {o.label}
                            {o.archived ? " (archived)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <label className="block">
                    <input
                      type="checkbox"
                      checked={p.registrationEnabled}
                      onChange={(e) =>
                        update((n) => {
                          n.presets[type.id].registrationEnabled = e.target.checked;
                        })
                      }
                    />{" "}
                    Registration enabled
                  </label>
                  <label className="block">
                    Registration approval{" "}
                    <select
                      value={p.registrationApprovalMode}
                      onChange={(e) =>
                        update((n) => {
                          n.presets[type.id].registrationApprovalMode = e.target.value as
                            | "automatic"
                            | "manual";
                        })
                      }
                    >
                      <option value="automatic">Automatic</option>
                      <option value="manual">Manual</option>
                    </select>
                  </label>
                  <label className="block">
                    Suggested tags (comma separated)
                    <Input
                      value={p.tags.join(", ")}
                      onChange={(e) =>
                        update((n) => {
                          n.presets[type.id].tags = e.target.value.split(",").map((t) => t.trim());
                        })
                      }
                    />
                  </label>
                </fieldset>
              );
            })}
        </CardContent>
      </Card>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <Button disabled={!draft || save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? "Saving…" : "Save event settings"}
      </Button>
      <Button
        variant="outline"
        disabled={!draft || save.isPending}
        onClick={() => {
          setDraft(null);
          setError("");
        }}
      >
        Discard changes
      </Button>
      <Button
        variant="outline"
        disabled={save.isPending || query.isFetching}
        onClick={async () => {
          if (
            draft &&
            !window.confirm("Discard your unsaved changes and reload the latest event settings?")
          )
            return;
          const result = await query.refetch();
          if (result.isSuccess) {
            setDraft(null);
            setError("");
          } else setError("Unable to reload event settings. Your draft is preserved.");
        }}
      >
        Reload latest settings
      </Button>
    </fieldset>
  );
}

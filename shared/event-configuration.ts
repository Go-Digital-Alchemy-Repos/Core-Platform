import { z } from "zod";
import {
  EVENT_TYPE_LABELS,
  EVENT_CATEGORY_LABELS,
  EVENT_AUDIENCE_LABELS,
  EVENT_FORMAT_LABELS,
  EVENT_DELIVERY_MODE_LABELS,
  EVENT_PRESET_DEFAULTS,
} from "./schema/events";
export const optionGroups = [
  "types",
  "categories",
  "audiences",
  "formats",
  "delivery",
  "tags",
] as const;
export type OptionGroup = (typeof optionGroups)[number];
const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const option = z
  .object({
    id,
    label: z.string().trim().min(1).max(100),
    archived: z.boolean(),
    behavior: z.enum(["in_person", "virtual", "hybrid"]).optional(),
  })
  .strict();
const preset = z
  .object({
    category: id,
    audience: id,
    format: id,
    deliveryOptionId: id,
    registrationEnabled: z.boolean(),
    registrationApprovalMode: z.enum(["automatic", "manual"]),
    tags: z.array(z.string().trim().min(1).max(100)).max(100),
  })
  .strict();
export const eventConfigurationSchema = z
  .object({
    version: z.literal(1),
    revision: z.number().int().nonnegative(),
    defaultType: id,
    types: z.array(option).min(1).max(100),
    categories: z.array(option).min(1).max(100),
    audiences: z.array(option).min(1).max(100),
    formats: z.array(option).min(1).max(100),
    delivery: z.array(option).min(1).max(100),
    tags: z.array(option).max(100),
    presets: z.record(id, preset),
  })
  .strict()
  .superRefine((c, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: "custom", message });
    for (const group of optionGroups) {
      if (new Set(c[group].map((o) => o.id)).size !== c[group].length)
        issue(`Duplicate IDs in ${group}`);
      if (group !== "tags" && !c[group].some((o) => !o.archived))
        issue(`${group} needs an active option`);
    }
    if (!c.types.some((o) => o.id === c.defaultType && !o.archived))
      issue("Default preset must be active");
    if (c.delivery.some((o) => !o.behavior))
      issue("Every delivery choice needs a delivery behavior");
    for (const type of c.types.filter((o) => !o.archived)) {
      const p = c.presets[type.id];
      if (!p) {
        issue(`Missing preset for ${type.label}`);
        continue;
      }
      for (const [group, value] of [
        ["categories", p.category],
        ["audiences", p.audience],
        ["formats", p.format],
        ["delivery", p.deliveryOptionId],
      ] as const) {
        if (!c[group].some((o) => o.id === value && !o.archived))
          issue(`${type.label} references an inactive ${group} option; replace it first`);
      }
    }
  });
export type EventConfiguration = z.infer<typeof eventConfigurationSchema>;
const rows = (labels: Record<string, string>) =>
  Object.entries(labels).map(([id, label]) => ({ id, label, archived: false }));
export function defaultEventConfiguration(): EventConfiguration {
  return {
    version: 1,
    revision: 0,
    defaultType: "training",
    types: rows(EVENT_TYPE_LABELS),
    categories: rows(EVENT_CATEGORY_LABELS),
    audiences: rows(EVENT_AUDIENCE_LABELS),
    formats: rows(EVENT_FORMAT_LABELS),
    delivery: rows(EVENT_DELIVERY_MODE_LABELS).map((o) => ({
      ...o,
      behavior: o.id as "virtual" | "in_person" | "hybrid",
    })),
    tags: [],
    presets: Object.fromEntries(
      Object.entries(EVENT_PRESET_DEFAULTS).map(([key, p]) => {
        const { deliveryMode, ...rest } = p;
        return [key, { ...rest, deliveryOptionId: deliveryMode, tags: [] }];
      }),
    ),
  };
}
export function validateConfigurationTransition(
  previous: EventConfiguration,
  next: EventConfiguration,
): string | null {
  for (const group of optionGroups)
    for (const old of previous[group]) {
      const current = next[group].find((o) => o.id === old.id);
      if (!current) return "Archive existing options instead of deleting them";
      if (group === "delivery" && current.behavior !== old.behavior)
        return "Existing delivery behavior cannot change; add a new choice";
    }
  return null;
}

export type ConfiguredEventChoices = {
  eventType?: string | null;
  category?: string | null;
  audience?: string | null;
  format?: string | null;
  deliveryMode?: string | null;
  deliveryOptionId?: string | null;
};
export function validateConfiguredEventChoices(
  configuration: EventConfiguration,
  data: ConfiguredEventChoices,
  existing?: ConfiguredEventChoices,
): string | null {
  for (const [group, field] of [
    ["types", "eventType"],
    ["categories", "category"],
    ["audiences", "audience"],
    ["formats", "format"],
  ] as const) {
    const value = data[field];
    if (
      value &&
      existing?.[field] !== value &&
      !configuration[group].some((o) => o.id === value && !o.archived)
    )
      return `Invalid or archived ${field}`;
  }
  if (data.deliveryOptionId) {
    const option = configuration.delivery.find((o) => o.id === data.deliveryOptionId);
    if ((!option || option.archived) && existing?.deliveryOptionId !== data.deliveryOptionId)
      return "Invalid or archived delivery choice";
    if (option && option.behavior !== (data.deliveryMode ?? existing?.deliveryMode))
      return "Delivery choice does not match delivery mode";
  }
  return null;
}

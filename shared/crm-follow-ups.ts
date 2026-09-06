import { z } from "zod";

const timestamp = z
  .string()
  .datetime()
  .refine((value) => {
    const parsed = new Date(value);
    return (
      Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 19) === value.slice(0, 19)
    );
  }, "Invalid calendar timestamp");
const identifier = z.string().min(1).max(128);
export const crmFollowUpFiltersSchema = z
  .object({
    kind: z.enum(["all", "lead", "client"]).default("all"),
    completion: z.enum(["open", "completed", "all"]).default("open"),
    due: z.enum(["all", "overdue", "upcoming", "undated"]).default("all"),
    owner: z.enum(["all", "mine", "unassigned", "user"]).default("all"),
    assigneeId: identifier.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.owner === "user") !== Boolean(value.assigneeId))
      context.addIssue({
        code: "custom",
        message: "Choose an assignee only with the user owner filter.",
        path: ["assigneeId"],
      });
  });
export const crmFollowUpQuerySchema = z
  .object({
    kind: z.enum(["all", "lead", "client"]).optional(),
    completion: z.enum(["open", "completed", "all"]).optional(),
    due: z.enum(["all", "overdue", "upcoming", "undated"]).optional(),
    owner: z.enum(["all", "mine", "unassigned", "user"]).optional(),
    assigneeId: identifier.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.string().min(1).max(4096).optional(),
  })
  .strict();
export const crmAssigneeQuerySchema = z
  .object({
    query: z.string().trim().max(120).default(""),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.string().min(1).max(2048).optional(),
  })
  .strict();
export const crmFollowUpCursorSchema = z
  .object({
    version: z.literal(1),
    asOf: timestamp,
    filters: crmFollowUpFiltersSchema,
    actorId: identifier,
    dueAt: timestamp.nullable(),
    kind: z.enum(["lead", "client"]),
    taskId: identifier,
  })
  .strict();
export const crmAssigneeCursorSchema = z
  .object({
    version: z.literal(1),
    query: z.string().max(120),
    name: z.string().max(1000),
    id: identifier,
  })
  .strict();
export type CrmFollowUpFilters = z.infer<typeof crmFollowUpFiltersSchema>;
export type CrmFollowUpKind = "lead" | "client";
export interface CrmFollowUpItem {
  kind: CrmFollowUpKind;
  taskId: string;
  recordId: string;
  recordName: string;
  title: string;
  dueAt: string | null;
  completed: boolean;
  assignedToId: string | null;
  assignee: { id: string; name: string; eligible: boolean } | null;
}
export interface CrmFollowUpPage {
  items: CrmFollowUpItem[];
  nextCursor: string | null;
  asOf: string;
}
export interface CrmAssigneePage {
  items: Array<{ id: string; name: string }>;
  nextCursor: string | null;
}

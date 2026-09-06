import { z } from "zod";
import {
  crmFollowUpFiltersSchema,
  crmFollowUpQuerySchema,
  crmFollowUpCursorSchema,
  crmAssigneeQuerySchema,
  crmAssigneeCursorSchema,
  type CrmFollowUpKind,
} from "@shared/crm-follow-ups";
import { CrmFollowUpsStorage, followUpError } from "../storage/crm-follow-ups.storage";
const storage = new CrmFollowUpsStorage();
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
function decode<T>(value: string, schema: z.ZodType<T>): T {
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error();
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return schema.parse(parsed);
  } catch {
    throw followUpError("This page cursor is invalid. Refresh the worklist.");
  }
}
export async function listCrmFollowUps(input: unknown, actorId: string, now = new Date()) {
  const { limit, cursor, ...raw } = crmFollowUpQuerySchema.parse(input);
  const filters = crmFollowUpFiltersSchema.parse(raw);
  const after = cursor ? decode(cursor, crmFollowUpCursorSchema) : undefined;
  if (
    after &&
    (after.actorId !== actorId || JSON.stringify(after.filters) !== JSON.stringify(filters))
  )
    throw followUpError("Filters changed. Refresh the worklist before paging.");
  const asOf = after?.asOf ?? now.toISOString();
  const rows = await storage.list(filters, actorId, asOf, limit + 1, after);
  const items = rows.slice(0, limit),
    last = items.at(-1);
  return {
    items,
    asOf,
    nextCursor:
      rows.length > limit && last
        ? encode({
            version: 1,
            asOf,
            filters,
            actorId,
            dueAt: last.dueAt,
            kind: last.kind,
            taskId: last.taskId,
          })
        : null,
  };
}
export async function listCrmAssignees(input: unknown) {
  const { limit, cursor, query } = crmAssigneeQuerySchema.parse(input);
  const after = cursor ? decode(cursor, crmAssigneeCursorSchema) : undefined;
  if (after && after.query !== query)
    throw followUpError("Search changed. Refresh the assignee list.");
  const rows = await storage.assignees(query, limit + 1, after),
    items = rows.slice(0, limit),
    last = items.at(-1);
  return {
    items,
    nextCursor: rows.length > limit && last ? encode({ version: 1, query, ...last }) : null,
  };
}
// Preserve the existing task payload coercion and unknown-key stripping.
const createSchema = z.object({
  title: z.string().trim().min(1, "Task title is required"),
  dueAt: z.coerce.date().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
});
const updateSchema = createSchema.partial().extend({ completed: z.boolean().optional() });
export const createCrmTask = (
  kind: CrmFollowUpKind,
  recordId: string,
  input: unknown,
  actorId: string,
) => storage.create(kind, recordId, createSchema.parse(input), actorId);
export const updateCrmTask = (kind: CrmFollowUpKind, taskId: string, input: unknown) =>
  storage.update(kind, taskId, updateSchema.parse(input));

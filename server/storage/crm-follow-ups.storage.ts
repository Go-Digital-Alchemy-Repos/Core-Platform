import { eq, sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import { users, crmLeadTasks, crmClientTasks } from "@shared/schema";
import { hasAdminPermission } from "../middleware/auth";
import type { CrmFollowUpFilters, CrmFollowUpItem, CrmFollowUpKind } from "@shared/crm-follow-ups";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export function followUpError(message: string, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}
const eligibleSql = sql`(u.is_suspended = false AND (u.role = 'admin' OR (u.role = 'editor' AND u.admin_permissions @> '["crm"]'::jsonb)))`;
const nameSql = sql`COALESCE(NULLIF(trim(concat_ws(' ',u.first_name,u.last_name)),''),u.email)`;
const stamp = (column: SQL) => sql`to_char(${column}, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
export class CrmFollowUpsStorage {
  constructor(private database = db) {}
  async list(
    filters: CrmFollowUpFilters,
    actorId: string,
    asOf: string,
    limit: number,
    after?: { dueAt: string | null; kind: CrmFollowUpKind; taskId: string },
  ): Promise<CrmFollowUpItem[]> {
    const conditions: SQL[] = [];
    if (filters.kind !== "all") conditions.push(sql`t.kind=${filters.kind}`);
    if (filters.completion !== "all")
      conditions.push(sql`t.completed=${filters.completion === "completed"}`);
    if (filters.owner === "mine") conditions.push(sql`t.assigned_to_id=${actorId}`);
    if (filters.owner === "user") conditions.push(sql`t.assigned_to_id=${filters.assigneeId}`);
    if (filters.owner === "unassigned") conditions.push(sql`t.assigned_to_id IS NULL`);
    if (filters.due === "overdue") conditions.push(sql`t.due_at < ${asOf}::timestamp`);
    if (filters.due === "upcoming") conditions.push(sql`t.due_at >= ${asOf}::timestamp`);
    if (filters.due === "undated") conditions.push(sql`t.due_at IS NULL`);
    if (after) {
      const tie = sql`(t.kind COLLATE "C",t.id COLLATE "C") > (${after.kind} COLLATE "C",${after.taskId} COLLATE "C")`;
      conditions.push(
        after.dueAt === null
          ? sql`(t.due_at IS NULL AND ${tie})`
          : sql`(t.due_at > ${after.dueAt}::timestamp OR t.due_at IS NULL OR (t.due_at = ${after.dueAt}::timestamp AND ${tie}))`,
      );
    }
    const result = await this.database.execute(sql`
      WITH t AS (
        SELECT 'lead'::text AS kind, t.id,t.lead_id AS record_id,r.name AS record_name,t.title,t.due_at,t.completed,t.assigned_to_id FROM crm_lead_tasks t JOIN crm_leads r ON r.id=t.lead_id
        UNION ALL
        SELECT 'client'::text AS kind,t.id,t.client_id AS record_id,r.name AS record_name,t.title,t.due_at,t.completed,t.assigned_to_id FROM crm_client_tasks t JOIN crm_clients r ON r.id=t.client_id
      ) SELECT t.kind,t.id AS "taskId",t.record_id AS "recordId",t.record_name AS "recordName",t.title,${stamp(sql`t.due_at`)} AS "dueAt",t.completed,t.assigned_to_id AS "assignedToId",
      CASE WHEN u.id IS NULL THEN NULL ELSE json_build_object('id',u.id,'name',${nameSql},'eligible',${eligibleSql}) END AS assignee
      FROM t LEFT JOIN users u ON u.id=t.assigned_to_id
      ${conditions.length ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``}
      ORDER BY t.due_at ASC NULLS LAST,t.kind COLLATE "C" ASC,t.id COLLATE "C" ASC LIMIT ${limit}
    `);
    return result.rows as unknown as CrmFollowUpItem[];
  }
  async assignees(query: string, limit: number, after?: { name: string; id: string }) {
    const conditions = [eligibleSql];
    if (query)
      conditions.push(sql`${nameSql} ILIKE ${"%" + query.replace(/[\\%_]/g, "\\$&") + "%"}`);
    if (after)
      conditions.push(
        sql`(${nameSql} COLLATE "C",u.id COLLATE "C") > (${after.name} COLLATE "C",${after.id} COLLATE "C")`,
      );
    const result = await this.database.execute(
      sql`SELECT u.id,${nameSql} AS name FROM users u WHERE ${sql.join(conditions, sql` AND `)} ORDER BY ${nameSql} COLLATE "C",u.id COLLATE "C" LIMIT ${limit}`,
    );
    return result.rows as Array<{ id: string; name: string }>;
  }
  private async validateAssignee(tx: Transaction, id: string | null | undefined) {
    if (id == null) return;
    const [user] = await tx.select().from(users).where(eq(users.id, id)).for("share");
    if (!user || user.isSuspended || !hasAdminPermission(user, "crm"))
      throw followUpError(
        "Choose an active administrator or editor with CRM access, or leave the task unassigned.",
      );
  }
  async create(
    kind: CrmFollowUpKind,
    recordId: string,
    data: { title: string; dueAt?: Date | null; assignedToId?: string | null },
    actorId: string,
  ) {
    return this.database.transaction(async (tx) => {
      const parent = kind === "lead" ? sql`crm_leads` : sql`crm_clients`;
      const found = await tx.execute(
        sql`SELECT id FROM ${parent} WHERE id=${recordId} FOR KEY SHARE`,
      );
      if (!found.rows.length)
        throw followUpError(kind === "lead" ? "Lead not found" : "Client not found", 404);
      const assignedToId = data.assignedToId ?? actorId;
      await this.validateAssignee(tx, assignedToId);
      const values = {
        title: data.title,
        dueAt: data.dueAt ?? null,
        assignedToId,
        createdById: actorId,
        completed: false,
      };
      const [task] =
        kind === "lead"
          ? await tx
              .insert(crmLeadTasks)
              .values({ ...values, leadId: recordId })
              .returning()
          : await tx
              .insert(crmClientTasks)
              .values({ ...values, clientId: recordId })
              .returning();
      return task;
    });
  }
  async update(
    kind: CrmFollowUpKind,
    id: string,
    data: {
      title?: string;
      dueAt?: Date | null;
      assignedToId?: string | null;
      completed?: boolean;
    },
  ) {
    return this.database.transaction(async (tx) => {
      const table = kind === "lead" ? crmLeadTasks : crmClientTasks;
      const [existing] = await tx.select().from(table).where(eq(table.id, id)).for("update");
      if (!existing) throw followUpError("Task not found", 404);
      if (data.assignedToId !== undefined && data.assignedToId !== existing.assignedToId)
        await this.validateAssignee(tx, data.assignedToId);
      const [task] = await tx
        .update(table)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(table.id, id))
        .returning();
      return task;
    });
  }
}

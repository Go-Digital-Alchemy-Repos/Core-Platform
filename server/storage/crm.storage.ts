import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  CRM_LEAD_STAGES,
  crmLeadNotes,
  crmLeadTasks,
  crmLeads,
  type CrmLead,
  type CrmLeadNote,
  type CrmLeadStage,
  type CrmLeadTask,
  type InsertCrmLead,
  type InsertCrmLeadNote,
  type InsertCrmLeadTask,
} from "@shared/schema";

export interface CrmLeadListFilters {
  query?: string;
  stage?: CrmLeadStage | "all";
}

export interface CrmLeadDetail extends CrmLead {
  notes: CrmLeadNote[];
  tasks: CrmLeadTask[];
}

function isCrmLeadStage(value: string | undefined): value is CrmLeadStage {
  return !!value && CRM_LEAD_STAGES.includes(value as CrmLeadStage);
}

export class CrmStorage {
  async listLeads(filters: CrmLeadListFilters = {}): Promise<CrmLead[]> {
    const conditions = [];
    const query = filters.query?.trim();
    if (query) {
      const pattern = `%${query}%`;
      conditions.push(or(
        ilike(crmLeads.name, pattern),
        ilike(crmLeads.email, pattern),
        ilike(crmLeads.phone, pattern),
        ilike(crmLeads.company, pattern),
        ilike(crmLeads.source, pattern),
      ));
    }
    if (isCrmLeadStage(filters.stage)) {
      conditions.push(eq(crmLeads.stage, filters.stage));
    }

    return db
      .select()
      .from(crmLeads)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(crmLeads.updatedAt), desc(crmLeads.createdAt));
  }

  async getLeadById(id: string): Promise<CrmLead | undefined> {
    const [lead] = await db.select().from(crmLeads).where(eq(crmLeads.id, id)).limit(1);
    return lead;
  }

  async getLeadDetail(id: string): Promise<CrmLeadDetail | undefined> {
    const lead = await this.getLeadById(id);
    if (!lead) return undefined;
    const [notes, tasks] = await Promise.all([
      this.listNotes(id),
      this.listTasks(id),
    ]);
    return { ...lead, notes, tasks };
  }

  async findDuplicateLead(data: Pick<InsertCrmLead, "email" | "phone">): Promise<CrmLead | undefined> {
    const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    const phone = typeof data.phone === "string" ? data.phone.trim() : "";
    if (email) {
      const [lead] = await db
        .select()
        .from(crmLeads)
        .where(sql`lower(${crmLeads.email}) = ${email}`)
        .limit(1);
      if (lead) return lead;
    }
    if (phone) {
      const [lead] = await db.select().from(crmLeads).where(eq(crmLeads.phone, phone)).limit(1);
      if (lead) return lead;
    }
    return undefined;
  }

  async createLead(data: InsertCrmLead): Promise<CrmLead> {
    const [lead] = await db.insert(crmLeads).values(data).returning();
    return lead;
  }

  async updateLead(id: string, data: Partial<InsertCrmLead>): Promise<CrmLead | undefined> {
    const [lead] = await db
      .update(crmLeads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(crmLeads.id, id))
      .returning();
    return lead;
  }

  async listNotes(leadId: string): Promise<CrmLeadNote[]> {
    return db
      .select()
      .from(crmLeadNotes)
      .where(eq(crmLeadNotes.leadId, leadId))
      .orderBy(desc(crmLeadNotes.createdAt));
  }

  async createNote(data: InsertCrmLeadNote): Promise<CrmLeadNote> {
    const [note] = await db.insert(crmLeadNotes).values(data).returning();
    return note;
  }

  async listTasks(leadId: string): Promise<CrmLeadTask[]> {
    return db
      .select()
      .from(crmLeadTasks)
      .where(eq(crmLeadTasks.leadId, leadId))
      .orderBy(crmLeadTasks.completed, crmLeadTasks.dueAt, desc(crmLeadTasks.createdAt));
  }

  async createTask(data: InsertCrmLeadTask): Promise<CrmLeadTask> {
    const [task] = await db.insert(crmLeadTasks).values(data).returning();
    return task;
  }

  async updateTask(id: string, data: Partial<InsertCrmLeadTask>): Promise<CrmLeadTask | undefined> {
    const [task] = await db
      .update(crmLeadTasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(crmLeadTasks.id, id))
      .returning();
    return task;
  }
}

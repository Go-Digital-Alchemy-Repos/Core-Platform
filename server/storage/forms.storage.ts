import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  cmsForms,
  cmsFormSubmissions,
  type CmsForm,
  type CmsFormSubmission,
  type InsertCmsForm,
  type InsertCmsFormSubmission,
} from "@shared/schema";

function normalizeForm<T extends CmsForm | undefined>(form: T): T {
  if (!form) return form;
  return {
    ...form,
    fields: Array.isArray(form.fields) ? form.fields : [],
    settings: typeof form.settings === "object" && form.settings ? form.settings : {},
  } as T;
}

export class FormsStorage {
  async getAll(): Promise<CmsForm[]> {
    const rows = await db.select().from(cmsForms).orderBy(desc(cmsForms.updatedAt), desc(cmsForms.createdAt));
    return rows.map((row) => normalizeForm(row));
  }

  async getPublicForms(): Promise<CmsForm[]> {
    const rows = await db
      .select()
      .from(cmsForms)
      .where(eq(cmsForms.isActive, true))
      .orderBy(cmsForms.name);
    return rows
      .map((row) => normalizeForm(row))
      .filter((row): row is CmsForm => Boolean(row && row.kind !== "application"));
  }

  async getById(id: string): Promise<CmsForm | undefined> {
    const [form] = await db.select().from(cmsForms).where(eq(cmsForms.id, id)).limit(1);
    return normalizeForm(form);
  }

  async getBySlug(slug: string): Promise<CmsForm | undefined> {
    const [form] = await db.select().from(cmsForms).where(eq(cmsForms.slug, slug)).limit(1);
    return normalizeForm(form);
  }

  async getPublicBySlug(slug: string): Promise<CmsForm | undefined> {
    const [form] = await db
      .select()
      .from(cmsForms)
      .where(and(eq(cmsForms.slug, slug), eq(cmsForms.isActive, true)))
      .limit(1);
    const normalized = normalizeForm(form);
    if (!normalized || normalized.kind === "application") return undefined;
    return normalized;
  }

  async create(data: InsertCmsForm): Promise<CmsForm> {
    const [form] = await db.insert(cmsForms).values(data).returning();
    return normalizeForm(form)!;
  }

  async update(id: string, data: Partial<InsertCmsForm>): Promise<CmsForm | undefined> {
    const [form] = await db
      .update(cmsForms)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cmsForms.id, id))
      .returning();
    return normalizeForm(form);
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await db.delete(cmsForms).where(eq(cmsForms.id, id)).returning({ id: cmsForms.id });
    return deleted.length > 0;
  }

  async createSubmission(data: InsertCmsFormSubmission): Promise<CmsFormSubmission> {
    const [submission] = await db.insert(cmsFormSubmissions).values(data).returning();
    return submission;
  }

  async getSubmissionsByFormId(formId: string): Promise<CmsFormSubmission[]> {
    return db
      .select()
      .from(cmsFormSubmissions)
      .where(eq(cmsFormSubmissions.formId, formId))
      .orderBy(desc(cmsFormSubmissions.createdAt));
  }

  async deleteSubmission(formId: string, submissionId: string): Promise<boolean> {
    const deleted = await db
      .delete(cmsFormSubmissions)
      .where(and(eq(cmsFormSubmissions.formId, formId), eq(cmsFormSubmissions.id, submissionId)))
      .returning({ id: cmsFormSubmissions.id });
    return deleted.length > 0;
  }
}

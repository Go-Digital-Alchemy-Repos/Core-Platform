import { db } from "../db";
import { cmsPages, type CmsPage, type InsertCmsPage } from "@shared/schema";
import { eq, desc, and, lte } from "drizzle-orm";

export class CmsPagesStorage {
  async getAllPages(): Promise<CmsPage[]> {
    return db.select().from(cmsPages).orderBy(desc(cmsPages.updatedAt));
  }

  async getPage(id: string): Promise<CmsPage | undefined> {
    const [page] = await db.select().from(cmsPages).where(eq(cmsPages.id, id));
    return page;
  }

  async getPageBySlug(slug: string): Promise<CmsPage | undefined> {
    const [page] = await db.select().from(cmsPages).where(eq(cmsPages.slug, slug));
    return page;
  }

  async createPage(data: InsertCmsPage): Promise<CmsPage> {
    const [page] = await db.insert(cmsPages).values(data).returning();
    return page;
  }

  async updatePage(id: string, data: Partial<InsertCmsPage>): Promise<CmsPage | undefined> {
    const [page] = await db
      .update(cmsPages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cmsPages.id, id))
      .returning();
    return page;
  }

  async deletePage(id: string): Promise<boolean> {
    const result = await db.delete(cmsPages).where(eq(cmsPages.id, id)).returning();
    return result.length > 0;
  }

  async publishPage(id: string, adminId: string): Promise<CmsPage | undefined> {
    const [page] = await db
      .update(cmsPages)
      .set({ status: "published", publishedAt: new Date(), updatedBy: adminId, updatedAt: new Date() })
      .where(eq(cmsPages.id, id))
      .returning();
    return page;
  }

  async unpublishPage(id: string, adminId: string): Promise<CmsPage | undefined> {
    const [page] = await db
      .update(cmsPages)
      .set({ status: "draft", publishedAt: null, scheduledAt: null, updatedBy: adminId, updatedAt: new Date() })
      .where(eq(cmsPages.id, id))
      .returning();
    return page;
  }

  async schedulePage(id: string, scheduledAt: Date, adminId: string): Promise<CmsPage | undefined> {
    const [page] = await db
      .update(cmsPages)
      .set({ status: "scheduled", scheduledAt, publishedAt: null, updatedBy: adminId, updatedAt: new Date() })
      .where(eq(cmsPages.id, id))
      .returning();
    return page;
  }

  async publishScheduledPages(): Promise<number> {
    const now = new Date();
    const result = await db
      .update(cmsPages)
      .set({ status: "published", publishedAt: now, scheduledAt: null, updatedAt: now })
      .where(and(eq(cmsPages.status, "scheduled"), lte(cmsPages.scheduledAt, now)))
      .returning();
    return result.length;
  }
}

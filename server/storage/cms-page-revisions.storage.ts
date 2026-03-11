import { db } from "../db";
import { cmsPageRevisions, type CmsPageRevision, type InsertCmsPageRevision } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export class CmsPageRevisionsStorage {
  async getRevisions(pageId: string): Promise<CmsPageRevision[]> {
    return db
      .select()
      .from(cmsPageRevisions)
      .where(eq(cmsPageRevisions.pageId, pageId))
      .orderBy(desc(cmsPageRevisions.createdAt))
      .limit(20);
  }

  async createRevision(data: InsertCmsPageRevision): Promise<CmsPageRevision> {
    const [revision] = await db.insert(cmsPageRevisions).values(data).returning();
    return revision;
  }
}

import { db } from "../db";
import { cmsMedia, type CmsMediaAsset, type InsertCmsMedia } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export class CmsMediaStorage {
  async getAllMedia(): Promise<CmsMediaAsset[]> {
    return db.select().from(cmsMedia).orderBy(desc(cmsMedia.createdAt));
  }

  async getMedia(id: string): Promise<CmsMediaAsset | undefined> {
    const [asset] = await db.select().from(cmsMedia).where(eq(cmsMedia.id, id));
    return asset;
  }

  async createMedia(data: InsertCmsMedia): Promise<CmsMediaAsset> {
    const [asset] = await db.insert(cmsMedia).values(data).returning();
    return asset;
  }

  async updateAlt(id: string, alt: string): Promise<CmsMediaAsset | undefined> {
    const [asset] = await db
      .update(cmsMedia)
      .set({ alt })
      .where(eq(cmsMedia.id, id))
      .returning();
    return asset;
  }

  async deleteMedia(id: string): Promise<CmsMediaAsset | undefined> {
    const [asset] = await db.delete(cmsMedia).where(eq(cmsMedia.id, id)).returning();
    return asset;
  }
}

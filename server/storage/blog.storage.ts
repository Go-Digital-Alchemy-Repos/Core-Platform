import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "../db";
import { blogPosts, type BlogPost, type InsertBlogPost } from "@shared/schema";

export class BlogStorage {
  async getPost(id: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return post;
  }

  async getPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
    return post;
  }

  async getPublishedPosts(): Promise<BlogPost[]> {
    return db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, true))
      .orderBy(desc(blogPosts.publishedAt));
  }

  async getAllPosts(): Promise<BlogPost[]> {
    return db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }

  async createPost(data: InsertBlogPost): Promise<BlogPost> {
    const [post] = await db.insert(blogPosts).values(data).returning();
    return post;
  }

  async updatePost(id: string, data: Partial<InsertBlogPost>): Promise<BlogPost | undefined> {
    const [post] = await db
      .update(blogPosts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return post;
  }

  async deletePost(id: string): Promise<boolean> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
    return true;
  }

  async countPosts(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(blogPosts);
    return Number(result[0].count);
  }

  async countPublished(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, true));
    return Number(result[0].count);
  }

  async publishScheduledPosts(): Promise<number> {
    const now = new Date();
    const result = await db
      .update(blogPosts)
      .set({ isPublished: true, publishedAt: now, scheduledAt: null, updatedAt: now })
      .where(
        and(
          eq(blogPosts.isPublished, false),
          sql`${blogPosts.scheduledAt} IS NOT NULL`,
          sql`${blogPosts.scheduledAt} <= ${now}`
        )
      )
      .returning();
    return result.length;
  }

  async getNextScheduledTime(): Promise<Date | null> {
    const [row] = await db
      .select({ scheduledAt: blogPosts.scheduledAt })
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.isPublished, false),
          sql`${blogPosts.scheduledAt} IS NOT NULL`
        )
      )
      .orderBy(sql`${blogPosts.scheduledAt} ASC`)
      .limit(1);
    return row?.scheduledAt ?? null;
  }
}

import { and, desc, eq, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  portfolioProjects,
  type InsertPortfolioProject,
  type PortfolioProject,
} from "@shared/schema";

type PortfolioProjectInsert = typeof portfolioProjects.$inferInsert;

export interface PortfolioProjectFilters {
  q?: string;
  industry?: string;
  category?: string;
  location?: string;
  status?: string;
  featured?: boolean;
  excludeFeatured?: boolean;
  publicOnly?: boolean;
  limit?: number;
}

export class PortfolioStorage {
  async getProjects(filters: PortfolioProjectFilters = {}): Promise<PortfolioProject[]> {
    const conditions = [];
    if (filters.publicOnly) {
      conditions.push(eq(portfolioProjects.status, "published"));
      conditions.push(eq(portfolioProjects.visibility, "public"));
      conditions.push(or(sql`${portfolioProjects.publishedAt} IS NULL`, lte(portfolioProjects.publishedAt, new Date())));
      conditions.push(eq(portfolioProjects.noindex, false));
    }
    if (filters.status && filters.status !== "all") {
      conditions.push(eq(portfolioProjects.status, filters.status as PortfolioProject["status"]));
    }
    if (filters.industry && filters.industry !== "all") {
      conditions.push(eq(portfolioProjects.industry, filters.industry as PortfolioProject["industry"]));
    }
    if (filters.location && filters.location !== "all") {
      conditions.push(eq(portfolioProjects.location, filters.location));
    }
    if (filters.category && filters.category !== "all") {
      conditions.push(sql`${filters.category} = ANY(${portfolioProjects.categories})`);
    }
    if (filters.featured) {
      conditions.push(eq(portfolioProjects.featured, true));
    }
    if (filters.excludeFeatured) {
      conditions.push(eq(portfolioProjects.featured, false));
    }
    if (filters.q?.trim()) {
      const term = `%${filters.q.trim()}%`;
      conditions.push(or(
        ilike(portfolioProjects.title, term),
        ilike(portfolioProjects.subtitle, term),
        ilike(portfolioProjects.location, term),
        ilike(portfolioProjects.clientName, term),
        ilike(portfolioProjects.summary, term),
        ilike(portfolioProjects.description, term),
      ));
    }

    const query = db
      .select()
      .from(portfolioProjects)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(portfolioProjects.sortOrder, desc(portfolioProjects.publishedAt), desc(portfolioProjects.updatedAt));

    if (filters.limit && filters.limit > 0) {
      return query.limit(filters.limit);
    }
    return query;
  }

  async getProject(id: string): Promise<PortfolioProject | undefined> {
    const [project] = await db.select().from(portfolioProjects).where(eq(portfolioProjects.id, id)).limit(1);
    return project;
  }

  async getProjectBySlug(slug: string): Promise<PortfolioProject | undefined> {
    const [project] = await db.select().from(portfolioProjects).where(eq(portfolioProjects.slug, slug)).limit(1);
    return project;
  }

  async getPublicProjectBySlug(slug: string): Promise<PortfolioProject | undefined> {
    const [project] = await db
      .select()
      .from(portfolioProjects)
      .where(and(
        eq(portfolioProjects.slug, slug),
        eq(portfolioProjects.status, "published"),
        eq(portfolioProjects.visibility, "public"),
        or(sql`${portfolioProjects.publishedAt} IS NULL`, lte(portfolioProjects.publishedAt, new Date())),
      ))
      .limit(1);
    return project;
  }

  async getProjectSlugOwner(slug: string): Promise<PortfolioProject | undefined> {
    return this.getProjectBySlug(slug);
  }

  async createProject(data: InsertPortfolioProject): Promise<PortfolioProject> {
    const [project] = await db.insert(portfolioProjects).values(data as PortfolioProjectInsert).returning();
    return project;
  }

  async updateProject(id: string, data: Partial<InsertPortfolioProject>): Promise<PortfolioProject | undefined> {
    const [project] = await db
      .update(portfolioProjects)
      .set({ ...data, updatedAt: new Date() } as Partial<PortfolioProjectInsert>)
      .where(eq(portfolioProjects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: string): Promise<boolean> {
    await db.delete(portfolioProjects).where(eq(portfolioProjects.id, id));
    return true;
  }

  async getFilterOptions(): Promise<{ industries: string[]; categories: string[]; locations: string[] }> {
    const projects = await this.getProjects({ publicOnly: true });
    return {
      industries: Array.from(new Set(projects.map((project) => project.industry).filter(Boolean))).sort(),
      categories: Array.from(new Set(projects.flatMap((project) => project.categories ?? []).filter(Boolean))).sort(),
      locations: Array.from(new Set(projects.map((project) => project.location).filter((value): value is string => Boolean(value)))).sort(),
    };
  }
}

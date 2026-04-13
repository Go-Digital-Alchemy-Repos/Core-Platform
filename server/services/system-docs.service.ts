import { promises as fs } from "fs";
import path from "path";
import { storage } from "../storage";
import { logger } from "../utils/logger";

type SystemDocDefinition = {
  title: string;
  slug: string;
  category: string;
  relativePath: string;
  sortOrder: number;
};

const DOCS_ROOT = path.resolve(process.cwd(), "docs");

const CATEGORY_ORDER: Record<string, number> = {
  "Getting Started": 0,
  "Admin Guides": 1,
  "Architecture": 2,
  "Architecture Decisions": 3,
  "Operations & Recovery": 4,
  "Deployment & Release": 5,
  "API Reference": 6,
  "Engineering Quality": 7,
  "Security": 8,
  "Product & Planning": 9,
  Reference: 10,
};

const ROOT_FILE_CATEGORY_MAP: Record<string, string> = {
  "backend-architecture.md": "Architecture",
  "changelog.md": "Reference",
  "deployment-notes.md": "Deployment & Release",
  "operations.md": "Operations & Recovery",
  "quality-gates.md": "Engineering Quality",
  "roadmap.md": "Product & Planning",
  "stabilization-plan.md": "Engineering Quality",
  "system-backups.md": "Operations & Recovery",
  "technical-debt.md": "Engineering Quality",
  "validation-report.md": "Engineering Quality",
};

function sortSystemDocs(a: SystemDocDefinition, b: SystemDocDefinition) {
  const categoryDiff = (CATEGORY_ORDER[a.category] ?? 999) - (CATEGORY_ORDER[b.category] ?? 999);
  if (categoryDiff !== 0) {
    return categoryDiff;
  }

  const sortDiff = a.sortOrder - b.sortOrder;
  if (sortDiff !== 0) {
    return sortDiff;
  }

  return a.title.localeCompare(b.title);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleFromHeadingOrPath(content: string, relativePath: string) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) {
    return heading;
  }

  return relativePath
    .replace(/\.md$/i, "")
    .split(/[\\/]/)
    .pop()!
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function categoryForRelativePath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");

  if (normalized.startsWith("admin/")) {
    return "Admin Guides";
  }

  if (normalized.startsWith("architecture/")) {
    return "Architecture";
  }

  if (normalized.startsWith("adr/")) {
    return "Architecture Decisions";
  }

  if (normalized.startsWith("runbooks/")) {
    return "Operations & Recovery";
  }

  return ROOT_FILE_CATEGORY_MAP[path.basename(normalized)] ?? "Reference";
}

async function collectMarkdownFiles(dir: string, prefix = ""): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return collectMarkdownFiles(absolutePath, relativePath);
      }

      if (entry.isFile() && entry.name.endsWith(".md")) {
        return [relativePath];
      }

      return [];
    }),
  );

  return files.flat();
}

async function getSystemDocDefinitions(): Promise<SystemDocDefinition[]> {
  const files = await collectMarkdownFiles(DOCS_ROOT);
  const definitions = await Promise.all(
    files.map(async (relativePath) => {
      const absolutePath = path.join(DOCS_ROOT, relativePath);
      const content = await fs.readFile(absolutePath, "utf8");
      const category = categoryForRelativePath(relativePath);
      const categoryBase = (CATEGORY_ORDER[category] ?? 999) * 100;

      return {
        title: titleFromHeadingOrPath(content, relativePath),
        slug: slugify(relativePath),
        category,
        relativePath,
        sortOrder: categoryBase,
      };
    }),
  );

  return definitions.sort(sortSystemDocs).map((definition, index) => ({
    ...definition,
    sortOrder: index + 1,
  }));
}

type EnsureSystemDocsOptions = {
  refreshExisting?: boolean;
};

export async function ensureSystemDocs(options: EnsureSystemDocsOptions = {}) {
  const { refreshExisting = true } = options;
  const definitions = await getSystemDocDefinitions();

  let created = 0;
  let updated = 0;

  for (const definition of definitions) {
    const absolutePath = path.join(DOCS_ROOT, definition.relativePath);
    const content = await fs.readFile(absolutePath, "utf8");
    const existing = await storage.docs.getDocBySlug(definition.slug);

    if (existing) {
      if (refreshExisting) {
        await storage.docs.updateDoc(existing.id, {
          title: definition.title,
          category: definition.category,
          content,
          sortOrder: definition.sortOrder,
        });
        updated += 1;
      }
      continue;
    }

    await storage.docs.createDoc({
      title: definition.title,
      slug: definition.slug,
      category: definition.category,
      content,
      sortOrder: definition.sortOrder,
      isPublished: true,
    });
    created += 1;
  }

  logger.app.info("System documentation synced", {
    total: definitions.length,
    created,
    updated,
  });

  return {
    total: definitions.length,
    created,
    updated,
  };
}

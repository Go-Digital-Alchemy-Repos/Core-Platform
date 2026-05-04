import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./db";
import { logger } from "./utils/logger";
import { sql } from "drizzle-orm";
import path from "path";

async function getMigrationBootstrapState() {
  const journalResult = await db.execute(sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = '__drizzle_migrations'
    ) AS exists
  `);

  const publicTablesResult = await db.execute(sql<{ count: number }>`
    SELECT COUNT(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> '__drizzle_migrations'
  `);

  const journalRow = journalResult.rows[0] as { exists?: boolean } | undefined;
  const publicTablesRow = publicTablesResult.rows[0] as { count?: number } | undefined;

  return {
    hasJournal: Boolean(journalRow?.exists),
    publicTableCount: Number(publicTablesRow?.count ?? 0),
  };
}

async function ensureEventSlugs() {
  await db.execute(sql`
    ALTER TABLE events ADD COLUMN IF NOT EXISTS slug text
  `);

  await db.execute(sql`
    WITH normalized AS (
      SELECT
        id,
        COALESCE(
          NULLIF(
            regexp_replace(
              regexp_replace(
                regexp_replace(lower(trim(title)), '[''"]', '', 'g'),
                '[^a-z0-9]+',
                '-',
                'g'
              ),
              '(^-+|-+$)',
              '',
              'g'
            ),
            ''
          ),
          'event'
        ) AS base_slug
      FROM events
      WHERE slug IS NULL OR slug = ''
    ),
    numbered AS (
      SELECT
        id,
        base_slug,
        row_number() OVER (PARTITION BY base_slug ORDER BY id) AS duplicate_number
      FROM normalized
    )
    UPDATE events
    SET slug = CASE
      WHEN numbered.duplicate_number = 1 THEN numbered.base_slug
      ELSE numbered.base_slug || '-' || numbered.duplicate_number
    END
    FROM numbered
    WHERE events.id = numbered.id
  `);

  await db.execute(sql`
    ALTER TABLE events ALTER COLUMN slug SET NOT NULL
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS events_slug_unique ON events(slug)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug)
  `);
}

export async function runMigrations() {
  const migrationsFolder = path.resolve(
    process.env.NODE_ENV === "production" ? __dirname : process.cwd(),
    "migrations"
  );

  const bootstrapState = await getMigrationBootstrapState();
  if (bootstrapState.publicTableCount > 0) {
    await ensureEventSlugs();
  }

  if (!bootstrapState.hasJournal && bootstrapState.publicTableCount > 0) {
    logger.app.warn(
      "Skipping startup migrations because the database already has tables but no Drizzle journal. Assuming schema was provisioned via drizzle push."
    );
    return;
  }

  logger.app.info("Running database migrations...");
  try {
    await migrate(db, { migrationsFolder });
    await ensureEventSlugs();
    logger.app.info("Database migrations completed successfully");
  } catch (err) {
    logger.app.error("Database migration failed", err);
    throw err;
  }
}

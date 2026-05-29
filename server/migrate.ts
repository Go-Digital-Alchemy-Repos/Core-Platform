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

async function ensureCrmTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "crm_leads" (
      "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" text NOT NULL,
      "email" text,
      "phone" text,
      "company" text,
      "message" text,
      "stage" text NOT NULL DEFAULT 'new',
      "source" text NOT NULL DEFAULT 'manual',
      "external_id" text,
      "form_submission_id" varchar REFERENCES "cms_form_submissions"("id") ON DELETE SET NULL,
      "form_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "owner_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
      "next_follow_up_at" timestamp,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_leads_stage" ON "crm_leads" ("stage")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_leads_email" ON "crm_leads" ("email")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_leads_phone" ON "crm_leads" ("phone")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_leads_source" ON "crm_leads" ("source")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_leads_created_at" ON "crm_leads" ("created_at")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_leads_owner" ON "crm_leads" ("owner_id")`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "crm_lead_notes" (
      "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      "lead_id" varchar NOT NULL REFERENCES "crm_leads"("id") ON DELETE CASCADE,
      "body" text NOT NULL,
      "created_by_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
      "created_at" timestamp DEFAULT now()
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_lead_notes_lead_id" ON "crm_lead_notes" ("lead_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_lead_notes_created_at" ON "crm_lead_notes" ("created_at")`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "crm_lead_tasks" (
      "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      "lead_id" varchar NOT NULL REFERENCES "crm_leads"("id") ON DELETE CASCADE,
      "title" text NOT NULL,
      "due_at" timestamp,
      "completed" boolean NOT NULL DEFAULT false,
      "assigned_to_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
      "created_by_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_lead_tasks_lead_id" ON "crm_lead_tasks" ("lead_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_lead_tasks_due_at" ON "crm_lead_tasks" ("due_at")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_lead_tasks_completed" ON "crm_lead_tasks" ("completed")`);
}

export async function runMigrations() {
  const migrationsFolder = path.resolve(
    process.env.NODE_ENV === "production" ? __dirname : process.cwd(),
    "migrations"
  );

  const bootstrapState = await getMigrationBootstrapState();
  if (bootstrapState.publicTableCount > 0) {
    await ensureEventSlugs();
    await ensureCrmTables();
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
    await ensureCrmTables();
    logger.app.info("Database migrations completed successfully");
  } catch (err) {
    logger.app.error("Database migration failed", err);
    throw err;
  }
}

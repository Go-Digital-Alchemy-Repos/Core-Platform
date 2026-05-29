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

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "crm_clients" (
      "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      "source_lead_id" varchar UNIQUE REFERENCES "crm_leads"("id") ON DELETE SET NULL,
      "name" text NOT NULL,
      "email" text,
      "phone" text,
      "company" text,
      "client_type" text NOT NULL DEFAULT 'individual',
      "primary_email" text,
      "secondary_email" text,
      "primary_phone" text,
      "alternate_phone" text,
      "preferred_contact_method" text NOT NULL DEFAULT 'no_preference',
      "address_line_1" text,
      "address_line_2" text,
      "city" text,
      "region" text,
      "postal_code" text,
      "country" text,
      "company_name" text,
      "legal_name" text,
      "website" text,
      "industry" text,
      "company_size" text,
      "business_type" text,
      "company_phone" text,
      "company_email" text,
      "billing_contact_name" text,
      "billing_email" text,
      "billing_phone" text,
      "account_owner_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
      "onboarding_status" text NOT NULL DEFAULT 'not_started',
      "service_start_date" timestamp,
      "renewal_date" timestamp,
      "client_since" timestamp,
      "internal_tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "status" text NOT NULL DEFAULT 'onboarding',
      "source" text NOT NULL DEFAULT 'manual',
      "form_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "owner_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
      "next_follow_up_at" timestamp,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    )
  `);

  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "client_type" text NOT NULL DEFAULT 'individual'`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "primary_email" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "secondary_email" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "primary_phone" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "alternate_phone" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "preferred_contact_method" text NOT NULL DEFAULT 'no_preference'`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "address_line_1" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "address_line_2" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "city" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "region" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "postal_code" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "country" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "company_name" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "legal_name" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "website" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "industry" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "company_size" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "business_type" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "company_phone" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "company_email" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "billing_contact_name" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "billing_email" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "billing_phone" text`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "account_owner_id" varchar REFERENCES "users"("id") ON DELETE SET NULL`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "onboarding_status" text NOT NULL DEFAULT 'not_started'`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "service_start_date" timestamp`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "renewal_date" timestamp`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "client_since" timestamp`);
  await db.execute(sql`ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "internal_tags" jsonb NOT NULL DEFAULT '[]'::jsonb`);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_clients_source_lead" ON "crm_clients" ("source_lead_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_clients_status" ON "crm_clients" ("status")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_clients_email" ON "crm_clients" ("email")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_clients_phone" ON "crm_clients" ("phone")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_clients_client_type" ON "crm_clients" ("client_type")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_clients_company_name" ON "crm_clients" ("company_name")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_clients_account_owner" ON "crm_clients" ("account_owner_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_clients_owner" ON "crm_clients" ("owner_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_clients_created_at" ON "crm_clients" ("created_at")`);

  await db.execute(sql`
    UPDATE "crm_clients"
    SET
      "client_type" = CASE WHEN NULLIF(trim(COALESCE("company", '')), '') IS NULL THEN 'individual' ELSE 'business' END,
      "primary_email" = COALESCE("primary_email", "email"),
      "primary_phone" = COALESCE("primary_phone", "phone"),
      "company_name" = COALESCE("company_name", "company"),
      "client_since" = COALESCE("client_since", "created_at"),
      "preferred_contact_method" = CASE
        WHEN "preferred_contact_method" IS NOT NULL AND "preferred_contact_method" <> 'no_preference' THEN "preferred_contact_method"
        WHEN NULLIF(trim(COALESCE("email", '')), '') IS NOT NULL THEN 'email'
        WHEN NULLIF(trim(COALESCE("phone", '')), '') IS NOT NULL THEN 'phone'
        ELSE 'no_preference'
      END
    WHERE "primary_email" IS NULL
       OR "primary_phone" IS NULL
       OR "company_name" IS NULL
       OR "client_since" IS NULL
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "crm_client_notes" (
      "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      "client_id" varchar NOT NULL REFERENCES "crm_clients"("id") ON DELETE CASCADE,
      "body" text NOT NULL,
      "created_by_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
      "created_at" timestamp DEFAULT now()
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_client_notes_client_id" ON "crm_client_notes" ("client_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_client_notes_created_at" ON "crm_client_notes" ("created_at")`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "crm_client_tasks" (
      "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      "client_id" varchar NOT NULL REFERENCES "crm_clients"("id") ON DELETE CASCADE,
      "title" text NOT NULL,
      "due_at" timestamp,
      "completed" boolean NOT NULL DEFAULT false,
      "assigned_to_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
      "created_by_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_client_tasks_client_id" ON "crm_client_tasks" ("client_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_client_tasks_due_at" ON "crm_client_tasks" ("due_at")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_crm_client_tasks_completed" ON "crm_client_tasks" ("completed")`);
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

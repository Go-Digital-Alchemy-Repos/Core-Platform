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

export async function runMigrations() {
  const migrationsFolder = path.resolve(
    process.env.NODE_ENV === "production" ? __dirname : process.cwd(),
    "migrations"
  );

  const bootstrapState = await getMigrationBootstrapState();
  if (!bootstrapState.hasJournal && bootstrapState.publicTableCount > 0) {
    logger.app.warn(
      "Skipping startup migrations because the database already has tables but no Drizzle journal. Assuming schema was provisioned via drizzle push."
    );
    return;
  }

  logger.app.info("Running database migrations...");
  try {
    await migrate(db, { migrationsFolder });
    logger.app.info("Database migrations completed successfully");
  } catch (err) {
    logger.app.error("Database migration failed", err);
    throw err;
  }
}

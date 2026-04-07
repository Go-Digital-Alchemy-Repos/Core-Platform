import { db } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "../utils/logger";

let searchIndexReady = false;

export function isSearchIndexReady(): boolean {
  return searchIndexReady;
}

export async function initSearchIndex() {
  try {
    const columnCheck = await db.execute(sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'therapist_profiles' AND column_name = 'search_vector'
    `);

    if (columnCheck.rows.length > 0) {
      searchIndexReady = true;
      logger.app.info("Full-text search index is available");
      return;
    }

    await db.execute(sql`
      ALTER TABLE therapist_profiles ADD COLUMN search_vector tsvector
    `);

    await db.execute(sql`
      CREATE OR REPLACE FUNCTION therapist_search_vector_update() RETURNS trigger AS $$
      DECLARE
        u_first text;
        u_last text;
      BEGIN
        SELECT first_name, last_name INTO u_first, u_last
        FROM users WHERE id = NEW.user_id;

        NEW.search_vector := to_tsvector('simple',
          coalesce(u_first || ' ' || u_last, '') || ' ' ||
          coalesce(NEW.title, '') || ' ' ||
          coalesce(NEW.city, '') || ' ' ||
          coalesce(NEW.country, '') || ' ' ||
          coalesce(array_to_string(NEW.specializations, ' '), '') || ' ' ||
          coalesce(array_to_string(NEW.languages, ' '), '')
        );
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql
    `);

    await db.execute(sql`
      DROP TRIGGER IF EXISTS trg_therapist_search_vector ON therapist_profiles
    `);

    await db.execute(sql`
      CREATE TRIGGER trg_therapist_search_vector
      BEFORE INSERT OR UPDATE ON therapist_profiles
      FOR EACH ROW EXECUTE FUNCTION therapist_search_vector_update()
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_tp_search_vector_gin
      ON therapist_profiles USING gin(search_vector)
    `);

    await db.execute(sql`
      UPDATE therapist_profiles SET search_vector = to_tsvector('simple',
        coalesce((SELECT first_name || ' ' || last_name FROM users WHERE id = therapist_profiles.user_id), '') || ' ' ||
        coalesce(title, '') || ' ' ||
        coalesce(city, '') || ' ' ||
        coalesce(country, '') || ' ' ||
        coalesce(array_to_string(specializations, ' '), '') || ' ' ||
        coalesce(array_to_string(languages, ' '), '')
      )
      WHERE search_vector IS NULL
    `);

    searchIndexReady = true;
    logger.app.info("Full-text search index initialized successfully");
  } catch (err) {
    searchIndexReady = false;
    logger.app.error("Failed to initialize search index — text search will fall back to ILIKE", err);
  }
}

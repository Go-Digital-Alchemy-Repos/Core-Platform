import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
const fixtureUrl = process.env.CRM_PROFILE_MIGRATION_TEST_DATABASE_URL;
if (fixtureUrl) {
  const url = new URL(fixtureUrl);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/core_crm_profile_test" ||
    url.search ||
    url.hash
  )
    throw new Error("Owned local profile-migration fixture required");
}
vi.mock("./db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({
    connectionString: process.env.CRM_PROFILE_MIGRATION_TEST_DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
    statement_timeout: 10000,
  });
  return { pool, db: drizzle(pool, { schema }) };
});
import { pool } from "./db";
import { runMigrations } from "./migrate";
async function legacySchema() {
  await pool.query(
    "DROP TABLE crm_client_custom_field_values,crm_client_notes,crm_client_tasks,crm_clients CASCADE",
  );
  await pool.query(await readFile("migrations/0022_crm_clients.sql", "utf8"));
}
async function row() {
  return (
    await pool.query(
      "SELECT client_type,primary_email,primary_phone,company_name,client_since,preferred_contact_method FROM crm_clients WHERE id='fixture'",
    )
  ).rows[0];
}
describe.skipIf(!fixtureUrl)("CRM profile migration in disposable PostgreSQL", () => {
  beforeEach(async () => {
    await pool.query(
      "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public",
    );
    await runMigrations();
  }, 60000);
  afterAll(async () => {
    await pool.end();
  });
  it("preserves explicit preferences, type, and nullable profile values across two restarts", async () => {
    await pool.query(
      "INSERT INTO crm_clients(id,name,email,phone,company,client_type,preferred_contact_method,client_since) VALUES ('fixture','Synthetic','test@example.test','123','Company','individual','no_preference',NULL)",
    );
    const before = await row();
    await runMigrations();
    await runMigrations();
    expect(await row()).toEqual(before);
    await pool.query(
      "UPDATE crm_clients SET preferred_contact_method='phone',client_since='2020-01-02T03:04:05',primary_email='chosen@example.test'",
    );
    const chosen = await row();
    await runMigrations();
    await runMigrations();
    expect(await row()).toEqual(chosen);
    await Promise.all([runMigrations(), runMigrations()]);
    expect(await row()).toEqual(chosen);
  }, 60000);
  it("backfills genuine pre-profile rows once using the historical schema", async () => {
    await legacySchema();
    await pool.query(
      "INSERT INTO crm_clients(id,name,email,phone,company,created_at) VALUES ('fixture','Synthetic','test@example.test','123','Company','2020-01-02T03:04:05')",
    );
    await runMigrations();
    expect(await row()).toEqual({
      client_type: "business",
      primary_email: "test@example.test",
      primary_phone: "123",
      company_name: "Company",
      client_since: new Date("2020-01-02T03:04:05Z"),
      preferred_contact_method: "email",
    });
    await pool.query(
      "UPDATE crm_clients SET client_type='individual',preferred_contact_method='no_preference',client_since=NULL,primary_email=NULL",
    );
    const chosen = await row();
    await runMigrations();
    await runMigrations();
    expect(await row()).toEqual(chosen);
  }, 60000);
  it("preserves existing profile columns in a partially upgraded legacy schema", async () => {
    await legacySchema();
    await pool.query(
      "ALTER TABLE crm_clients ADD COLUMN client_type text NOT NULL DEFAULT 'individual', ADD COLUMN preferred_contact_method text NOT NULL DEFAULT 'no_preference', ADD COLUMN client_since timestamp",
    );
    await pool.query(
      "INSERT INTO crm_clients(id,name,email,phone,company) VALUES ('fixture','Synthetic','test@example.test','123','Company')",
    );
    await runMigrations();
    expect(await row()).toEqual({
      client_type: "individual",
      primary_email: "test@example.test",
      primary_phone: "123",
      company_name: "Company",
      client_since: null,
      preferred_contact_method: "no_preference",
    });
    const chosen = await row();
    await runMigrations();
    await runMigrations();
    expect(await row()).toEqual(chosen);
  }, 60000);
  it("rolls back newly added profile columns when legacy backfill fails", async () => {
    await legacySchema();
    await pool.query(
      "INSERT INTO crm_clients(id,name,email) VALUES ('fixture','Synthetic','test@example.test')",
    );
    await pool.query(
      "CREATE FUNCTION reject_profile_backfill() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $$; CREATE TRIGGER reject_profile BEFORE UPDATE ON crm_clients FOR EACH ROW EXECUTE FUNCTION reject_profile_backfill()",
    );
    await expect(runMigrations()).rejects.toThrow();
    const columns = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_clients' AND column_name IN ('primary_email','client_type','primary_phone','company_name','client_since','preferred_contact_method')",
    );
    expect(columns.rows).toEqual([]);
    await pool.query(
      "DROP TRIGGER reject_profile ON crm_clients; DROP FUNCTION reject_profile_backfill()",
    );
    await runMigrations();
    expect(await row()).toMatchObject({
      primary_email: "test@example.test",
      preferred_contact_method: "email",
    });
  }, 60000);
});

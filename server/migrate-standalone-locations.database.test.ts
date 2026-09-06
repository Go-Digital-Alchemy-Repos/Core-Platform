import { afterAll, describe, expect, it, vi } from "vitest";
import express from "express";
const fixtureUrl = process.env.STANDALONE_MIGRATION_TEST_DATABASE_URL;
if (fixtureUrl) {
  const url = new URL(fixtureUrl);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/core_standalone_migration_test" ||
    url.search ||
    url.hash
  )
    throw new Error("Owned local standalone-migration fixture required");
}
vi.mock("./db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({
    connectionString: process.env.STANDALONE_MIGRATION_TEST_DATABASE_URL,
    max: 3,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
    statement_timeout: 10000,
  });
  return { pool, db: drizzle(pool, { schema }) };
});
import { pool } from "./db";
import { runMigrations } from "./migrate";
import router from "./routes/admin/therapists.routes";
import { errorHandler } from "./middleware/error-handler";
import { storage } from "./storage";

describe.skipIf(!fixtureUrl)("standalone locations without a Drizzle journal", () => {
  afterAll(async () => {
    await pool.end();
  });
  it("reconciles nullable users and CRM while preserving existing accounts and profile media", async () => {
    await pool.query(
      "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public",
    );
    await runMigrations();
    await pool.query(
      "INSERT INTO users(id,email,password,first_name,last_name,role) VALUES ('existing','synthetic@example.test','unused','Existing','Person','therapist')",
    );
    await pool.query(
      "INSERT INTO therapist_profiles(id,user_id,title) VALUES ('existing-profile','existing','Existing profile')",
    );
    await pool.query(
      "INSERT INTO directory_profile_media(id,profile_id,url) VALUES ('preserved-media','existing-profile','/synthetic-existing.webp')",
    );
    await pool.query(
      "ALTER TABLE therapist_profiles ALTER COLUMN user_id SET NOT NULL; DROP SCHEMA drizzle CASCADE",
    );
    await runMigrations();
    await runMigrations();
    expect(
      (
        await pool.query(
          "SELECT is_nullable FROM information_schema.columns WHERE table_name='therapist_profiles' AND column_name='user_id'",
        )
      ).rows,
    ).toEqual([{ is_nullable: "YES" }]);
    expect(
      (
        await pool.query(
          "SELECT to_regclass('public.crm_custom_field_definitions') IS NOT NULL AS exists",
        )
      ).rows[0].exists,
    ).toBe(true);
    expect(
      (await pool.query("SELECT user_id FROM therapist_profiles WHERE id='existing-profile'")).rows,
    ).toEqual([{ user_id: "existing" }]);
    await pool.query(
      "INSERT INTO system_settings(key,value,category) VALUES ('directory_mode','store_locator','directory_settings') ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,category=EXCLUDED.category",
    );
    const originalFetch = globalThis.fetch;
    let blocked = 0;
    vi.stubGlobal("fetch", (input: string | URL | Request, options?: RequestInit) => {
      const url = new URL(
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
      );
      if (url.hostname !== "127.0.0.1") {
        blocked++;
        throw new Error("External provider blocked by fixture");
      }
      return originalFetch(input, options);
    });
    const app = express();
    app.use(express.json());
    app.use("/profiles", router);
    app.use(errorHandler);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    try {
      const port = (server.address() as { port: number }).port;
      const response = await fetch(`http://127.0.0.1:${port}/profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Synthetic location",
          country: "Testland",
          isApproved: true,
        }),
      });
      expect(response.status).toBe(201);
      const profile = await response.json();
      expect(profile.userId).toBeNull();
      expect(profile.user.firstName).toBe("Synthetic location");
      expect(blocked).toBe(1);
      await pool.query(
        "INSERT INTO directory_profile_media(id,profile_id,url) VALUES ('standalone-media',$1,'/synthetic-standalone.webp')",
        [profile.id],
      );
      const usage = await storage.therapists.getProfileMediaUsage();
      expect(usage.find((item) => item.media.id === "standalone-media")?.user).toBeNull();
      expect(usage.find((item) => item.media.id === "preserved-media")?.media.url).toBe(
        "/synthetic-existing.webp",
      );
      expect((await pool.query("SELECT count(*)::int AS count FROM users")).rows[0].count).toBe(1);
      expect((await storage.therapists.getProfileWithUser(profile.id))?.user.firstName).toBe(
        "Synthetic location",
      );
      expect(
        (await storage.therapists.listProfilesPaginated({ directoryMode: "store_locator" })).total,
      ).toBe(1);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      vi.unstubAllGlobals();
    }
  }, 60000);
});

import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from "vitest";
const testUrl = process.env.EVENT_CONFIGURATION_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/core_event_configuration_test" ||
    url.search ||
    url.hash
  )
    throw new Error("Owned local event configuration fixture required");
}
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({
    connectionString: process.env.EVENT_CONFIGURATION_TEST_DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
  return { pool, db: drizzle(pool, { schema }) };
});
import { pool } from "../db";
import { runMigrations } from "../migrate";
import { readEventConfiguration, saveEventConfiguration } from "./event-configuration.service";
import { defaultEventConfiguration } from "@shared/event-configuration";
describe.skipIf(!testUrl)("event configuration PostgreSQL persistence", () => {
  beforeAll(async () => {
    await runMigrations();
    await runMigrations();
  }, 60000);
  beforeEach(async () => {
    await pool.query("TRUNCATE system_settings,users CASCADE");
    await pool.query(
      "INSERT INTO users(id,email,password,role) VALUES ('event-config-admin','config@example.test','synthetic','admin')",
    );
  });
  afterAll(async () => {
    await pool.end();
  });
  it("returns compatible defaults without a stored setting", async () => {
    expect(await readEventConfiguration()).toEqual(defaultEventConfiguration());
    expect((await pool.query("SELECT * FROM system_settings")).rows).toHaveLength(0);
  });
  it("round trips options, presets, ordering, and audit revision", async () => {
    const config = defaultEventConfiguration();
    config.types.reverse();
    config.types[0].label = "Community gathering";
    config.tags.push({ id: "materials", label: "Materials", archived: false });
    const saved = await saveEventConfiguration(config, "event-config-admin");
    expect(saved.revision).toBe(1);
    expect(await readEventConfiguration()).toEqual(saved);
    expect(
      (
        await pool.query(
          "SELECT details FROM activity_logs WHERE action='event_configuration_updated'",
        )
      ).rows.map((r) => JSON.parse(r.details)),
    ).toEqual([{ previousRevision: 0, revision: 1 }]);
  });
  it("allows exactly one concurrent first save, rejecting stale revision", async () => {
    const left = defaultEventConfiguration();
    left.types[0].label = "Left";
    const right = defaultEventConfiguration();
    right.types[0].label = "Right";
    const results = await Promise.allSettled([
      saveEventConfiguration(left, "event-config-admin"),
      saveEventConfiguration(right, "event-config-admin"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({ reason: { status: 409 } });
    expect((await readEventConfiguration()).revision).toBe(1);
    expect((await pool.query("SELECT * FROM activity_logs")).rows).toHaveLength(1);
  });
  it("rejects stale subsequent writes without losing newer labels", async () => {
    const first = await saveEventConfiguration(defaultEventConfiguration(), "event-config-admin");
    const next = structuredClone(first);
    next.types[0].label = "Updated";
    await saveEventConfiguration(next, "event-config-admin");
    await expect(saveEventConfiguration(first, "event-config-admin")).rejects.toMatchObject({
      status: 409,
    });
    expect((await readEventConfiguration()).types[0].label).toBe("Updated");
  });
  it("rolls back settings when audit insertion fails", async () => {
    await expect(
      saveEventConfiguration(defaultEventConfiguration(), "missing-actor"),
    ).rejects.toThrow();
    expect(await readEventConfiguration()).toEqual(defaultEventConfiguration());
    expect((await pool.query("SELECT * FROM system_settings")).rows).toHaveLength(0);
  });
  it("rejects deletion and canonical delivery remapping but permits safe archival", async () => {
    const first = await saveEventConfiguration(defaultEventConfiguration(), "event-config-admin");
    const removed = structuredClone(first);
    removed.types = removed.types.filter((o) => o.id !== "community_event");
    await expect(saveEventConfiguration(removed, "event-config-admin")).rejects.toMatchObject({
      status: 400,
    });
    const changed = structuredClone(first);
    changed.delivery[0].behavior = "virtual";
    await expect(saveEventConfiguration(changed, "event-config-admin")).rejects.toMatchObject({
      status: 400,
    });
    const archived = structuredClone(first);
    archived.types.find((o) => o.id === "community_event")!.archived = true;
    expect(
      (await saveEventConfiguration(archived, "event-config-admin")).types.find(
        (o) => o.id === "community_event",
      )!.archived,
    ).toBe(true);
  });
});

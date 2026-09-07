import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
vi.mock("../db", () => ({ db: {} }));
import { SettingsStorage } from "../storage/settings.storage";
import {
  readShippingProviderCredentials as read,
  saveShippingProviderCredentials as save,
  shippingCredentialStorageKey as key,
} from "./ecommerce-shipping-credentials.service";
import { getShippingProviderCredentialCategory as category } from "./ecommerce-shipping-provider.service";
const url = process.env.SHIPPING_CREDENTIAL_TEST_DATABASE_URL;
if (url) {
  const parsed = new URL(url);
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.pathname !== "/core_shipping_credentials_test" ||
    parsed.search ||
    parsed.hash
  )
    throw new Error("Dedicated loopback shipping credential fixture required");
}
let pool: pg.Pool;
let settings: SettingsStorage;
describe.skipIf(!url)("shipping credential isolation in PostgreSQL", () => {
  beforeAll(async () => {
    pool = new pg.Pool({
      connectionString: url,
      max: 5,
      connectionTimeoutMillis: 5000,
      query_timeout: 15000,
      statement_timeout: 10000,
    });
    await pool.query(
      "CREATE TABLE system_settings (id varchar PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL UNIQUE, value text NOT NULL, category text NOT NULL, is_secret boolean NOT NULL DEFAULT false, updated_at timestamp DEFAULT now())",
    );
    settings = new SettingsStorage(60_000, drizzle(pool, { schema }));
  });
  beforeEach(async () => {
    await pool.query("TRUNCATE system_settings");
    settings.invalidateAll();
  });
  afterAll(async () => {
    if (pool) await pool.end();
  });
  it("keeps simultaneous providers independent and encrypted at rest", async () => {
    await Promise.all([
      save(settings, "easypost", { apiKey: "synthetic-easy" }),
      save(settings, "shippo", { apiKey: "synthetic-shippo" }),
    ]);
    expect(await read(settings, "easypost")).toEqual({ apiKey: "synthetic-easy" });
    expect(await read(settings, "shippo")).toEqual({ apiKey: "synthetic-shippo" });
    const rows = (await pool.query("SELECT key,value,is_secret FROM system_settings")).rows;
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.is_secret && /^[a-f0-9]{32}:[a-f0-9]+$/.test(row.value))).toBe(
      true,
    );
    expect(JSON.stringify(rows)).not.toContain("synthetic-");
  });
  it("reads legacy values only in their stored category without copying or reassigning them", async () => {
    await settings.upsertSetting("apiKey", "legacy-easy", category("easypost"), true);
    const legacy = (await pool.query("SELECT * FROM system_settings WHERE key='apiKey'")).rows[0];
    expect(await read(settings, "shippo")).toEqual({ apiKey: "" });
    expect(await read(settings, "easypost")).toEqual({ apiKey: "legacy-easy" });
    await save(settings, "shippo", { apiKey: "new-shippo" });
    expect((await pool.query("SELECT * FROM system_settings WHERE key='apiKey'")).rows[0]).toEqual(
      legacy,
    );
    expect(await read(settings, "easypost")).toEqual({ apiKey: "legacy-easy" });
  });
  it("rotates one provider without changing peers and retains omitted/blank fields", async () => {
    await save(settings, "shipstation", { apiKey: "old-key", apiSecret: "old-secret" });
    await save(settings, "dhl_express", {
      apiKey: "dhl-key",
      apiSecret: "dhl-secret",
      accountNumber: "dhl-account",
    });
    await save(settings, "shipstation", {
      apiKey: " new-key ",
      apiSecret: "   ",
      unknown: "ignored",
    });
    expect(await read(settings, "shipstation")).toEqual({
      apiKey: "new-key",
      apiSecret: "old-secret",
    });
    await save(settings, "shipstation", {});
    expect(await read(settings, "dhl_express")).toEqual({
      apiKey: "dhl-key",
      apiSecret: "dhl-secret",
      accountNumber: "dhl-account",
    });
    expect(
      (await pool.query("SELECT count(*)::int AS total FROM system_settings")).rows[0].total,
    ).toBe(5);
  });
  it("gives even an explicitly empty namespaced value precedence over legacy", async () => {
    await settings.upsertSetting("apiKey", "legacy-key", category("easypost"), true);
    await settings.upsertSetting(key("easypost", "apiKey"), "", category("easypost"), true);
    expect(await read(settings, "easypost")).toEqual({ apiKey: "" });
    expect((await save(settings, "easypost", {})).setupFields[0].hasValue).toBe(false);
  });
  it("rolls back every field and retains the committed cache on batch failure", async () => {
    await save(settings, "shipstation", { apiKey: "old-key", apiSecret: "old-secret" });
    await read(settings, "shipstation");
    const before = (await pool.query("SELECT * FROM system_settings ORDER BY key")).rows;
    await pool.query(
      `CREATE FUNCTION fixture_reject_rotation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.key = '${key("shipstation", "apiSecret")}' THEN RAISE EXCEPTION 'synthetic-write-rejected'; END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_reject_rotation BEFORE INSERT OR UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION fixture_reject_rotation()`,
    );
    try {
      await expect(
        save(settings, "shipstation", { apiKey: "new-key", apiSecret: "new-secret" }),
      ).rejects.toThrow();
      expect((await pool.query("SELECT * FROM system_settings ORDER BY key")).rows).toEqual(before);
      expect(await read(settings, "shipstation")).toEqual({
        apiKey: "old-key",
        apiSecret: "old-secret",
      });
    } finally {
      await pool.query(
        "DROP TRIGGER fixture_reject_rotation ON system_settings; DROP FUNCTION fixture_reject_rotation()",
      );
    }
  });
  it("returns only public field metadata, never credentials or internal storage keys", async () => {
    const response = await save(settings, "shipstation", {
      apiKey: "sensitive-key",
      apiSecret: "sensitive-secret",
    });
    expect(response).toEqual({
      provider: "shipstation",
      setupFields: [
        { key: "apiKey", label: "API key", secret: true, hasValue: true },
        { key: "apiSecret", label: "API secret", secret: true, hasValue: true },
      ],
    });
    expect(JSON.stringify(response)).not.toMatch(/sensitive|ecommerce_shipping_provider/);
  });
});

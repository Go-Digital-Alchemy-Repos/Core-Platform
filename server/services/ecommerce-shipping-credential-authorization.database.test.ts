import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
vi.mock("../db", () => ({ db: {} }));
const invalidate = vi.hoisted(() => vi.fn());
vi.mock("../storage/index", () => ({ storage: { settings: { invalidateAll: invalidate } } }));
import { SettingsStorage } from "../storage/settings.storage";
import {
  readEasyPostQuoteAuthorizationReadiness as readiness,
  EASYPOST_CREDENTIAL_KEYS as keys,
  EASYPOST_CREDENTIAL_LOCK,
  rotateEasyPostCredentials as rotate,
  approveEasyPostTestGeneration as approve,
  readAuthorizedEasyPostTestCredentials as read,
  recheckEasyPostTestGeneration as recheck,
  saveEasyPostProviderConfiguration as configure,
} from "./ecommerce-shipping-credential-authorization.service";
const url = process.env.SHIPPING_AUTHORIZATION_TEST_DATABASE_URL;
if (url) {
  const u = new URL(url);
  if (
    !["postgres:", "postgresql:"].includes(u.protocol) ||
    u.hostname !== "127.0.0.1" ||
    u.pathname !== "/core_shipping_authorization_test" ||
    u.search ||
    u.hash
  )
    throw new Error("Dedicated loopback shipping authorization fixture required");
}
let pool: pg.Pool, database: typeof import("../db").db;
const config = (active = true, testMode = true) =>
  configure(database, {
    provider: "easypost",
    displayName: "EasyPost",
    type: "aggregator",
    active,
    testMode,
  });
const claim = () => database.transaction(read);
async function initialized() {
  await config();
  const generation = (await rotate(database, "synthetic-test-key"))!;
  await approve(database, generation);
  return generation;
}
async function waitForLocks(count: number) {
  for (let i = 0; i < 300; i++) {
    const result = await pool.query(
      "SELECT count(*)::int AS total FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'",
    );
    if (result.rows[0].total >= count) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Expected transaction lock wait did not occur");
}
const settle = <T>(promise: Promise<T>) =>
  promise.then(
    (value) => ({ value, error: null as unknown }),
    (error) => ({ value: undefined, error }),
  );
describe.skipIf(!url)("EasyPost approved test generation PostgreSQL", () => {
  beforeAll(async () => {
    pool = new pg.Pool({
      connectionString: url,
      max: 8,
      connectionTimeoutMillis: 5000,
      query_timeout: 15000,
      statement_timeout: 10000,
    });
    database = drizzle(pool, { schema });
    await pool.query(
      "CREATE TABLE system_settings(id varchar PRIMARY KEY DEFAULT gen_random_uuid(),key text NOT NULL UNIQUE,value text NOT NULL,category text NOT NULL,is_secret boolean NOT NULL DEFAULT false,updated_at timestamp DEFAULT now());CREATE TABLE ecommerce_shipping_providers(id varchar PRIMARY KEY DEFAULT gen_random_uuid(),provider text NOT NULL UNIQUE,display_name text NOT NULL,type text NOT NULL DEFAULT 'aggregator',capabilities text[] NOT NULL DEFAULT '{}',settings jsonb NOT NULL DEFAULT '{}',test_mode boolean NOT NULL DEFAULT true,active boolean NOT NULL DEFAULT false,connected_at timestamp,created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now())",
    );
  });
  beforeEach(async () => {
    await pool.query("TRUNCATE system_settings,ecommerce_shipping_providers");
    invalidate.mockClear();
  });
  afterAll(async () => {
    if (pool) await pool.end();
  });
  it("reports uncached public readiness without disclosing credentials or generations", async () => {
    const status = () => database.transaction(readiness);
    expect((await status()).reasonCode).toBe("not_configured");
    await config();
    const generation = (await rotate(database, "readiness-private-key"))!;
    expect(await status()).toMatchObject({
      configured: true,
      approvedTestCredentials: false,
      enabled: false,
      reasonCode: "test_approval_required",
    });
    await approve(database, generation);
    expect(await status()).toMatchObject({
      configured: true,
      approvedTestCredentials: true,
      enabled: true,
      reasonCode: null,
    });
    await config(false);
    expect((await status()).reasonCode).toBe("provider_inactive");
    await config(true, false);
    expect((await status()).reasonCode).toBe("production_mode");
    expect(JSON.stringify(await status())).not.toMatch(/private-key|credentialGeneration|apiKey/);
    await pool.query("DELETE FROM ecommerce_shipping_providers");
    expect((await status()).reasonCode).toBe("provider_inactive");
  });
  it("requires explicit approval and rotates key/generation/approval as one committed set", async () => {
    await config();
    const first = (await rotate(database, " first-key "))!;
    await expect(claim()).rejects.toMatchObject({ code: "credentials_unapproved" });
    await approve(database, first);
    expect(await claim()).toEqual({
      provider: "easypost",
      mode: "test",
      apiKey: "first-key",
      credentialGenerationId: first,
      approvedCredentialGenerationId: first,
    });
    const next = await rotate(database, "second-key");
    expect(next).not.toBe(first);
    await expect(claim()).rejects.toMatchObject({ code: "credentials_unapproved" });
    await expect(approve(database, first)).rejects.toMatchObject({
      code: "credential_generation_changed",
    });
    expect(
      (await pool.query("SELECT value FROM system_settings WHERE key=$1", [keys.approval])).rows[0]
        .value,
    ).toBe("");
    expect(await rotate(database, "   ")).toBeNull();
    expect(
      (await pool.query("SELECT value FROM system_settings WHERE key=$1", [keys.generation]))
        .rows[0].value,
    ).toBe(next);
  });
  it("never authorizes a legacy value or an existing namespaced key without generation approval", async () => {
    await config();
    const storage = new SettingsStorage(60000, database);
    await storage.upsertSetting("apiKey", "legacy", "ecommerce_shipping_provider_easypost", true);
    await expect(claim()).rejects.toMatchObject({ code: "credential_configuration_invalid" });
    await storage.upsertSetting(
      keys.apiKey,
      "legacy",
      "ecommerce_shipping_provider_easypost",
      true,
    );
    await expect(claim()).rejects.toMatchObject({ code: "credential_configuration_invalid" });
  });
  it("reads uncached committed state even while a separate settings instance retains an old key", async () => {
    const old = await initialized();
    const cached = new SettingsStorage(60000, database);
    const warm = await cached.getDecryptedCategory("ecommerce_shipping_provider_easypost");
    const next = (await rotate(database, "new-key"))!;
    await approve(database, next);
    expect(
      (await cached.getDecryptedCategory("ecommerce_shipping_provider_easypost"))[keys.apiKey],
    ).toBe(warm[keys.apiKey]);
    expect((await claim()).apiKey).toBe("new-key");
    await expect(database.transaction((tx) => recheck(tx, old))).rejects.toMatchObject({
      code: "credential_generation_changed",
    });
  });
  it.each([
    [false, true, "provider_inactive"],
    [true, false, "provider_not_test"],
  ] as const)("rejects active=%s testMode=%s", async (active, testMode, code) => {
    await initialized();
    await config(active, testMode);
    await expect(claim()).rejects.toMatchObject({ code });
  });
  it.each([
    [false, "raw-secret"],
    [true, "malformed-ciphertext"],
  ] as const)("rejects unsafe key storage isSecret=%s", async (isSecret, value) => {
    await initialized();
    await pool.query("UPDATE system_settings SET value=$1,is_secret=$2 WHERE key=$3", [
      value,
      isSecret,
      keys.apiKey,
    ]);
    await expect(claim()).rejects.toMatchObject({ code: "credential_configuration_invalid" });
  });
  it("rolls back key and generation when clearing approval fails, without cache invalidation", async () => {
    await initialized();
    const before = (await pool.query("SELECT * FROM system_settings ORDER BY key")).rows;
    const invalidations = invalidate.mock.calls.length;
    await pool.query(
      `CREATE FUNCTION fail_approval_clear() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.key='${keys.approval}' AND NEW.value='' THEN RAISE EXCEPTION 'synthetic-rotation-failure'; END IF; RETURN NEW; END $$;CREATE TRIGGER fail_approval_clear BEFORE INSERT OR UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION fail_approval_clear()`,
    );
    try {
      await expect(rotate(database, "new-private-key")).rejects.toMatchObject({
        code: "credential_write_failed",
      });
      expect((await pool.query("SELECT * FROM system_settings ORDER BY key")).rows).toEqual(before);
      expect(invalidate.mock.calls.length).toBe(invalidations);
      expect((await claim()).apiKey).toBe("synthetic-test-key");
    } finally {
      await pool.query(
        "DROP TRIGGER fail_approval_clear ON system_settings;DROP FUNCTION fail_approval_clear()",
      );
    }
  });
  it("serializes a claim before rotation while preserving the already-captured generation", async () => {
    const old = await initialized();
    let ready!: () => void, release!: () => void;
    const entered = new Promise<void>((r) => (ready = r)),
      gate = new Promise<void>((r) => (release = r));
    const captured = database.transaction(async (tx) => {
      const result = await read(tx);
      ready();
      await gate;
      return result;
    });
    await entered;
    const rotation = rotate(database, "replacement");
    try {
      await waitForLocks(1);
    } finally {
      release();
    }
    expect((await captured).credentialGenerationId).toBe(old);
    const next = await rotation;
    expect(next).not.toBe(old);
    await expect(claim()).rejects.toMatchObject({ code: "credentials_unapproved" });
  });
  it.each(["rotation", "deactivation", "approval"] as const)(
    "serializes %s against a waiting claim or stale approval",
    async (operation) => {
      const old = await initialized();
      const blocker = await pool.connect();
      let first: Promise<unknown> | undefined, second: ReturnType<typeof settle> | undefined;
      try {
        await blocker.query("BEGIN");
        await blocker.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          EASYPOST_CREDENTIAL_LOCK,
        ]);
        first = operation === "deactivation" ? config(false) : rotate(database, "replacement");
        await waitForLocks(1);
        second = settle(operation === "approval" ? approve(database, old) : claim());
        await waitForLocks(2);
        await blocker.query("COMMIT");
        await first;
        expect((await second).error).toMatchObject({
          code:
            operation === "deactivation"
              ? "provider_inactive"
              : operation === "approval"
                ? "credential_generation_changed"
                : "credentials_unapproved",
        });
      } finally {
        await blocker.query("ROLLBACK");
        blocker.release();
        await Promise.allSettled([first, second]);
      }
    },
  );
});

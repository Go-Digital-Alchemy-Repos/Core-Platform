import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
vi.mock("../db", () => ({ db: {} }));
vi.mock("../storage/index", () => ({ storage: { settings: { invalidateAll: vi.fn() } } }));
import {
  rotateEasyPostCredentials as rotate,
  approveEasyPostTestGeneration as quoteApprove,
  saveEasyPostProviderConfiguration as provider,
  EASYPOST_CREDENTIAL_KEYS as credentialKeys,
} from "./ecommerce-shipping-credential-authorization.service";
import {
  configureEasyPostLabelAuthorization as configure,
  readEasyPostLabelReadiness as readiness,
  EASYPOST_LABEL_AUTHORIZATION_KEYS as keys,
} from "./ecommerce-shipping-label-authorization.service";
const url = process.env.SHIPPING_LABEL_AUTHORIZATION_TEST_DATABASE_URL;
if (url) {
  const parsed = new URL(url);
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.pathname !== "/core_shipping_label_authorization_test" ||
    parsed.search ||
    parsed.hash
  )
    throw new Error("Dedicated loopback label authorization fixture required");
}
let pool: pg.Pool, database: typeof import("../db").db;
const read = () => database.transaction(readiness);
const request = (generation: string, revision = 0) => ({
  version: 1,
  expectedGenerationId: generation,
  expectedRevision: revision,
  purchaseEnabled: true,
  labelApproval: "grant",
  evidenceReference: "synthetic-owner-approval",
});
async function initialize() {
  await provider(database, {
    provider: "easypost",
    displayName: "EasyPost",
    type: "aggregator",
    active: true,
    testMode: true,
  });
  return (await rotate(database, "synthetic-initial-key"))!;
}
const snapshot = async () =>
  (await pool.query("SELECT key,value FROM system_settings ORDER BY key")).rows;
const logs = async () =>
  (await pool.query("SELECT action,details FROM activity_logs ORDER BY created_at,id")).rows;
describe.skipIf(!url)("label authorization actual PostgreSQL", () => {
  beforeAll(async () => {
    pool = new pg.Pool({
      connectionString: url,
      max: 8,
      connectionTimeoutMillis: 5000,
      query_timeout: 15000,
      statement_timeout: 10000,
    });
    database = drizzle(pool, { schema });
    await pool.query(`CREATE TABLE users(id varchar PRIMARY KEY,role text NOT NULL,is_suspended boolean NOT NULL DEFAULT false);
      CREATE TABLE activity_logs(id varchar PRIMARY KEY DEFAULT gen_random_uuid(),user_id varchar NOT NULL REFERENCES users(id),action text NOT NULL,details text,created_at timestamp DEFAULT now());
      CREATE TABLE system_settings(id varchar PRIMARY KEY DEFAULT gen_random_uuid(),key text NOT NULL UNIQUE,value text NOT NULL,category text NOT NULL,is_secret boolean NOT NULL DEFAULT false,updated_at timestamp DEFAULT now());
      CREATE TABLE ecommerce_shipping_providers(id varchar PRIMARY KEY DEFAULT gen_random_uuid(),provider text NOT NULL UNIQUE,display_name text NOT NULL,type text NOT NULL DEFAULT 'aggregator',capabilities text[] NOT NULL DEFAULT '{}',settings jsonb NOT NULL DEFAULT '{}',test_mode boolean NOT NULL DEFAULT true,active boolean NOT NULL DEFAULT false,connected_at timestamp,created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now());`);
  });
  beforeEach(async () => {
    await pool.query(
      "DROP TRIGGER IF EXISTS reject_audit ON activity_logs; TRUNCATE activity_logs,users,system_settings,ecommerce_shipping_providers; INSERT INTO users(id,role) VALUES ('operator','admin'),('editor','editor')",
    );
  });
  afterAll(async () => {
    await pool?.end();
  });
  it("defaults off and quote approval never implies implemented label buy", async () => {
    const gen = await initialize();
    await quoteApprove(database, gen);
    expect(await read()).toMatchObject({
      implemented: false,
      purchaseActivated: false,
      approvedLabelTestCredentials: false,
      enabled: false,
      authorizationRevision: 0,
    });
    expect(await logs()).toEqual([]);
  });
  it("initializes separate approval with bounded same-transaction audit and no-op replay", async () => {
    const gen = await initialize();
    const result = await configure(database, request(gen), "operator");
    expect(result).toMatchObject({
      implemented: false,
      enabled: false,
      reasonCode: "not_implemented",
      purchaseActivated: true,
      approvedLabelTestCredentials: true,
      authorizationRevision: 1,
    });
    expect(await logs()).toHaveLength(1);
    expect(JSON.stringify(await logs())).not.toContain("synthetic-initial-key");
    await configure(database, request(gen, 1), "operator");
    expect(await logs()).toHaveLength(1);
    await expect(configure(database, request(gen), "operator")).rejects.toMatchObject({
      code: "authorization_revision_changed",
    });
  });
  it.each([undefined, "missing", "editor"])(
    "rejects missing/ineligible actor %s before rotation writes",
    async (actor) => {
      const gen = await initialize();
      await configure(database, request(gen), "operator");
      const before = await snapshot();
      await expect(rotate(database, "synthetic-next-key", actor)).rejects.toMatchObject({
        code: "credential_write_failed",
      });
      expect(await snapshot()).toEqual(before);
      expect(await logs()).toHaveLength(1);
    },
  );
  it("rotation clears both approvals, increments revision and records invalidation atomically", async () => {
    const gen = await initialize();
    await quoteApprove(database, gen);
    await configure(database, request(gen), "operator");
    const next = await rotate(database, "synthetic-next-key", "operator");
    expect(next).not.toBe(gen);
    expect(await read()).toMatchObject({
      purchaseActivated: true,
      approvedLabelTestCredentials: false,
      authorizationRevision: 2,
      enabled: false,
    });
    const rows = await snapshot();
    expect(rows.find((row) => row.key === credentialKeys.approval).value).toBe("");
    const event = (await logs()).find(
      (row) => row.action === "shipping_label_approval_invalidated",
    );
    expect(JSON.parse(event.details)).toMatchObject({
      previousCredentialGenerationId: gen,
      credentialGenerationId: next,
      previousRevision: 1,
      revision: 2,
    });
  });
  it("can replace unreadable old ciphertext without decrypting it for audit", async () => {
    const gen = await initialize();
    await configure(database, request(gen), "operator");
    await pool.query("UPDATE system_settings SET value='corrupt-old-ciphertext' WHERE key=$1", [
      credentialKeys.apiKey,
    ]);
    const next = await rotate(database, "synthetic-replacement-key", "operator");
    expect(next).not.toBe(gen);
    expect(await read()).toMatchObject({
      configured: true,
      approvedLabelTestCredentials: false,
      authorizationRevision: 2,
    });
    const event = (await logs()).find(
      (row) => row.action === "shipping_label_approval_invalidated",
    );
    expect(JSON.parse(event.details)).toMatchObject({
      previousCredentialGenerationId: gen,
      credentialGenerationId: next,
    });
    expect(JSON.stringify(await logs())).not.toMatch(/corrupt-old|replacement-key/);
  });
  it("blank key is a complete no-op even without actor", async () => {
    const gen = await initialize();
    await configure(database, request(gen), "operator");
    const before = await snapshot();
    expect(await rotate(database, " ")).toBeNull();
    expect(await snapshot()).toEqual(before);
    expect(await logs()).toHaveLength(1);
  });
  it("audit failure rolls back both configuration and rotation", async () => {
    const gen = await initialize();
    await pool.query(
      "CREATE OR REPLACE FUNCTION fail_label_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic-audit-failure'; END $$; CREATE TRIGGER reject_audit BEFORE INSERT ON activity_logs FOR EACH ROW EXECUTE FUNCTION fail_label_audit()",
    );
    const before = await snapshot();
    await expect(configure(database, request(gen), "operator")).rejects.toMatchObject({
      code: "authorization_unavailable",
    });
    expect(await snapshot()).toEqual(before);
    await pool.query("DROP TRIGGER reject_audit ON activity_logs");
    await configure(database, request(gen), "operator");
    await pool.query(
      "CREATE TRIGGER reject_audit BEFORE INSERT ON activity_logs FOR EACH ROW EXECUTE FUNCTION fail_label_audit()",
    );
    const initialized = await snapshot();
    await expect(rotate(database, "synthetic-next-key", "operator")).rejects.toMatchObject({
      code: "credential_write_failed",
    });
    expect(await snapshot()).toEqual(initialized);
    expect(await logs()).toHaveLength(1);
  });
  it("serializes competing revision updates to one audit winner", async () => {
    const gen = await initialize();
    const outcomes = await Promise.allSettled([
      configure(database, request(gen), "operator"),
      configure(database, { ...request(gen), purchaseEnabled: false }, "operator"),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    expect(await logs()).toHaveLength(1);
    expect((await read()).authorizationRevision).toBe(1);
  });
  it("rotation versus grant cannot leave stale generation authorized", async () => {
    const gen = await initialize();
    await configure(database, request(gen), "operator");
    await Promise.allSettled([
      rotate(database, "synthetic-next-key", "operator"),
      configure(database, { ...request(gen, 1), purchaseEnabled: false }, "operator"),
    ]);
    expect((await read()).approvedLabelTestCredentials).toBe(false);
    expect((await snapshot()).find((row) => row.key === keys.approval).value).toBe("");
  });
  it.each(["malformed", "misclassified", "exhausted"])(
    "fails closed on %s persisted label state",
    async (kind) => {
      const gen = await initialize();
      await configure(database, request(gen), "operator");
      if (kind === "malformed")
        await pool.query("UPDATE system_settings SET value='yes' WHERE key=$1", [keys.enabled]);
      else if (kind === "misclassified")
        await pool.query("UPDATE system_settings SET category='other' WHERE key=$1", [
          keys.enabled,
        ]);
      else
        await pool.query("UPDATE system_settings SET value='2147483647' WHERE key=$1", [
          keys.revision,
        ]);
      const before = await snapshot();
      await expect(rotate(database, "synthetic-next-key", "operator")).rejects.toMatchObject({
        code: "credential_write_failed",
      });
      expect(await snapshot()).toEqual(before);
      if (kind !== "exhausted")
        await expect(read()).rejects.toMatchObject({ code: "authorization_unavailable" });
    },
  );
  it("rejects grant in production mode but permits explicit revoke", async () => {
    const gen = await initialize();
    await configure(database, request(gen), "operator");
    await pool.query("UPDATE ecommerce_shipping_providers SET test_mode=false");
    await expect(configure(database, request(gen, 1), "operator")).rejects.toMatchObject({
      code: "provider_not_test",
    });
    await configure(
      database,
      { ...request(gen, 1), labelApproval: "revoke", purchaseEnabled: false },
      "operator",
    );
    expect((await read()).approvedLabelTestCredentials).toBe(false);
  });
});

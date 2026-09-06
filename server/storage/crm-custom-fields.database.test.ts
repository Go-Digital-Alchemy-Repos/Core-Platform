import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
const testUrl = process.env.CRM_CUSTOM_FIELDS_TEST_DATABASE_URL;
function assertDisposableDatabaseUrl(value: string) {
  const url = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.search ||
    url.hash ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.pathname !== "/core_crm_custom_fields_test"
  )
    throw new Error("Use only local disposable core_crm_custom_fields_test");
}
if (testUrl) assertDisposableDatabaseUrl(testUrl);
it.each([
  "postgresql://127.0.0.1/core_crm_custom_fields_test?host=remote.example",
  "postgresql://127.0.0.1/core_crm_custom_fields_test#fragment",
  "https://127.0.0.1/core_crm_custom_fields_test",
  "postgresql://remote.example/core_crm_custom_fields_test",
  "postgresql://127.0.0.1/production",
])("rejects unsafe disposable database URL %s", (value) => {
  expect(() => assertDisposableDatabaseUrl(value)).toThrow();
});
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({
    connectionString: process.env.CRM_CUSTOM_FIELDS_TEST_DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
    statement_timeout: 10000,
  });
  return { pool, db: drizzle(pool, { schema }) };
});
vi.mock("../utils/logger", () => ({
  logger: { app: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } },
}));
import { db, pool } from "../db";
import { runMigrations } from "../migrate";
import { crmClients, insertCrmLeadSchema, insertCrmClientSchema } from "@shared/schema";
import { CrmCustomFieldsStorage } from "./crm-custom-fields.storage";
it("generic CRM creation schemas do not accept server-owned values revisions", () => {
  for (const schema of [insertCrmLeadSchema, insertCrmClientSchema]) {
    expect(schema.parse({ name: "Synthetic", customValuesRevision: 123 })).not.toHaveProperty(
      "customValuesRevision",
    );
  }
});
const storage = new CrmCustomFieldsStorage();
const create = (key = "favorite_color", type = "text", config = {}) =>
  storage.createDefinition({
    key,
    type,
    entityScope: "both",
    config: { version: 1, label: "Field", ...config },
  });
const entry = (field: { id: string; revision: number }, value: unknown) => ({
  definitionId: field.id,
  definitionRevision: field.revision,
  value,
});
describe.skipIf(!testUrl)("CRM custom field persistence in disposable PostgreSQL", () => {
  beforeAll(async () => {
    await runMigrations();
  }, 60000);
  beforeEach(async () => {
    await pool.query("TRUNCATE crm_leads, crm_clients, crm_custom_field_definitions CASCADE");
    await pool.query(
      "INSERT INTO crm_leads(id,name) VALUES ('lead','Synthetic lead'); INSERT INTO crm_clients(id,name) VALUES ('client','Synthetic client')",
    );
  });
  afterAll(async () => {
    await pool.end();
  });
  it("preserves populated legacy rows and jobs when added, and runs twice", async () => {
    await pool.query(
      "UPDATE crm_leads SET metadata = '{\"legacy\":true}', form_data = '{\"old\":\"kept\"}' WHERE id='lead'",
    );
    await pool.query(
      "INSERT INTO cms_forms(id,name,slug) VALUES ('crm-fields-form','Synthetic form','crm-fields-form')",
    );
    await pool.query(
      "INSERT INTO cms_form_submissions(id,form_id,data) VALUES ('crm-fields-submission','crm-fields-form','{\"old\":true}')",
    );
    await pool.query(
      "INSERT INTO cms_form_effect_jobs(id,submission_id,deduplication_key,payload) VALUES ('crm-fields-job','crm-fields-submission','crm_intake','{\"kind\":\"crm_intake\",\"formName\":\"Synthetic\"}')",
    );
    await pool.query(
      "DROP TABLE crm_lead_custom_field_values, crm_client_custom_field_values, crm_custom_field_revisions, crm_custom_field_definitions; ALTER TABLE crm_leads DROP COLUMN custom_values_revision; ALTER TABLE crm_clients DROP COLUMN custom_values_revision; ALTER TABLE cms_forms DROP COLUMN crm_mapping, DROP COLUMN crm_mapping_revision",
    );
    await runMigrations();
    await runMigrations();
    expect(
      (
        await pool.query(
          "SELECT metadata,form_data,custom_values_revision FROM crm_leads WHERE id='lead'",
        )
      ).rows[0],
    ).toEqual({
      metadata: { legacy: true },
      form_data: { old: "kept" },
      custom_values_revision: 0,
    });
    expect(
      (
        await pool.query(
          "SELECT crm_mapping,crm_mapping_revision FROM cms_forms WHERE id='crm-fields-form'",
        )
      ).rows[0],
    ).toEqual({ crm_mapping: null, crm_mapping_revision: 0 });
    expect(
      (
        await pool.query(
          "SELECT status,attempt_count FROM cms_form_effect_jobs WHERE id='crm-fields-job'",
        )
      ).rows[0],
    ).toEqual({ status: "queued", attempt_count: 0 });
  });
  it("writes all scalar types with null/false/zero and historical archive labels", async () => {
    const fields = await Promise.all([
      create(),
      create("count_value", "number"),
      create("date_value", "date"),
      create("flag_value", "boolean"),
      create("choice_value", "choice", {
        choices: [{ key: "blue", label: "Original", archived: false }],
      }),
    ]);
    await storage.writeValues("lead", "lead", {
      expectedRevision: 0,
      values: fields.map((field, n) => entry(field, [null, 0, "0001-01-01", false, "blue"][n])),
    });
    const choice = fields[4];
    await storage.reviseDefinition(choice.id, {
      expectedRevision: 1,
      archived: true,
      config: {
        ...choice.config,
        choices: [{ key: "blue", label: "Archived label", archived: true }],
      },
    });
    const read = await storage.readValues("lead", "lead");
    expect(read.revision).toBe(1);
    expect(read.values.map((row) => row.value)).toEqual(
      expect.arrayContaining([null, 0, "0001-01-01", false, "blue"]),
    );
    const historical = read.values.find((row) => row.definitionId === choice.id)!;
    expect(historical.acceptedConfig.choices[0].label).toBe("Original");
    expect(historical.current.config.choices[0].label).toBe("Archived label");
    await expect(
      storage.writeValues("lead", "lead", {
        expectedRevision: 1,
        values: [entry({ ...choice, revision: 2 }, "blue")],
      }),
    ).rejects.toThrow("field_archived");
    await storage.writeValues("lead", "lead", {
      expectedRevision: 1,
      values: [entry({ ...choice, revision: 2 }, null)],
    });
  });
  it("allows exactly one competing definition revision and retains both versions", async () => {
    const field = await create();
    const results = await Promise.allSettled(
      ["A", "B"].map((label) =>
        storage.reviseDefinition(field.id, {
          expectedRevision: 1,
          archived: false,
          config: { ...field.config, label },
        }),
      ),
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(
      (await pool.query("SELECT count(*)::int AS count FROM crm_custom_field_revisions")).rows[0]
        .count,
    ).toBe(2);
    await expect(
      storage.reviseDefinition(field.id, {
        expectedRevision: 2,
        archived: false,
        key: "different",
        config: field.config,
      }),
    ).rejects.toThrow();
  });
  it("serializes limits so competing creates cannot cross 50 active fields", async () => {
    for (let n = 0; n < 49; n++) await create(`field_${n}`);
    const results = await Promise.allSettled([create("last_one"), create("last_two")]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await storage.listDefinitions()).toHaveLength(50);
  });
  it("serializes record revision checks and does not lose the winning values", async () => {
    const field = await create();
    const results = await Promise.allSettled(
      ["A", "B"].map((value) =>
        storage.writeValues("lead", "lead", { expectedRevision: 0, values: [entry(field, value)] }),
      ),
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect((await storage.readValues("lead", "lead")).revision).toBe(1);
    await expect(
      storage.writeValues("lead", "lead", {
        expectedRevision: 1,
        values: [entry({ ...field, revision: 2 }, "stale")],
      }),
    ).rejects.toThrow("stale_definition_revision");
  });
  it("rejects scope mismatch and applies defaults only for manual create", async () => {
    const field = await storage.createDefinition({
      key: "client_only",
      entityScope: "client",
      type: "boolean",
      config: { version: 1, label: "Flag", requiredOnManualCreate: true, defaultValue: false },
    });
    await expect(
      storage.writeValues("lead", "lead", { expectedRevision: 0, values: [entry(field, true)] }),
    ).rejects.toThrow("unknown_or_wrong_scope_field");
    await storage.writeValues(
      "client",
      "client",
      { expectedRevision: 0, values: [] },
      "manual_create",
    );
    expect((await storage.readValues("client", "client")).values[0].value).toBe(false);
  });
  it("rolls back earlier values and entity revision when a later DB write fails", async () => {
    const first = await create("first_field"),
      second = await create("second_field");
    await pool.query(
      `CREATE FUNCTION crm_test_fail_value() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.definition_id = '${second.id}'::uuid THEN RAISE EXCEPTION 'injected'; END IF; RETURN NEW; END $$; CREATE TRIGGER crm_test_fail BEFORE INSERT ON crm_lead_custom_field_values FOR EACH ROW EXECUTE FUNCTION crm_test_fail_value()`,
    );
    try {
      await expect(
        storage.writeValues("lead", "lead", {
          expectedRevision: 0,
          values: [entry(first, "first"), entry(second, "second")],
        }),
      ).rejects.toThrow();
    } finally {
      await pool.query(
        "DROP TRIGGER crm_test_fail ON crm_lead_custom_field_values; DROP FUNCTION crm_test_fail_value()",
      );
    }
    expect(await storage.readValues("lead", "lead")).toEqual({ revision: 0, values: [] });
  });
  it("joins the caller transaction so record creation rolls back with custom fields", async () => {
    const field = await create();
    await expect(
      db.transaction(async (tx) => {
        await tx.insert(crmClients).values({ id: "composed", name: "Synthetic" });
        await storage.writeValues(
          "client",
          "composed",
          { expectedRevision: 0, values: [entry(field, "value")] },
          "manual_create",
          tx,
        );
        throw new Error("injected_after_values");
      }),
    ).rejects.toThrow("injected_after_values");
    expect((await pool.query("SELECT id FROM crm_clients WHERE id='composed'")).rowCount).toBe(0);
  });
  it("enforces actual foreign keys, scalar and revision checks and preserves definitions on entity deletion", async () => {
    const field = await create();
    for (const statement of [
      "UPDATE crm_custom_field_definitions SET revision=0",
      "UPDATE crm_custom_field_definitions SET entity_scope='other'",
      "UPDATE crm_custom_field_revisions SET config='[]'",
      "UPDATE crm_custom_field_revisions SET config='{}'",
      'UPDATE crm_custom_field_revisions SET config=\'{"version":"1"}\'',
      "UPDATE crm_leads SET custom_values_revision=-1",
    ])
      await expect(pool.query(statement)).rejects.toThrow();
    await expect(
      pool.query(
        "INSERT INTO crm_lead_custom_field_values(lead_id,definition_id,definition_revision,value) VALUES('missing',$1,1,'true')",
        [field.id],
      ),
    ).rejects.toThrow();
    await expect(
      pool.query(
        "INSERT INTO crm_lead_custom_field_values(lead_id,definition_id,definition_revision,value) VALUES('lead',$1,99,'true')",
        [field.id],
      ),
    ).rejects.toThrow();
    await expect(
      pool.query(
        "INSERT INTO crm_lead_custom_field_values(lead_id,definition_id,definition_revision,value) VALUES('lead',$1,1,'{}')",
        [field.id],
      ),
    ).rejects.toThrow();
    await storage.writeValues("lead", "lead", {
      expectedRevision: 0,
      values: [entry(field, "retained")],
    });
    await expect(
      pool.query("DELETE FROM crm_custom_field_revisions WHERE definition_id=$1", [field.id]),
    ).rejects.toThrow();
    await pool.query("DELETE FROM crm_leads WHERE id='lead'");
    expect((await pool.query("SELECT * FROM crm_lead_custom_field_values")).rowCount).toBe(0);
    expect(await storage.listDefinitions()).toHaveLength(1);
  });
  it("rolls back a definition if its revision insert fails and rejects archived key reuse", async () => {
    await expect(
      storage.createDefinition(
        {
          key: "failed_field",
          entityScope: "lead",
          type: "text",
          config: { version: 1, label: "Failed" },
        },
        "nonexistent-user",
      ),
    ).rejects.toThrow();
    expect(await storage.listDefinitions()).toEqual([]);
    const field = await create();
    const archived = await storage.reviseDefinition(field.id, {
      expectedRevision: 1,
      archived: true,
      config: field.config,
    });
    await expect(create()).rejects.toThrow();
    const active = await storage.reviseDefinition(field.id, {
      expectedRevision: 2,
      archived: false,
      config: archived.config,
    });
    expect(active).toMatchObject({ id: field.id, revision: 3, archivedAt: null });
  });
  it("keeps archived fields in the total limit and serializes unarchive against the active cap", async () => {
    const field = await create();
    await storage.reviseDefinition(field.id, {
      expectedRevision: 1,
      archived: true,
      config: field.config,
    });
    for (let n = 0; n < 50; n++) await create(`active_${n}`);
    await expect(
      storage.reviseDefinition(field.id, {
        expectedRevision: 2,
        archived: false,
        config: field.config,
      }),
    ).rejects.toThrow("active_field_limit");
    await pool.query(`WITH added AS (
      INSERT INTO crm_custom_field_definitions(key,entity_scope,type,archived_at)
      SELECT 'archived_'||n,'both','text',now() FROM generate_series(1,149) n RETURNING id
    ) INSERT INTO crm_custom_field_revisions(definition_id,revision,config)
      SELECT id,1,'{"version":1,"label":"Archived"}'::jsonb FROM added`);
    expect(await storage.listDefinitions()).toHaveLength(200);
    await expect(create("too_many")).rejects.toThrow();
  });
  it("rejects exhausted record revisions without changing values", async () => {
    const field = await create();
    await pool.query("UPDATE crm_leads SET custom_values_revision=2147483647 WHERE id='lead'");
    await expect(
      storage.writeValues("lead", "lead", {
        expectedRevision: 2147483647,
        values: [entry(field, "no write")],
      }),
    ).rejects.toThrow();
    expect((await storage.readValues("lead", "lead")).values).toEqual([]);
  });
});

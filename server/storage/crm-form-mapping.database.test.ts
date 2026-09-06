import { beforeAll, beforeEach, afterAll, afterEach, describe, it, expect, vi } from "vitest";
const testUrl = process.env.CRM_FORM_MAPPING_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.search ||
    url.hash ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.pathname !== "/core_crm_mapping_test"
  )
    throw new Error("Local disposable core_crm_mapping_test required");
}
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({
    connectionString: process.env.CRM_FORM_MAPPING_TEST_DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
    statement_timeout: 10000,
  });
  return { pool, db: drizzle(pool, { schema }) };
});
vi.mock("../storage", async () => {
  const { FormsStorage } = await import("./forms.storage");
  const { CrmStorage } = await import("./crm.storage");
  return {
    storage: {
      forms: new FormsStorage(),
      crm: new CrmStorage(),
      users: { getFormNotificationUsers: async () => [] },
    },
  };
});
vi.mock("../services/site-features.service", () => ({ isSiteFeatureEnabled: async () => true }));
vi.mock("../services/mailchimp.service", () => ({
  syncContactToMailchimp: async () => {
    throw new Error("Unexpected provider call");
  },
}));
vi.mock("../services/email.service", () => ({
  deliverManagedFormNotification: async () => {
    throw new Error("Unexpected email call");
  },
}));
vi.mock("../utils/logger", () => ({
  logger: { app: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } },
}));
import { pool } from "../db";
import { runMigrations } from "../migrate";
import { storage } from "../storage";
import { insertCmsFormSchema } from "@shared/schema";
import { CrmCustomFieldsStorage } from "./crm-custom-fields.storage";
import { CrmFormMappingStorage } from "./crm-form-mapping.storage";
import { submitManagedFormById } from "../services/forms.service";
import { previewCrmFormMapping } from "../services/crm-form-mapping.service";
import { runFormEffectJobs } from "../services/form-effect-jobs.service";
const fields = new CrmCustomFieldsStorage(),
  mappings = new CrmFormMappingStorage();
let formId: string;
let definition: Awaited<ReturnType<typeof fields.createDefinition>>;
const input = {
  full_name: "Visitor",
  contact: "visitor@example.test",
  budget: "12",
  email: "trap@example.test",
};
const mapping = (revision = 1) => ({
  version: 1,
  revision,
  mode: "explicit",
  bindings: [
    { sourceFieldId: "name", target: { kind: "builtin", key: "name" }, required: true },
    { sourceFieldId: "contact", target: { kind: "builtin", key: "email" }, required: true },
    {
      sourceFieldId: "budget",
      target: { kind: "custom", definitionId: definition.id },
      required: false,
    },
  ],
});
const accept = (key = "attempt", data: unknown = input) =>
  submitManagedFormById(formId, data, { idempotencyKey: key });
const run = () => runFormEffectJobs(() => new Date(Date.now() + 10000), 10);
async function counts() {
  return (
    await pool.query(
      "SELECT (SELECT count(*)::int FROM cms_form_submissions) AS submissions,(SELECT count(*)::int FROM cms_form_effect_jobs) AS jobs,(SELECT count(*)::int FROM crm_leads) AS leads,(SELECT count(*)::int FROM crm_lead_custom_field_values) AS values",
    )
  ).rows[0];
}
describe.skipIf(!testUrl)("mapped form acceptance in disposable PostgreSQL", () => {
  beforeAll(async () => {
    await runMigrations();
  }, 60000);
  beforeEach(async () => {
    await pool.query(
      "TRUNCATE cms_forms,crm_leads,crm_clients,crm_custom_field_definitions CASCADE",
    );
    definition = await fields.createDefinition({
      key: "visitor_budget",
      type: "number",
      entityScope: "both",
      config: { version: 1, label: "Budget" },
    });
    const form = await storage.forms.create(
      insertCmsFormSchema.parse({
        name: "Mapped form",
        slug: "mapped-form",
        fields: [
          { id: "name", key: "full_name", label: "Name", type: "text", required: true },
          { id: "contact", key: "contact", label: "Email", type: "email", required: true },
          { id: "budget", key: "budget", label: "Budget", type: "number" },
          { id: "trap", key: "email", label: "Legacy email", type: "email" },
        ],
        settings: { createCrmLead: true },
      }),
    );
    formId = form.id;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  afterAll(async () => {
    await pool.end();
  });
  it("keeps mapping revision monotonic across removal/recreation and omits it from public forms", async () => {
    await mappings.save(formId, { expectedRevision: 0, mapping: mapping() });
    for (const form of [
      await storage.forms.getPublicById(formId),
      await storage.forms.getPublicBySlug("mapped-form"),
      ...(await storage.forms.getPublicForms()),
    ]) {
      expect(form).not.toHaveProperty("crmMapping");
      expect(form).not.toHaveProperty("crmMappingRevision");
    }
    await mappings.save(formId, { expectedRevision: 1, mapping: null });
    await mappings.save(formId, { expectedRevision: 2, mapping: mapping(3) });
    await expect(
      mappings.save(formId, { expectedRevision: 1, mapping: null }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect((await mappings.get(formId)).revision).toBe(3);
  });
  it("preview and intake use ordinary number validation and explicit targets rather than heuristic keys", async () => {
    const preview = await previewCrmFormMapping(formId, {
      expectedRevision: 0,
      mapping: mapping(),
      sample: input,
    });
    expect(preview).toMatchObject({
      ok: true,
      normalizedBuiltins: { email: "visitor@example.test" },
      customValues: [{ value: 12 }],
    });
    expect(await counts()).toEqual({ submissions: 0, jobs: 0, leads: 0, values: 0 });
    await mappings.save(formId, { expectedRevision: 0, mapping: mapping() });
    await accept();
    expect(await run()).toMatchObject({ completed: 1, retried: 0 });
    const lead = (await pool.query("SELECT id,email FROM crm_leads")).rows[0];
    expect(lead.email).toBe("visitor@example.test");
    expect((await fields.readValues("lead", lead.id)).values[0].value).toBe(12);
  });
  it("persists one snapshot/effect under concurrent response-loss retries and survives later archive/mapping removal", async () => {
    await mappings.save(formId, { expectedRevision: 0, mapping: mapping() });
    const results = await Promise.all([accept(), accept()]);
    expect(results[0].submission.id).toBe(results[1].submission.id);
    await fields.reviseDefinition(definition.id, {
      expectedRevision: 1,
      archived: true,
      config: definition.config,
    });
    expect((await accept()).submission.id).toBe(results[0].submission.id);
    await expect(accept("new-attempt")).rejects.toMatchObject({ statusCode: 503 });
    await mappings.save(formId, { expectedRevision: 1, mapping: null });
    expect(await run()).toMatchObject({ completed: 1, retried: 0 });
    expect(await counts()).toEqual({ submissions: 1, jobs: 1, leads: 1, values: 1 });
    const lead = (await pool.query("SELECT id FROM crm_leads")).rows[0];
    expect((await fields.readValues("lead", lead.id)).values[0]).toMatchObject({
      definitionRevision: 1,
      value: 12,
    });
  });
  it("does not erase accepted custom values on blank duplicate intake", async () => {
    await mappings.save(formId, { expectedRevision: 0, mapping: mapping() });
    await accept();
    await run();
    await accept("second", { ...input, budget: "" });
    await run();
    expect((await counts()).leads).toBe(1);
    const lead = (await pool.query("SELECT id FROM crm_leads")).rows[0];
    expect((await fields.readValues("lead", lead.id)).values[0].value).toBe(12);
  });
  it("rejects invalid mapped input before submission and job writes", async () => {
    await expect(
      previewCrmFormMapping(formId, {
        expectedRevision: 0,
        mapping: mapping(),
        sample: { ...input, budget: "invalid" },
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await mappings.save(formId, { expectedRevision: 0, mapping: mapping() });
    await expect(accept("invalid", { ...input, budget: "invalid" })).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(
      accept("out-of-bounds", { ...input, budget: "1000000000001" }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(await counts()).toEqual({ submissions: 0, jobs: 0, leads: 0, values: 0 });
  });
  it("serializes generic field edits against mapping saves", async () => {
    const form = (await storage.forms.getById(formId))!;
    const results = await Promise.allSettled([
      mappings.save(formId, { expectedRevision: 0, mapping: mapping() }),
      storage.forms.update(formId, {
        fields: form.fields.filter((field) => field.id !== "budget"),
      }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const after = (await storage.forms.getById(formId))!;
    expect(Boolean(after.crmMapping)).toBe(after.fields.some((field) => field.id === "budget"));
  });
  it("generic form updates preserve mapping and reject mapped key changes", async () => {
    await mappings.save(formId, { expectedRevision: 0, mapping: mapping() });
    const form = (await storage.forms.getById(formId))!;
    await expect(
      storage.forms.update(formId, {
        fields: form.fields.map((field) =>
          field.id === "budget" ? { ...field, key: "changed" } : field,
        ),
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    await storage.forms.update(formId, {
      name: "Renamed",
      crmMapping: null,
      crmMappingRevision: 99,
    } as never);
    expect((await mappings.get(formId)).revision).toBe(1);
  });
  it("unknown versions and wrong form identity never fall back to heuristic intake", async () => {
    await mappings.save(formId, { expectedRevision: 0, mapping: mapping() });
    await accept();
    await pool.query("UPDATE cms_form_effect_jobs SET payload=jsonb_set(payload,'{version}','2')");
    expect(await run()).toMatchObject({ completed: 0, retried: 1 });
    expect((await counts()).leads).toBe(0);
    await pool.query(
      "UPDATE cms_form_effect_jobs SET status='queued',next_attempt_at=now(),payload=jsonb_set(jsonb_set(payload,'{version}','1'),'{formId}','\"different\"')",
    );
    expect(await run()).toMatchObject({ completed: 0, retried: 1 });
    expect((await counts()).leads).toBe(0);
  });
  it("a lost claim cannot create a lead or write custom values", async () => {
    await mappings.save(formId, { expectedRevision: 0, mapping: mapping() });
    await accept();
    const job = (await storage.forms.claimNextEffectJob(new Date(Date.now() + 10000)))!;
    await pool.query("UPDATE cms_form_effect_jobs SET processing_token='replacement' WHERE id=$1", [
      job.id,
    ]);
    vi.spyOn(storage.forms, "claimNextEffectJob")
      .mockResolvedValueOnce(job)
      .mockResolvedValue(undefined);
    expect(await run()).toMatchObject({ completed: 0, retried: 0 });
    expect((await counts()).leads).toBe(0);
  });
  it("rolls back lead and values when a mapped effect fails, then retries the pinned snapshot", async () => {
    await mappings.save(formId, { expectedRevision: 0, mapping: mapping() });
    await accept();
    await pool.query(
      "CREATE FUNCTION crm_mapping_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected'; END $$; CREATE TRIGGER crm_mapping_fail BEFORE INSERT ON crm_lead_custom_field_values FOR EACH ROW EXECUTE FUNCTION crm_mapping_fail()",
    );
    try {
      expect(await run()).toMatchObject({ completed: 0, retried: 1 });
      expect((await counts()).leads).toBe(0);
    } finally {
      await pool.query(
        "DROP TRIGGER crm_mapping_fail ON crm_lead_custom_field_values;DROP FUNCTION crm_mapping_fail()",
      );
    }
    await pool.query("UPDATE cms_form_effect_jobs SET next_attempt_at=now()");
    expect(await run()).toMatchObject({ completed: 1, retried: 0 });
    expect((await counts()).values).toBe(1);
  });
  it("retains legacy unversioned job behavior when mapping is absent", async () => {
    await accept();
    expect(await run()).toMatchObject({ completed: 1, retried: 0 });
    expect((await pool.query("SELECT email FROM crm_leads")).rows[0].email).toBe(
      "trap@example.test",
    );
    expect((await counts()).values).toBe(0);
  });
});

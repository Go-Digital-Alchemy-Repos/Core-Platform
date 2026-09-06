import { afterAll, expect, it, vi } from "vitest";
import { gunzipSync } from "node:zlib";
import { writeFileSync } from "node:fs";
const fixtureUrl = process.env.CRM_RECOVERY_DATABASE_URL;
if (!fixtureUrl) throw new Error("Disposable CRM recovery fixture required");
const parsedUrl = new URL(fixtureUrl);
if (
  !["postgres:", "postgresql:"].includes(parsedUrl.protocol) ||
  parsedUrl.hostname !== "127.0.0.1" ||
  parsedUrl.pathname !== "/core_crm_recovery" ||
  parsedUrl.search ||
  parsedUrl.hash
)
  throw new Error("Local fixture required");
vi.mock("../../server/db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({
    connectionString: process.env.CRM_RECOVERY_DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
    statement_timeout: 10000,
  });
  return { pool, db: drizzle(pool, { schema }) };
});
const objects = vi.hoisted(() => new Map<string, Buffer>());
vi.mock("../../server/services/backup-storage.service", () => ({
  isBackupStorageConfigured: async () => true,
  getBackupStorageInfo: async () => ({
    source: "env",
    bucketName: "synthetic-memory",
    prefix: "crm-recovery",
  }),
  uploadBackupObject: async (key: string, bytes: Buffer) => {
    objects.set(key, Buffer.from(bytes));
    return { key };
  },
  listBackupObjects: async () => [],
  downloadBackupObject: async (key: string) => objects.get(key),
  deleteBackupObject: async (key: string) => objects.delete(key),
}));
import { pool } from "../../server/db";
import { runMigrations } from "../../server/migrate";
import { storage } from "../../server/storage";
import { CrmCustomFieldsStorage } from "../../server/storage/crm-custom-fields.storage";
import { CrmFormMappingStorage } from "../../server/storage/crm-form-mapping.storage";
import { submitManagedFormById } from "../../server/services/forms.service";
import { runFormEffectJobs } from "../../server/services/form-effect-jobs.service";
import {
  runSystemBackup,
  restoreBackupSnapshot,
} from "../../server/services/system-backup.service";
import { insertCmsFormSchema, insertCrmClientSchema, insertCrmLeadSchema } from "@shared/schema";
const custom = new CrmCustomFieldsStorage();
const mappings = new CrmFormMappingStorage();
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item,
  );
let stage = "migrations";
afterAll(async () => {
  writeFileSync(process.env.CRM_RECOVERY_STAGE!, stage, { mode: 0o600 });
  await pool.end();
});
it("captures/restores CRM history, mapping and pinned jobs through production backup algorithms", async () => {
  await runMigrations();
  await storage.settings.upsertSetting("enable_crm", "true", "system_configuration", false);
  stage = "seed-definitions";
  const number = await custom.createDefinition({
    key: "recovery_number",
    entityScope: "both",
    type: "number",
    config: { version: 1, label: "Number" },
  });
  const boolean = await custom.createDefinition({
    key: "recovery_boolean",
    entityScope: "both",
    type: "boolean",
    config: { version: 1, label: "Boolean" },
  });
  const choice = await custom.createDefinition({
    key: "recovery_choice",
    entityScope: "both",
    type: "choice",
    config: {
      version: 1,
      label: "Original choice",
      choices: [{ key: "orchard", label: "Original orchard", archived: false }],
    },
  });
  const values = [
    { definitionId: number.id, definitionRevision: 1, value: 0 },
    { definitionId: boolean.id, definitionRevision: 1, value: false },
    { definitionId: choice.id, definitionRevision: 1, value: "orchard" },
  ];
  stage = "seed-client";
  const client = await storage.crm.createManualClient(
    insertCrmClientSchema.parse({ name: "Synthetic client", email: "client@example.test" }),
    values,
  );
  const existingLead = await storage.crm.createLead(
    insertCrmLeadSchema.parse({ name: "Existing synthetic lead", email: "existing@example.test" }),
  );
  await custom.writeValues("lead", existingLead.id, { expectedRevision: 0, values });
  stage = "seed-form";
  const form = await storage.forms.create(
    insertCmsFormSchema.parse({
      name: "Recovery form",
      slug: "crm-recovery",
      fields: [
        { id: "email-id", key: "email", label: "Email", type: "email" },
        { id: "number-id", key: "number", label: "Number", type: "number" },
        { id: "boolean-id", key: "boolean", label: "Boolean", type: "consent" },
        {
          id: "choice-id",
          key: "choice",
          label: "Choice",
          type: "select",
          options: [{ label: "Orchard", value: "orchard" }],
        },
      ],
      settings: {
        createCrmLead: true,
        notifyAdmins: false,
        mailchimpEnabled: false,
        storeAsContactMessage: false,
      },
    }),
  );
  const mapping = {
    version: 1,
    mode: "explicit",
    revision: 1,
    bindings: [
      { sourceFieldId: "email-id", target: { kind: "builtin", key: "email" }, required: true },
      ...values.map((value, index) => ({
        sourceFieldId: ["number-id", "boolean-id", "choice-id"][index],
        target: { kind: "custom", definitionId: value.definitionId },
        required: false,
      })),
    ],
  };
  await mappings.save(form.id, { expectedRevision: 0, mapping });
  const sample = { email: "pending@example.test", number: "0", boolean: false, choice: "orchard" };
  stage = "accept-job";
  const accepted = await submitManagedFormById(form.id, sample, {
    idempotencyKey: "pending-recovery",
  });
  expect(
    (await pool.query("SELECT payload->>'kind' AS kind,status FROM cms_form_effect_jobs")).rows,
  ).toEqual([{ kind: "crm_intake", status: "queued" }]);
  stage = "archive-choice";
  await custom.reviseDefinition(choice.id, {
    expectedRevision: 1,
    archived: true,
    config: {
      ...choice.config,
      label: "Archived choice",
      choices: [{ key: "orchard", label: "Archived orchard", archived: true }],
    },
  });
  // Keep a live mapping whose target is now archived; accepted job must still use revision 1.
  const beforeValues = await custom.readValues("client", client.id);
  expect(beforeValues.values.map((item) => item.value)).toEqual(
    expect.arrayContaining([0, false, "orchard"]),
  );
  stage = "capture-backup";
  const manifest = await runSystemBackup("manual");
  const bytes = objects.get(manifest.key)!;
  expect(bytes).toBeDefined();
  const snapshot: Parameters<typeof restoreBackupSnapshot>[0] = JSON.parse(
    gunzipSync(bytes).toString("utf8"),
  );
  const required = [
    "crm_custom_field_definitions",
    "crm_custom_field_revisions",
    "crm_lead_custom_field_values",
    "crm_client_custom_field_values",
    "cms_forms",
    "cms_form_submissions",
    "cms_form_effect_jobs",
  ];
  expect(snapshot.tables.map((table) => table.name)).toEqual(expect.arrayContaining(required));
  stage = "assert-snapshot";
  const pinned = snapshot.tables.find((table) => table.name === "cms_form_effect_jobs")!.rows[0]
    .payload as { version: number; customValues: typeof values };
  expect(pinned.version).toBe(1);
  expect(pinned.customValues).toEqual(values);
  await pool.query("TRUNCATE crm_custom_field_definitions,cms_forms,crm_clients CASCADE");
  stage = "restore-backup";
  await restoreBackupSnapshot(snapshot);
  async function compare() {
    for (const table of snapshot.tables) {
      stage = "compare-" + table.name;
      expect(/^[a-z_][a-z0-9_]*$/.test(table.name)).toBe(true);
      const expectedRows = table.rows;
      const actual = (await pool.query(`SELECT * FROM public."${table.name}"`)).rows;
      if (
        canonical(actual.map(canonical).sort()) !== canonical(expectedRows.map(canonical).sort())
      ) {
        const expected = expectedRows[0] ?? {};
        stage +=
          ":" +
          Object.keys(expected)
            .filter((key) => canonical(actual[0]?.[key]) !== canonical(expected[key]))
            .join(",");
      }
      expect(actual.map(canonical).sort(), table.name).toEqual(expectedRows.map(canonical).sort());
    }
  }
  stage = "compare-restored";
  await compare();
  stage = "post-restore-migrations";
  await runMigrations();
  await compare();
  stage = "read-values";
  expect(await custom.readValues("client", client.id)).toEqual(beforeValues);
  stage = "read-restored";
  expect(await mappings.get(form.id)).toEqual({ mapping, revision: 1 });
  await expect(
    submitManagedFormById(form.id, sample, { idempotencyKey: "new-after-archive" }),
  ).rejects.toMatchObject({ statusCode: 503 });
  expect(
    (await submitManagedFormById(form.id, sample, { idempotencyKey: "pending-recovery" }))
      .submission.id,
  ).toBe(accepted.submission.id);
  stage = "process-restored";
  expect(await runFormEffectJobs(() => new Date(Date.now() + 10000), 10)).toMatchObject({
    completed: 1,
    retried: 0,
  });
  const lead = (await pool.query("SELECT id FROM crm_leads WHERE email='pending@example.test'"))
    .rows[0];
  const restoredValues = await custom.readValues("lead", lead.id);
  expect(
    restoredValues.values.map((item) => ({
      definitionId: item.definitionId,
      definitionRevision: item.definitionRevision,
      value: item.value,
    })),
  ).toEqual(expect.arrayContaining(values));
  const historicalChoice = restoredValues.values.find((item) => item.definitionId === choice.id)!;
  expect(historicalChoice.acceptedConfig.label).toBe("Original choice");
  expect(historicalChoice.acceptedConfig.choices[0]).toMatchObject({
    label: "Original orchard",
    archived: false,
  });
  expect(historicalChoice.current.archivedAt).not.toBeNull();
  expect(await runFormEffectJobs(() => new Date(Date.now() + 10000), 10)).toMatchObject({
    completed: 0,
    retried: 0,
  });
  expect((await pool.query("SELECT count(*)::int AS count FROM crm_leads")).rows[0].count).toBe(2);
  writeFileSync(
    process.env.CRM_RECOVERY_RESULT!,
    JSON.stringify({
      passed: true,
      tableCount: snapshot.tables.length,
      rowCount: snapshot.manifest.totalRowCount,
      allSnapshotRowsEqual: true,
      postRestoreMigrationsAllRowsEqual: true,
      explicitClientProfileValuesPreserved: true,
      customTablesIncluded: true,
      zeroFalseAndArchivedChoicePreserved: true,
      pinnedPendingJobProcessed: true,
      archivedFreshIntakeRejected: true,
      replaySameSubmission: true,
      workerRetryNoDuplicate: true,
      transport: "in-memory backup object adapter; actual capture/gzip/restore/worker",
    }),
    { mode: 0o600 },
  );
}, 120000);

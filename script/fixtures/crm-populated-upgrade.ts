import assert from "node:assert/strict";
import { pool } from "../../server/db";
import { CrmCustomFieldsStorage } from "../../server/storage/crm-custom-fields.storage";
import { CrmFormMappingStorage } from "../../server/storage/crm-form-mapping.storage";
import { storage } from "../../server/storage";
import {
  insertCmsFormSchema,
  insertCrmLeadSchema,
  insertCrmClientSchema,
} from "../../shared/schema";
import { runMigrations } from "../../server/migrate";
import { writeFileSync } from "node:fs";

const url = new URL(process.env.DATABASE_URL!);
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.pathname, "/core_crm_upgrade");
assert.ok(["postgres:", "postgresql:"].includes(url.protocol));
assert.equal(url.search + url.hash, "");
let stage = "create-lead";
try {
  const custom = new CrmCustomFieldsStorage();
  const lead = await storage.crm.createLead(insertCrmLeadSchema.parse({ name: "Candidate lead" }));
  stage = "create-client";
  const client = await storage.crm.createManualClient(
    insertCrmClientSchema.parse({ name: "Candidate client" }),
    [],
  );
  stage = "create-definition";
  const definition = await custom.createDefinition({
    key: "upgrade_number",
    entityScope: "both",
    type: "number",
    config: { version: 1, label: "Upgrade number" },
  });
  const values = [
    { definitionId: definition.id, definitionRevision: definition.revision, value: 0 },
  ];
  stage = "write-values";
  await custom.writeValues("lead", lead.id, { expectedRevision: 0, values });
  await custom.writeValues("client", client.id, {
    expectedRevision: client.customValuesRevision,
    values,
  });
  stage = "create-form";
  const form = await storage.forms.create(
    insertCmsFormSchema.parse({
      name: "Candidate mapping",
      slug: "candidate-mapping",
      fields: [{ id: "quantity", key: "quantity", label: "Quantity", type: "number" }],
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
      {
        sourceFieldId: "quantity",
        target: { kind: "custom", definitionId: definition.id },
        required: false,
      },
    ],
  };
  const mappings = new CrmFormMappingStorage();
  stage = "save-mapping";
  await mappings.save(form.id, { expectedRevision: 0, mapping });
  stage = "read-assert";
  const before = {
    lead: await custom.readValues("lead", lead.id),
    client: await custom.readValues("client", client.id),
    mapping: await mappings.get(form.id),
  };
  assert.equal(before.lead.values[0].value, 0);
  assert.equal(before.client.values[0].value, 0);
  assert.deepEqual(before.mapping, { mapping, revision: 1 });
  stage = "restart-assert";
  for (let run = 0; run < 2; run++) {
    await runMigrations();
    assert.deepEqual(await custom.readValues("lead", lead.id), before.lead);
    assert.deepEqual(await custom.readValues("client", client.id), before.client);
    assert.deepEqual(await mappings.get(form.id), before.mapping);
  }
  writeFileSync(
    process.env.CRM_UPGRADE_RESULT!,
    JSON.stringify({
      customLeadAndClientValuesUsable: true,
      mappingUsable: true,
      populatedCandidateRestarts: 2,
    }),
    { mode: 0o600 },
  );
} catch (error) {
  writeFileSync(
    process.env.CRM_UPGRADE_RESULT!,
    JSON.stringify({
      fixtureFailed: stage,
      errorType: error instanceof Error ? error.name : "Unknown",
    }),
    { mode: 0o600 },
  );
  throw error;
} finally {
  await pool.end();
}

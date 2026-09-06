import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { beforeAll, afterAll, beforeEach, it, expect, vi } from "vitest";
const state = vi.hoisted(() => ({ archived: false, persist: vi.fn() }));
vi.mock("../db", () => ({ db: {} }));
vi.mock("../storage", () => ({
  storage: {
    forms: {
      getPublicBySlug: async () => ({ id: "form", fields: [], settings: {} }),
      withSubmissionForm: async (_id: string, work: (form: unknown, tx: unknown) => unknown) =>
        work(form, {}),
      findSubmissionByKey: async () => undefined,
      createSubmissionWithEffects: state.persist,
    },
    users: { getFormNotificationUsers: async () => [] },
  },
}));
vi.mock("../services/mailchimp.service", () => ({ syncContactToMailchimp: vi.fn() }));
vi.mock("../services/site-features.service", () => ({ isSiteFeatureEnabled: async () => true }));
vi.mock("../utils/logger", () => ({
  logger: { app: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } },
}));
import { CrmCustomFieldsStorage } from "../storage/crm-custom-fields.storage";
import { crmCustomFieldDefinitionSchema } from "@shared/crm-custom-fields";
import { insertCmsFormSchema } from "@shared/schema";
import formsRouter from "./forms.routes";
import clientFormsRouter from "./client-forms.routes";
import { errorHandler } from "../middleware/error-handler";
const definitionId = "00000000-0000-4000-8000-000000000001";
const form = {
  ...insertCmsFormSchema.parse({
    name: "Private configured form",
    slug: "contact-form",
    fields: [{ id: "budget-input", key: "budget", label: "Budget", type: "number" }],
    settings: { createCrmLead: true },
  }),
  id: "form",
  crmMappingRevision: 1,
  crmMapping: {
    version: 1,
    revision: 1,
    mode: "explicit",
    bindings: [
      { sourceFieldId: "budget-input", target: { kind: "custom", definitionId }, required: false },
    ],
  },
};
let server: Server, base: string;
beforeAll(async () => {
  vi.stubEnv("CLIENT_STACK_ID", "mapped-test");
  vi.stubEnv("CLIENT_FORM_PROXY_TOKEN", "synthetic-mapped-proxy-token");
  const app = express();
  app.use(express.json());
  app.use("/forms", formsRouter);
  app.use("/client-forms", clientFormsRouter);
  app.use(errorHandler);
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  vi.unstubAllEnvs();
});
beforeEach(() => {
  vi.restoreAllMocks();
  state.archived = false;
  state.persist.mockClear();
  vi.spyOn(CrmCustomFieldsStorage.prototype, "listDefinitions").mockImplementation(async () => [
    crmCustomFieldDefinitionSchema.parse({
      id: definitionId,
      key: "private_budget",
      type: "number",
      entityScope: "both",
      revision: 1,
      archivedAt: state.archived ? "2026-09-06T00:00:00Z" : null,
      config: { version: 1, label: "Private internal label" },
    }),
  ]);
});
async function submit(path: string, budget: string) {
  return fetch(base + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-form-proxy-token": "synthetic-mapped-proxy-token",
    },
    body: JSON.stringify({ budget }),
  });
}
it.each(["/forms/contact-form/submit", "/client-forms/mapped-test/contact"])(
  "%s exposes safe source-field errors without raw values/configuration",
  async (path) => {
    const response = await submit(path, "1000000000001");
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errors).toEqual([{ sourceFieldId: "budget-input", code: "invalid_value" }]);
    const text = JSON.stringify(body);
    for (const secret of [
      "1000000000001",
      definitionId,
      "private_budget",
      "Private internal label",
    ])
      expect(text).not.toContain(secret);
    expect(state.persist).not.toHaveBeenCalled();
  },
);
it.each(["/forms/contact-form/submit", "/client-forms/mapped-test/contact"])(
  "%s keeps unavailable mappings neutral",
  async (path) => {
    state.archived = true;
    const response = await submit(path, "12");
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).not.toHaveProperty("errors");
    expect(JSON.stringify(body)).not.toContain(definitionId);
    expect(state.persist).not.toHaveBeenCalled();
  },
);
it("preserves ordinary validation message/status without adding mapped diagnostics", async () => {
  const response = await submit("/forms/contact-form/submit", "not-a-number");
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body).not.toHaveProperty("errors");
  expect(body.message).toContain("Budget");
});

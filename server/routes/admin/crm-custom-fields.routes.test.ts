import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { User } from "@shared/schema";
vi.mock("../../db", () => ({
  db: { transaction: async (work: (tx: unknown) => Promise<unknown>) => work({ fixture: "tx" }) },
}));
const state = vi.hoisted(() => ({
  raw: null as string | null,
  enabled: true,
  users: new Map<string, unknown>(),
  manualLead: vi.fn(),
  manualClient: vi.fn(),
  saved: vi.fn(),
  deleted: vi.fn(),
}));
vi.mock("../../storage", () => ({
  storage: {
    crm: { createManualLead: state.manualLead, createManualClient: state.manualClient },
    users: { getUser: async (id: string) => state.users.get(id) },
    settings: {
      getSetting: async () => state.raw,
      getDecryptedCategory: async () => ({ enable_crm: String(state.enabled) }),
      upsertSetting: async (...args: unknown[]) => {
        state.saved(...args);
        state.raw = args[1] as string;
        return {};
      },
      deleteSetting: state.deleted,
    },
  },
}));
vi.mock("../../storage/index", async () => await import("../../storage"));
vi.mock("../../utils/logger", () => ({
  logger: { app: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } },
}));
// Keep the actual admin router mounting and authentication; unrelated modules
// have empty child routers so no external integrations initialize in this test.
vi.mock("./dashboard.routes", () => ({ default: express.Router() }));
vi.mock("./therapists.routes", () => ({ default: express.Router() }));
vi.mock("./users.routes", () => ({ default: express.Router() }));
vi.mock("./tiers.routes", () => ({ default: express.Router() }));
vi.mock("./events.routes", () => ({ default: express.Router() }));
vi.mock("./blog.routes", () => ({ default: express.Router() }));
vi.mock("./registrations.routes", () => ({ default: express.Router() }));
vi.mock("./cms.routes", () => ({ default: express.Router() }));
vi.mock("./cms-media.routes", () => ({ default: express.Router() }));
vi.mock("./cms-sections.routes", () => ({ default: express.Router() }));
vi.mock("./cms-galleries.routes", () => ({ default: express.Router() }));
vi.mock("./cms-seo.routes", () => ({ default: express.Router() }));
vi.mock("./cms-redirects.routes", () => ({ default: express.Router() }));
vi.mock("./cms-audit.routes", () => ({ default: express.Router() }));
vi.mock("./applications.routes", () => ({ default: express.Router() }));
vi.mock("./cms-menus.routes", () => ({ default: express.Router() }));
vi.mock("./cms-sidebars.routes", () => ({ default: express.Router() }));
vi.mock("./system-backups.routes", () => ({ default: express.Router() }));
vi.mock("./forms.routes", () => ({ default: express.Router() }));
vi.mock("./editor-locks.routes", () => ({ default: express.Router() }));
vi.mock("./ecommerce.routes", () => ({ default: express.Router() }));
vi.mock("./careers.routes", () => ({ default: express.Router() }));
vi.mock("./portfolio.routes", () => ({ default: express.Router() }));
vi.mock("./membership.routes", () => ({ default: express.Router() }));
vi.mock("./client-site-content.routes", () => ({ default: express.Router() }));
vi.mock("./client-stack-onboarding.routes", () => ({ default: express.Router() }));
vi.mock("../../services/email.service", () => ({}));
vi.mock("../../services/r2.service", () => ({}));
vi.mock("../../services/system-email-templates.service", () => ({}));
vi.mock("../../services/mailchimp.service", () => ({}));
vi.mock("../../services/image-optimizer", () => ({}));
vi.mock("../../services/cms-media-upload.service", () => ({}));
import adminRouter from "./index";
import { CrmCustomFieldsStorage } from "../../storage/crm-custom-fields.storage";
import { generateToken } from "../../middleware/auth";
import { errorHandler } from "../../middleware/error-handler";
let server: Server;
let base: string;
const cookie = (role: string, permissions: string[] = []) => {
  const user = {
    id: role + permissions.join(),
    email: "user@example.test",
    password: "synthetic-session-version",
    role,
    adminPermissions: permissions,
    isSuspended: false,
  } as unknown as User;
  state.users.set(user.id, user);
  return `corePlatform_token=${generateToken(user)}`;
};
async function request(
  path: string,
  role?: string,
  method = "GET",
  body?: unknown,
  permissions: string[] = [],
) {
  return fetch(base + path, {
    method,
    headers: {
      ...(role ? { cookie: cookie(role, permissions) } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe("mounted CRM custom fields API", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json(), cookieParser());
    app.use("/api/admin", adminRouter);
    app.use(errorHandler);
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    state.enabled = true;
    state.users.clear();
    state.manualLead.mockResolvedValue({
      lead: { id: "created-lead", customValuesRevision: 1 },
      duplicate: false,
    });
    state.manualClient.mockResolvedValue({ id: "created-client", customValuesRevision: 1 });
    vi.spyOn(CrmCustomFieldsStorage.prototype, "listDefinitions").mockResolvedValue([]);
    vi.spyOn(CrmCustomFieldsStorage.prototype, "createDefinition").mockResolvedValue({} as never);
    vi.spyOn(CrmCustomFieldsStorage.prototype, "reviseDefinition").mockResolvedValue({} as never);
    vi.spyOn(CrmCustomFieldsStorage.prototype, "readValues").mockResolvedValue({
      revision: 1,
      values: [],
    });
    vi.spyOn(CrmCustomFieldsStorage.prototype, "writeValues").mockResolvedValue({
      revision: 1,
      values: [],
    });
  });
  const path = "/api/admin/crm/settings/custom-fields";
  const definition = {
    key: "field_key",
    type: "text",
    entityScope: "both",
    config: { version: 1, label: "Field" },
  };
  const id = "00000000-0000-4000-8000-000000000001";
  const patch = { expectedRevision: 0, values: [] };
  it("requires authentication on definition and value endpoints", async () => {
    for (const target of [
      path,
      "/api/admin/crm/leads/lead/custom-fields",
      "/api/admin/crm/clients/client/custom-fields",
    ])
      expect((await request(target)).status).toBe(401);
  });
  it("lets CRM editors read definitions but never create/revise them", async () => {
    expect((await request(path, "editor", "GET", undefined, ["crm"])).status).toBe(200);
    expect((await request(path, "editor", "POST", definition, ["crm"])).status).toBe(403);
    expect(
      (
        await request(
          `${path}/${id}`,
          "editor",
          "PATCH",
          { expectedRevision: 1, archived: true, config: definition.config },
          ["crm"],
        )
      ).status,
    ).toBe(403);
    expect(CrmCustomFieldsStorage.prototype.createDefinition).not.toHaveBeenCalled();
  });
  it.each(["leads", "clients"])("lets permitted CRM editors read/edit %s values", async (scope) => {
    const target = `/api/admin/crm/${scope}/record/custom-fields`;
    expect((await request(target, "editor", "GET", undefined, ["crm"])).status).toBe(200);
    const response = await request(target, "editor", "PATCH", patch, ["crm"]);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ revision: 1, values: [] });
    expect(CrmCustomFieldsStorage.prototype.writeValues).toHaveBeenCalledWith(
      scope === "leads" ? "lead" : "client",
      "record",
      patch,
      "patch",
      expect.anything(),
    );
  });
  it("keeps unrelated users and disabled CRM out", async () => {
    for (const target of [path, "/api/admin/crm/leads/record/custom-fields"]) {
      expect((await request(target, "editor", "GET", undefined, ["content"])).status).toBe(403);
      expect((await request(target, "client")).status).toBe(403);
    }
    state.enabled = false;
    expect((await request(path, "admin", "POST", definition)).status).toBe(404);
    expect((await request(path, "admin")).status).toBe(404);
    expect(
      (
        await request("/api/admin/crm/clients/record/custom-fields", "editor", "PATCH", patch, [
          "crm",
        ])
      ).status,
    ).toBe(404);
  });
  it("admin definition writes return complete inventory", async () => {
    const created = await request(path, "admin", "POST", definition);
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({ definitions: [] });
    expect(
      (
        await request(`${path}/${id}`, "admin", "PATCH", {
          expectedRevision: 1,
          archived: true,
          config: definition.config,
        })
      ).status,
    ).toBe(200);
  });
  it("rejects unknown body fields instead of exposing transaction, lifecycle or server revision control", async () => {
    for (const body of [
      { ...definition, transaction: {} },
      { ...definition, customValuesRevision: 99 },
    ])
      expect((await request(path, "admin", "POST", body)).status).toBe(400);
    for (const body of [
      { ...patch, mode: "manual_create" },
      { ...patch, stage: "won" },
      { ...patch, customValuesRevision: 99 },
    ])
      expect(
        (
          await request("/api/admin/crm/leads/record/custom-fields", "editor", "PATCH", body, [
            "crm",
          ])
        ).status,
      ).toBe(400);
    expect(CrmCustomFieldsStorage.prototype.writeValues).not.toHaveBeenCalled();
    expect(CrmCustomFieldsStorage.prototype.createDefinition).not.toHaveBeenCalled();
  });
  it.each([
    ["stale_custom_values_revision", 409],
    ["stale_definition_revision", 409],
    ["crm_custom_field_not_found", 404],
    ["invalid_field_value", 400],
    ["SQL detail: private-value password=secret", 500],
  ])("sanitizes %s to %s", async (code, status) => {
    vi.mocked(CrmCustomFieldsStorage.prototype.writeValues).mockRejectedValue(
      new Error(String(code)),
    );
    const response = await request(
      "/api/admin/crm/leads/record/custom-fields",
      "editor",
      "PATCH",
      patch,
      ["crm"],
    );
    expect(response.status).toBe(status);
    const text = await response.text();
    expect(text).not.toContain("private-value");
    expect(text).not.toContain("password");
  });
  it("does not leak unrelated admin access through the scoped mount", async () => {
    expect(
      (await request("/api/admin/dashboard-stats", "editor", "GET", undefined, ["crm"])).status,
    ).toBe(403);
  });
  it("permits trusted manual creation only through authenticated CRM routes", async () => {
    for (const path of ["/api/admin/crm", "/api/admin/crm/clients"]) {
      expect((await request(path, undefined, "POST", { name: "Synthetic" })).status).toBe(401);
      expect(
        (await request(path, "editor", "POST", { name: "Synthetic" }, ["content"])).status,
      ).toBe(403);
      expect((await request(path, "editor", "POST", { name: "Synthetic" }, ["crm"])).status).toBe(
        201,
      );
      expect(
        (
          await request(path, "editor", "POST", { name: "Synthetic", customValuesRevision: 99 }, [
            "crm",
          ])
        ).status,
      ).toBe(400);
    }
    expect(state.manualLead).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Synthetic" }),
      [],
      expect.any(Function),
      expect.any(String),
    );
    expect(state.manualClient).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Synthetic" }),
      [],
    );
    state.enabled = false;
    expect(
      (await request("/api/admin/crm/clients", "admin", "POST", { name: "Synthetic" })).status,
    ).toBe(404);
  });
  it("returns actionable manual duplicate conflict without pretending creation succeeded", async () => {
    state.manualLead.mockRejectedValue(new Error("duplicate_lead_custom_fields"));
    const response = await request("/api/admin/crm", "editor", "POST", { name: "Duplicate" }, [
      "crm",
    ]);
    expect(response.status).toBe(409);
    expect((await response.json()).message).toContain("current revision");
  });
});

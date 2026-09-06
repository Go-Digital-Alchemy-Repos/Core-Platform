import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { User } from "@shared/schema";
vi.mock("../../db", () => ({ db: {} }));
const state = vi.hoisted(() => ({
  raw: null as string | null,
  enabled: true,
  cmsEnabled: true,
  users: new Map<string, unknown>(),
  saved: vi.fn(),
  deleted: vi.fn(),
}));
vi.mock("../../storage", () => ({
  storage: {
    users: { getUser: async (id: string) => state.users.get(id) },
    settings: {
      getSetting: async () => state.raw,
      getDecryptedCategory: async () => ({
        enable_crm: String(state.enabled),
        enable_cms: String(state.cmsEnabled),
      }),
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
import { CrmFormMappingStorage } from "../../storage/crm-form-mapping.storage";
import { CrmCustomFieldsStorage } from "../../storage/crm-custom-fields.storage";
import { insertCmsFormSchema } from "@shared/schema";
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

describe("mounted form CRM mapping permissions", () => {
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
    state.cmsEnabled = true;
    state.users.clear();
    vi.spyOn(CrmFormMappingStorage.prototype, "get").mockResolvedValue({
      mapping: null,
      revision: 0,
    });
    vi.spyOn(CrmFormMappingStorage.prototype, "save").mockResolvedValue({
      mapping: null,
      revision: 1,
    });
    const form = {
      ...insertCmsFormSchema.parse({ name: "Sample", slug: "sample" }),
      id: "form",
      crmMapping: null,
      crmMappingRevision: 0,
      createdAt: null,
      updatedAt: null,
    };
    vi.spyOn(CrmFormMappingStorage.prototype, "withForm").mockImplementation(
      async (_id, _write, work) => work(form, {} as never),
    );
    vi.spyOn(CrmCustomFieldsStorage.prototype, "listDefinitions").mockResolvedValue([]);
  });
  const path = "/api/admin/forms/form/crm-mapping";
  const cases = [
    [path, "GET", undefined],
    [path, "PUT", { expectedRevision: 0, mapping: null }],
    [path + "/preview", "POST", { expectedRevision: 0, mapping: null, sample: {} }],
  ] as const;
  it("requires authenticated admin for every mapping operation", async () => {
    for (const [target, method, body] of cases) {
      expect((await request(target, undefined, method, body)).status).toBe(401);
      expect((await request(target, "editor", method, body, ["content", "crm"])).status).toBe(403);
      expect((await request(target, "client", method, body)).status).toBe(403);
      expect((await request(target, "admin", method, body)).status).toBe(200);
    }
  });
  it.each(["cmsEnabled", "enabled"] as const)(
    "requires feature %s for reads, saves and preview",
    async (feature) => {
      state[feature] = false;
      for (const [target, method, body] of cases)
        expect((await request(target, "admin", method, body)).status).toBe(404);
      expect(CrmFormMappingStorage.prototype.save).not.toHaveBeenCalled();
    },
  );
  it("rejects extra controls and malformed mapping before storage", async () => {
    expect(
      (await request(path, "admin", "PUT", { expectedRevision: 0, mapping: null, transaction: {} }))
        .status,
    ).toBe(400);
    expect(
      (await request(path, "admin", "PUT", { expectedRevision: 0, mapping: { version: 2 } }))
        .status,
    ).toBe(400);
    expect(CrmFormMappingStorage.prototype.save).not.toHaveBeenCalled();
  });
  it("sanitizes failed writes and reports stale mapping conflicts", async () => {
    vi.mocked(CrmFormMappingStorage.prototype.save).mockRejectedValue(
      Object.assign(new Error("stale private sample"), { statusCode: 409 }),
    );
    expect(
      (await request(path, "admin", "PUT", { expectedRevision: 0, mapping: null })).status,
    ).toBe(409);
    vi.mocked(CrmFormMappingStorage.prototype.save).mockRejectedValue(
      new Error("SQL private sample password=secret"),
    );
    const response = await request(path, "admin", "PUT", { expectedRevision: 0, mapping: null });
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private sample");
  });
});

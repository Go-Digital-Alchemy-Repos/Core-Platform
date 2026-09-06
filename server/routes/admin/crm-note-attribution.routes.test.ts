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
  users: new Map<string, unknown>(),
  saved: vi.fn(),
  deleted: vi.fn(),
  note: vi.fn(async (data: unknown) => data),
}));
vi.mock("../../storage", () => ({
  storage: {
    crm: {
      getLeadById: async () => ({ id: "record" }),
      getClientById: async () => ({ id: "record" }),
      getLeadDetail: async () => ({
        id: "record",
        notes: [{ id: "note", authorName: "Ada Lovelace" }],
      }),
      getClientDetail: async () => ({
        id: "record",
        notes: [{ id: "note", authorName: "Ada Lovelace" }],
      }),
      createNote: state.note,
      createClientNote: state.note,
    },
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
import settingsRouter from "../settings.routes";
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
describe("mounted CRM note attribution", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json(), cookieParser());
    app.use("/api/admin", adminRouter);
    app.use("/api/admin", settingsRouter);
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
    state.raw = null;
    state.enabled = true;
    state.users.clear();
    vi.clearAllMocks();
  });

  it("rejects a suspended requester before reading notes", async () => {
    const token = cookie("admin");
    const user = state.users.get("admin") as User;
    state.users.set("admin", { ...user, isSuspended: true });
    for (const path of ["/api/admin/crm/record", "/api/admin/crm/clients/record"]) {
      const response = await fetch(base + path, { headers: { cookie: token } });
      expect(response.status).toBe(401);
    }
  });
  it.each(["/api/admin/crm/record", "/api/admin/crm/clients/record"])(
    "preserves requester gates and session note ownership for %s",
    async (path) => {
      expect((await request(path)).status).toBe(401);
      expect((await request(path, "client")).status).toBe(403);
      expect((await request(path, "editor")).status).toBe(403);
      for (const role of ["admin", "editor"]) {
        const response = await request(path, role, "GET", undefined, ["crm"]);
        expect(response.status).toBe(200);
        expect((await response.json()).notes[0].authorName).toBe("Ada Lovelace");
      }
      const created = await request(
        path + "/notes",
        "editor",
        "POST",
        {
          body: "Shared note",
          createdById: "someone-else",
          authorName: "Forged",
          visibility: "private",
        },
        ["crm"],
      );
      expect(created.status).toBe(201);
      expect(state.note).toHaveBeenLastCalledWith(
        expect.objectContaining({ body: "Shared note", createdById: "editorcrm" }),
      );
      expect(state.note.mock.calls.at(-1)?.[0]).not.toHaveProperty("visibility");
      expect(await created.json()).not.toHaveProperty("authorName");
      state.enabled = false;
      expect((await request(path, "admin")).status).toBe(404);
    },
  );
});

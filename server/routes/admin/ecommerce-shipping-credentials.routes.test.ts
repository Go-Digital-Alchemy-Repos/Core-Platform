import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { User } from "@shared/schema";
vi.mock("../../db", () => ({ db: {} }));
const state = vi.hoisted(() => ({
  enabled: true,
  users: new Map<string, unknown>(),
  values: new Map<string, { value: string; category: string }>(),
  writes: vi.fn(),
  rotationActor: vi.fn(),
  activated: vi.fn(async (data: unknown) => data),
}));
const quoteService = vi.hoisted(() => ({
  create: vi.fn(async () => ({
    statusCode: 201,
    quote: { id: "synthetic-attempt", status: "quoted" },
  })),
  read: vi.fn(async () => ({ id: "synthetic-attempt", status: "quoted" })),
  readiness: vi.fn(async () => ({
    implemented: true,
    configured: false,
    approvedTestCredentials: false,
    enabled: false,
    mode: "test",
    reasonCode: "not_configured",
  })),
  maintain: vi.fn(),
}));
vi.mock("../../services/ecommerce-shipping-quote-runtime.service", () => ({
  shippingQuoteService: quoteService,
}));
vi.mock("../../storage", () => ({
  storage: {
    users: { getUser: async (id: string) => state.users.get(id) },
    settings: {
      getSetting: async () => null,
      invalidateAll: () => {},
      invalidateCategory: () => {},
      upsertSetting: async (key: string, value: string, category: string) => {
        state.values.set(key, { value, category });
        return { key, value, category, isSecret: false };
      },
      deleteSetting: async (key: string) => {
        state.values.delete(key);
      },
      getDecryptedCategory: async (category: string) =>
        category === "system_configuration"
          ? { enable_ecommerce: String(state.enabled) }
          : Object.fromEntries(
              [...state.values]
                .filter(([, row]) => row.category === category)
                .map(([key, row]) => [key, row.value]),
            ),
      upsertSettings: async (entries: { key: string; value: string; category: string }[]) => {
        state.writes(entries);
        for (const entry of entries) state.values.set(entry.key, entry);
        return entries;
      },
    },
    ecommerce: { getShippingProviders: async () => [], upsertShippingProvider: state.activated },
  },
}));
vi.mock("../../storage/index", async () => await import("../../storage"));
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
vi.mock("./crm.routes", () => ({ default: express.Router() }));
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

vi.mock("../../services/ecommerce-shipping-credential-authorization.service", () => ({
  rotateEasyPostCredentials: async (_database: unknown, value: string, actorId?: string) => {
    state.rotationActor(actorId);
    state.writes([
      {
        key: "ecommerce_shipping_provider_easypost__apiKey",
        value,
        category: "ecommerce_shipping_provider_easypost",
        isSecret: true,
      },
    ]);
    state.values.set("ecommerce_shipping_provider_easypost__apiKey", {
      value,
      category: "ecommerce_shipping_provider_easypost",
    });
    return "synthetic-generation";
  },
  saveEasyPostProviderConfiguration: async (_database: unknown, data: unknown) =>
    state.activated(data),
}));
import adminRouter from "./index";
import settingsRouter from "../settings.routes";
import { generateToken } from "../../middleware/auth";
import { errorHandler } from "../../middleware/error-handler";
let server: Server, base: string;
function cookie(role: string) {
  const user = {
    id: role,
    email: "synthetic@example.test",
    password: "synthetic",
    role,
    isSuspended: false,
    adminPermissions: [],
  } as unknown as User;
  state.users.set(role, user);
  return "corePlatform_token=" + generateToken(user);
}
const request = (path: string, method = "GET", body?: unknown, role: string | null = "admin") =>
  fetch(base + path, {
    method,
    headers: {
      ...(role ? { cookie: cookie(role) } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
describe("mounted shipping credential routes", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json(), cookieParser());
    app.use("/api/admin", adminRouter);
    app.use("/api/admin", settingsRouter);
    app.use(errorHandler);
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    base =
      "http://127.0.0.1:" +
      (server.address() as AddressInfo).port +
      "/api/admin/ecommerce/shipping/providers";
  });
  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  beforeEach(() => {
    state.values.clear();
    state.users.clear();
    state.enabled = true;
    vi.clearAllMocks();
  });
  it("reserves every EasyPost authorization key in generic PUT and DELETE while retaining unrelated settings", async () => {
    const origin = base.replace("/api/admin/ecommerce/shipping/providers", "");
    for (const suffix of [
      "apiKey",
      "credentialGenerationId",
      "approvedTestGenerationId",
      "futureMetadata",
    ]) {
      const key = "ecommerce_shipping_provider_easypost__" + suffix;
      for (const [method, path, body] of [
        [
          "PUT",
          "/api/admin/settings",
          { key, value: "browser-value", category: "another_category", isSecret: false },
        ],
        ["DELETE", "/api/admin/settings/" + key, undefined],
      ] as const) {
        const response = await fetch(origin + path, {
          method,
          headers: { cookie: cookie("admin"), "Content-Type": "application/json" },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        expect(response.status).toBe(400);
      }
    }
    expect(state.values.size).toBe(0);
    const response = await fetch(origin + "/api/admin/settings", {
      method: "PUT",
      headers: { cookie: cookie("admin"), "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "unrelated_setting",
        value: "retained",
        category: "ordinary",
        isSecret: false,
      }),
    });
    expect(response.status).toBe(200);
    expect(state.values.get("unrelated_setting")?.value).toBe("retained");
  });
  it("does not accept caller-supplied approval or generation through credential setup", async () => {
    const response = await request("/easypost/credentials", "PUT", {
      credentials: {
        apiKey: "synthetic-key",
        credentialGenerationId: "forged",
        approvedTestGenerationId: "forged",
      },
    });
    expect(response.status).toBe(200);
    expect([...state.values.keys()]).toEqual(["ecommerce_shipping_provider_easypost__apiKey"]);
    expect(state.rotationActor).toHaveBeenLastCalledWith("admin");
    expect(JSON.stringify(await response.json())).not.toMatch(/forged|synthetic-key|Generation/);
  });
  it("preserves auth, role and module gates before reading or saving credentials", async () => {
    for (const [role, status] of [
      [null, 401],
      ["editor", 403],
      ["client", 403],
    ] as const)
      expect(
        (
          await request(
            "/shippo/credentials",
            "PUT",
            { credentials: { apiKey: "not-written" } },
            role,
          )
        ).status,
      ).toBe(status);
    state.enabled = false;
    expect(
      (await request("/shippo/credentials", "PUT", { credentials: { apiKey: "not-written" } }))
        .status,
    ).toBe(404);
    expect(state.writes).not.toHaveBeenCalled();
  });
  it("keeps public field names and reads independent readiness through all handlers", async () => {
    for (const provider of ["easypost", "shippo"]) {
      const saved = await request("/" + provider + "/credentials", "PUT", {
        credentials: { apiKey: "private-" + provider },
      });
      expect(saved.status).toBe(200);
      const text = await saved.text();
      expect(text).not.toContain("private-");
      expect(JSON.parse(text).setupFields[0]).toMatchObject({ key: "apiKey", hasValue: true });
    }
    expect([...state.values.keys()].sort()).toEqual([
      "ecommerce_shipping_provider_easypost__apiKey",
      "ecommerce_shipping_provider_shippo__apiKey",
    ]);
    const listed = await request("");
    expect(listed.headers.get("cache-control")).toContain("no-store");
    const raw = await listed.text();
    expect(raw).not.toContain("private-");
    const statuses = JSON.parse(raw);
    for (const provider of ["easypost", "shippo"])
      expect(
        statuses.find((s: { provider: string }) => s.provider === provider).setupFields[0].hasValue,
      ).toBe(true);
    const ready = await request("/easypost/readiness");
    expect((await ready.json()).setupFields[0].hasValue).toBe(true);
    expect(
      (
        await request("/easypost", "PUT", {
          displayName: "EasyPost",
          type: "aggregator",
          active: true,
        })
      ).status,
    ).toBe(200);
  });
  it("does not borrow another providers legacy key for readiness or activation", async () => {
    state.values.set("apiKey", {
      value: "legacy-private",
      category: "ecommerce_shipping_provider_easypost",
    });
    expect((await (await request("/shippo/readiness")).json()).setupFields[0].hasValue).toBe(false);
    expect(
      (await request("/shippo", "PUT", { displayName: "Shippo", type: "aggregator", active: true }))
        .status,
    ).toBe(400);
    expect(state.activated).not.toHaveBeenCalled();
    expect((await (await request("/easypost/readiness")).json()).setupFields[0].hasValue).toBe(
      true,
    );
  });
  it("returns a sanitized failure without exposing submitted or storage error values", async () => {
    state.writes.mockImplementationOnce(() => {
      throw new Error("private-database-credential");
    });
    const response = await request("/shippo/credentials", "PUT", {
      credentials: { apiKey: "private-submitted-credential" },
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "Shipping credentials could not be saved" });
    expect(state.values.size).toBe(0);
  });
  it("rejects unknown providers and preserves blank credentials", async () => {
    expect(
      (await request("/unknown/credentials", "PUT", { credentials: { apiKey: "secret" } })).status,
    ).toBe(404);
    state.values.set("ecommerce_shipping_provider_shipstation__apiKey", {
      value: "retained",
      category: "ecommerce_shipping_provider_shipstation",
    });
    const res = await request("/shipstation/credentials", "PUT", {
      credentials: { apiKey: "  ", apiSecret: "rotated" },
    });
    expect(res.status).toBe(200);
    expect(state.writes.mock.calls[0][0]).toEqual([
      {
        key: "ecommerce_shipping_provider_shipstation__apiSecret",
        value: "rotated",
        category: "ecommerce_shipping_provider_shipstation",
        isSecret: true,
      },
    ]);
    expect(await res.text()).not.toMatch(/retained|rotated/);
  });
  const quoteEndpoints = [
    ["POST", "/orders/synthetic-order/shipping-quotes", "create"],
    ["GET", "/orders/synthetic-order/shipping-quotes/synthetic-attempt", "read"],
    ["GET", "/shipping/providers/easypost/quote-readiness", "readiness"],
  ] as const;
  function quoteRequest(method: string, path: string, role: string | null) {
    const origin = base.replace("/api/admin/ecommerce/shipping/providers", "");
    return fetch(origin + "/api/admin/ecommerce" + path, {
      method,
      headers: {
        ...(role ? { cookie: cookie(role) } : {}),
        "Content-Type": "application/json",
        "Idempotency-Key": "2a85e348-23d7-49a4-882f-fd6bf537874c",
      },
      ...(method === "POST"
        ? {
            body: JSON.stringify({
              version: "1.0.0",
              locationId: "synthetic-location",
              items: [{ orderItemId: "item", quantity: 1 }],
              parcel: { weight: 16, weightUnit: "oz" },
            }),
          }
        : {}),
    });
  }
  it.each(quoteEndpoints)(
    "quote endpoint %s %s denies anonymous/non-admin before service",
    async (method, path) => {
      for (const [role, status] of [
        [null, 401],
        ["editor", 403],
        ["client", 403],
      ] as const) {
        const response = await quoteRequest(method, path, role);
        expect(response.status).toBe(status);
      }
      for (const handler of Object.values(quoteService)) expect(handler).not.toHaveBeenCalled();
    },
  );
  it.each(quoteEndpoints)(
    "quote endpoint %s %s retains ecommerce disabled gate",
    async (method, path) => {
      state.enabled = false;
      expect((await quoteRequest(method, path, "admin")).status).toBe(404);
      for (const handler of Object.values(quoteService)) expect(handler).not.toHaveBeenCalled();
    },
  );
  it.each(quoteEndpoints)(
    "admin reaches quote endpoint %s %s with private no-store",
    async (method, path, handler) => {
      const response = await quoteRequest(method, path, "admin");
      expect(response.status).toBe(method === "POST" ? 201 : 200);
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(response.headers.get("cache-control")).toContain("private");
      expect(quoteService[handler]).toHaveBeenCalledTimes(1);
      for (const name of ["create", "read", "readiness", "maintain"] as const)
        if (name !== handler) expect(quoteService[name]).not.toHaveBeenCalled();
      if (handler === "create")
        expect(quoteService.create).toHaveBeenCalledWith(
          "synthetic-order",
          "2a85e348-23d7-49a4-882f-fd6bf537874c",
          expect.objectContaining({ version: "1.0.0", locationId: "synthetic-location" }),
        );
      if (handler === "read")
        expect(quoteService.read).toHaveBeenCalledWith("synthetic-order", "synthetic-attempt");
      expect(await response.json()).toMatchObject(
        handler === "readiness"
          ? { mode: "test", reasonCode: "not_configured" }
          : { id: "synthetic-attempt" },
      );
    },
  );
});

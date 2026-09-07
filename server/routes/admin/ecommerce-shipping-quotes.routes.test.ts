import { afterEach, describe, it, expect, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { createShippingQuoteRouter } from "./ecommerce-shipping-quotes.routes";
import type { ShippingQuoteService } from "../../services/ecommerce-shipping-quote-orchestration";
let server: Server | undefined;
afterEach(async () => {
  if (server) {
    const current = server;
    server = undefined;
    await new Promise<void>((resolve, reject) =>
      current.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
async function harness() {
  const service = {
    create: vi.fn(),
    read: vi.fn(),
    readiness: vi.fn(),
    maintain: vi.fn(),
  } satisfies ShippingQuoteService;
  const app = express();
  app.use(express.json());
  app.use(
    "/api/admin/ecommerce",
    createShippingQuoteRouter(service, {
      requireAdmin: (req, res, next) =>
        req.get("X-Synthetic-Role") === "admin" ? next() : void res.sendStatus(403),
      requireEcommerceEnabled: (req, res, next) =>
        req.get("X-Synthetic-Ecommerce") === "enabled" ? next() : void res.sendStatus(404),
    }),
  );
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  const address = server!.address();
  if (!address || typeof address === "string") throw new Error("No local fixture address");
  const call = (path: string, init: RequestInit = {}) =>
    fetch(`http://127.0.0.1:${address.port}/api/admin/ecommerce${path}`, {
      ...init,
      signal: AbortSignal.timeout(2000),
    });
  return { call, service };
}
const headers = {
  "X-Synthetic-Role": "admin",
  "X-Synthetic-Ecommerce": "enabled",
  "content-type": "application/json",
};
describe("unmounted shipping quote router integration boundary", () => {
  it("executes supplied admin and ecommerce guards before all service calls", async () => {
    const { call, service } = await harness();
    for (const path of [
      "/shipping/providers/easypost/quote-readiness",
      "/orders/order/shipping-quotes/attempt",
    ]) {
      expect((await call(path)).status).toBe(403);
      expect((await call(path, { headers: { "X-Synthetic-Role": "admin" } })).status).toBe(404);
    }
    expect(
      (
        await call("/orders/order/shipping-quotes", {
          method: "POST",
          body: "{}",
          headers: { "content-type": "application/json" },
        })
      ).status,
    ).toBe(403);
    expect(service.create).not.toHaveBeenCalled();
    expect(service.read).not.toHaveBeenCalled();
    expect(service.readiness).not.toHaveBeenCalled();
  });
  it("passes scoped identifiers, idempotency header and body, with private no-store responses", async () => {
    const { call, service } = await harness();
    service.create.mockResolvedValue({
      quote: { id: "attempt" } as never,
      replayed: false,
      statusCode: 202,
    });
    const res = await call("/orders/order/shipping-quotes", {
      method: "POST",
      headers: { ...headers, "Idempotency-Key": "synthetic-key" },
      body: JSON.stringify({ version: "1.0.0" }),
    });
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ id: "attempt" });
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(service.create).toHaveBeenCalledWith("order", "synthetic-key", { version: "1.0.0" });
    service.read.mockResolvedValue({ id: "attempt" } as never);
    await call("/orders/order/shipping-quotes/attempt", { headers });
    expect(service.read).toHaveBeenCalledWith("order", "attempt");
  });
  it("returns typed readiness without invoking a quote transaction", async () => {
    const { call, service } = await harness();
    const readiness = {
      implemented: true,
      configured: true,
      approvedTestCredentials: false,
      enabled: false,
      mode: "test" as const,
      reasonCode: "test_approval_required" as const,
    };
    service.readiness.mockResolvedValue(readiness);
    const res = await call("/shipping/providers/easypost/quote-readiness", { headers });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(readiness);
    expect(service.create).not.toHaveBeenCalled();
  });
});

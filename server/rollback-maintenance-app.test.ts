import { afterEach, describe, expect, it, vi } from "vitest";
import type { Server } from "http";
import { createRollbackMaintenanceApp } from "./rollback-maintenance-app";

let server: Server | undefined;
afterEach(async () => {
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
  server = undefined;
});
async function fixture(ready = vi.fn().mockResolvedValue(undefined)) {
  const download = vi
    .fn()
    .mockResolvedValue({ buffer: Buffer.from("synthetic"), contentType: "image/webp" });
  server = createRollbackMaintenanceApp({ ready, download }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server!.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing fixture port");
  return { origin: `http://127.0.0.1:${address.port}`, download };
}

describe("rollback maintenance admission", () => {
  it("allows health, database readiness and namespaced media reads only", async () => {
    const { origin, download } = await fixture();
    expect((await fetch(`${origin}/health`)).status).toBe(200);
    expect((await fetch(`${origin}/ready`)).status).toBe(200);
    const media = await fetch(`${origin}/r2/cms/images/test.webp`);
    expect(media.status).toBe(200);
    expect(await media.text()).toBe("synthetic");
    expect(download).toHaveBeenCalledWith("cms/images/test.webp");
    for (const [method, path] of [
      ["POST", "/api/stripe/webhook"],
      ["POST", "/api/admin/ecommerce/orders"],
      ["GET", "/api/admin/settings"],
      ["DELETE", "/r2/cms/images/test.webp"],
      ["POST", "/api/contact"],
      ["GET", "/admin"],
    ]) {
      const response = await fetch(origin + path, { method });
      expect(response.status).toBe(503);
      expect(response.headers.get("retry-after")).toBe("60");
    }
    expect(download).toHaveBeenCalledTimes(1);
  });
  it("sanitizes readiness errors", async () => {
    const { origin } = await fixture(
      vi.fn().mockRejectedValue(new Error("synthetic-private-detail")),
    );
    const response = await fetch(origin + "/ready");
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("synthetic-private-detail");
  });
});

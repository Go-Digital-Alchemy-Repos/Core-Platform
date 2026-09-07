// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { ShippingQuotePanel } from "./shipping-quote-panel";
import { setQuoteSessionOwner, readQuoteSession } from "./shipping-quote-session";
import type { Order } from "./ecommerce-page.types";
const api = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: api.request }));
let host: HTMLDivElement, root: Root, client: QueryClient;
const order: Order = {
  id: "order-a",
  status: "paid",
  paymentStatus: "paid",
  fulfillmentMode: "shipping",
  totalAmount: 100,
  createdAt: "2026-09-07T00:00:00Z",
  items: [
    { id: "item", productName: "Parcel item", quantity: 2, lineTotal: 100, requiresShipping: true },
  ],
};
const ready = {
  implemented: true,
  configured: true,
  approvedTestCredentials: true,
  enabled: true,
  mode: "test",
  reasonCode: null,
};
const result = (status = "quoted") => ({
  id: "attempt-a",
  provider: "easypost",
  mode: "test",
  status,
  stale: false,
  createdAt: "2026-09-07T00:00:00Z",
  expiresAt: "2026-09-07T00:15:00Z",
  errorCode: status === "unknown" ? "request_timeout" : null,
  rates:
    status === "quoted"
      ? [
          {
            id: "rate_a",
            carrier: "Synthetic",
            service: "Ground",
            amount: 101,
            currency: "USD",
            estimatedDays: null,
            deliveryGuaranteed: null,
          },
        ]
      : [],
});
const response = (data: unknown) => ({ json: async () => data });
let post: () => Promise<unknown>, get: () => Promise<unknown>;
async function render(o = order, userId = "user-a") {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ShippingQuotePanel
          key={`${userId}:${o.id}`}
          userId={userId}
          order={o}
          remaining={{ item: 2 }}
        />
      </QueryClientProvider>,
    );
  });
  await tick();
}
async function tick() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
async function fill(id: string, value: string) {
  await act(async () => {
    const el = host.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement;
    const proto =
      el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  });
}
function button(label: string) {
  return [...host.querySelectorAll("button")].find((b) => b.textContent === label)!;
}
async function click(label: string) {
  await act(async () => button(label).click());
  await tick();
}
async function draft() {
  await fill("quote-location", "location");
  await fill("quote-weight", "16");
}
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  sessionStorage.clear();
  setQuoteSessionOwner("user-a");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  post = async () => response(result());
  get = async () => response(result());
  api.request.mockReset();
  api.request.mockImplementation((method: string, url: string) => {
    if (method === "POST") return post();
    if (url.endsWith("quote-readiness")) return Promise.resolve(response(ready));
    if (url.endsWith("/locations"))
      return Promise.resolve(
        response([
          { id: "location", name: "Warehouse", active: true },
          { id: "inactive", name: "Inactive", active: false },
        ]),
      );
    return get();
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  host.remove();
});
describe("shipping quote panel synthetic API wiring", () => {
  it("submits strict request with UUID and displays normalized test rates without buying", async () => {
    await render();
    await draft();
    expect(host.textContent).toContain("16.0 oz");
    expect(host.textContent).not.toContain("Inactive");
    await click("Get test shipping rates");
    const sent = api.request.mock.calls.find((c) => c[0] === "POST")!;
    expect(sent[1]).toBe("/api/admin/ecommerce/orders/order-a/shipping-quotes");
    expect(sent[2]).toEqual({
      version: "1.0.0",
      locationId: "location",
      items: [{ orderItemId: "item", quantity: 2 }],
      parcel: { weight: 16, weightUnit: "oz" },
    });
    expect(sent[3].headers["Idempotency-Key"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(host.textContent).toContain("$1.01 USD");
    expect(host.textContent).toContain("Delivery guarantee unknown");
    expect(host.textContent).toContain("Label purchase is unavailable");
  });
  it("lost response retries immutable key/body even after order refetch", async () => {
    post = async () => {
      throw new Error("abort");
    };
    await render();
    await draft();
    await click("Get test shipping rates");
    const first = api.request.mock.calls.find((c) => c[0] === "POST")!;
    await render({ ...order, items: [...order.items].reverse() });
    post = async () => response(result());
    await click("Retry same quote request");
    const calls = api.request.mock.calls.filter((c) => c[0] === "POST");
    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual(first);
  });
  it("reload recovers unknown attempt via GET and refresh never POSTs", async () => {
    post = async () => response(result("unknown"));
    await render();
    await draft();
    await click("Get test shipping rates");
    await act(async () => root.unmount());
    root = createRoot(host);
    get = async () => response(result("unknown"));
    await render();
    expect(host.textContent).toContain("outcome is unknown");
    await click("Refresh quote status");
    expect(api.request.mock.calls.filter((c) => c[0] === "POST")).toHaveLength(1);
    expect((host.querySelector("#quote-weight") as HTMLInputElement).value).toBe("16");
  });
  it("reload after lost POST keeps key for explicit same-request recovery", async () => {
    post = async () => {
      throw new Error("abort");
    };
    await render();
    await draft();
    await click("Get test shipping rates");
    const key = readQuoteSession("user-a", order.id)!.request!.key;
    await act(async () => root.unmount());
    root = createRoot(host);
    await render();
    post = async () => response(result());
    await click("Retry same quote request");
    expect(
      api.request.mock.calls.filter((c) => c[0] === "POST")[1][3].headers["Idempotency-Key"],
    ).toBe(key);
  });
  it("late response for order A never replaces order B draft", async () => {
    let resolve!: (v: unknown) => void;
    post = () =>
      new Promise((r) => {
        resolve = r;
      });
    await render();
    await draft();
    await click("Get test shipping rates");
    await render({ ...order, id: "order-b" });
    await fill("quote-weight", "32");
    await act(async () => resolve(response(result())));
    await tick();
    expect((host.querySelector("#quote-weight") as HTMLInputElement).value).toBe("32");
    expect(host.textContent).not.toContain("$1.01");
    expect(readQuoteSession("user-a", "order-a")?.request?.attemptId).toBe("attempt-a");
  });
  it("identity switch hides and clears old recovery entries", async () => {
    await render();
    await draft();
    setQuoteSessionOwner("user-b");
    await render(order, "user-b");
    expect((host.querySelector("#quote-weight") as HTMLInputElement).value).toBe("");
    expect(readQuoteSession("user-a", order.id)).toBeNull();
  });
  it("failed status refresh retains previous result and draft", async () => {
    await render();
    await draft();
    await click("Get test shipping rates");
    get = async () => {
      throw new Error("abort");
    };
    await click("Refresh quote status");
    expect(host.textContent).toContain("$1.01 USD");
    expect(host.textContent).toContain("previous result have been kept");
    expect((host.querySelector("#quote-weight") as HTMLInputElement).value).toBe("16");
  });
  it("explicit new quote keeps draft and uses a different key", async () => {
    await render();
    await draft();
    await click("Get test shipping rates");
    await click("New quote");
    expect((host.querySelector("#quote-weight") as HTMLInputElement).value).toBe("16");
    await click("Get test shipping rates");
    const calls = api.request.mock.calls.filter((c) => c[0] === "POST");
    expect(calls[0][3]).not.toEqual(calls[1][3]);
  });
  it("settings GET failure blocks submission and retry retains draft", async () => {
    const base = api.request.getMockImplementation()!;
    let fail = true;
    api.request.mockImplementation((...args) =>
      args[1].endsWith("/locations") && fail ? Promise.reject(new Error("abort")) : base(...args),
    );
    await render();
    await fill("quote-weight", "16");
    expect(button("Get test shipping rates").disabled).toBe(true);
    fail = false;
    await click("Retry quote settings");
    expect((host.querySelector("#quote-weight") as HTMLInputElement).value).toBe("16");
  });
  it("StrictMode still displays completed results", async () => {
    await act(async () => {
      root.render(
        <React.StrictMode>
          <QueryClientProvider client={client}>
            <ShippingQuotePanel userId="user-a" order={order} remaining={{ item: 2 }} />
          </QueryClientProvider>
        </React.StrictMode>,
      );
    });
    await tick();
    await draft();
    await click("Get test shipping rates");
    expect(host.textContent).toContain("$1.01 USD");
  });
  it("retains unknown history and restores its immutable attempt", async () => {
    post = async () => response(result("unknown"));
    await render();
    await draft();
    await click("Get test shipping rates");
    const key = readQuoteSession("user-a", order.id)!.request!.key;
    await click("New quote");
    expect(host.textContent).toContain("Prior quote 1: unknown");
    await fill("quote-weight", "32");
    get = async () => response(result("unknown"));
    await click("Review prior quote 1");
    expect(readQuoteSession("user-a", order.id)?.request?.key).toBe(key);
    expect((host.querySelector("#quote-weight") as HTMLInputElement).value).toBe("16");
    expect(api.request.mock.calls.filter((c) => c[0] === "POST")).toHaveLength(1);
  });
  it("allows partially refunded shipped orders with remaining units but blocks manual risk review", async () => {
    await render({ ...order, paymentStatus: "partially_refunded", status: "shipped" });
    await draft();
    expect(button("Get test shipping rates").disabled).toBe(false);
    await render({ ...order, fraudDecision: "manual_review" });
    expect(button("Get test shipping rates").disabled).toBe(true);
  });
  it("rejects negative selections instead of silently dropping them", async () => {
    await render({
      ...order,
      items: [
        ...order.items,
        { id: "other", productName: "Other", quantity: 1, lineTotal: 10, requiresShipping: true },
      ],
    });
    await draft();
    await fill("quote-item-other", "-1");
    expect(button("Get test shipping rates").disabled).toBe(true);
    expect(host.textContent).toContain("Choose items");
  });
  it.each(["resolve", "reject"] as const)(
    "ignores stale StrictMode GET %s after a new quote starts",
    async (outcome) => {
      await render();
      await draft();
      await click("Get test shipping rates");
      await act(async () => root.unmount());
      root = createRoot(host);
      const pending: Array<{ resolve: (v: unknown) => void; reject: (e: Error) => void }> = [];
      get = () => new Promise((resolve, reject) => pending.push({ resolve, reject }));
      await act(async () =>
        root.render(
          <React.StrictMode>
            <QueryClientProvider client={client}>
              <ShippingQuotePanel userId="user-a" order={order} remaining={{ item: 2 }} />
            </QueryClientProvider>
          </React.StrictMode>,
        ),
      );
      expect(pending).toHaveLength(2);
      // Settle the currently owning GET first; the older StrictMode request is still in flight.
      await act(async () => pending[1].resolve(response(result())));
      await tick();
      await click("New quote");
      let finishPost!: (value: unknown) => void;
      post = () =>
        new Promise((resolve) => {
          finishPost = resolve;
        });
      await click("Get test shipping rates");
      await act(async () => {
        if (outcome === "resolve")
          pending[0].resolve(
            response({ ...result(), rates: [{ ...result().rates[0], amount: 999 }] }),
          );
        else pending[0].reject(new Error("late abort"));
      });
      await tick();
      expect(host.textContent).not.toContain("$9.99");
      expect(host.textContent).not.toContain("Quote status could not be loaded");
      expect(button("New quote").disabled).toBe(true);
      expect(host.textContent).toContain("Checking quote");
      await act(async () => finishPost(response({ ...result(), id: "attempt-new" })));
      await tick();
      expect(button("New quote").disabled).toBe(false);
      expect(readQuoteSession("user-a", order.id)?.request?.attemptId).toBe("attempt-new");
    },
  );
  it("invalid package and unapproved credentials cannot submit", async () => {
    await render();
    await draft();
    await fill("quote-length", "1");
    expect(button("Get test shipping rates").disabled).toBe(true);
    await fill("quote-length", "");
    client.setQueryData(["shipping-quote-readiness", "user-a"], {
      ...ready,
      approvedTestCredentials: false,
      reasonCode: "test_approval_required",
    });
    await tick();
    expect(button("Get test shipping rates").disabled).toBe(true);
  });
});

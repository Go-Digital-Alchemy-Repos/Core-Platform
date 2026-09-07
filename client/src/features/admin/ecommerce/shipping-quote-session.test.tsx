// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  clearQuoteSessions,
  readQuoteSession,
  setQuoteSessionOwner,
  writeQuoteSession,
  type QuoteSession,
} from "./shipping-quote-session";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
vi.mock("@/lib/queryClient", async () => {
  const { QueryClient } = await import("@tanstack/react-query");
  return {
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    }),
    apiRequest: vi.fn(async () => ({ json: async () => ({ id: "user-b", role: "admin" }) })),
    getQueryFn: () => async () => ({ id: "user-a", role: "admin" }),
    STALE_TIMES: { SESSION: 300000 },
  };
});
const draft = {
  locationId: "location",
  quantities: { item: "1" },
  weight: "16",
  weightUnit: "oz" as const,
  length: "",
  width: "",
  height: "",
  dimensionUnit: "in" as const,
};
const session: QuoteSession = {
  draft,
  request: {
    key: "6a09639e-31b3-4650-b43a-d787c657699c",
    body: {
      version: "1.0.0",
      locationId: "location",
      items: [{ orderItemId: "item", quantity: 1 }],
      parcel: { weight: 16, weightUnit: "oz" },
    },
  },
};
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  sessionStorage.clear();
  setQuoteSessionOwner("user-a");
});
afterEach(() => queryClient.clear());
describe("shipping quote recovery storage", () => {
  it("rejects malformed and oversized stored entries without loading them", () => {
    expect(writeQuoteSession("user-a", "order", session)).toBe(true);
    const key = Object.keys(sessionStorage).find((k) => k.endsWith(":order"))!;
    sessionStorage.setItem(key, JSON.stringify({ ...session, addresses: "forbidden" }));
    expect(readQuoteSession("user-a", "order")).toBeNull();
    sessionStorage.setItem(key, "x".repeat(24001));
    expect(readQuoteSession("user-a", "order")).toBeNull();
  });
  it("caps records without evicting unresolved recovery", () => {
    for (let i = 0; i < 20; i++) expect(writeQuoteSession("user-a", String(i), session)).toBe(true);
    expect(writeQuoteSession("user-a", "overflow", session)).toBe(false);
    expect(readQuoteSession("user-a", "0")?.request?.key).toBe(session.request!.key);
  });
  it("caps retained history and rejects unsafe data", () => {
    expect(
      writeQuoteSession("user-a", "order", {
        ...session,
        history: Array.from({ length: 6 }, () => ({ draft, request: session.request! })),
      }),
    ).toBe(false);
    expect(
      writeQuoteSession("user-a", "order", {
        ...session,
        draft: { ...draft, weight: "x".repeat(65) },
      }),
    ).toBe(false);
  });
  it("old user cannot persist a late result after identity switch", () => {
    writeQuoteSession("user-a", "order", session);
    setQuoteSessionOwner("user-b");
    expect(writeQuoteSession("user-a", "order", session)).toBe(false);
    expect(readQuoteSession("user-a", "order")).toBeNull();
  });
  it("logout clears recovery with no OrdersTab mounted", async () => {
    writeQuoteSession("user-a", "order", session);
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    let auth!: ReturnType<typeof useAuth>;
    function AuthOnly() {
      auth = useAuth();
      return null;
    }
    try {
      await act(async () =>
        root.render(
          <QueryClientProvider client={queryClient}>
            <AuthOnly />
          </QueryClientProvider>,
        ),
      );
      await act(async () => {
        await auth.logout.mutateAsync();
      });
      expect(readQuoteSession("user-a", "order")).toBeNull();
      expect(Object.keys(sessionStorage)).toHaveLength(0);
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });
  it("clears only its own namespace", () => {
    sessionStorage.setItem("unrelated", "keep");
    writeQuoteSession("user-a", "order", session);
    clearQuoteSessions();
    expect(sessionStorage.getItem("unrelated")).toBe("keep");
  });
});

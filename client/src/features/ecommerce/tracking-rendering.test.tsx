// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const order = vi.hoisted(() => ({
  id: "tracking-order",
  status: "shipped",
  paymentStatus: "paid",
  totalAmount: 100,
  items: [],
  shipments: [
    {
      id: "bad",
      status: "shipped",
      trackingNumber: "LEGACY-BAD",
      trackingUrl: "javascript:alert(1)",
    },
    { id: "data", status: "shipped", trackingUrl: "data:text/html,unsafe" },
    {
      id: "good",
      status: "shipped",
      trackingNumber: null,
      trackingUrl: "https://carrier.example.test/track",
    },
  ],
}));
const overview = vi.hoisted(() => ({
  customer: { name: "Synthetic", email: "synthetic@example.test" },
  addresses: [],
  recentOrders: [],
}));
const empty = vi.hoisted(() => []);
vi.mock("@/components/layout/page-layout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "customer", role: "client", email: "synthetic@example.test" },
    logout: vi.fn(),
  }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey: string[] }) => ({
    data:
      options.queryKey[0] === "/api/ecommerce/account/orders"
        ? order
        : options.queryKey[0] === "/api/ecommerce/account"
          ? overview
          : empty,
    isError: false,
  }),
  useMutation: (options: { onSuccess?: (data: unknown) => void }) => ({
    mutate: () => options.onSuccess?.(order),
    isPending: false,
  }),
}));
import CustomerAccountPage from "./customer-account-page";
import OrderStatusPage from "./order-status-page";
let root: Root, host: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});
it.each(["account", "public"] as const)(
  "keeps existing unsafe shipment links inert in %s order detail while preserving URL-only tracking",
  (view) => {
    window.history.replaceState(
      {},
      "",
      view === "public"
        ? "/order-status?orderId=tracking-order&email=synthetic%40example.test&token=synthetic"
        : "/account/orders/tracking-order",
    );
    act(() =>
      root.render(view === "account" ? <CustomerAccountPage view="order" /> : <OrderStatusPage />),
    );
    expect(host.textContent).toContain("LEGACY-BAD");
    expect(host.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(host.querySelector('a[href^="data:"]')).toBeNull();
    const link = host.querySelector('a[href="https://carrier.example.test/track"]');
    expect(link?.textContent).toContain("Track");
    expect(link?.getAttribute("rel")).toContain("noreferrer");
  },
);

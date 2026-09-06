// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
let root: Root;
let host: HTMLDivElement;
const waitFor = async (check: () => void) => {
  for (let i = 0; i < 80; i++) {
    try {
      check();
      return;
    } catch {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 15));
      });
    }
  }
  check();
};
const visible = (element: Element) => !element.closest("[hidden]");
const byRole = (role: string, options?: { name: string }) =>
  [...host.querySelectorAll(role === "button" ? "button" : `[role="${role}"]`)].find(
    (element) =>
      visible(element) &&
      (!options ||
        (element.getAttribute("aria-label") || element.textContent?.trim()) === options.name),
  ) as HTMLElement | undefined;
const required = (element: Element | undefined | null) => {
  if (!element) throw new Error("Expected element missing");
  return element as HTMLElement;
};
const find = async (lookup: () => Element | undefined | null) => {
  await waitFor(() => {
    required(lookup());
  });
  return required(lookup());
};
const display = (value: string) =>
  [...host.querySelectorAll("input")].find((input) => visible(input) && input.value === value);
const label = (value: string) => {
  const target = [...host.querySelectorAll("label")].find((item) => item.textContent === value);
  return target?.htmlFor ? host.querySelector(`[id="${target.htmlFor}"]`) : null;
};
const text = (value: string) =>
  [...host.querySelectorAll("p")].find((item) => visible(item) && item.textContent === value);
const screen = {
  getByRole: (role: string, options?: { name: string }) => required(byRole(role, options)),
  queryByRole: (role: string, options?: { name: string }) => byRole(role, options) ?? null,
  findByRole: (role: string, options?: { name: string }) => find(() => byRole(role, options)),
  findByLabelText: (value: string) => find(() => label(value)),
  findByText: (value: string) => find(() => text(value)),
  queryByText: (value: string) => text(value) ?? null,
  findByDisplayValue: (value: string) => find(() => display(value)),
  getByDisplayValue: (value: string) => required(display(value)),
  queryByDisplayValue: (value: string) => display(value) ?? null,
};
const fireEvent = {
  click: (element: HTMLElement) => act(() => element.click()),
  change: (element: HTMLElement, event: { target: { value: string } }) =>
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        element,
        event.target.value,
      );
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }),
};
const render = (ui: React.ReactElement) => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(ui));
  return { rerender: (next: React.ReactElement) => act(() => root.render(next)) };
};
const cleanup = () => {
  act(() => root?.unmount());
  host?.remove();
};
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/queryClient", () => ({ apiRequest: api }));
vi.mock("@/components/layout/page-layout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
import OrderStatusPage from "./order-status-page";
let client: QueryClient;
const response = (data: unknown) => ({ json: async () => data });
const order = (id: string) => ({
  id,
  status: "paid",
  paymentStatus: "paid",
  totalAmount: 100,
  items: [],
  shipments: [],
});
const fill = (id: string, value: string) =>
  fireEvent.change(required(host.querySelector("#" + id)), { target: { value } });
const mount = () =>
  render(
    <QueryClientProvider client={client}>
      <OrderStatusPage />
    </QueryClientProvider>,
  );
beforeEach(() => {
  vi.stubGlobal("React", React);
  api.mockReset();
  window.history.replaceState({}, "", "/");
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});
describe("order status request recovery", () => {
  it("clears old details, exposes lookup failure, and keeps entered values for retry", async () => {
    api.mockResolvedValue(response(order("first")));
    mount();
    fill("status-order-id", "first");
    fill("status-email", "buyer@example.test");
    fill("status-token", "synthetic");
    fireEvent.click(screen.getByRole("button", { name: "Find order" }));
    await waitFor(() => expect(host.textContent).toContain("#first"));
    fill("status-order-id", "second");
    expect(host.textContent).not.toContain("#first");
    let reject!: (error: Error) => void;
    api.mockImplementation(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Find order" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Finding order…" }).hasAttribute("disabled")).toBe(
        true,
      ),
    );
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
    await act(async () => reject(new Error("secret backend detail")));
    await screen.findByText("Order could not be loaded. Check your details and try again.");
    expect(host.textContent).not.toContain("secret backend detail");
    expect((host.querySelector("#status-order-id") as HTMLInputElement).value).toBe("second");
    api.mockResolvedValue(response(order("second")));
    fireEvent.click(screen.getByRole("button", { name: "Find order" }));
    await waitFor(() => expect(host.textContent).toContain("#second"));
  });
  it("ignores old successful lookup after editing and completing a newer lookup", async () => {
    let finishOld!: (value: unknown) => void;
    api
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOld = resolve;
          }),
      )
      .mockResolvedValue(response(order("new")));
    mount();
    fill("status-order-id", "old");
    fill("status-email", "buyer@example.test");
    fill("status-token", "synthetic");
    fireEvent.click(screen.getByRole("button", { name: "Find order" }));
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    fill("status-order-id", "new");
    fireEvent.click(screen.getByRole("button", { name: "Find order" }));
    await waitFor(() => expect(host.textContent).toContain("#new"));
    await act(async () => finishOld(response(order("old"))));
    expect(host.textContent).toContain("#new");
    expect(host.textContent).not.toContain("#old");
  });
  it("shows link pending/error and ignores stale link success after input changes", async () => {
    api.mockRejectedValueOnce(new Error("private diagnostic"));
    mount();
    fill("status-order-id", "missing");
    fill("status-email", "buyer@example.test");
    fireEvent.click(screen.getByRole("button", { name: "Email secure status link" }));
    await screen.findByText("Secure status link could not be requested. Please try again.");
    let finish!: (value: unknown) => void;
    api.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Email secure status link" }));
    await screen.findByText("Requesting your secure link…");
    fill("status-order-id", "changed");
    await act(async () => finish(response({ message: "Old request message" })));
    expect(host.textContent).not.toContain("Old request message");
    expect(
      screen.getByRole("button", { name: "Email secure status link" }).hasAttribute("disabled"),
    ).toBe(false);
  });
});

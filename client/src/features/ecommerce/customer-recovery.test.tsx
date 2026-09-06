// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
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
const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  toast: vi.fn(),
  user: { id: "customer-a", email: "a@example.test", role: "client" } as {
    id: string;
    email: string;
    role: string;
  } | null,
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: mocks.user, logout: { mutate: vi.fn() } }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/components/layout/page-layout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@stripe/stripe-js", () => ({ loadStripe: vi.fn().mockResolvedValue(null) }));
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: () => <div data-testid="payment-elements" />,
  PaymentElement: () => null,
  useStripe: () => null,
  useElements: () => null,
}));
vi.mock("@/lib/queryClient", async () => {
  const { QueryClient } = await import("@tanstack/react-query");
  return {
    apiRequest: mocks.api,
    queryClient: new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Infinity,
          queryFn: async ({ queryKey }) => (await mocks.api("GET", queryKey[0])).json(),
        },
        mutations: { retry: false },
      },
    }),
  };
});
import { queryClient } from "@/lib/queryClient";
import CustomerAccountPage from "./customer-account-page";
import CheckoutPage from "./checkout-page";
const overview = (name = "Alice Original") => ({
  customer: {
    name,
    email: "a@example.test",
    phone: "111",
    marketingEmailOptIn: false,
    orderSmsOptIn: false,
  },
  addresses: [],
  recentOrders: [],
  orderCount: 0,
  openShipmentCount: 0,
});
const response = (data: unknown) => ({ status: 200, json: async () => data });
const settings = { customerAccountMode: "required", store: { allowedCountries: ["US"] } };
const mount = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  queryClient.clear();
  mocks.api.mockReset();
  mocks.toast.mockReset();
  mocks.user = { id: "customer-a", email: "a@example.test", role: "client" };
  localStorage.setItem(
    "core-platform-ecommerce-cart",
    JSON.stringify([
      { productId: "synthetic", name: "Test", slug: "test", quantity: 1, unitPrice: 1200 },
    ]),
  );
  mocks.api.mockImplementation(async (method, path) =>
    response(
      path === "/api/ecommerce/account"
        ? overview()
        : path === "/api/ecommerce/checkout/settings"
          ? settings
          : path === "/api/ecommerce/stripe/config"
            ? { publishableKey: "pk_test_synthetic" }
            : [],
    ),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("checkout settings recovery", () => {
  it("blocks a slow then failed settings load and retries without a payment request", async () => {
    let reject!: (error: Error) => void;
    mocks.api.mockImplementation(async (_method, path) =>
      path === "/api/ecommerce/checkout/settings"
        ? new Promise((_resolve, fail) => {
            reject = fail;
          })
        : response(path.includes("stripe") ? { publishableKey: "pk_test_synthetic" } : []),
    );
    mount(<CheckoutPage />);
    expect(await screen.findByText("Loading checkout settings...")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Continue to payment" })).toBeNull();
    act(() => {
      host
        .querySelector("#checkout-details-form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(mocks.api.mock.calls.every(([method]) => method === "GET")).toBe(true);
    await act(async () => reject(new Error("private backend failure")));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("could not be loaded"),
    );
    mocks.api.mockImplementation(async () => response(settings));
    fireEvent.click(screen.getByRole("button", { name: "Retry checkout settings" }));
    expect(await screen.findByRole("button", { name: "Continue to payment" })).toBeTruthy();
    expect(mocks.api.mock.calls.every(([method]) => method === "GET")).toBe(true);
  });
  it("never autofills another customer's cached addresses on identity switch", async () => {
    queryClient.setQueryData(
      ["/api/ecommerce/account/addresses"],
      [
        {
          id: "old",
          address: "Old private address",
          city: "Old",
          state: "MA",
          zipCode: "00000",
          country: "US",
          isDefault: true,
        },
      ],
    );
    mocks.api.mockImplementation(async (_method, path) => {
      if (path === "/api/ecommerce/account/addresses")
        return response(
          mocks.user?.id === "customer-a"
            ? []
            : [
                {
                  id: "new",
                  label: "Home",
                  address: "New own address",
                  city: "New",
                  state: "MA",
                  zipCode: "11111",
                  country: "US",
                  isDefault: true,
                },
              ],
        );
      return response(path.includes("stripe") ? { publishableKey: "pk_test_synthetic" } : settings);
    });
    const view = mount(<CheckoutPage />);
    await screen.findByRole("button", { name: "Continue to payment" });
    expect(screen.queryByDisplayValue("Old private address")).toBeNull();
    queryClient.setQueryData(
      ["/api/ecommerce/account/addresses", "customer-a"],
      [
        {
          id: "a",
          address: "Another A address",
          city: "Old",
          state: "MA",
          zipCode: "00000",
          country: "US",
        },
      ],
    );
    mocks.user = { id: "customer-b", email: "b@example.test", role: "client" };
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <CheckoutPage />
      </QueryClientProvider>,
    );
    expect(await screen.findByDisplayValue("New own address")).toBeTruthy();
    expect(screen.queryByDisplayValue("Another A address")).toBeNull();
    expect(
      mocks.api.mock.calls
        .filter(([, path]) => String(path).includes("account/addresses"))
        .every(([, path]) => path === "/api/ecommerce/account/addresses"),
    ).toBe(true);
  });
  it.each(["customer-b", null])(
    "clears already autofilled private address on switch to %s",
    async (nextIdentity) => {
      mocks.api.mockImplementation(async (_method, path) => {
        if (path === "/api/ecommerce/account/addresses")
          return response([
            {
              id: mocks.user?.id,
              label: "Home",
              address: mocks.user?.id === "customer-a" ? "Private A street" : "Own B street",
              city: "City",
              state: "MA",
              zipCode: "11111",
              country: "US",
              isDefault: true,
            },
          ]);
        if (path === "/api/ecommerce/checkout/payment-intent")
          return response({
            orderId: "private-order-a",
            clientSecret: "synthetic-never-sent",
            lookupToken: "synthetic",
            priced: {
              subtotalAmount: 1200,
              discountAmount: 0,
              shippingAmount: 0,
              taxAmount: 0,
              totalAmount: 1200,
            },
          });
        if (path === "/api/ecommerce/shipping/rates") return response([]);
        return response(
          path.includes("stripe") ? { publishableKey: "pk_test_synthetic" } : settings,
        );
      });
      const view = mount(<CheckoutPage />);
      await screen.findByDisplayValue("Private A street");
      fireEvent.change(await screen.findByLabelText("Full name"), {
        target: { value: "Private A name" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Update rates" }));
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
      });
      act(() => {
        host
          .querySelector("#checkout-details-form")!
          .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      });
      await find(() => host.querySelector('[data-testid="payment-elements"]'));
      mocks.user = nextIdentity
        ? { id: nextIdentity, email: "b@example.test", role: "client" }
        : null;
      view.rerender(
        <QueryClientProvider client={queryClient}>
          <CheckoutPage />
        </QueryClientProvider>,
      );
      expect(host.querySelector('[data-testid="payment-elements"]')).toBeNull();
      expect(screen.queryByDisplayValue("Private A street")).toBeNull();
      expect(screen.queryByDisplayValue("Private A name")).toBeNull();
      if (nextIdentity) expect(await screen.findByDisplayValue("Own B street")).toBeTruthy();
      else expect(((await screen.findByLabelText("Address")) as HTMLInputElement).value).toBe("");
      expect(await screen.findByRole("button", { name: "Continue to payment" })).toBeTruthy();
    },
  );
  it("preserves anonymous manual draft when logging in during checkout", async () => {
    mocks.user = null;
    const view = mount(<CheckoutPage />);
    await screen.findByRole("button", { name: "Continue to payment" });
    fireEvent.change(await screen.findByLabelText("Address"), {
      target: { value: "My manual draft" },
    });
    mocks.user = { id: "customer-b", email: "b@example.test", role: "client" };
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <CheckoutPage />
      </QueryClientProvider>,
    );
    expect(await screen.findByDisplayValue("My manual draft")).toBeTruthy();
  });
  it("preserves entered checkout details across failed background refresh and retry", async () => {
    mount(<CheckoutPage />);
    await screen.findByRole("button", { name: "Continue to payment" });
    const name = await screen.findByLabelText("Full name");
    fireEvent.change(name, { target: { value: "My draft" } });
    mocks.api.mockRejectedValue(new Error("private"));
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/ecommerce/checkout/settings"] });
    });
    expect(await screen.findByRole("alert")).toBeTruthy();
    mocks.api.mockResolvedValue(response(settings));
    fireEvent.click(screen.getByRole("button", { name: "Retry checkout settings" }));
    expect(await screen.findByDisplayValue("My draft")).toBeTruthy();
  });
});
describe("account recovery", () => {
  it("shows failed initial account load and a working retry rather than endless loading", async () => {
    mocks.api.mockRejectedValue(new Error("private"));
    mount(<CustomerAccountPage view="profile" />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save profile" })).toBeNull();
    mocks.api.mockResolvedValue(response(overview()));
    fireEvent.click(screen.getByRole("button", { name: "Retry account" }));
    expect(await screen.findByDisplayValue("Alice")).toBeTruthy();
  });
  it("keeps dirty profile on refetch, updates clean fields and resets on identity switch", async () => {
    const view = mount(<CustomerAccountPage view="profile" />);
    const first = await screen.findByLabelText("First name");
    await waitFor(() => expect((first as HTMLInputElement).value).toBe("Alice"));
    fireEvent.change(first, { target: { value: "Draft" } });
    await act(async () => {
      queryClient.setQueryData(["/api/ecommerce/account", "customer-a"], overview("Server New"));
    });
    expect(screen.getByDisplayValue("Draft")).toBeTruthy();
    mocks.user = { id: "customer-b", email: "b@example.test", role: "client" };
    mocks.api.mockResolvedValue(response(overview("Bob Second")));
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <CustomerAccountPage view="profile" />
      </QueryClientProvider>,
    );
    expect(screen.queryByDisplayValue("Draft")).toBeNull();
    expect(await screen.findByDisplayValue("Bob")).toBeTruthy();
  });
  it("refreshes a clean profile but retains it through a failed query retry after editing", async () => {
    mount(<CustomerAccountPage view="profile" />);
    await screen.findByDisplayValue("Alice");
    await act(async () => {
      queryClient.setQueryData(["/api/ecommerce/account", "customer-a"], overview("Fresh Person"));
    });
    expect(await screen.findByDisplayValue("Fresh")).toBeTruthy();
    fireEvent.change(screen.getByDisplayValue("Fresh"), { target: { value: "Unsaved" } });
    mocks.api.mockRejectedValue(new Error("private"));
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/ecommerce/account", "customer-a"] });
    });
    expect(await screen.findByRole("alert")).toBeTruthy();
    mocks.api.mockResolvedValue(response(overview("Server Person")));
    fireEvent.click(screen.getByRole("button", { name: "Retry account" }));
    expect(await screen.findByDisplayValue("Unsaved")).toBeTruthy();
  });
  it("retains an address draft when the overview refreshes", async () => {
    mount(<CustomerAccountPage view="addresses" />);
    await screen.findByRole("button", { name: "Add address" });
    const labelInput = required(host.querySelector('input[placeholder="Home, Work, Studio"]'));
    fireEvent.change(labelInput, { target: { value: "Draft address" } });
    await act(async () => {
      queryClient.setQueryData(
        ["/api/ecommerce/account", "customer-a"],
        overview("Updated Person"),
      );
    });
    expect(screen.getByDisplayValue("Draft address")).toBeTruthy();
  });
  it("keeps the explicit address editor and reset form across background hydration", async () => {
    mocks.api.mockImplementation(async (_method, path) =>
      response(
        path === "/api/ecommerce/account/addresses"
          ? [
              {
                id: "saved",
                label: "Home",
                address: "Saved street",
                city: "City",
                state: "MA",
                zipCode: "11111",
                country: "US",
                isDefault: true,
              },
            ]
          : overview(),
      ),
    );
    mount(<CustomerAccountPage view="addresses" />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    expect(screen.getByDisplayValue("Saved street")).toBeTruthy();
    await act(async () => {
      queryClient.setQueryData(["/api/ecommerce/account", "customer-a"], {
        ...overview(),
        customer: { ...overview().customer, address: "Changed server street" },
      });
    });
    expect(screen.getByDisplayValue("Saved street")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await act(async () => {
      queryClient.setQueryData(["/api/ecommerce/account", "customer-a"], {
        ...overview(),
        customer: { ...overview().customer, address: "New default street" },
      });
    });
    await screen.findByRole("button", { name: "Add address" });
    expect(screen.queryByDisplayValue("New default street")).toBeNull();
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  });
  it("reports save failure without erasing draft, then retries the actual payload", async () => {
    mount(<CustomerAccountPage view="profile" />);
    const first = await screen.findByLabelText("First name");
    await waitFor(() => expect((first as HTMLInputElement).value).toBe("Alice"));
    fireEvent.change(first, { target: { value: "Edited" } });
    mocks.api.mockRejectedValue(new Error("raw sensitive error"));
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Your changes could not be saved. Please try again.",
    );
    expect(screen.getByDisplayValue("Edited")).toBeTruthy();
    mocks.api.mockResolvedValue(response(overview("Edited Original")));
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(await screen.findByRole("status")).toHaveProperty("textContent", "Account updated.");
    expect(mocks.api).toHaveBeenCalledWith("PUT", "/api/ecommerce/account/profile", {
      firstName: "Edited",
      lastName: "Original",
      phone: "111",
    });
  });
  it("preserves dirty preferences on overview refetch", async () => {
    mount(<CustomerAccountPage view="preferences" />);
    const toggle = await screen.findByRole("switch", { name: "Marketing emails" });
    fireEvent.click(toggle);
    await act(async () => {
      queryClient.setQueryData(["/api/ecommerce/account", "customer-a"], overview("Updated Name"));
    });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });
  it.each(["orders", "addresses"] as const)(
    "does not present failed %s as empty results",
    async (section) => {
      mocks.api.mockImplementation(async (_method, path) => {
        if (path.endsWith("/" + section)) throw new Error("private");
        return response(overview());
      });
      mount(<CustomerAccountPage view={section} />);
      expect(await screen.findByRole("alert")).toBeTruthy();
      expect(screen.queryByText("No orders yet.")).toBeNull();
      expect(
        screen.queryByText("No saved addresses yet. Add one below for faster checkout."),
      ).toBeNull();
    },
  );
});

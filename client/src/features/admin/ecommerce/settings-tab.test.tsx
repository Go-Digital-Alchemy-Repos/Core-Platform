// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsTab, type EcommerceSettingsSection } from "./settings-tab";

const api = vi.hoisted(() => ({ request: vi.fn(), invalidate: vi.fn(), toast: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({
  apiRequest: api.request,
  queryClient: { invalidateQueries: api.invalidate },
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: api.toast }) }));
const sections = ["store", "customer-accounts", "stripe", "tax", "security"] as const;
const paths = Object.fromEntries(
  sections.map((section) => [
    section,
    section === "security"
      ? "/api/admin/ecommerce/security/settings"
      : `/api/admin/ecommerce/settings/${section}`,
  ]),
);
const stored: Record<string, unknown> = {
  stripe: {
    activeMode: "live",
    testPublishableKey: "pk_test_stored",
    livePublishableKey: "pk_live_stored",
  },
  tax: { enabled: true, manualRateBps: 825, taxShipping: true, stripeTaxEnabled: false },
  "customer-accounts": { customerAccountMode: "required" },
  store: {
    storeOrigin: {
      name: "Stored farm",
      address: "1 Farm Road",
      line2: "",
      city: "Boston",
      state: "MA",
      zip: "02101",
      country: "US",
    },
    storeTimezone: "America/Chicago",
    shippingDestinationMode: "us_only",
    allowedCountries: ["US"],
  },
  security: {
    enabled: true,
    highRiskCountries: [],
    suspiciousEmailDomains: [],
    disposableEmailDomains: [],
    blockedEmails: [],
    blockedIpRanges: [],
    allowedIpRanges: [],
    blockedAddresses: [],
    captchaProvider: "none",
    customerDeclineMessage: "Stored decline",
    riskReviewThreshold: 40,
    riskBlockThreshold: 80,
    defaultHighRiskAction: "block",
    billingShippingMismatchAction: "allow",
    countryMismatchAction: "allow",
  },
};
let root: Root;
let host: HTMLDivElement;
let client: QueryClient;
const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 15));
  });
const save = () =>
  [...host.querySelectorAll("button")].find((button) => /save/i.test(button.textContent || ""));
async function render(
  section: EcommerceSettingsSection,
  queryFn: (key: string) => Promise<unknown>,
) {
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, queryFn: ({ queryKey }) => queryFn(String(queryKey[0])) },
    },
  });
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <SettingsTab section={section} />
      </QueryClientProvider>,
    );
  });
  await flush();
}
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  api.request.mockReset();
  api.toast.mockReset();
  api.request.mockResolvedValue({});
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  client?.clear();
  host.remove();
  vi.unstubAllGlobals();
});

describe("Stripe activation status", () => {
  it.each([
    [false, false, "Stripe credentials required"],
    [true, false, "Awaiting payment activation"],
    [true, true, "New Stripe transactions enabled"],
  ])(
    "renders saved configuration %s and operator activation %s",
    async (configured, enabled, title) => {
      await render("stripe", async (key) => {
        if (key === paths.stripe) {
          return {
            ...(stored.stripe as object),
            configured,
            providerTransactionsEnabled: enabled,
            awaitingActivation: configured && !enabled,
          };
        }
        return key.endsWith("blocks")
          ? []
          : stored[sections.find((name) => paths[name] === key) || "missing"] || {};
      });
      expect(host.querySelector('[data-testid="stripe-activation-status"]')?.textContent).toContain(
        title,
      );
      await act(async () => save()!.click());
      await flush();
      const payload = api.request.mock.calls[0][2];
      expect(payload).not.toHaveProperty("providerTransactionsEnabled");
      expect(payload).not.toHaveProperty("configured");
      expect(payload).not.toHaveProperty("awaitingActivation");
      expect(host.querySelector('[data-testid="stripe-activation-status"]')?.textContent).toContain(
        title,
      );
    },
  );
});

describe("settings initial-load safety", () => {
  it.each(sections)("blocks %s saves during initial loading", async (section) => {
    await render(section, () => new Promise(() => {}));
    const button = save();
    expect(!button || button.disabled || button.closest("fieldset")?.disabled).toBe(true);
    if (button) await act(async () => button.click());
    expect(api.request).not.toHaveBeenCalled();
  });
  it.each(sections)(
    "shows a retry after %s load fails, then saves fetched values",
    async (section) => {
      let failed = true;
      await render(section, async (key) => {
        if (key === paths[section]) {
          if (failed) throw new Error("Load failed");
          return stored[section];
        }
        return key.endsWith("blocks")
          ? []
          : stored[sections.find((name) => paths[name] === key) || "missing"] || {};
      });
      const retry = [...host.querySelectorAll("button")].find((button) =>
        /retry/i.test(button.textContent || ""),
      );
      expect(retry).toBeDefined();
      expect(api.request).not.toHaveBeenCalled();
      failed = false;
      await act(async () => retry!.click());
      await flush();
      expect(save()).toBeDefined();
      await act(async () => save()!.click());
      await flush();
      expect(api.request).toHaveBeenCalledWith(
        "PUT",
        paths[section],
        expect.objectContaining(stored[section]),
      );
    },
  );
  it("keeps Stripe edits across refetch and error recovery while unrelated GETs fail", async () => {
    let rejectStripe = false;
    await render("stripe", async (key) => {
      if (key !== paths.stripe || rejectStripe) throw new Error("Unavailable");
      return stored.stripe;
    });
    const input = [...host.querySelectorAll("input")].find(
      (field) => field.value === "pk_live_stored",
    )!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        input,
        "pk_live_edit",
      );
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      client.setQueryData([paths.stripe], {
        ...(stored.stripe as object),
        livePublishableKey: "pk_live_remote_change",
      });
    });
    await flush();
    expect(
      [...host.querySelectorAll("input")].some((field) => field.value === "pk_live_edit"),
    ).toBe(true);
    rejectStripe = true;
    await act(async () => {
      await client.refetchQueries({ queryKey: [paths.stripe] });
    });
    await flush();
    expect(save()).toBeUndefined();
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    rejectStripe = false;
    await act(async () =>
      [...host.querySelectorAll("button")]
        .find((button) => button.textContent === "Retry")!
        .click(),
    );
    await flush();
    expect(
      [...host.querySelectorAll("input")].some((field) => field.value === "pk_live_edit"),
    ).toBe(true);
    await act(async () => save()!.click());
    await flush();
    expect(api.request).toHaveBeenCalledWith(
      "PUT",
      paths.stripe,
      expect.objectContaining({ livePublishableKey: "pk_live_edit", activeMode: "live" }),
    );
  });

  it.each(sections)("hydrates slow successful %s GET before allowing save", async (section) => {
    let resolve!: (value: unknown) => void;
    const pending = new Promise((done) => {
      resolve = done;
    });
    await render(section, (key) =>
      key === paths[section] ? pending : Promise.reject(new Error("Other section unavailable")),
    );
    expect(save()).toBeUndefined();
    await act(async () => resolve(stored[section]));
    await flush();
    expect(save()).toBeDefined();
    await act(async () => save()!.click());
    await flush();
    expect(api.request).toHaveBeenCalledWith(
      "PUT",
      paths[section],
      expect.objectContaining(stored[section]),
    );
  });
  it.each(sections)("reports failed %s save and retains values for retry", async (section) => {
    await render(section, async (key) =>
      key === paths[section] ? stored[section] : Promise.reject(new Error("Unrelated query")),
    );
    api.request.mockRejectedValueOnce(new Error("Write failed"));
    await act(async () => save()!.click());
    await flush();
    expect(api.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Settings could not be saved", variant: "destructive" }),
    );
    const attempted = api.request.mock.calls[0][2];
    expect(save()?.disabled).toBe(false);
    await act(async () => save()!.click());
    await flush();
    expect(api.request.mock.calls[1][2]).toEqual(attempted);
    expect(api.request.mock.calls[1][2]).toEqual(expect.objectContaining(stored[section]));
  });
});

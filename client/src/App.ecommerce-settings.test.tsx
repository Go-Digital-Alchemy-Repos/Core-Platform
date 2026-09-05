// @vitest-environment jsdom

import React, { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { DEFAULT_SITE_FEATURES } from "@shared/site-features";

const state = vi.hoisted(() => ({
  ecommerceEnabled: true,
  user: { role: "admin" } as { role: string } | null,
}));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data:
      queryKey[0] === "/api/site-config"
        ? { ...DEFAULT_SITE_FEATURES, ecommerceEnabled: state.ecommerceEnabled }
        : queryKey[0] === "/api/setup/status"
          ? { needsSetup: false }
          : undefined,
    isLoading: false,
  }),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.user, isLoading: false, hasAdminPermission: () => false }),
}));

// Keep App's real Switch, ProtectedRoute, and Ecommerce page/section selection.
// Isolate unrelated shell effects and the settings forms' API requests.
vi.mock("@/components/shared/branding-provider", () => ({
  BrandingProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/shared/theme-mode-provider", () => ({
  ThemeModeProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/features/frontend-edit/frontend-edit", () => ({
  FrontendEditProvider: ({ children }: { children: ReactNode }) => children,
  useAdminEditDeepLink: () => undefined,
}));
vi.mock("@/components/shared/cookie-consent-banner", () => ({ CookieConsentBanner: () => null }));
vi.mock("@/lib/analytics-runtime", () => ({
  loadGa4IfConsented: async () => undefined,
  loadMarketingPixelsIfConsented: async () => undefined,
}));
vi.mock("@/features/admin/admin-sidebar", () => ({
  AdminSidebar: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/features/admin/cms/builder/cms-rich-text-editor", () => ({
  CmsRichTextEditor: () => null,
}));
vi.mock("@/features/admin/ecommerce/settings-tab", () => ({
  SettingsTab: ({ section }: { section: string }) => (
    <div data-testid="ecommerce-settings" data-section={section} />
  ),
}));
vi.mock("@/features/auth/login-page", () => ({ default: () => <h1>Sign in</h1> }));

const sections = ["store", "customer-accounts", "security", "stripe", "tax"] as const;

describe("App ecommerce settings routing", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("React", React);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    state.ecommerceEnabled = true;
    state.user = { role: "admin" };
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  async function visit(path: string) {
    const location = memoryLocation({ path, record: true });
    await act(async () => {
      root.render(
        <Router hook={location.hook}>
          <App />
        </Router>,
      );
    });
    // App's route content is lazy-loaded; resolve the actual Ecommerce module.
    await act(async () => {
      await import("@/features/admin/ecommerce/ecommerce-page");
    });
    return location;
  }

  it.each(sections)("renders the %s settings destination", async (section) => {
    await visit(`/admin/ecommerce/settings/${section}`);
    expect(
      container.querySelector('[data-testid="ecommerce-settings"]')?.getAttribute("data-section"),
    ).toBe(section);
    expect(container.textContent).not.toContain("404 Page Not Found");
  });

  it("preserves the existing settings overview destination", async () => {
    await visit("/admin/ecommerce/settings");
    expect(
      container.querySelector('[data-testid="ecommerce-settings"]')?.getAttribute("data-section"),
    ).toBe("store");
  });

  it("keeps settings unavailable when ecommerce is disabled", async () => {
    state.ecommerceEnabled = false;
    await visit("/admin/ecommerce/settings/store");
    expect(container.textContent).toContain("404 Page Not Found");
    expect(container.querySelector('[data-testid="ecommerce-settings"]')).toBeNull();
  });

  it("keeps non-admin users forbidden", async () => {
    state.user = { role: "editor" };
    await visit("/admin/ecommerce/settings/store");
    expect(container.querySelector('[data-testid="forbidden-page"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="ecommerce-settings"]')).toBeNull();
  });

  it("redirects unauthenticated visitors to sign in", async () => {
    state.user = null;
    const location = await visit("/admin/ecommerce/settings/store");
    expect(location.history.at(-1)).toBe("/auth/login");
    expect(container.querySelector('[data-testid="ecommerce-settings"]')).toBeNull();
  });
});

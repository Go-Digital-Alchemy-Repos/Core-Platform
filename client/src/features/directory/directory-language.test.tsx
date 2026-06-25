// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { DirectoryBrowserSection } from "@/features/directory/directory-page";
import { DIRECTORY_LABEL_PRESETS } from "@shared/types/directory-settings";
import { DEFAULT_SITE_FEATURES } from "@shared/site-features";

vi.mock("wouter", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children),
  useLocation: () => ["/directory", vi.fn()],
  useSearch: () => "",
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAdmin: false,
    isTherapist: false,
    logout: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-unread-notification-count", () => ({
  useUnreadNotificationCount: () => 0,
}));

vi.mock("@/components/shared/branding-provider", () => ({
  useBranding: () => ({
    frontendLogoUrl: "",
    socialIconStyle: "circle",
    socialLinks: [],
  }),
}));

vi.mock("@/hooks/use-specializations", () => ({
  useSpecializations: () => ({
    specializations: [
      { id: "luxury", name: "Luxury Leasing" },
      { id: "residential", name: "Residential Sales" },
    ],
  }),
}));

vi.mock("@/components/directory/map-view", () => ({
  MapView: () => React.createElement("div", { "data-testid": "mock-map" }, "Map"),
}));

const storeLocatorSettings = {
  directoryMode: "store_locator",
  ...DIRECTORY_LABEL_PRESETS.store_locator,
  directoryRequiresApplicationProcess: true,
  directoryRequiresApprovedApplication: true,
  directoryRequiresActiveSubscription: true,
  directoryShowLocationJobs: false,
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        queryFn: async ({ queryKey }) => {
          const key = String(queryKey[0]);
          if (key === "/api/directory-settings") return storeLocatorSettings;
          if (key === "/api/site-config") return { ...DEFAULT_SITE_FEATURES, cmsEnabled: false };
          if (key === "/api/cms/menus") return null;
          if (key === "/api/therapists/filters") return { languages: [], countries: [] };
          if (key === "/api/therapists")
            return { items: [], total: 0, page: 1, pageSize: 12, totalPages: 1 };
          return null;
        },
      },
    },
  });
}

describe("directory shell language", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  let queryClient: QueryClient;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { React?: typeof React; IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).React = React;
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    queryClient = createQueryClient();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    queryClient.clear();
    container.remove();
    document.body.innerHTML = "";
  });

  it("uses store locator labels across the public shell and directory browser", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement(
            React.Fragment,
            null,
            React.createElement(Navbar),
            React.createElement(DirectoryBrowserSection, { syncUrl: false }),
            React.createElement(Footer),
          ),
        ),
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.textContent).toContain("Find Location");
    expect(container.textContent).toContain(
      "Search by name, categories, address, phone, or service area",
    );
    expect(container.textContent).toContain("Connecting people with trusted locations");
    expect(container.textContent?.toLowerCase()).not.toContain("mental health professional");
  });
});

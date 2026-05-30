// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import CmsMenusPage from "@/features/admin/cms/cms-menus-page";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const navigateMock = vi.fn();
let locationMock = "/admin/cms/menus";
const queryClientMock = vi.hoisted(() => ({
  apiRequest: vi.fn(() => Promise.resolve(new Response("{}"))),
  invalidateQueries: vi.fn(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (options: unknown) => useQueryMock(options),
    useMutation: (options: unknown) => useMutationMock(options),
  };
});

vi.mock("@/lib/queryClient", () => ({
  apiRequest: queryClientMock.apiRequest,
  queryClient: {
    invalidateQueries: queryClientMock.invalidateQueries,
  },
}));

vi.mock("wouter", () => ({
  useLocation: () => [locationMock, navigateMock],
}));

vi.mock("@/features/admin/admin-sidebar", () => ({
  AdminSidebar: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "admin-sidebar" }, children),
}));

vi.mock("@/components/shared/editor-lock-banner", () => ({
  EditorLockBanner: () => null,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/use-editor-lock", () => ({
  useEditorLock: () => ({
    hasLocking: false,
    isReadOnly: false,
    isLoading: false,
    acquire: vi.fn(),
    summary: null,
  }),
}));

vi.mock("@/hooks/use-lock-conflict-guard", () => ({
  useLockConflictGuard: () => undefined,
}));

const pages = [
  {
    id: "page-about",
    title: "About Us",
    slug: "about-us",
    status: "published",
    pageType: "custom",
    template: "full-width",
    sidebarId: null,
    content: {},
    seoTitle: null,
    seoDescription: null,
    seoKeywords: null,
    ogImageUrl: null,
    canonicalUrl: null,
    noindex: false,
    createdBy: null,
    updatedBy: null,
    scheduledAt: null,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const menus = [
  {
    id: "menu-main",
    name: "Main Navigation",
    location: "main_navigation",
    items: [
      {
        id: "item-about",
        label: "Manual",
        url: "/manual",
        openInNewTab: false,
        children: [],
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

function changeValue(element: HTMLInputElement | HTMLSelectElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
  const prototype = Object.getPrototypeOf(element) as HTMLInputElement | HTMLSelectElement;
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else {
    element.value = value;
  }
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("CmsMenusPage", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    locationMock = "/admin/cms/menus";
    navigateMock.mockReset();
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === "/api/admin/cms/pages") {
        return { data: pages, isLoading: false };
      }
      if (queryKey[0] === "/api/admin/cms/menus") {
        return { data: menus, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });
    useMutationMock.mockImplementation((options: { mutationFn?: () => Promise<unknown> }) => ({
      mutate: vi.fn(() => options.mutationFn?.()),
      mutateAsync: vi.fn(),
      isPending: false,
    }));
    (globalThis as typeof globalThis & { React?: typeof React; IS_REACT_ACT_ENVIRONMENT?: boolean }).React = React;
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container.remove();
    vi.clearAllMocks();
  });

  it("fills label and URL when a CMS page is selected for a menu item", () => {
    act(() => {
      root = createRoot(container);
      root.render(<CmsMenusPage />);
    });

    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="button-edit-menu-menu-main"]')?.click();
    });

    const pageSelect = container.querySelector<HTMLSelectElement>('[data-testid="select-page-item-about"]');
    expect(pageSelect).not.toBeNull();

    act(() => {
      changeValue(pageSelect!, "page-about");
    });

    expect(container.querySelector<HTMLInputElement>('[data-testid="input-label-item-about"]')?.value).toBe("About Us");
    expect(container.querySelector<HTMLInputElement>('[data-testid="input-url-item-about"]')?.value).toBe("/about-us");
  });

  it("marks linked menu labels as custom when edited manually", () => {
    const linkedMenus = [
      {
        ...menus[0],
        items: [
          {
            id: "item-about",
            label: "About Us",
            url: "/about-us",
            pageId: "page-about",
            labelSource: "page",
            openInNewTab: false,
            children: [],
          },
        ],
      },
    ];
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === "/api/admin/cms/pages") {
        return { data: pages, isLoading: false };
      }
      if (queryKey[0] === "/api/admin/cms/menus") {
        return { data: linkedMenus, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });

    act(() => {
      root = createRoot(container);
      root.render(<CmsMenusPage />);
    });

    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="button-edit-menu-menu-main"]')?.click();
    });

    const labelInput = container.querySelector<HTMLInputElement>('[data-testid="input-label-item-about"]');
    act(() => {
      changeValue(labelInput!, "Our Story");
    });
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="button-save-menu"]')?.click();
    });

    expect(queryClientMock.apiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/admin/cms/menus/menu-main",
      expect.objectContaining({
        items: [
          expect.objectContaining({
            id: "item-about",
            label: "Our Story",
            labelSource: "custom",
            pageId: "page-about",
          }),
        ],
      }),
    );
  });

  it("opens a menu from the editMenu query parameter", () => {
    locationMock = "/admin/cms/menus?editMenu=menu-main";

    act(() => {
      root = createRoot(container);
      root.render(<CmsMenusPage />);
    });

    expect(container.querySelector('[data-testid="text-menu-editor-title"]')?.textContent).toContain("Edit: Main Navigation");
  });
});

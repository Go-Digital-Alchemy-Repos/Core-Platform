// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { CategoriesTab } from "@/features/admin/ecommerce/ecommerce-page";

const categories = [
  {
    id: "cat-guides",
    name: "Guides & Workbooks",
    slug: "guides-workbooks",
    description: null,
    parentId: null,
    image: null,
    sortOrder: 0,
    active: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
  {
    id: "cat-training",
    name: "Professional Training",
    slug: "professional-training",
    description: "Courses and workshops",
    parentId: "cat-guides",
    image: "https://example.com/training.jpg",
    sortOrder: 1,
    active: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
  {
    id: "cat-family",
    name: "Family Resources",
    slug: "family-resources",
    description: null,
    parentId: null,
    image: null,
    sortOrder: 2,
    active: false,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
];

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (options: unknown) => useQueryMock(options),
    useMutation: (options: unknown) => useMutationMock(options),
  };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("Ecommerce CategoriesTab", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    useQueryMock.mockReturnValue({ data: categories, isLoading: false });
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
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
    vi.unstubAllGlobals();
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    container.remove();
  });

  function renderCategoriesTab() {
    act(() => {
      root = createRoot(container);
      root.render(React.createElement(CategoriesTab));
    });
  }

  it("renders parent and child categories in a manageable table", () => {
    renderCategoriesTab();

    expect(container.textContent).toContain("Guides & Workbooks");
    expect(container.textContent).toContain("Professional Training");
    expect(container.textContent).toContain("Family Resources");
    expect(container.textContent).toContain("Edit existing categories or add child categories under any parent.");
  });

  it("hydrates the editor when an existing category is selected", () => {
    renderCategoriesTab();

    const editButtons = Array.from(container.querySelectorAll("button")).filter(
      (button) => button.textContent?.trim() === "Edit",
    );

    act(() => {
      editButtons[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const inputs = Array.from(container.querySelectorAll("input"));
    expect(container.textContent).toContain("Edit category");
    expect(inputs[0].value).toBe("Professional Training");
    expect(inputs[1].value).toBe("professional-training");
    expect(container.querySelector("textarea")?.value).toBe("Courses and workshops");
  });
});

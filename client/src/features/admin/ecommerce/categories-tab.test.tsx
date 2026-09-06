// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { CategoriesTab } from "./categories-tab";
const api = vi.hoisted(() => ({ request: vi.fn(), invalidate: vi.fn(), toast: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({
  apiRequest: api.request,
  queryClient: { invalidateQueries: api.invalidate },
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: api.toast }) }));
vi.mock("@/features/admin/cms/components/cms-image-upload", () => ({ CmsImageUpload: () => null }));
let root: Root, host: HTMLDivElement, client: QueryClient;
const category = (id: string, parentId: string | null, sortOrder = 0, active = true) => ({
  id,
  parentId,
  name: id,
  slug: id,
  sortOrder,
  active,
});
const rows = () =>
  [...host.querySelectorAll("tbody tr")].map((row) => row.querySelector("td")?.textContent);
const click = (element: Element | null | undefined) => {
  expect(element).toBeTruthy();
  act(() => (element as HTMLElement).click());
};
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
const openSelect = async (index = 0) => {
  await act(async () => {
    const trigger = host.querySelectorAll('[role="combobox"]')[index];
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  });
};
const option = (text: string) =>
  [...document.querySelectorAll('[role="option"]')].find((el) => el.textContent === text);
const mount = (categories: ReturnType<typeof category>[]) => {
  client.setQueryData(["/api/admin/ecommerce/categories"], categories);
  act(() =>
    root.render(
      <QueryClientProvider client={client}>
        <CategoriesTab />
      </QueryClientProvider>,
    ),
  );
};
beforeEach(() => {
  vi.stubGlobal("React", React);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  api.request.mockReset();
  api.invalidate.mockReset();
  api.toast.mockReset();
  api.request.mockResolvedValue({});
  client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false }, mutations: { retry: false } },
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  client.clear();
  vi.unstubAllGlobals();
});
it("renders every closed-cycle category once and permits a root repair without offering self or descendants", async () => {
  mount([
    category("B", "A"),
    category("A", "B"),
    category("C", "B"),
    category("Self", "Self"),
    category("Root", null),
  ]);
  expect(rows()).toEqual(["Root", "A", "B", "C", "Self"]);
  click(
    [...host.querySelectorAll("tbody tr")].find(
      (row) => row.querySelector("td")?.textContent === "A",
    ),
  );
  await openSelect();
  expect(option("A")).toBeUndefined();
  expect(option("-- B")).toBeUndefined();
  expect(option("-- -- C")).toBeUndefined();
  expect(
    [...document.querySelectorAll('[role="option"]')].map((el) =>
      el.textContent?.replace(/^(-- )*/, ""),
    ),
  ).toEqual(["No parent category", "Root", "Self"]);
  expect(option("Root")).toBeTruthy();
  click(option("No parent category"));
  click(
    [...host.querySelectorAll("button")].find((button) => button.textContent === "Update category"),
  );
  await waitFor(() =>
    expect(api.request).toHaveBeenCalledWith(
      "PUT",
      "/api/admin/ecommerce/categories/A",
      expect.objectContaining({ parentId: null, name: "A" }),
    ),
  );
  expect(api.request).toHaveBeenCalledTimes(1);
});
it("preserves root, sibling and orphan tree ordering, inactive choices and search filtering", async () => {
  mount([
    category("Zulu", null, 2),
    category("ChildB", "Alpha"),
    category("Orphan", "missing"),
    category("ChildA", "Alpha"),
    category("Alpha", null, 1),
    category("Inactive", null, 3, false),
  ]);
  expect(rows()).toEqual(["Alpha", "ChildA", "ChildB", "Zulu", "Inactive", "Orphan"]);
  click(
    [...host.querySelectorAll("tbody tr")].find(
      (row) => row.querySelector("td")?.textContent === "Alpha",
    ),
  );
  await openSelect();
  expect(option("Inactive")).toBeTruthy();
  expect(option("Alpha")).toBeUndefined();
  expect(option("-- ChildA")).toBeUndefined();
  click(option("No parent category"));
  const search = host.querySelector(
    'input[placeholder="Search categories, slugs, descriptions, or parents"]',
  )!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
      search,
      "Alpha",
    );
    search.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(rows()).toEqual(["Alpha", "ChildA", "ChildB"]);
});

it("keeps a self-parented category editable with only the root repair choice", async () => {
  mount([category("Self", "Self")]);
  expect(rows()).toEqual(["Self"]);
  click(host.querySelector("tbody tr"));
  await openSelect();
  expect([...document.querySelectorAll('[role="option"]')].map((el) => el.textContent)).toEqual([
    "No parent category",
  ]);
});

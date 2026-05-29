// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import AdminCrmClientsPage from "@/features/admin/crm-clients-page";

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

vi.mock("@/components/shared/protected-route", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "protected-route" }, children),
}));

vi.mock("@/features/admin/admin-sidebar", () => ({
  AdminSidebar: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "admin-sidebar" }, children),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("AdminCrmClientsPage", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    useQueryMock.mockImplementation(({ queryKey, enabled = true }: { queryKey: unknown[]; enabled?: boolean }) => {
      if (!enabled) return { data: undefined, isLoading: false };
      if (queryKey[0] === "/api/admin/crm/clients" && queryKey.length === 2) {
        return {
          data: [
            {
              id: "client-1",
              name: "Ada Lovelace",
              email: "ada@example.com",
              phone: null,
              company: "Compiler Co",
              status: "onboarding",
              source: "website_form",
              nextFollowUpAt: null,
            },
          ],
          isLoading: false,
        };
      }

      return { data: undefined, isLoading: false };
    });
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
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
  });

  it("renders converted clients with lifecycle status", () => {
    act(() => {
      root = createRoot(container);
      root.render(<AdminCrmClientsPage />);
    });

    expect(container.textContent).toContain("CRM Clients");
    expect(container.textContent).toContain("Ada Lovelace");
    expect(container.textContent).toContain("Onboarding");
  });
});

// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import AdminEventsPage from "@/features/admin/events-page";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const lockGuardMock = vi.fn();
const editorLockState = {
  hasLocking: true,
  hasLoaded: true,
  isReadOnly: true,
  isLoading: false,
  acquire: vi.fn(),
  summary: {
    variant: "warning" as const,
    title: "Event already checked out",
    description: "Jamie Editor is already editing this event.",
  },
};
let mutationStates: Array<{
  mutate: ReturnType<typeof vi.fn>;
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
}> = [];

const mockEvents = [
  {
    id: "event-1",
    title: "Counselor Training",
    description: "Upcoming training event",
    date: "2026-05-01T14:00:00.000Z",
    endDate: "2026-05-01T15:00:00.000Z",
    timezone: "America/New_York",
    location: "Zoom",
    isVirtual: true,
    imageUrl: "",
    status: "published",
    visibility: "public",
    memberOnly: false,
    registrationEnabled: false,
    showInArchives: false,
    isRecurring: false,
  },
];

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

vi.mock("@/components/shared/editor-lock-banner", () => ({
  EditorLockBanner: ({ title }: { title: string }) =>
    React.createElement("div", { "data-testid": "editor-lock-banner" }, title),
}));

vi.mock("@/components/shared/loading-spinner", () => ({
  LoadingSpinner: () => React.createElement("div", { "data-testid": "loading-spinner" }, "Loading"),
}));

vi.mock("@/features/admin/cms/components/cms-image-upload", () => ({
  CmsImageUpload: () => React.createElement("div", { "data-testid": "cms-image-upload" }),
}));

vi.mock("@/features/admin/cms/builder/cms-rich-text-editor", () => ({
  CmsRichTextEditor: ({ value = "", onChange, ...props }: { value?: string; onChange?: (value: string) => void }) =>
    React.createElement("textarea", {
      ...props,
      value,
      onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => onChange?.(event.target.value),
    }),
}));

vi.mock("@/features/admin/cms/components/image-position-picker", () => ({
  ImagePositionPicker: () => React.createElement("div", { "data-testid": "image-position-picker" }),
}));

vi.mock("@/components/shared/structured-data-status", () => ({
  StructuredDataStatus: () => React.createElement("div", { "data-testid": "structured-data-status" }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-editor-lock", () => ({
  useEditorLock: () => editorLockState,
}));

vi.mock("@/hooks/use-lock-conflict-guard", () => ({
  useLockConflictGuard: (args: unknown) => lockGuardMock(args),
}));

describe("AdminEventsPage", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    lockGuardMock.mockReset();
    editorLockState.isReadOnly = true;
    mutationStates = [];
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === "/api/admin/events") {
        return { data: mockEvents, isLoading: false };
      }

      if (queryKey[0] === "/api/admin/events" && queryKey[2] === "registrations") {
        return { data: [], isLoading: false };
      }

      return { data: [], isLoading: false };
    });
    useMutationMock.mockImplementation(() => {
      const state = {
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
      };
      mutationStates.push(state);
      return state;
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
    container.remove();
    document.body.innerHTML = "";
  });

  it("closes the event editor sheet when a lock conflict is detected", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(AdminEventsPage));
    });

    const editButton = document.body.querySelector('[data-testid="button-edit-event-event-1"]') as HTMLButtonElement | null;
    expect(editButton).not.toBeNull();

    await act(async () => {
      editButton?.click();
    });

    expect(document.body.querySelector('[data-testid="input-event-title"]')).not.toBeNull();
    expect(lockGuardMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        resourceId: "event-1",
        resourceLabel: "event",
        editorLock: editorLockState,
      }),
    );

    const guardArgs = lockGuardMock.mock.calls.at(-1)?.[0] as { onConflict: () => void };

    await act(async () => {
      guardArgs.onConflict();
    });

    expect(document.body.querySelector('[data-testid="input-event-title"]')).toBeNull();
  });

  it("submits the edited event through the update mutation", async () => {
    editorLockState.isReadOnly = false;
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(AdminEventsPage));
    });

    const editButton = document.body.querySelector('[data-testid="button-edit-event-event-1"]') as HTMLButtonElement | null;
    expect(editButton).not.toBeNull();

    await act(async () => {
      editButton?.click();
    });

    const submitButton = document.body.querySelector('[data-testid="button-submit-event"]') as HTMLButtonElement | null;
    expect(submitButton).not.toBeNull();

    await act(async () => {
      submitButton?.click();
    });

    const calledPayload = mutationStates.flatMap((state) => state.mutate.mock.calls).at(-1)?.[0];
    expect(calledPayload).toEqual(
      expect.objectContaining({
        id: "event-1",
        data: expect.objectContaining({
          title: "Counselor Training",
          location: "Zoom",
        }),
      })
    );
  });
});

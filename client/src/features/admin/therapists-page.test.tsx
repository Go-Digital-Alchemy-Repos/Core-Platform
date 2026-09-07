// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AddTherapistSheet, getAdminDirectoryLabels } from "./therapists-page";
import type { PublicDirectorySettings } from "@shared/types/directory-settings";

vi.mock("@/hooks/use-specializations", () => ({
  useSpecializations: () => ({ specializations: [] }),
}));
vi.mock("@/features/admin/cms/builder/cms-rich-text-editor", () => ({
  CmsRichTextEditor: () => null,
}));
let root: Root;
let container: HTMLDivElement;
const labels = getAdminDirectoryLabels({
  listingLabelSingular: "Location",
} as PublicDirectorySettings);
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it("shows server failures inside the open drawer, beside Create Location", async () => {
  await act(async () =>
    root.render(
      <AddTherapistSheet
        open
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
        serverError="Email already registered"
        labels={labels}
      />,
    ),
  );
  const dialog = document.querySelector('[role="dialog"]')!;
  expect(dialog.querySelector('[role="alert"]')?.textContent).toContain("Email already registered");
  expect(dialog.querySelector('[data-testid="button-add-submit"]')?.textContent).toContain(
    "Create Location",
  );
});

it("connects the footer submit button to the form and surfaces validation failures", async () => {
  const submit = vi.fn();
  await act(async () =>
    root.render(
      <AddTherapistSheet
        open
        onOpenChange={vi.fn()}
        onSubmit={submit}
        isPending={false}
        labels={labels}
      />,
    ),
  );
  const button = document.querySelector<HTMLButtonElement>('[data-testid="button-add-submit"]')!;
  expect(button.form?.id).toBe("add-therapist-form");
  await act(async () => button.click());
  expect(submit).not.toHaveBeenCalled();
  const alert = document.querySelector('[data-testid="add-profile-error"]');
  expect(alert?.textContent).toContain("First name required");
  expect(alert?.textContent).toContain("Valid email required");
});

it("creates a standalone location without account fields", async () => {
  const submit = vi.fn();
  const locationLabels = getAdminDirectoryLabels({
    directoryMode: "store_locator",
    listingLabelSingular: "Location",
  } as PublicDirectorySettings);
  await act(async () =>
    root.render(
      <AddTherapistSheet
        open
        onOpenChange={vi.fn()}
        onSubmit={submit}
        isPending={false}
        labels={locationLabels}
      />,
    ),
  );
  expect(document.querySelector('[data-testid="input-add-email"]')).toBeNull();
  expect(document.querySelector('[data-testid="input-add-password"]')).toBeNull();
  const button = document.querySelector<HTMLButtonElement>('[data-testid="button-add-submit"]')!;
  await act(async () => button.click());
  expect(document.querySelector('[role="alert"]')?.textContent).toContain(
    "Location name is required",
  );
  const { Simulate } = await import("react-dom/test-utils");
  const title = document.querySelector<HTMLInputElement>('[data-testid="input-add-title"]')!;
  await act(async () => {
    title.value = "Warehouse North";
    Simulate.change(title);
  });
  await act(async () => button.click());
  expect(submit).toHaveBeenCalledTimes(1);
  expect(submit.mock.calls[0][0]).toMatchObject({ title: "Warehouse North" });
  expect(submit.mock.calls[0][0]).not.toHaveProperty("email");
  expect(submit.mock.calls[0][0]).not.toHaveProperty("password");
});

it("shows current validation errors instead of an earlier server failure", async () => {
  await act(async () =>
    root.render(
      <AddTherapistSheet
        open
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
        serverError="Email already registered"
        labels={labels}
      />,
    ),
  );
  await act(async () =>
    document.querySelector<HTMLButtonElement>('[data-testid="button-add-submit"]')!.click(),
  );
  const message = document.querySelector('[data-testid="add-profile-error"]')?.textContent;
  expect(message).toContain("First name required");
  expect(message).not.toContain("Email already registered");
});

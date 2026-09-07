// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SpeakersSettings } from "./speakers-settings";
const api = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: api.request }));
vi.mock("../cms/components/cms-image-upload", () => ({
  CmsImageUpload: () => <span>Image upload fixture</span>,
}));
const original = {
  id: "speaker-1",
  name: "Existing Speaker",
  description: "Existing biography",
  imageUrl: "/image.png",
  email: "speaker@example.test",
  phone: "123",
  websiteUrl: "https://example.test",
};
let rows: Array<typeof original>;
let read: ReturnType<typeof vi.fn>;
let root: Root, host: HTMLDivElement, cache: QueryClient;
const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
};
const button = (text: string) =>
  Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (b) => b.textContent?.trim() === text,
  )!;
const click = async (b: HTMLButtonElement) => {
  expect(b).toBeDefined();
  await act(async () => b.click());
  await settle();
};
async function input(id: string, value: string) {
  const element = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
  expect(element).not.toBeNull();
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype,
      "value",
    )!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
const mount = async () => {
  await act(async () =>
    root.render(
      <QueryClientProvider client={cache}>
        <SpeakersSettings />
      </QueryClientProvider>,
    ),
  );
  await settle();
};
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  rows = [{ ...original }];
  read = vi.fn(async () => rows.map((r) => ({ ...r })));
  api.request.mockReset().mockResolvedValue({});
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, queryFn: read }, mutations: { retry: false } },
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  cache.clear();
  host.remove();
  vi.unstubAllGlobals();
});
it("creates with trimmed fields and refreshes the observed speakers query", async () => {
  await mount();
  expect(host.textContent).toContain("Existing events keep their own speaker details");
  await click(button("Add speaker"));
  await input("speaker-name", "  New Speaker  ");
  await input("speaker-bio", " New biography ");
  await input("speaker-email", "new@example.test");
  api.request.mockImplementation(async () => {
    rows = [...rows, { ...original, id: "speaker-2", name: "New Speaker" }];
    return {};
  });
  const reads = read.mock.calls.length;
  await click(button("Save speaker"));
  expect(api.request).toHaveBeenCalledWith("POST", "/api/admin/events/organizers", {
    name: "New Speaker",
    description: "New biography",
    imageUrl: "",
    email: "new@example.test",
    phone: "",
    websiteUrl: "",
  });
  expect(read.mock.calls.length).toBeGreaterThan(reads);
  expect(host.textContent).toContain("New Speaker");
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it("hydrates edit and updates the exact speaker without event snapshot writes", async () => {
  await mount();
  await click(document.querySelector<HTMLButtonElement>('[aria-label="Edit Existing Speaker"]')!);
  expect((document.getElementById("speaker-name") as HTMLInputElement).value).toBe(original.name);
  expect((document.getElementById("speaker-bio") as HTMLTextAreaElement).value).toBe(
    original.description,
  );
  await input("speaker-name", "Renamed");
  await input("speaker-phone", "");
  await click(button("Save speaker"));
  expect(api.request).toHaveBeenCalledExactlyOnceWith(
    "PUT",
    "/api/admin/events/organizers/speaker-1",
    {
      name: "Renamed",
      description: original.description,
      imageUrl: original.imageUrl,
      email: original.email,
      phone: "",
      websiteUrl: original.websiteUrl,
    },
  );
});
it("retains edited entries after save failure and permits successful retry", async () => {
  await mount();
  await click(button("Add speaker"));
  await input("speaker-name", "Retained draft");
  api.request.mockRejectedValueOnce(new Error("Save failed safely"));
  await click(button("Save speaker"));
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("Save failed safely");
  expect((document.getElementById("speaker-name") as HTMLInputElement).value).toBe(
    "Retained draft",
  );
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  await click(button("Save speaker"));
  expect(api.request).toHaveBeenCalledTimes(2);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it("requires delete confirmation, retains failure, then refreshes lists after retry", async () => {
  cache.setQueryData(["/api/admin/events"], [{ id: "event", speakerName: original.name }]);
  await mount();
  await click(document.querySelector<HTMLButtonElement>('[aria-label="Delete Existing Speaker"]')!);
  expect(api.request).not.toHaveBeenCalled();
  expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain(
    "Existing events retain their speaker name, biography, and image",
  );
  await click(button("Cancel"));
  expect(api.request).not.toHaveBeenCalled();
  await click(document.querySelector<HTMLButtonElement>('[aria-label="Delete Existing Speaker"]')!);
  api.request.mockRejectedValueOnce(new Error("Delete failed safely"));
  await click(button("Delete speaker"));
  expect(document.querySelector('[role="alertdialog"] [role="alert"]')?.textContent).toBe(
    "Delete failed safely",
  );
  api.request.mockImplementation(async () => {
    rows = [];
    return {};
  });
  await click(button("Delete speaker"));
  expect(api.request).toHaveBeenLastCalledWith("DELETE", "/api/admin/events/organizers/speaker-1");
  expect(host.textContent).toContain("No saved speakers yet");
  expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  expect(cache.getQueryState(["/api/admin/events"])?.isInvalidated).toBe(true);
  expect(cache.getQueryData(["/api/admin/events"])).toEqual([
    { id: "event", speakerName: original.name },
  ]);
});
it("shows a failed list request with retry instead of a false empty state", async () => {
  read.mockRejectedValueOnce(new Error("Read failed"));
  await mount();
  expect(host.textContent).toContain("Unable to load speakers");
  expect(host.textContent).not.toContain("No saved speakers yet");
  await click(button("Retry"));
  expect(host.textContent).toContain("Existing Speaker");
  expect(host.textContent).not.toContain("Unable to load speakers");
});

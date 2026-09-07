// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BrandingTab } from "./branding-tab";
const api = vi.hoisted(() => ({ request: vi.fn(), invalidate: vi.fn(), toast: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({
  apiRequest: api.request,
  queryClient: { invalidateQueries: api.invalidate },
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: api.toast }) }));
vi.mock("@/features/admin/cms/components/cms-image-upload", () => ({ CmsImageUpload: () => null }));
let root: Root, host: HTMLDivElement;
let resolve: (v: { sRGBHex: string }) => void;
let open: ReturnType<typeof vi.fn>;
const settings = {
  branding: {
    brand_primary_color: { value: "#112233", isSecret: false },
    brand_secondary_color: { value: "#445566", isSecret: false },
  },
};
const hex = (key: string) =>
  host.querySelector<HTMLInputElement>(`[data-testid="input-hex-brand_${key}_color"]`)!;
const sample = (name: string) =>
  host.querySelector<HTMLButtonElement>(`[aria-label="Sample screen color for ${name} Color"]`)!;
const render = async () => {
  await act(async () =>
    root.render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
      >
        <BrandingTab settings={settings} initialSubtab="colors" />
      </QueryClientProvider>,
    ),
  );
};
beforeEach(async () => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("isSecureContext", true);
  open = vi.fn(
    () =>
      new Promise<{ sRGBHex: string }>((yes) => {
        resolve = yes;
      }),
  );
  vi.stubGlobal(
    "EyeDropper",
    class {
      open = open;
    },
  );
  api.request.mockReset().mockResolvedValue({ json: async () => ({}) });
  api.invalidate.mockResolvedValue(undefined);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await render();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
it("exposes sampling for all18 fields outside native inputs, saves only explicitly", async () => {
  expect(host.querySelectorAll('button[aria-label^="Sample screen color for"]')).toHaveLength(18);
  expect(host.querySelectorAll('input[type="color"]')).toHaveLength(18);
  await act(async () => sample("Primary").click());
  expect(sample("Secondary").disabled).toBe(true);
  await act(async () => resolve({ sRGBHex: "#abcdef" }));
  expect(hex("primary").value).toBe("#ABCDEF");
  expect(hex("secondary").value).toBe("#445566");
  expect(api.request).not.toHaveBeenCalled();
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[data-testid="button-save-branding-colors"]')!.click(),
  );
  expect(api.request).toHaveBeenCalledWith(
    "PUT",
    "/api/admin/settings",
    expect.objectContaining({
      key: "brand_primary_color",
      value: "#ABCDEF",
      category: "branding",
      isSecret: false,
    }),
  );
});
it("keeps sampled draft on same-settings rerender and failed explicit save", async () => {
  await act(async () => sample("Primary").click());
  await act(async () => resolve({ sRGBHex: "#abcdef" }));
  await render();
  expect(hex("primary").value).toBe("#ABCDEF");
  api.request.mockRejectedValue(new Error("Save unavailable"));
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[data-testid="button-save-branding-colors"]')!.click(),
  );
  expect(hex("primary").value).toBe("#ABCDEF");
  expect(api.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
});
it("unsupported browser retains manual controls and explains external-browser draft boundary", async () => {
  vi.stubGlobal("EyeDropper", undefined);
  await render();
  expect(sample("Primary").disabled).toBe(true);
  expect(hex("primary").disabled).toBe(false);
  expect(host.textContent).toContain("Codex browser");
  expect(host.textContent).toContain("Keep unsaved changes here");
  expect(api.request).not.toHaveBeenCalled();
});

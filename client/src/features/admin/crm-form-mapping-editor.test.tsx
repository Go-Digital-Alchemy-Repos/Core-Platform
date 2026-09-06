// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cmsFormFieldSchema } from "@shared/schema";
import { CrmFormMappingEditor } from "./crm-form-mapping-editor";
let root: Root, host: HTMLDivElement, cache: QueryClient;
let status: number, saveStatus: number;
let calls: Array<{
  url: string;
  method: string;
  body: { expectedRevision: number; mapping: unknown; sample: Record<string, unknown> };
}>;
let saved: { mapping: unknown; revision: number };
let previewResponse: unknown;
let definitionsStatus: number;
const dirty = vi.fn();
const fields = [
  cmsFormFieldSchema.parse({
    id: "stable-name",
    key: "visitor_name",
    label: "Visitor name",
    type: "text",
  }),
];
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  previewResponse = undefined;
  definitionsStatus = 200;
  status = 200;
  saveStatus = 200;
  saved = { mapping: null, revision: 7 };
  calls = [];
  dirty.mockClear();
  cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, options?: RequestInit) => {
      const method = options?.method ?? "GET";
      const body = options?.body ? JSON.parse(String(options.body)) : undefined;
      calls.push({ url, method, body });
      if (url.endsWith("custom-fields"))
        return new Response(JSON.stringify({ definitions: [] }), { status: definitionsStatus });
      if (method === "GET") return new Response(JSON.stringify(saved), { status });
      if (saveStatus !== 200)
        return new Response(JSON.stringify({ message: "private raw configuration" }), {
          status: saveStatus,
        });
      if (url.endsWith("preview") && previewResponse !== undefined)
        return new Response(JSON.stringify(previewResponse));
      if (url.endsWith("preview"))
        return new Response(
          JSON.stringify({
            ok: true,
            mode: "explicit",
            mappingRevision: body.expectedRevision + 1,
            normalizedBuiltins: { name: body.sample.visitor_name },
            customValues: [],
          }),
        );
      saved = { mapping: body.mapping, revision: body.expectedRevision + 1 };
      return new Response(JSON.stringify(saved));
    }),
  );
});
afterEach(() => {
  act(() => root.unmount());
  cache.clear();
  host.remove();
  vi.unstubAllGlobals();
});
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 15));
  });
}
async function render(props: Partial<React.ComponentProps<typeof CrmFormMappingEditor>> = {}) {
  await act(async () =>
    root.render(
      <QueryClientProvider client={cache}>
        <CrmFormMappingEditor
          formId="form1"
          fields={fields}
          createCrmLead
          hasUnsavedFormChanges={false}
          readOnly={false}
          onDirtyChange={dirty}
          {...props}
        />
      </QueryClientProvider>,
    ),
  );
  await settle();
}
function button(label: string) {
  return [...host.querySelectorAll("button")].find((item) => item.textContent === label)!;
}
async function click(element: HTMLElement) {
  await act(async () => element.click());
  await settle();
}
async function value(element: HTMLSelectElement | HTMLTextAreaElement, next: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLTextAreaElement.prototype,
      "value",
    )!.set!.call(element, next);
    element.dispatchEvent(
      new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }),
    );
  });
}
async function configure() {
  await click(host.querySelector('input[type="checkbox"]')!);
  await click(button("Add field mapping"));
  await value(host.querySelector("select")!, "stable-name");
}
it("saves stable source identity with next revision, previews actual endpoint, and removes without resetting revision", async () => {
  await render();
  await configure();
  expect(button("Save CRM mapping").disabled).toBe(false);
  await click(button("Save CRM mapping"));
  expect(calls.find((call) => call.method === "PUT")?.body).toEqual({
    expectedRevision: 7,
    mapping: {
      version: 1,
      revision: 8,
      mode: "explicit",
      bindings: [
        { sourceFieldId: "stable-name", target: { kind: "builtin", key: "name" }, required: false },
      ],
    },
  });
  await value(host.querySelector("textarea")!, '{"visitor_name":"Sample visitor"}');
  await click(button("Preview CRM mapping"));
  expect(calls.find((call) => call.url.endsWith("preview"))?.body.sample).toEqual({
    visitor_name: "Sample visitor",
  });
  expect(host.textContent).toContain("Sample visitor");
  await click(host.querySelector('input[type="checkbox"]')!);
  await click(button("Save CRM mapping"));
  expect(calls.filter((call) => call.method === "PUT").at(-1)?.body).toEqual({
    expectedRevision: 8,
    mapping: null,
  });
  expect(saved.revision).toBe(9);
});
it("load failure blocks defaults and retry hydrates current revision", async () => {
  status = 503;
  await render();
  expect(button("Save CRM mapping")).toBeUndefined();
  expect(host.textContent).toContain("could not be loaded");
  status = 200;
  await click(button("Retry CRM mapping"));
  await configure();
  await click(button("Save CRM mapping"));
  expect(saved.revision).toBe(8);
});
it("stale save retains edits and hides backend details until explicit reload", async () => {
  await render();
  await configure();
  saveStatus = 409;
  await click(button("Save CRM mapping"));
  expect(host.querySelector("select")?.value).toBe("stable-name");
  expect(host.textContent).toContain("edits are retained");
  expect(host.textContent).not.toContain("private raw");
  expect(dirty).toHaveBeenLastCalledWith(true);
  saved = { mapping: null, revision: 10 };
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
  await click(button("Reload saved mapping"));
  expect(host.querySelector('input[type="checkbox"]')).toHaveProperty("checked", false);
});
it("blocks incomplete and duplicate targets and blocks unsaved form configuration", async () => {
  await render();
  await configure();
  await click(button("Add field mapping"));
  await value(host.querySelectorAll("select")[2], "stable-name");
  expect(button("Save CRM mapping").disabled).toBe(true);
  await click(button("Remove mapping 2"));
  await render({ hasUnsavedFormChanges: true });
  expect(button("Save CRM mapping").disabled).toBe(true);
  await click(host.querySelector('input[type="checkbox"]')!);
  expect(button("Save CRM mapping").disabled).toBe(true);
});
it("allows persisted mapping removal while generic lead-creation settings are dirty", async () => {
  saved.mapping = { version: 1, revision: 7, mode: "explicit", bindings: [] };
  await render({ createCrmLead: false, hasUnsavedFormChanges: true });
  await click(host.querySelector('input[type="checkbox"]')!);
  await click(button("Save CRM mapping"));
  expect(saved).toEqual({ mapping: null, revision: 8 });
});
it("read-only locks controls and unsaved forms make no requests", async () => {
  await render({ formId: "draft-new" });
  expect(calls).toHaveLength(0);
  expect(host.textContent).toContain("Save this form");
  await render({ readOnly: true });
  expect(host.querySelector('input[type="checkbox"]')).toHaveProperty("disabled", true);
  expect(button("Save CRM mapping").disabled).toBe(true);
});

it("unavailable definitions block editing until a successful retry", async () => {
  definitionsStatus = 503;
  await render();
  expect(host.querySelector('input[type="checkbox"]')).toHaveProperty("disabled", true);
  definitionsStatus = 200;
  await click(button("Retry CRM mapping"));
  expect(host.querySelector('input[type="checkbox"]')).toHaveProperty("disabled", false);
});
it("renders typed source errors and rejects unsupported preview responses", async () => {
  await render();
  await configure();
  previewResponse = {
    ok: false,
    kind: "invalid_values",
    errors: [{ sourceFieldId: "stable-name", code: "required_value" }],
  };
  await click(button("Preview CRM mapping"));
  expect(host.textContent).toContain("Visitor name: required value");
  previewResponse = {
    ok: false,
    kind: "configuration_unavailable",
    errors: [{ sourceFieldId: null, code: "unavailable_target" }],
  };
  await click(button("Preview CRM mapping"));
  expect(host.textContent).toContain("Mapping configuration is unavailable.");
  previewResponse = { private: "do not display this" };
  await click(button("Preview CRM mapping"));
  expect(host.textContent).not.toContain("do not display this");
  expect(host.textContent).toContain("Unsupported mapping data");
});
it("unsupported mapping version never enables defaults", async () => {
  saved.mapping = { version: 2, revision: 7, mode: "explicit", bindings: [] };
  await render();
  expect(button("Save CRM mapping")).toBeUndefined();
  expect(host.textContent).toContain("could not be loaded");
});

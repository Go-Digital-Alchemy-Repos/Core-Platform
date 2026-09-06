// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrmCustomFieldSettings } from "./crm-custom-field-settings";
import { crmCustomFieldDefinitionSchema } from "@shared/crm-custom-fields";
import { CRM_CUSTOM_FIELDS_QUERY_KEY } from "@/hooks/use-crm-custom-fields";
const id = "11111111-1111-4111-8111-111111111111";
const field = () =>
  crmCustomFieldDefinitionSchema.parse({
    id,
    key: "farm_size",
    entityScope: "both",
    type: "number",
    revision: 3,
    archivedAt: null,
    config: { version: 1, label: "Farm size", defaultValue: 0 },
  });
describe("custom field definition settings", () => {
  let root: Root, host: HTMLDivElement, cache: QueryClient;
  let definitions: ReturnType<typeof field>[];
  let loadStatus: number, saveStatus: number;
  let calls: Array<{ method: string; url: string; body?: Record<string, unknown> }>;
  beforeEach(() => {
    vi.stubGlobal("React", React);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    definitions = [];
    loadStatus = 200;
    saveStatus = 200;
    calls = [];
    cache = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, options?: RequestInit) => {
        const method = options?.method ?? "GET";
        const body = options?.body ? JSON.parse(String(options.body)) : undefined;
        calls.push({ method, url, body });
        if (method === "GET")
          return new Response(JSON.stringify({ definitions }), { status: loadStatus });
        if (saveStatus !== 200)
          return new Response(JSON.stringify({ message: "private backend details" }), {
            status: saveStatus,
          });
        const saved =
          method === "POST"
            ? crmCustomFieldDefinitionSchema.parse({ ...body, id, revision: 1, archivedAt: null })
            : crmCustomFieldDefinitionSchema.parse({
                ...definitions[0],
                config: body.config,
                revision: definitions[0].revision + 1,
                archivedAt: body.archived ? "2026-09-06T00:00:00Z" : null,
              });
        definitions = [saved];
        return new Response(JSON.stringify({ definitions }));
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
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
  async function render(canEdit = true) {
    await act(async () =>
      root.render(
        <QueryClientProvider client={cache}>
          <CrmCustomFieldSettings canEdit={canEdit} />
        </QueryClientProvider>,
      ),
    );
    await settle();
  }
  function button(text: string) {
    const found = Array.from(host.querySelectorAll("button")).find((b) => b.textContent === text);
    if (!found) throw new Error(`Missing button ${text}`);
    return found;
  }
  async function click(text: string) {
    await act(async () => button(text).click());
    await settle();
  }
  async function change(id: string, value: string) {
    const element = host.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        element.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype,
        "value",
      )!.set!.call(element, value);
      element.dispatchEvent(
        new Event(element.tagName === "SELECT" ? "change" : "input", { bubbles: true }),
      );
    });
  }
  async function submit() {
    await act(async () =>
      host
        .querySelector("form")
        ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
    );
    await settle();
  }
  it.each([
    ["text", "Hello", "Hello"],
    ["number", "0", 0],
    ["date", "2024-02-29", "2024-02-29"],
    ["boolean", "false", false],
    ["choice", "option_one", "option_one"],
  ])("creates typed %s with exact safe request shape", async (type, raw, expected) => {
    await render();
    await change("cf-key", "farm_size");
    await change("cf-label", "Farm size");
    await change("cf-scope", "both");
    await change("cf-type", String(type));
    if (type === "choice") {
      await click("Add option");
      await change("cf-choice-key-0", "option_one");
      await change("cf-choice-label-0", "One");
    }
    await change("cf-default", String(raw));
    await submit();
    const request = calls.find((c) => c.method === "POST")!;
    expect(request.url).toBe(CRM_CUSTOM_FIELDS_QUERY_KEY[0]);
    expect(Object.keys(request.body!).sort()).toEqual(["config", "entityScope", "key", "type"]);
    expect(request.body).toMatchObject({
      key: "farm_size",
      entityScope: "both",
      type,
      config: { version: 1, defaultValue: expected },
    });
    expect(host.textContent).toContain("Custom field saved.");
  });
  it("patches accepted revision, immutable identity and archive without deleting values", async () => {
    definitions = [field()];
    await render();
    await click("Farm size");
    for (const id of ["cf-key", "cf-scope", "cf-type"])
      expect((host.querySelector(`#${id}`) as HTMLInputElement).disabled).toBe(true);
    await change("cf-label", "Updated label");
    const archive = Array.from(host.querySelectorAll("label"))
      .find((label) => label.textContent === "Archived field")!
      .querySelector("input")!;
    await act(async () => archive.click());
    await submit();
    expect(calls.find((c) => c.method === "PATCH")).toMatchObject({
      url: CRM_CUSTOM_FIELDS_QUERY_KEY[0] + "/" + id,
      body: {
        expectedRevision: 3,
        archived: true,
        config: { label: "Updated label", defaultValue: 0 },
      },
    });
    expect(Object.keys(calls.find((c) => c.method === "PATCH")!.body!).sort()).toEqual([
      "archived",
      "config",
      "expectedRevision",
    ]);
    expect(host.textContent).toContain("Archiving preserves existing values");
  });
  it("failed GET blocks even direct form submission, then Retry restores load", async () => {
    loadStatus = 503;
    await render();
    await change("cf-key", "farm_size");
    await change("cf-label", "Field");
    await submit();
    expect(calls.filter((c) => c.method !== "GET")).toEqual([]);
    expect(button("Create custom field").disabled).toBe(true);
    loadStatus = 200;
    await click("Retry loading custom fields");
    expect((host.querySelector("fieldset") as HTMLFieldSetElement).disabled).toBe(false);
  });
  it("pending initial GET never permits writes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    await render();
    await submit();
    expect(host.textContent).toContain("Loading custom fields");
    expect(button("Create custom field").disabled).toBe(true);
  });
  it.each([409, 500, 403])("retains edits and sanitizes failed save %s", async (status) => {
    definitions = [field()];
    saveStatus = status;
    await render();
    await click("Farm size");
    await change("cf-label", "My unsaved label");
    await submit();
    expect((host.querySelector("#cf-label") as HTMLInputElement).value).toBe("My unsaved label");
    expect(host.textContent).not.toContain("private backend details");
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    if (status === 409) {
      expect(host.textContent).toContain("This field changed");
      definitions = [
        { ...field(), revision: 4, config: { ...field().config, label: "Other administrator" } },
      ];
      await click("Reload saved field");
      expect((host.querySelector("#cf-label") as HTMLInputElement).value).toBe(
        "Other administrator",
      );
      saveStatus = 200;
      await submit();
      expect(calls.filter((c) => c.method === "PATCH").at(-1)?.body?.expectedRevision).toBe(4);
    }
  });
  it("failed conflict reload retains draft and blocks saving on failed query", async () => {
    definitions = [field()];
    saveStatus = 409;
    await render();
    await click("Farm size");
    await change("cf-label", "Keep this");
    await submit();
    loadStatus = 503;
    await click("Reload saved field");
    expect((host.querySelector("#cf-label") as HTMLInputElement).value).toBe("Keep this");
    expect(button("Save custom field").disabled).toBe(true);
  });
  it("background refresh does not replace edits", async () => {
    definitions = [field()];
    await render();
    await click("Farm size");
    await change("cf-label", "Keep this");
    await act(async () =>
      cache.setQueryData(CRM_CUSTOM_FIELDS_QUERY_KEY, {
        definitions: [{ ...field(), revision: 4 }],
      }),
    );
    expect((host.querySelector("#cf-label") as HTMLInputElement).value).toBe("Keep this");
    await submit();
    expect(calls.find((c) => c.method === "PATCH")?.body?.expectedRevision).toBe(3);
  });
  it("invalid stored versions disable editing rather than replacing data", async () => {
    definitions = [
      { ...field(), config: { ...field().config, version: 99 } } as unknown as ReturnType<
        typeof field
      >,
    ];
    await render();
    expect(button("Create custom field").disabled).toBe(true);
    await submit();
    expect(calls.filter((c) => c.method !== "GET")).toEqual([]);
  });
  it("read-only permission prevents queries and controls", async () => {
    await render(false);
    expect(calls).toEqual([]);
    expect(host.querySelector("form")).toBeNull();
    expect(host.textContent).toContain("Only administrators");
  });
  it("labels each typed control and permits removal only of unsaved choice options", async () => {
    await render();
    await change("cf-type", "choice");
    await click("Add option");
    for (const control of host.querySelectorAll("input[id],select[id]"))
      expect(host.querySelector(`label[for="${control.id}"]`)).not.toBeNull();
    await click("Remove unsaved option 1");
    expect(host.querySelector("#cf-choice-key-0")).toBeNull();
  });
  it("unarchives using the current revision and retains immutable saved option keys", async () => {
    definitions = [
      crmCustomFieldDefinitionSchema.parse({
        ...field(),
        type: "choice",
        archivedAt: "2026-09-06T00:00:00Z",
        config: {
          ...field().config,
          defaultValue: null,
          choices: [{ key: "option_one", label: "One", archived: true }],
        },
      }),
    ];
    await render();
    await click("Farm size (archived)");
    expect((host.querySelector("#cf-choice-key-0") as HTMLInputElement).disabled).toBe(true);
    expect(host.textContent).not.toContain("Remove unsaved option 1");
    const archive = Array.from(host.querySelectorAll("label"))
      .find((label) => label.textContent === "Archived field")!
      .querySelector("input")!;
    await act(async () => archive.click());
    await submit();
    expect(calls.find((c) => c.method === "PATCH")?.body).toMatchObject({
      expectedRevision: 3,
      archived: false,
      config: { choices: [{ key: "option_one", archived: true }] },
    });
  });
  it("blocks invalid numeric defaults and duplicate choice keys", async () => {
    await render();
    await change("cf-key", "farm_size");
    await change("cf-label", "Farm size");
    await change("cf-type", "number");
    await change("cf-default", "1000000000001");
    await submit();
    expect(calls.filter((c) => c.method !== "GET")).toEqual([]);
    await change("cf-type", "choice");
    for (let i = 0; i < 2; i++) {
      await click("Add option");
      await change(`cf-choice-key-${i}`, "option_one");
      await change(`cf-choice-label-${i}`, "One");
    }
    await submit();
    expect(calls.filter((c) => c.method !== "GET")).toEqual([]);
  });
  it("sends required/manual, copy and order configuration only in its allowed scope", async () => {
    await render();
    await change("cf-key", "farm_size");
    await change("cf-label", "Farm size");
    const label = (text: string) =>
      Array.from(host.querySelectorAll("label"))
        .find((label) => label.textContent === text)!
        .querySelector("input")!;
    expect(label("Copy lead value when first converted to a client").disabled).toBe(true);
    await change("cf-scope", "both");
    await change("cf-order", "7");
    await act(async () => {
      label("Required for new manual records").click();
      label("Copy lead value when first converted to a client").click();
    });
    await submit();
    expect(calls.find((c) => c.method === "POST")?.body).toMatchObject({
      entityScope: "both",
      config: { order: 7, requiredOnManualCreate: true, copyOnConversion: true },
    });
  });
});

// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CrmRecordCustomFields,
  ManualCrmCustomFields,
  type ManualFieldsState,
} from "./crm-record-custom-fields";
import { CreateLeadSheet } from "./crm-page";
import { CreateCrmClientSheet } from "./crm-create-client-sheet";
import { crmCustomFieldDefinitionSchema } from "@shared/crm-custom-fields";
const id = "11111111-1111-4111-8111-111111111111";
const definition = (type = "number", defaultValue: unknown = 0) =>
  crmCustomFieldDefinitionSchema.parse({
    id,
    key: "farm_size",
    entityScope: "both",
    type,
    revision: 3,
    archivedAt: null,
    config: { version: 1, label: "Farm size", defaultValue },
  });

describe("typed CRM record values", () => {
  let root: Root, host: HTMLDivElement, cache: QueryClient;
  let definitions: ReturnType<typeof definition>[];
  let record: { revision: number; values: unknown[] };
  let loadStatus: number, saveStatus: number;
  type TestValue = { definitionId: string; definitionRevision: number; value: unknown };
  type TestBody = { expectedRevision: number; values: TestValue[]; customFields: TestValue[] };
  let calls: Array<{ method: string; url: string; body?: TestBody }>;
  beforeEach(() => {
    vi.stubGlobal("React", React);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    definitions = [definition()];
    record = { revision: 7, values: [] };
    loadStatus = saveStatus = 200;
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
          return new Response(JSON.stringify(url.includes("settings") ? { definitions } : record), {
            status: loadStatus,
          });
        if (saveStatus !== 200)
          return new Response(JSON.stringify({ message: "Save rejected" }), { status: saveStatus });
        if (method === "POST") return new Response(JSON.stringify({ id: "created" }));
        record = {
          revision: record.revision + 1,
          values: [
            ...record.values.filter(
              (v) =>
                !body.values.some(
                  (entry: TestValue) =>
                    entry.definitionId === (v as { definitionId: string }).definitionId,
                ),
            ),
            ...body.values.map((v: TestValue) => ({
              ...v,
              current: definitions.find((d) => d.id === v.definitionId),
              acceptedConfig: definitions.find((d) => d.id === v.definitionId)!.config,
            })),
          ],
        };
        return new Response(JSON.stringify(record));
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
  async function render(node: React.ReactNode) {
    await act(async () =>
      root.render(<QueryClientProvider client={cache}>{node}</QueryClientProvider>),
    );
    await settle();
  }
  async function change(selector: string, value: string) {
    const element = document.querySelector(selector) as HTMLInputElement | HTMLSelectElement;
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
  const button = (text: string) =>
    Array.from(document.querySelectorAll("button")).find((b) => b.textContent === text)!;
  async function click(text: string) {
    await act(async () => button(text).click());
    await settle();
  }
  it.each(["lead", "client"] as const)(
    "patches %s using captured revision with zero and null clear",
    async (scope) => {
      await render(<CrmRecordCustomFields scope={scope} id="record" />);
      await change(`#record-field-${id}`, "0");
      await click("Save custom values");
      expect(calls.find((c) => c.method === "PATCH")).toMatchObject({
        url: `/api/admin/crm/${scope === "lead" ? "leads" : "clients"}/record/custom-fields`,
        body: {
          expectedRevision: 7,
          values: [{ definitionId: id, definitionRevision: 3, value: 0 }],
        },
      });
      await change(`#record-field-${id}`, "");
      await click("Save custom values");
      expect(calls.filter((c) => c.method === "PATCH").at(-1)?.body).toMatchObject({
        expectedRevision: 8,
        values: [{ value: null }],
      });
    },
  );
  it.each([
    ["text", "A note"],
    ["date", "2026-09-06"],
  ])("saves typed %s values", async (type, input) => {
    definitions = [definition(type, null)];
    await render(<CrmRecordCustomFields scope="client" id="record" />);
    await change(`#record-field-${id}`, input);
    await click("Save custom values");
    expect(calls.find((c) => c.method === "PATCH")?.body?.values[0].value).toBe(input);
  });
  it("retains an archived accepted option while permitting a new active choice", async () => {
    definitions = [
      crmCustomFieldDefinitionSchema.parse({
        ...definition("text", null),
        type: "choice",
        config: {
          version: 1,
          label: "Choice",
          choices: [
            { key: "old_key", label: "Renamed", archived: true },
            { key: "new_key", label: "New", archived: false },
          ],
        },
      }),
    ];
    record.values = [
      {
        definitionId: id,
        definitionRevision: 1,
        value: "old_key",
        current: definitions[0],
        acceptedConfig: {
          ...definitions[0].config,
          choices: [{ key: "old_key", label: "Original", archived: false }],
        },
      },
    ];
    await render(<CrmRecordCustomFields scope="lead" id="record" />);
    expect(host.textContent).toContain("Accepted value: Original");
    expect((document.querySelector('option[value="old_key"]') as HTMLOptionElement).disabled).toBe(
      true,
    );
    expect(button("Save custom values").disabled).toBe(true);
    await change(`#record-field-${id}`, "new_key");
    await click("Save custom values");
    expect(calls.find((c) => c.method === "PATCH")?.body?.values[0]).toMatchObject({
      definitionRevision: 3,
      value: "new_key",
    });
  });
  it("malformed record data disables editing and emits no PATCH", async () => {
    record.values = [{ definitionId: id, value: "unsupported" }];
    await render(<CrmRecordCustomFields scope="lead" id="record" />);
    expect(button("Save custom values").disabled).toBe(true);
    expect(calls.filter((c) => c.method === "PATCH")).toHaveLength(0);
  });
  it("preserves boolean false and sends only edited definitions", async () => {
    definitions = [definition("boolean", false)];
    await render(<CrmRecordCustomFields scope="lead" id="record" />);
    await change(`#record-field-${id}`, "false");
    await click("Save custom values");
    expect(calls.find((c) => c.method === "PATCH")?.body.values).toEqual([
      { definitionId: id, definitionRevision: 3, value: false },
    ]);
  });
  it("retains conflict edits and explicitly reloads the current revision", async () => {
    await render(<CrmRecordCustomFields scope="lead" id="record" />);
    await change(`#record-field-${id}`, "9");
    saveStatus = 409;
    await click("Save custom values");
    expect((document.querySelector(`#record-field-${id}`) as HTMLInputElement).value).toBe("9");
    expect(host.textContent).toContain("Your edits are retained");
    record = { revision: 12, values: [] };
    await click("Reload saved custom values");
    saveStatus = 200;
    await change(`#record-field-${id}`, "4");
    await click("Save custom values");
    expect(calls.filter((c) => c.method === "PATCH").at(-1)?.body.expectedRevision).toBe(12);
  });
  it("retains draft when reload fails and blocks further saves", async () => {
    await render(<CrmRecordCustomFields scope="client" id="record" />);
    await change(`#record-field-${id}`, "8");
    saveStatus = 500;
    await click("Save custom values");
    loadStatus = 503;
    await click("Reload saved custom values");
    expect((document.querySelector(`#record-field-${id}`) as HTMLInputElement).value).toBe("8");
    expect(button("Save custom values").disabled).toBe(true);
  });
  it("waits for initial fresh data rather than capturing a stale cached revision on reopen", async () => {
    cache.setQueryData(["/api/admin/crm/leads/record/custom-fields"], {
      revision: 2,
      values: [],
      definitions,
    });
    record = { revision: 9, values: [] };
    await render(<CrmRecordCustomFields scope="lead" id="record" />);
    await change(`#record-field-${id}`, "3");
    await click("Save custom values");
    expect(calls.find((c) => c.method === "PATCH")?.body?.expectedRevision).toBe(9);
  });
  it("does not apply defaults to existing empty records and preserves draft during background refresh", async () => {
    await render(<CrmRecordCustomFields scope="lead" id="record" />);
    expect((document.querySelector(`#record-field-${id}`) as HTMLInputElement).value).toBe("");
    await change(`#record-field-${id}`, "6");
    await act(async () =>
      cache.setQueryData(["/api/admin/crm/leads/record/custom-fields"], {
        ...record,
        revision: 20,
        definitions,
      }),
    );
    await click("Save custom values");
    expect(calls.find((c) => c.method === "PATCH")?.body.expectedRevision).toBe(7);
  });
  it("loads 51 retained values and patches only the active edit without rewriting archived history", async () => {
    definitions = Array.from({ length: 51 }, (_, index) => ({
      ...definition(),
      id: `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`,
      key: `retained_${index}`,
      archivedAt: index < 50 ? "2026-09-06T00:00:00Z" : null,
      config: { ...definition().config, label: `Retained field ${index}` },
    }));
    record.values = definitions.map((field) => ({
      definitionId: field.id,
      definitionRevision: 1,
      value: 17,
      current: field,
      acceptedConfig: { ...field.config, label: `Accepted ${field.key}` },
    }));
    const history = JSON.stringify(record.values.slice(0, 50));
    await render(<CrmRecordCustomFields scope="lead" id="record" />);
    expect(host.textContent).toContain("Retained field 0 (archived, read-only): 17");
    expect(host.textContent).toContain("Retained field 49 (archived, read-only): 17");
    await change(`#record-field-${definitions[50].id}`, "0");
    await click("Save custom values");
    expect(calls.find((c) => c.method === "PATCH")?.body?.values).toEqual([
      { definitionId: definitions[50].id, definitionRevision: 3, value: 0 },
    ]);
    expect(record.values).toHaveLength(51);
    expect(JSON.stringify(record.values.slice(0, 50))).toBe(history);
    expect(host.textContent).toContain("Retained field 49 (archived, read-only): 17");
    expect(host.textContent).toContain("Custom values saved.");
  });
  it("shows archived historical labels read-only and does not submit them", async () => {
    definitions = [
      crmCustomFieldDefinitionSchema.parse({
        ...definition("text", null),
        type: "choice",
        archivedAt: "2026-09-06T00:00:00Z",
        config: {
          version: 1,
          label: "Current label",
          choices: [{ key: "old_key", label: "Renamed", archived: true }],
        },
      }),
    ];
    record.values = [
      {
        definitionId: id,
        definitionRevision: 1,
        value: "old_key",
        current: definitions[0],
        acceptedConfig: {
          ...definitions[0].config,
          choices: [{ key: "old_key", label: "Accepted old label", archived: false }],
        },
      },
    ];
    await render(<CrmRecordCustomFields scope="lead" id="record" />);
    expect(host.textContent).toContain("Accepted old label");
    expect(host.textContent).toContain("archived, read-only");
    expect(document.querySelector(`#record-field-${id}`)).toBeNull();
    expect(button("Save custom values").disabled).toBe(true);
  });
  it("manual defaults retain zero/false and explicit clear fails required validation", async () => {
    definitions = [
      { ...definition(), config: { ...definition().config, requiredOnManualCreate: true } },
    ];
    let state: ManualFieldsState | undefined;
    const onChange = (next: ManualFieldsState) => {
      state = next;
    };
    await render(<ManualCrmCustomFields scope="client" onChange={onChange} />);
    expect(state).toMatchObject({ ready: true, values: [{ value: 0 }] });
    await change(`#record-field-${id}`, "");
    expect(state?.ready).toBe(false);
  });
  it("manual client creation sends atomic customFields and retains form on failure", async () => {
    definitions = [definition("boolean", false)];
    const close = vi.fn();
    await render(<CreateCrmClientSheet onClose={close} />);
    await change("#new-client-name", "Synthetic Client");
    saveStatus = 409;
    await click("Create client");
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({
      name: "Synthetic Client",
      primaryEmail: null,
      customFields: [{ definitionId: id, definitionRevision: 3, value: false }],
    });
    expect(close).not.toHaveBeenCalled();
    expect((document.querySelector("#new-client-name") as HTMLInputElement).value).toBe(
      "Synthetic Client",
    );
  });
  it("manual lead creation sends its custom values atomically and retains failed entries", async () => {
    const close = vi.fn();
    await render(<CreateLeadSheet open onOpenChange={close} />);
    await change('[data-testid="input-crm-lead-name"]', "Synthetic Lead");
    await change(`#record-field-${id}`, "5");
    saveStatus = 409;
    await click("Create Lead");
    expect(calls.find((c) => c.method === "POST")).toMatchObject({
      url: "/api/admin/crm",
      body: {
        name: "Synthetic Lead",
        source: "manual",
        customFields: [{ definitionId: id, definitionRevision: 3, value: 5 }],
      },
    });
    expect(close).not.toHaveBeenCalled();
    expect((document.querySelector(`#record-field-${id}`) as HTMLInputElement).value).toBe("5");
    definitions = [{ ...definition(), revision: 4 }];
    await click("Reload custom field defaults");
    await click("Create Lead");
    expect(calls.filter((c) => c.method === "POST").at(-1)?.body.customFields[0]).toMatchObject({
      definitionRevision: 4,
      value: 0,
    });
  });
  it("failed definition loading prevents manual creation", async () => {
    loadStatus = 503;
    await render(<CreateCrmClientSheet onClose={() => {}} />);
    await change("#new-client-name", "Synthetic Client");
    expect(button("Create client").disabled).toBe(true);
    expect(calls.filter((c) => c.method !== "GET")).toHaveLength(0);
  });
});

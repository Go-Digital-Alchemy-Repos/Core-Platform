// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Page from "./client-stack-onboarding-page";

const { request, toast } = vi.hoisted(() => ({ request: vi.fn(), toast: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: request }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (value: string) => void;
  }) => (
    <select value={value} onChange={(event) => onValueChange(event.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
}));

const plan = (id: string) => ({
  stackId: id,
  publicOrigin: `https://${id}.example`,
  adminOrigin: `https://admin.${id}.example`,
  records: [],
  manualInstructions: [],
  rollbackInstructions: [],
  requiredVerification: [],
});
const ready = { status: "ready", pending: [], failed: [] };
const response = (value: unknown) => ({ json: async () => value });
function deferred() {
  let resolve!: (value: ReturnType<typeof response>) => void;
  const promise = new Promise<ReturnType<typeof response>>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("onboarding evidence belongs to the generated plan and observed checks", () => {
  let host: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  beforeEach(async () => {
    request.mockReset();
    toast.mockReset();
    vi.stubGlobal("React", React);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Page />
        </QueryClientProvider>,
      ),
    );
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    host.remove();
    vi.unstubAllGlobals();
  });
  async function flush() {
    await act(async () => {
      await new Promise((done) => setTimeout(done, 0));
    });
  }
  async function generate(id: string) {
    request.mockResolvedValueOnce(response(plan(id)));
    await act(async () =>
      host
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
    );
    await flush();
  }
  async function click(text: string) {
    const button = [...host.querySelectorAll("button")].find((item) =>
      item.textContent?.includes(text),
    );
    expect(button).toBeTruthy();
    await act(async () => button!.click());
    await flush();
  }
  const checks = () =>
    [...host.querySelectorAll("select")].filter((item) =>
      [...item.options].some((option) => option.value === "pending"),
    );
  async function select(item: HTMLSelectElement, value: string) {
    await act(async () => {
      item.value = value;
      item.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  it("resets prior passing checks and results when generating another plan", async () => {
    await generate("first");
    for (const item of checks()) await select(item, "pass");
    request.mockResolvedValueOnce(response(ready));
    await click("Evaluate release readiness");
    expect(host.textContent).toContain("Status: ready");
    await generate("second");
    expect(checks()).toHaveLength(9);
    expect(checks().every((item) => item.value === "pending")).toBe(true);
    expect(host.textContent).not.toContain("Status: ready");
    request.mockResolvedValueOnce(
      response({ status: "pending", pending: ["Domain ownership"], failed: [] }),
    );
    await click("Evaluate release readiness");
    expect(request.mock.calls.at(-1)?.[2]).toEqual({
      stackId: "second",
      checks: expect.objectContaining({ ownership: "pending", certificate: "pending" }),
    });
  });

  it("ignores late readiness, DNS and evidence responses from the replaced plan", async () => {
    await generate("first");
    const readiness = deferred(),
      dns = deferred(),
      evidence = deferred();
    request.mockReturnValueOnce(readiness.promise);
    await click("Evaluate release readiness");
    request.mockReturnValueOnce(dns.promise);
    await click("Verify published DNS");
    request.mockReturnValueOnce(evidence.promise);
    await click("View recorded evidence");
    await generate("second");
    // A new plan can be verified while old requests remain in flight.
    request.mockResolvedValueOnce(response({ status: "new-plan-result", records: [] }));
    await click("Verify published DNS");
    await act(async () => {
      readiness.resolve(response(ready));
      dns.resolve(
        response({
          status: "passed",
          records: [
            {
              fqdn: "old.example",
              type: "CNAME",
              expectedValue: "old",
              status: "passed",
              observedValues: [],
              message: "old DNS result",
            },
          ],
        }),
      );
      evidence.resolve(
        response([
          {
            id: "old",
            kind: "old_plan_evidence",
            recordedAt: "2026-09-06T00:00:00Z",
            recordedByUserId: null,
          },
        ]),
      );
    });
    await flush();
    expect(host.textContent).toContain("https://second.example");
    expect(host.textContent).toContain("new-plan-result");
    for (const stale of ["Status: ready", "old DNS result", "old plan evidence"])
      expect(host.textContent).not.toContain(stale);
  });

  it("invalidates a ready result immediately when an observed check changes", async () => {
    await generate("first");
    request.mockResolvedValueOnce(response(ready));
    await click("Evaluate release readiness");
    expect(host.textContent).toContain("Status: ready");
    await select(checks()[0], "fail");
    expect(host.textContent).not.toContain("Status: ready");
    const pending = deferred();
    request.mockReturnValueOnce(pending.promise);
    await click("Evaluate release readiness");
    await select(checks()[1], "fail");
    await act(async () => pending.resolve(response(ready)));
    await flush();
    expect(host.textContent).not.toContain("Status: ready");
  });

  it("does not retain the old plan when regeneration fails", async () => {
    await generate("first");
    request.mockRejectedValueOnce(new Error("Plan validation failed"));
    await act(async () =>
      host
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
    );
    await flush();
    expect(host.textContent).not.toContain("https://first.example");
    expect(checks()).toHaveLength(0);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Plan validation failed" }),
    );
  });
});

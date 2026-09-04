// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { WebhookDeliveriesTab } from "./webhook-deliveries-tab";

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: [
      {
        eventId: "evt_failed_123",
        eventType: "payment_intent.succeeded",
        status: "failed",
        attemptCount: 2,
        startedAt: "2026-09-04T00:00:00.000Z",
        completedAt: null,
        processedAt: null,
        hasFailure: true,
      },
    ],
    isLoading: false,
  }),
  useMutation: () => ({ mutate: mocks.mutate, isPending: false }),
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
}));

describe("WebhookDeliveriesTab", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mocks.mutate.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.innerHTML = "";
  });

  it("shows failed event metadata and replays only through an explicit action", () => {
    act(() => root.render(React.createElement(WebhookDeliveriesTab)));

    expect(container.textContent).toContain("payment_intent.succeeded");
    expect(container.textContent).toContain("evt_failed_123");
    expect(container.textContent).toContain("Needs replay");
    const replay = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Replay from Stripe"),
    );
    expect(replay).toBeTruthy();
    act(() => replay?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(mocks.mutate).toHaveBeenCalledWith("evt_failed_123");
  });
});

// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";

type HarnessProps = {
  isDirty: boolean;
  enabled?: boolean;
  message?: string;
  onReady: (api: ReturnType<typeof useUnsavedChangesGuard>) => void;
};

function UnsavedChangesHarness({ onReady, ...props }: HarnessProps) {
  const api = useUnsavedChangesGuard(props);
  onReady(api);
  return React.createElement("div", null, "guard");
}

describe("useUnsavedChangesGuard", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
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
    vi.restoreAllMocks();
    container.remove();
    document.body.innerHTML = "";
  });

  async function renderHarness(props: Omit<HarnessProps, "onReady">) {
    if (!root) {
      root = createRoot(container);
    }

    let latestApi: ReturnType<typeof useUnsavedChangesGuard> | null = null;

    await act(async () => {
      root!.render(
        React.createElement(UnsavedChangesHarness, {
          ...props,
          onReady: (api) => {
            latestApi = api;
          },
        })
      );
    });

    if (!latestApi) {
      throw new Error("Guard API not ready");
    }

    return latestApi;
  }

  it("confirms before discarding when the editor is dirty", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const onDiscard = vi.fn();
    const api = await renderHarness({ isDirty: true });

    expect(api.confirmDiscardChanges(onDiscard)).toBe(true);
    expect(confirmSpy).toHaveBeenCalledWith("You have unsaved changes. Leave without saving?");
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it("does not discard when the user cancels the confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const onDiscard = vi.fn();
    const api = await renderHarness({ isDirty: true, message: "Leave this editor?" });

    expect(api.confirmDiscardChanges(onDiscard)).toBe(false);
    expect(confirmSpy).toHaveBeenCalledWith("Leave this editor?");
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it("supports override messages for non-navigation dirty actions", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const onProceed = vi.fn();
    const api = await renderHarness({ isDirty: true, message: "Leave this editor?" });

    expect(
      api.confirmIfDirty(onProceed, "Publish the saved version instead?")
    ).toBe(true);
    expect(confirmSpy).toHaveBeenCalledWith("Publish the saved version instead?");
    expect(onProceed).toHaveBeenCalledTimes(1);
  });

  it("registers a beforeunload prompt only while dirty", async () => {
    await renderHarness({ isDirty: true, message: "Leave this editor?" });

    const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent & {
      returnValue?: string;
    };
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });
});

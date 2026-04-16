// @vitest-environment jsdom

import React from "react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { EditorLockBanner } from "@/components/shared/editor-lock-banner";

describe("EditorLockBanner", () => {
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
    container.remove();
    document.body.innerHTML = "";
  });

  async function renderBanner(props: React.ComponentProps<typeof EditorLockBanner>) {
    root = createRoot(container);
    await act(async () => {
      root!.render(React.createElement(EditorLockBanner, props));
    });
  }

  it("shows takeover controls for admins when another user holds the lock", async () => {
    const onTakeOver = vi.fn();
    await renderBanner({
      variant: "locked-by-other",
      title: "Editing locked by Alex Admin",
      description: "Read-only until the lock is released.",
      canTakeOver: true,
      onRefresh: vi.fn(),
      onTakeOver,
    });

    const takeoverButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Take Over")
    );
    expect(takeoverButton).toBeTruthy();

    await act(async () => {
      takeoverButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onTakeOver).toHaveBeenCalledTimes(1);
  });

  it("does not show takeover controls on the owned-state banner", async () => {
    await renderBanner({
      variant: "active-owned",
      title: "You’re editing this item",
      description: "Your lock is active.",
    });

    expect(container.textContent).toContain("You’re editing this item");
    expect(container.textContent).not.toContain("Take Over");
  });
});

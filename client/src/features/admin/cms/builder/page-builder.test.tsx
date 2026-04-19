// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { PageBuilder } from "./page-builder";

vi.mock("./page-builder-preview", () => ({
  FrontendPreviewDialog: () => null,
}));

describe("PageBuilder", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    (globalThis as typeof globalThis & { React?: typeof React; IS_REACT_ACT_ENVIRONMENT?: boolean }).React = React;
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    (globalThis as typeof globalThis & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
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

  it("renders an empty builder without crashing", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(
        React.createElement(PageBuilder, {
          content: { blocks: [] },
          onChange: vi.fn(),
        }),
      );
    });

    expect(container.textContent).toContain("Visual Builder");
    expect(container.textContent).toContain("0 block");
  });
});

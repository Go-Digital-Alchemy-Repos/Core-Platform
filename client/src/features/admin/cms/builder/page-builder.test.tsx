// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { PageBuilder } from "./page-builder";
import { fixtureWithBrokenPreview, mixedBuilderFixture } from "./page-builder-test-fixtures";

vi.mock("./page-builder-preview", () => ({
  FrontendPreviewDialog: () => null,
}));

vi.mock("./block-renderer", () => ({
  BlockRenderer: ({ block }: { block: { id: string; type: string } }) => {
    if (block.id === "broken-preview-block") {
      throw new Error("Broken preview");
    }

    return React.createElement(
      "div",
      { "data-testid": `mock-block-preview-${block.id}` },
      `Preview:${block.type}`,
    );
  },
}));

describe("PageBuilder", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
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
    vi.restoreAllMocks();
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

  it("renders a realistic mixed block fixture and keeps legacy aliases visible in the builder", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(
        React.createElement(PageBuilder, {
          content: mixedBuilderFixture,
          onChange: vi.fn(),
        }),
      );
    });

    expect(container.textContent).toContain("6 block");
    expect(container.textContent).toContain("Hero");
    expect(container.textContent).toContain("Call to Action");
    expect(container.textContent).toContain("Blog Post Feed (Live)");
    expect(container.textContent).toContain("Events Preview");
    expect(container.textContent).toContain("FAQ");
    expect(container.textContent).toContain("Professional Directory (Live)");
    expect(container.querySelector('[data-testid="mock-block-preview-cta-legacy-block"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="mock-block-preview-blog-legacy-block"]')).not.toBeNull();
  });

  it("isolates a single broken preview while leaving the rest of the builder interactive", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(
        React.createElement(PageBuilder, {
          content: fixtureWithBrokenPreview,
          onChange: vi.fn(),
        }),
      );
    });

    expect(container.textContent).toContain("This block preview could not be rendered in the builder.");
    expect(container.textContent).toContain("Block ID: broken-preview-block");
    expect(container.textContent).toContain("Type: Blog Preview");
    expect(container.querySelector('[data-testid="mock-block-preview-hero-block"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="select-canvas-block-broken-preview-block"]')).not.toBeNull();
  });
});

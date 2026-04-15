import { describe, expect, it } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { BrandingTab } from "@/features/admin/settings-page";

describe("BrandingTab", () => {
  it("renders branding view without throwing", () => {
    (globalThis as typeof globalThis & { React?: typeof React }).React = React;
    const client = new QueryClient();

    expect(() =>
      renderToString(
        React.createElement(
          QueryClientProvider,
          { client },
          React.createElement(BrandingTab, {
            settings: {},
            initialSubtab: "branding",
            showHeader: false,
          }),
        ),
      ),
    ).not.toThrow();
  });
});

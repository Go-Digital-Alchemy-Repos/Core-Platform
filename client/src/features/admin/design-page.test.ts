import { describe, expect, it } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { BrandingTab, INTEGRATIONS, IntegrationCard } from "@/features/admin/settings-page";

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

describe("IntegrationCard", () => {
  it("renders boolean integration fields as switches", () => {
    (globalThis as typeof globalThis & { React?: typeof React }).React = React;
    const client = new QueryClient();
    const merchantCenter = INTEGRATIONS.find((config) => config.category === "google_merchant_center");

    expect(merchantCenter).toBeDefined();
    const html = renderToString(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(IntegrationCard, {
          config: merchantCenter!,
          settings: {
            google_merchant_center: {
              product_feed_enabled: { value: "false", isSecret: false },
            },
          },
        }),
      ),
    );

    expect(html).toContain('data-testid="switch-product_feed_enabled"');
    expect(html).toContain("Disabled");
  });
});

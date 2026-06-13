import { describe, expect, it } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import {
  BrandingTab,
  filterEmailTemplates,
  getEmailTemplateModuleCounts,
  INTEGRATIONS,
  IntegrationCard,
  isEmailTemplateModuleEnabled,
} from "@/features/admin/settings-page";
import { DEFAULT_SITE_FEATURES } from "@shared/site-features";

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

describe("email template library helpers", () => {
  const templates = [
    {
      name: "Event Reminder",
      slug: "event-reminder",
      module: "events" as const,
      subject: "Reminder: {{eventTitle}} is coming up",
      description: "Sent before an event starts.",
      variables: ["eventTitle", "eventDate"],
      isActive: true,
    },
    {
      name: "Password Reset",
      slug: "password-reset",
      module: "users" as const,
      subject: "Reset Your Password",
      description: "Sent when a user requests a password reset.",
      variables: ["resetUrl"],
      isActive: false,
    },
    {
      name: "Managed Form Submission",
      slug: "managed-form-submission",
      module: "forms" as const,
      subject: "New Form Submission",
      description: "Sent when a managed form receives a submission.",
      variables: ["formName"],
      isActive: true,
    },
  ];

  it("counts templates by module", () => {
    const counts = getEmailTemplateModuleCounts(templates);

    expect(counts.events).toBe(1);
    expect(counts.users).toBe(1);
    expect(counts.forms).toBe(1);
    expect(counts.ecommerce).toBe(0);
  });

  it("filters by module, status, and searchable variables", () => {
    expect(
      filterEmailTemplates(templates, {
        moduleFilter: "events",
        statusFilter: "active",
      }).map((template) => template.slug),
    ).toEqual(["event-reminder"]);

    expect(
      filterEmailTemplates(templates, {
        searchQuery: "resetUrl",
      }).map((template) => template.slug),
    ).toEqual(["password-reset"]);

    expect(
      filterEmailTemplates(templates, {
        statusFilter: "inactive",
      }).map((template) => template.slug),
    ).toEqual(["password-reset"]);
  });

  it("hides templates for disabled modules", () => {
    const siteFeatures = { ...DEFAULT_SITE_FEATURES, eventsEnabled: false };

    expect(isEmailTemplateModuleEnabled("events", siteFeatures)).toBe(false);
    expect(isEmailTemplateModuleEnabled("forms", siteFeatures)).toBe(true);
    expect(
      filterEmailTemplates(templates, {
        siteFeatures,
      }).map((template) => template.slug),
    ).toEqual(["password-reset", "managed-form-submission"]);
  });
});

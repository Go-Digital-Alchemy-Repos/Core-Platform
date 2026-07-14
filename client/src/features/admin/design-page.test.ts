import { describe, expect, it } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import {
  BrandingTab,
  ECOMMERCE_INTEGRATION_CATEGORIES,
  filterIntegrations,
  filterEmailTemplates,
  getIntegrationLibraryCounts,
  getEmailTemplateModuleCounts,
  INTEGRATIONS,
  IntegrationCard,
  isIntegrationConfigured,
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
    const merchantCenter = INTEGRATIONS.find(
      (config) => config.category === "google_merchant_center",
    );

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

describe("integration library helpers", () => {
  const settings = {
    stripe: {
      stripe_secret_key: { value: "sk_live_saved", isSecret: true },
    },
  };
  const platformIntegrations = INTEGRATIONS.filter(
    (config) => config.category === "stripe" || config.category === "mailgun",
  );

  it("detects configured integrations and counts them by group", () => {
    const stripe = INTEGRATIONS.find((config) => config.category === "stripe");
    const mailgun = INTEGRATIONS.find((config) => config.category === "mailgun");

    expect(stripe).toBeDefined();
    expect(mailgun).toBeDefined();
    expect(isIntegrationConfigured(stripe!, settings)).toBe(true);
    expect(isIntegrationConfigured(mailgun!, settings)).toBe(false);

    const counts = getIntegrationLibraryCounts(platformIntegrations, settings);
    expect(counts.commerce).toEqual({ total: 1, configured: 1 });
    expect(counts.communications).toEqual({ total: 1, configured: 0 });
  });

  it("filters integrations by search, category, group, and status", () => {
    expect(
      filterIntegrations(platformIntegrations, settings, {
        searchQuery: "transactional",
      }).map((config) => config.category),
    ).toEqual(["mailgun"]);

    expect(
      filterIntegrations(platformIntegrations, settings, {
        groupFilter: "commerce",
        statusFilter: "configured",
      }).map((config) => config.category),
    ).toEqual(["stripe"]);

    expect(
      filterIntegrations(platformIntegrations, settings, {
        categoryFilter: "Other",
        statusFilter: "not_configured",
      }).map((config) => config.category),
    ).toEqual(["mailgun"]);
  });

  it("keeps buy-now-pay-later and wallet providers in system integrations", () => {
    const systemIntegrationCategories = INTEGRATIONS.filter(
      (config) => !ECOMMERCE_INTEGRATION_CATEGORIES.has(config.category),
    ).map((config) => config.category);

    expect(systemIntegrationCategories).toContain("affirm");
    expect(systemIntegrationCategories).toContain("afterpay");
    expect(systemIntegrationCategories).toContain("paypal");
  });

  it("adds must-have ecommerce integrations as setup-ready ecommerce-only providers", () => {
    const ecommerceIntegrationCategories = INTEGRATIONS.filter((config) =>
      ECOMMERCE_INTEGRATION_CATEGORIES.has(config.category),
    ).map((config) => config.category);

    expect(ecommerceIntegrationCategories).toEqual(
      expect.arrayContaining([
        "klaviyo",
        "omnisend",
        "google_ads_tag_manager",
        "pinterest_ads",
        "microsoft_ads_merchant_center",
        "avalara_avatax",
        "taxjar",
        "shipbob",
        "amazon_marketplace",
        "walmart_marketplace",
        "dhl_express",
      ]),
    );

    const avalara = INTEGRATIONS.find((config) => config.category === "avalara_avatax");
    expect(avalara).toMatchObject({
      libraryCategory: "Tax & Compliance",
      configurable: true,
      operational: false,
      requiresAdapter: true,
    });

    expect(
      filterIntegrations(INTEGRATIONS, {}, { searchQuery: "inventory sync" }).map(
        (config) => config.category,
      ),
    ).toEqual(expect.arrayContaining(["amazon_marketplace", "walmart_marketplace"]));
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

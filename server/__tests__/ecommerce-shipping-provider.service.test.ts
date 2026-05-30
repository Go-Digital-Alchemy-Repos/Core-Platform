import { describe, expect, it } from "vitest";
import { ECOMMERCE_SHIPPING_PROVIDER_REGISTRY, mergeShippingProviderStatuses } from "../services/ecommerce-shipping-provider.service";
import type { EcommerceShippingProvider } from "@shared/schema";

describe("ecommerce shipping provider registry", () => {
  it("includes first-class aggregator, workflow, simplicity, and direct carrier options", () => {
    const providers = ECOMMERCE_SHIPPING_PROVIDER_REGISTRY.map((definition) => definition.provider);

    expect(providers).toEqual(expect.arrayContaining([
      "easypost",
      "shippo",
      "shipstation",
      "veeqo",
      "easyship",
      "pirate_ship",
      "ups",
      "usps",
      "fedex",
    ]));
  });

  it("merges configured provider status without exposing settings", () => {
    const connectedAt = new Date("2026-05-30T00:00:00.000Z");
    const statuses = mergeShippingProviderStatuses([
      {
        id: "provider-1",
        provider: "easypost",
        displayName: "EasyPost",
        type: "aggregator",
        capabilities: ["rates"],
        settings: { apiKey: "secret" },
        testMode: false,
        active: true,
        connectedAt,
        createdAt: connectedAt,
        updatedAt: connectedAt,
      } satisfies EcommerceShippingProvider,
    ]);

    const easypost = statuses.find((status) => status.provider === "easypost");
    expect(easypost).toMatchObject({ active: true, testMode: false, connectedAt });
    expect(easypost).not.toHaveProperty("settings");
  });
});

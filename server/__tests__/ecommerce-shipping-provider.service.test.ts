import { describe, expect, it } from "vitest";
import {
  ECOMMERCE_SHIPPING_PROVIDER_REGISTRY,
  getShippingProviderCredentialCategory,
  getShippingProvidersByCapability,
  mergeShippingProviderStatuses,
  shippingProviderSupportsCapability,
} from "../services/ecommerce-shipping-provider.service";
import { createShippingProviderClient, EasyPostShippingProviderClient } from "../services/ecommerce-shipping-carrier.service";
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
    const statuses = mergeShippingProviderStatuses(
      [
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
      ],
      { easypost: { apiKey: true } },
    );

    const easypost = statuses.find((status) => status.provider === "easypost");
    expect(easypost).toMatchObject({ active: true, testMode: false, connectedAt });
    expect(easypost).not.toHaveProperty("settings");
    expect(easypost?.setupFields[0]).toMatchObject({ key: "apiKey", hasValue: true });
    expect(easypost).toMatchObject({
      configured: true,
      operational: true,
      readyCapabilities: expect.arrayContaining(["rates", "labels", "tracking"]),
      missingCredentialLabels: [],
    });
    const shipstation = statuses.find((status) => status.provider === "shipstation");
    expect(shipstation).toMatchObject({
      configured: false,
      operational: false,
      readyCapabilities: [],
      missingCredentialLabels: ["API key", "API secret"],
    });
  });

  it("uses provider-scoped encrypted settings categories", () => {
    expect(getShippingProviderCredentialCategory("shippo")).toBe("ecommerce_shipping_provider_shippo");
  });

  it("exposes capability lookups for carrier-provider orchestration", () => {
    expect(getShippingProvidersByCapability("rates").map((provider) => provider.provider)).toEqual(
      expect.arrayContaining(["easypost", "shippo", "ups", "fedex"]),
    );
    expect(shippingProviderSupportsCapability("shipstation", "workflow_automation")).toBe(true);
    expect(shippingProviderSupportsCapability("pirate_ship", "address_validation")).toBe(false);
  });

  it("creates an EasyPost carrier client without exposing transport details to checkout", async () => {
    const client = createShippingProviderClient("easypost", { apiKey: "test-key" });
    expect(client).toBeInstanceOf(EasyPostShippingProviderClient);
    expect(client.capabilities).toEqual(expect.arrayContaining(["rates", "labels", "tracking"]));
    expect((client as EasyPostShippingProviderClient).buildRateQuotePayload({
      provider: "easypost",
      orderId: "order-1",
      fromAddress: {
        name: "Warehouse",
        street1: "10 Main St",
        city: "Grand Rapids",
        state: "MI",
        zip: "49503",
        country: "US",
      },
      toAddress: {
        name: "Customer",
        street1: "50 Market St",
        city: "Detroit",
        state: "MI",
        zip: "48226",
        country: "US",
      },
      parcels: [{ length: 10, width: 6, height: 2, weight: 16, weightUnit: "oz" }],
    })).toMatchObject({
      shipment: {
        options: { reference: "order-1" },
        parcel: { mass_unit: "oz", distance_unit: "in", weight: 16 },
      },
    });
  });
});

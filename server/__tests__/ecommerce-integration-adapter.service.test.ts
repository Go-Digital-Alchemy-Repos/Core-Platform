import { describe, expect, it } from "vitest";
import {
  assertEcommerceIntegrationOperational,
  createEcommerceIntegrationAdapter,
  ECOMMERCE_INTEGRATION_ADAPTER_REGISTRY,
  getEcommerceIntegrationAdapterDefinition,
  getEcommerceIntegrationAdaptersByCapability,
} from "../services/ecommerce-integration-adapter.service";

describe("ecommerce integration adapter registry", () => {
  it("registers the must-have configurable ecommerce integrations", () => {
    const providers = ECOMMERCE_INTEGRATION_ADAPTER_REGISTRY.map(
      (definition) => definition.provider,
    );

    expect(providers).toEqual(
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
  });

  it("keeps setup-only providers from pretending to be operational", () => {
    const avalara = getEcommerceIntegrationAdapterDefinition("avalara_avatax");
    expect(avalara).toMatchObject({
      configurable: true,
      operational: false,
      requiresAdapter: true,
      capabilities: expect.arrayContaining(["tax_quote", "tax_transaction_commit"]),
    });

    expect(() => assertEcommerceIntegrationOperational("avalara_avatax", "tax_quote")).toThrow(
      "Avalara AvaTax is configurable, but its operational adapter is not implemented yet",
    );
  });

  it("exposes capability lookups and safe adapter stubs", () => {
    expect(
      getEcommerceIntegrationAdaptersByCapability("marketplace_order_sync").map(
        (provider) => provider.provider,
      ),
    ).toEqual(expect.arrayContaining(["amazon_marketplace", "walmart_marketplace"]));

    const adapter = createEcommerceIntegrationAdapter("klaviyo");
    expect(adapter.capabilities).toEqual(expect.arrayContaining(["marketing_event_dispatch"]));
    expect(() => adapter.assertOperational("marketing_event_dispatch")).toThrow(
      "Klaviyo is configurable, but its operational adapter is not implemented yet",
    );
  });
});

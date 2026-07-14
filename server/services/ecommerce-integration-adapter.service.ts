export type EcommerceIntegrationAdapterCapability =
  | "marketing_event_dispatch"
  | "customer_profile_sync"
  | "product_feed_publishing"
  | "tax_quote"
  | "tax_transaction_commit"
  | "tax_refund_adjustment"
  | "shipping_rates"
  | "label_purchase"
  | "shipment_tracking"
  | "address_validation"
  | "inventory_sync"
  | "fulfillment_sync"
  | "marketplace_order_sync";

export interface EcommerceIntegrationAdapterDefinition {
  provider: string;
  displayName: string;
  configurable: boolean;
  operational: boolean;
  requiresAdapter: boolean;
  capabilities: EcommerceIntegrationAdapterCapability[];
}

export interface EcommerceIntegrationAdapter {
  provider: string;
  capabilities: EcommerceIntegrationAdapterCapability[];
  assertOperational(capability?: EcommerceIntegrationAdapterCapability): void;
}

export const ECOMMERCE_INTEGRATION_ADAPTER_REGISTRY: EcommerceIntegrationAdapterDefinition[] = [
  {
    provider: "klaviyo",
    displayName: "Klaviyo",
    configurable: true,
    operational: false,
    requiresAdapter: true,
    capabilities: ["marketing_event_dispatch", "customer_profile_sync"],
  },
  {
    provider: "omnisend",
    displayName: "Omnisend",
    configurable: true,
    operational: false,
    requiresAdapter: true,
    capabilities: ["marketing_event_dispatch", "customer_profile_sync"],
  },
  {
    provider: "google_ads_tag_manager",
    displayName: "Google Ads & Tag Manager",
    configurable: true,
    operational: false,
    requiresAdapter: true,
    capabilities: ["marketing_event_dispatch"],
  },
  {
    provider: "pinterest_ads",
    displayName: "Pinterest Tag & Conversions API",
    configurable: true,
    operational: false,
    requiresAdapter: true,
    capabilities: ["marketing_event_dispatch", "product_feed_publishing"],
  },
  {
    provider: "microsoft_ads_merchant_center",
    displayName: "Microsoft Ads & Merchant Center",
    configurable: true,
    operational: false,
    requiresAdapter: true,
    capabilities: ["marketing_event_dispatch", "product_feed_publishing"],
  },
  {
    provider: "avalara_avatax",
    displayName: "Avalara AvaTax",
    configurable: true,
    operational: false,
    requiresAdapter: true,
    capabilities: [
      "tax_quote",
      "tax_transaction_commit",
      "tax_refund_adjustment",
      "address_validation",
    ],
  },
  {
    provider: "taxjar",
    displayName: "TaxJar",
    configurable: true,
    operational: false,
    requiresAdapter: true,
    capabilities: ["tax_quote", "tax_transaction_commit", "tax_refund_adjustment"],
  },
  {
    provider: "shipbob",
    displayName: "ShipBob",
    configurable: true,
    operational: false,
    requiresAdapter: true,
    capabilities: ["fulfillment_sync", "inventory_sync", "shipment_tracking"],
  },
  {
    provider: "amazon_marketplace",
    displayName: "Amazon Marketplace + MCF",
    configurable: true,
    operational: false,
    requiresAdapter: true,
    capabilities: ["marketplace_order_sync", "inventory_sync", "fulfillment_sync"],
  },
  {
    provider: "walmart_marketplace",
    displayName: "Walmart Marketplace",
    configurable: true,
    operational: false,
    requiresAdapter: true,
    capabilities: ["marketplace_order_sync", "inventory_sync", "product_feed_publishing"],
  },
  {
    provider: "easypost",
    displayName: "EasyPost",
    configurable: true,
    operational: false,
    requiresAdapter: true,
    capabilities: ["shipping_rates", "label_purchase", "shipment_tracking", "address_validation"],
  },
  {
    provider: "ups",
    displayName: "UPS",
    configurable: true,
    operational: false,
    requiresAdapter: true,
    capabilities: ["shipping_rates", "label_purchase", "shipment_tracking", "address_validation"],
  },
  {
    provider: "usps",
    displayName: "USPS",
    configurable: true,
    operational: false,
    requiresAdapter: true,
    capabilities: ["shipping_rates", "label_purchase", "shipment_tracking"],
  },
  {
    provider: "fedex",
    displayName: "FedEx",
    configurable: true,
    operational: false,
    requiresAdapter: true,
    capabilities: ["shipping_rates", "label_purchase", "shipment_tracking", "address_validation"],
  },
  {
    provider: "dhl_express",
    displayName: "DHL Express",
    configurable: true,
    operational: false,
    requiresAdapter: true,
    capabilities: ["shipping_rates", "label_purchase", "shipment_tracking"],
  },
];

export function getEcommerceIntegrationAdapterDefinition(provider: string) {
  return ECOMMERCE_INTEGRATION_ADAPTER_REGISTRY.find(
    (definition) => definition.provider === provider,
  );
}

export function getEcommerceIntegrationAdaptersByCapability(
  capability: EcommerceIntegrationAdapterCapability,
) {
  return ECOMMERCE_INTEGRATION_ADAPTER_REGISTRY.filter((definition) =>
    definition.capabilities.includes(capability),
  );
}

export function assertEcommerceIntegrationOperational(
  provider: string,
  capability?: EcommerceIntegrationAdapterCapability,
) {
  const definition = getEcommerceIntegrationAdapterDefinition(provider);
  if (!definition) throw new Error(`${provider} is not registered as an ecommerce integration`);
  if (capability && !definition.capabilities.includes(capability)) {
    throw new Error(`${definition.displayName} does not support ${capability}`);
  }
  if (!definition.operational) {
    throw new Error(
      `${definition.displayName} is configurable, but its operational adapter is not implemented yet`,
    );
  }
}

export function createEcommerceIntegrationAdapter(provider: string): EcommerceIntegrationAdapter {
  const definition = getEcommerceIntegrationAdapterDefinition(provider);
  if (!definition) return new UnsupportedEcommerceIntegrationAdapter(provider, []);
  return new UnsupportedEcommerceIntegrationAdapter(provider, definition.capabilities);
}

class UnsupportedEcommerceIntegrationAdapter implements EcommerceIntegrationAdapter {
  constructor(
    readonly provider: string,
    readonly capabilities: EcommerceIntegrationAdapterCapability[],
  ) {}

  assertOperational(capability?: EcommerceIntegrationAdapterCapability) {
    assertEcommerceIntegrationOperational(this.provider, capability);
  }
}

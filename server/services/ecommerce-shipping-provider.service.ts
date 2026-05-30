import type { EcommerceShippingProvider } from "@shared/schema";

export type EcommerceShippingProviderCapability =
  | "rates"
  | "labels"
  | "tracking"
  | "address_validation"
  | "international"
  | "workflow_automation"
  | "inventory";

export interface EcommerceShippingProviderDefinition {
  provider: string;
  displayName: string;
  type: "direct_carrier" | "aggregator" | "workflow" | "marketplace";
  recommendedFor: string;
  capabilities: EcommerceShippingProviderCapability[];
  setupFields: Array<{
    key: string;
    label: string;
    secret?: boolean;
  }>;
}

export interface EcommerceShippingProviderStatus extends EcommerceShippingProviderDefinition {
  active: boolean;
  testMode: boolean;
  connectedAt: Date | null;
}

export const ECOMMERCE_SHIPPING_PROVIDER_REGISTRY: EcommerceShippingProviderDefinition[] = [
  {
    provider: "easypost",
    displayName: "EasyPost",
    type: "aggregator",
    recommendedFor: "First-class carrier aggregation, live rates, labels, tracking, and address validation.",
    capabilities: ["rates", "labels", "tracking", "address_validation", "international"],
    setupFields: [{ key: "apiKey", label: "API key", secret: true }],
  },
  {
    provider: "shippo",
    displayName: "Shippo",
    type: "aggregator",
    recommendedFor: "API-forward rate shopping, label creation, tracking, and address validation.",
    capabilities: ["rates", "labels", "tracking", "address_validation", "international"],
    setupFields: [{ key: "apiKey", label: "API token", secret: true }],
  },
  {
    provider: "shipstation",
    displayName: "ShipStation",
    type: "workflow",
    recommendedFor: "Operational shipping workflows, fulfillment automation, and marketplace order routing.",
    capabilities: ["labels", "tracking", "workflow_automation"],
    setupFields: [
      { key: "apiKey", label: "API key", secret: true },
      { key: "apiSecret", label: "API secret", secret: true },
    ],
  },
  {
    provider: "veeqo",
    displayName: "Veeqo",
    type: "workflow",
    recommendedFor: "Inventory plus shipping workflows for growing ecommerce operations.",
    capabilities: ["labels", "tracking", "workflow_automation", "inventory"],
    setupFields: [{ key: "apiKey", label: "API key", secret: true }],
  },
  {
    provider: "easyship",
    displayName: "Easyship",
    type: "aggregator",
    recommendedFor: "International fulfillment, duties, taxes, and cross-border delivery options.",
    capabilities: ["rates", "labels", "tracking", "international"],
    setupFields: [{ key: "apiKey", label: "Access token", secret: true }],
  },
  {
    provider: "pirate_ship",
    displayName: "Pirate Ship",
    type: "marketplace",
    recommendedFor: "Simple label purchasing workflows for lean teams.",
    capabilities: ["labels", "tracking"],
    setupFields: [{ key: "apiKey", label: "API key", secret: true }],
  },
  {
    provider: "ups",
    displayName: "UPS",
    type: "direct_carrier",
    recommendedFor: "Direct UPS rates, labels, and tracking through a merchant carrier account.",
    capabilities: ["rates", "labels", "tracking", "address_validation", "international"],
    setupFields: [
      { key: "clientId", label: "Client ID", secret: true },
      { key: "clientSecret", label: "Client secret", secret: true },
      { key: "accountNumber", label: "Account number", secret: true },
    ],
  },
  {
    provider: "usps",
    displayName: "USPS",
    type: "direct_carrier",
    recommendedFor: "Direct USPS domestic shipping rates, labels, and tracking.",
    capabilities: ["rates", "labels", "tracking"],
    setupFields: [{ key: "apiKey", label: "API key", secret: true }],
  },
  {
    provider: "fedex",
    displayName: "FedEx",
    type: "direct_carrier",
    recommendedFor: "Direct FedEx rates, labels, tracking, and international carrier workflows.",
    capabilities: ["rates", "labels", "tracking", "address_validation", "international"],
    setupFields: [
      { key: "clientId", label: "API key", secret: true },
      { key: "clientSecret", label: "Secret key", secret: true },
      { key: "accountNumber", label: "Account number", secret: true },
    ],
  },
];

export function mergeShippingProviderStatuses(
  configuredProviders: EcommerceShippingProvider[],
): EcommerceShippingProviderStatus[] {
  const configuredByProvider = new Map(configuredProviders.map((provider) => [provider.provider, provider]));

  return ECOMMERCE_SHIPPING_PROVIDER_REGISTRY.map((definition) => {
    const configured = configuredByProvider.get(definition.provider);
    return {
      ...definition,
      active: configured?.active ?? false,
      testMode: configured?.testMode ?? true,
      connectedAt: configured?.connectedAt ?? null,
    };
  });
}

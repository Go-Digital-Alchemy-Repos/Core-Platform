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
  setupFields: EcommerceShippingProviderSetupField[];
}

export interface EcommerceShippingProviderSetupField {
    key: string;
    label: string;
    secret?: boolean;
}

export interface EcommerceShippingProviderSetupFieldStatus extends EcommerceShippingProviderSetupField {
  hasValue: boolean;
}

export interface EcommerceShippingProviderStatus extends EcommerceShippingProviderDefinition {
  setupFields: EcommerceShippingProviderSetupFieldStatus[];
  active: boolean;
  testMode: boolean;
  connectedAt: Date | null;
  configured: boolean;
  operational: boolean;
  readyCapabilities: EcommerceShippingProviderCapability[];
  missingCredentialLabels: string[];
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
  credentialStatus: Record<string, Record<string, boolean>> = {},
): EcommerceShippingProviderStatus[] {
  const configuredByProvider = new Map(configuredProviders.map((provider) => [provider.provider, provider]));

  return ECOMMERCE_SHIPPING_PROVIDER_REGISTRY.map((definition) => {
    const configured = configuredByProvider.get(definition.provider);
    const setupFields = definition.setupFields.map((field) => ({
      ...field,
      hasValue: Boolean(credentialStatus[definition.provider]?.[field.key]),
    }));
    const missingCredentialLabels = setupFields
      .filter((field) => !field.hasValue)
      .map((field) => field.label);
    const hasRequiredCredentials = missingCredentialLabels.length === 0;
    const active = configured?.active ?? false;
    return {
      ...definition,
      setupFields,
      active,
      testMode: configured?.testMode ?? true,
      connectedAt: configured?.connectedAt ?? null,
      configured: hasRequiredCredentials,
      operational: active && hasRequiredCredentials,
      readyCapabilities: active && hasRequiredCredentials ? definition.capabilities : [],
      missingCredentialLabels,
    };
  });
}

export function getShippingProviderDefinition(provider: string): EcommerceShippingProviderDefinition | undefined {
  return ECOMMERCE_SHIPPING_PROVIDER_REGISTRY.find((definition) => definition.provider === provider);
}

export function getShippingProvidersByCapability(capability: EcommerceShippingProviderCapability): EcommerceShippingProviderDefinition[] {
  return ECOMMERCE_SHIPPING_PROVIDER_REGISTRY.filter((definition) => definition.capabilities.includes(capability));
}

export function shippingProviderSupportsCapability(provider: string, capability: EcommerceShippingProviderCapability): boolean {
  return getShippingProviderDefinition(provider)?.capabilities.includes(capability) ?? false;
}

export function getShippingProviderCredentialCategory(provider: string): string {
  return `ecommerce_shipping_provider_${provider}`;
}

import { getShippingProviderDefinition, type EcommerceShippingProviderCapability } from "./ecommerce-shipping-provider.service";

export interface ShippingProviderAddress {
  name?: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface ShippingProviderParcel {
  length?: number | null;
  width?: number | null;
  height?: number | null;
  distanceUnit?: string | null;
  weight: number;
  weightUnit: string;
}

export interface ShippingRateQuoteRequest {
  provider: string;
  fromAddress: ShippingProviderAddress;
  toAddress: ShippingProviderAddress;
  parcels: ShippingProviderParcel[];
  orderId?: string;
}

export interface ShippingRateQuote {
  provider: string;
  serviceCode: string;
  serviceName: string;
  carrier: string;
  amount: number;
  currency: string;
  estimatedDays?: number | null;
  providerRateId?: string | null;
  raw?: unknown;
}

export interface ShippingLabelPurchaseRequest extends ShippingRateQuoteRequest {
  providerRateId: string;
}

export interface ShippingLabelPurchase {
  provider: string;
  labelUrl: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  providerShipmentId?: string | null;
  raw?: unknown;
}

export interface ShippingTrackingStatusRequest {
  provider: string;
  trackingNumber: string;
  carrier?: string | null;
}

export interface ShippingTrackingStatus {
  provider: string;
  status: string;
  carrier?: string | null;
  trackingNumber: string;
  trackingUrl?: string | null;
  raw?: unknown;
}

export interface ShippingProviderClient {
  provider: string;
  capabilities: EcommerceShippingProviderCapability[];
  quoteRates(request: ShippingRateQuoteRequest): Promise<ShippingRateQuote[]>;
  purchaseLabel(request: ShippingLabelPurchaseRequest): Promise<ShippingLabelPurchase>;
  getTrackingStatus(request: ShippingTrackingStatusRequest): Promise<ShippingTrackingStatus>;
}

export class UnsupportedShippingProviderClient implements ShippingProviderClient {
  provider: string;
  capabilities: EcommerceShippingProviderCapability[];

  constructor(provider: string) {
    const definition = getShippingProviderDefinition(provider);
    this.provider = provider;
    this.capabilities = definition?.capabilities ?? [];
  }

  async quoteRates(_request: ShippingRateQuoteRequest): Promise<ShippingRateQuote[]> {
    throw new Error(`${this.provider} live rate quoting is not implemented yet`);
  }

  async purchaseLabel(_request: ShippingLabelPurchaseRequest): Promise<ShippingLabelPurchase> {
    throw new Error(`${this.provider} label purchasing is not implemented yet`);
  }

  async getTrackingStatus(request: ShippingTrackingStatusRequest): Promise<ShippingTrackingStatus> {
    return {
      provider: this.provider,
      status: "unknown",
      carrier: request.carrier,
      trackingNumber: request.trackingNumber,
    };
  }
}

export class EasyPostShippingProviderClient extends UnsupportedShippingProviderClient {
  private readonly apiKey: string;

  constructor(credentials: { apiKey?: string }) {
    super("easypost");
    this.apiKey = credentials.apiKey?.trim() ?? "";
  }

  buildRateQuotePayload(request: ShippingRateQuoteRequest) {
    this.assertConfigured();
    return {
      shipment: {
        to_address: toEasyPostAddress(request.toAddress),
        from_address: toEasyPostAddress(request.fromAddress),
        parcel: toEasyPostParcel(request.parcels[0]),
        options: request.orderId ? { reference: request.orderId } : undefined,
      },
    };
  }

  async quoteRates(request: ShippingRateQuoteRequest): Promise<ShippingRateQuote[]> {
    this.buildRateQuotePayload(request);
    throw new Error("EasyPost API transport is not connected yet");
  }

  async purchaseLabel(request: ShippingLabelPurchaseRequest): Promise<ShippingLabelPurchase> {
    this.assertConfigured();
    if (!request.providerRateId) throw new Error("EasyPost rate id is required to purchase a label");
    throw new Error("EasyPost label purchase transport is not connected yet");
  }

  private assertConfigured() {
    if (!this.apiKey) throw new Error("EasyPost API key is not configured");
  }
}

export function createShippingProviderClient(provider: string, credentials: Record<string, string> = {}): ShippingProviderClient {
  if (provider === "easypost") return new EasyPostShippingProviderClient(credentials);
  return new UnsupportedShippingProviderClient(provider);
}

export function inferCarrierTrackingUrl(params: {
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}): string | null {
  const explicitUrl = params.trackingUrl?.trim();
  if (explicitUrl) return explicitUrl;

  const trackingNumber = params.trackingNumber?.trim();
  if (!trackingNumber) return null;

  const carrier = normalizeCarrier(params.carrier);
  if (!carrier) return null;

  const encodedTrackingNumber = encodeURIComponent(trackingNumber);
  if (carrier.includes("ups")) {
    return `https://www.ups.com/track?tracknum=${encodedTrackingNumber}`;
  }
  if (carrier.includes("usps") || carrier.includes("postal")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodedTrackingNumber}`;
  }
  if (carrier.includes("fedex") || carrier.includes("federal express")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodedTrackingNumber}`;
  }
  if (carrier.includes("dhl")) {
    return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?tracking-id=${encodedTrackingNumber}`;
  }
  if (carrier.includes("ontrac")) {
    return `https://www.ontrac.com/tracking/?number=${encodedTrackingNumber}`;
  }

  return null;
}

function normalizeCarrier(carrier?: string | null): string {
  return carrier?.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ") ?? "";
}

function toEasyPostAddress(address: ShippingProviderAddress) {
  return {
    name: address.name,
    company: address.company,
    street1: address.street1,
    street2: address.street2,
    city: address.city,
    state: address.state,
    zip: address.zip,
    country: address.country,
    phone: address.phone,
    email: address.email,
  };
}

function toEasyPostParcel(parcel: ShippingProviderParcel | undefined) {
  if (!parcel) throw new Error("At least one parcel is required for live shipping rates");
  return {
    length: parcel.length ?? undefined,
    width: parcel.width ?? undefined,
    height: parcel.height ?? undefined,
    distance_unit: parcel.distanceUnit ?? "in",
    weight: parcel.weight,
    mass_unit: parcel.weightUnit,
  };
}

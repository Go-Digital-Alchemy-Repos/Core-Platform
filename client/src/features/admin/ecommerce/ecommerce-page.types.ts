export interface Product {
  id: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  productType?: string | null;
  vendor?: string | null;
  price: number;
  compareAtPrice?: number | null;
  costPerItem?: number | null;
  taxable: boolean;
  taxCategory?: string | null;
  featured: boolean;
  visibility: string;
  publishedAt?: string | null;
  archivedAt?: string | null;
  salePrice?: number | null;
  status: string;
  active: boolean;
  sku?: string | null;
  urlSlug: string;
  tags: string[];
  primaryImage?: string | null;
  secondaryImages: string[];
  features: string[];
  included: string[];
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: string | null;
  physicalProduct: boolean;
  requiresShipping: boolean;
  weight?: number | null;
  weightUnit: string;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimensionUnit: string;
  shippingProfile?: string | null;
  fulfillmentType: string;
  badgeText?: string | null;
  categories?: Category[];
  variants?: ProductVariant[];
  media?: ProductMedia[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  title: string;
  sku?: string | null;
  barcode?: string | null;
  price?: number | null;
  salePrice?: number | null;
  compareAtPrice?: number | null;
  costPerItem?: number | null;
  inventoryQuantity: number;
  trackInventory: boolean;
  lowStockThreshold?: number | null;
  allowBackorder: boolean;
  status: string;
  active: boolean;
  isDefault: boolean;
}

export interface ProductMedia {
  id: string;
  url: string;
  type: string;
  altText?: string | null;
  primary: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  image?: string | null;
  sortOrder: number;
  active: boolean;
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
}

export interface FulfillmentLocation {
  id: string;
  name: string;
  type: string;
  city?: string | null;
  state?: string | null;
  country: string;
  isPrimary: boolean;
  active: boolean;
}

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  states: string[];
  active: boolean;
}

export interface ShippingRate {
  id: string;
  zoneId: string;
  name: string;
  description?: string | null;
  amount: number;
  minOrderAmount?: number | null;
  maxOrderAmount?: number | null;
  active: boolean;
}

export interface ShippingProvider {
  provider: string;
  displayName: string;
  type: string;
  recommendedFor: string;
  capabilities: string[];
  setupFields: Array<{ key: string; label: string; secret?: boolean; hasValue?: boolean }>;
  active: boolean;
  testMode: boolean;
  connectedAt?: string | null;
  configured?: boolean;
  operational?: boolean;
  readyCapabilities?: string[];
  missingCredentialLabels?: string[];
}

export interface Coupon {
  id: string;
  code: string;
  name?: string | null;
  description?: string | null;
  notes?: string | null;
  type: string;
  value: number;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  maxRedemptions?: number | null;
  perCustomerLimit?: number | null;
  active: boolean;
  timesUsed: number;
  startDate?: string | null;
  endDate?: string | null;
  customerEligibility: string;
  eligibleCustomerEmails: string[];
  eligibleProductIds: string[];
  eligibleCategoryIds: string[];
  excludedProductIds: string[];
  excludedCategoryIds: string[];
  allowStacking: boolean;
  appliesTo: string;
  applyBeforeTax: boolean;
  archivedAt?: string | null;
  createdAt: string;
}

export interface CouponReport {
  totalUses: number;
  totalDiscountGiven: number;
  totalRevenue: number;
  remainingUses: number | null;
  recentOrders: Array<{
    orderId: string;
    customerEmail: string | null;
    totalAmount: number;
    discountAmount: number;
    redeemedAt: string;
  }>;
}

export interface Order {
  id: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  subtotalAmount?: number;
  shippingAmount?: number;
  taxAmount?: number;
  discountAmount?: number;
  createdAt: string;
  customer?: { name?: string | null; email?: string | null; phone?: string | null } | null;
  shippingName?: string | null;
  shippingCompany?: string | null;
  shippingAddress?: string | null;
  shippingLine2?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingZip?: string | null;
  shippingCountry?: string | null;
  items: Array<{ id: string; productName: string; quantity: number; lineTotal: number }>;
  shipments?: Array<{
    id: string;
    carrier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    status: string;
    shippedAt?: string | null;
    emailSentAt?: string | null;
  }>;
  fulfillments?: Array<{
    id: string;
    status: string;
    carrier?: string | null;
    trackingNumber?: string | null;
    fulfilledAt?: string | null;
    serviceLevel?: string | null;
  }>;
  internalNotes?: Array<{
    id: string;
    body: string;
    createdAt: string;
    author?: {
      email: string;
      firstName?: string | null;
      lastName?: string | null;
    } | null;
  }>;
  isManualOrder?: boolean;
  manualPaymentMethod?: string | null;
  manualPaymentReference?: string | null;
  manualPaymentMarkedAt?: string | null;
  fulfillmentMode?: string | null;
}

export interface PaymentRequest {
  id: string;
  paymentUrl?: string | null;
  status: string;
}

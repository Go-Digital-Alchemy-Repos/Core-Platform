import { z } from "zod";
import { storage } from "../storage/index";
import {
  ecommerceCartItemSchema,
  type EcommerceCategory,
  type EcommerceCoupon,
  type EcommerceProduct,
  type EcommerceProductVariant,
  type EcommerceShippingRate,
  type EcommerceShippingZone,
} from "@shared/schema";
import { calculateEcommerceTax, type EcommerceTaxCalculation } from "./ecommerce-tax.service";
import { assertEcommerceShippingDestinationAllowed } from "./ecommerce-store-settings.service";

export const MAX_ECOMMERCE_CART_LINES = 50;
export const MAX_ECOMMERCE_LOOKUP_ID_LENGTH = 128;
export const MAX_ECOMMERCE_COUPON_CODE_LENGTH = 80;
export const MAX_ECOMMERCE_CUSTOMER_EMAIL_LENGTH = 254;

export const shippingAddressQuoteSchema = z.object({
  country: z.string().trim().min(1).max(80).default("US"),
  state: z.string().trim().min(1).max(80).optional(),
});

export const priceCartSchema = z.object({
  items: z.array(ecommerceCartItemSchema).min(1).max(MAX_ECOMMERCE_CART_LINES),
  couponCode: z.string().trim().max(MAX_ECOMMERCE_COUPON_CODE_LENGTH).optional(),
  customerId: z.string().trim().min(1).max(MAX_ECOMMERCE_LOOKUP_ID_LENGTH).optional(),
  customerEmail: z.string().trim().email().max(MAX_ECOMMERCE_CUSTOMER_EMAIL_LENGTH).optional(),
  shippingRateId: z.string().trim().min(1).max(MAX_ECOMMERCE_LOOKUP_ID_LENGTH).optional(),
  shippingAddress: shippingAddressQuoteSchema.optional(),
});

export const couponValidationRequestSchema = z.object({
  code: z.string().trim().min(1).max(MAX_ECOMMERCE_COUPON_CODE_LENGTH),
  subtotalAmount: z.number().int().min(0).optional(),
  items: priceCartSchema.shape.items.optional(),
  customerEmail: z.string().trim().email().max(MAX_ECOMMERCE_CUSTOMER_EMAIL_LENGTH).optional(),
});

export const shippingRateQuoteRequestSchema = z.object({
  items: priceCartSchema.shape.items,
  address: shippingAddressQuoteSchema,
});

type EcommerceCartItem = z.infer<typeof ecommerceCartItemSchema>;

function httpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode });
}

function aggregateCartItems(items: EcommerceCartItem[]): EcommerceCartItem[] {
  const itemMap = new Map<string, EcommerceCartItem>();

  for (const item of items) {
    const variantId = item.variantId ?? null;
    const key = `${item.productId}:${variantId ?? ""}`;
    const existing = itemMap.get(key);
    if (!existing) {
      itemMap.set(key, { ...item, variantId: variantId ?? undefined });
      continue;
    }
    const quantity = existing.quantity + item.quantity;
    if (quantity > 99) {
      throw httpError("Cart item quantity exceeds the maximum allowed quantity", 400);
    }
    existing.quantity = quantity;
  }

  return [...itemMap.values()];
}

export interface PricedCartLine {
  productId: string;
  variantId: string | null;
  name: string;
  variantTitle: string | null;
  sku: string | null;
  optionsSnapshot: Record<string, string> | null;
  slug: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  image: string | null;
  categoryIds: string[];
  taxable: boolean;
  taxCategory: string | null;
  taxAmount: number;
  requiresShipping: boolean;
  fulfillmentType: string;
  productSnapshot: Record<string, unknown>;
}

export interface PricedCart {
  lines: PricedCartLine[];
  subtotalAmount: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  coupon: EcommerceCoupon | null;
  couponMessage?: string;
  couponCode?: string;
  couponValidation?: CouponValidationResult;
  shippingRate: ShippingRateOption | null;
  tax: EcommerceTaxCalculation;
}

export interface PublicPricedCartLine {
  productId: string;
  variantId: string | null;
  name: string;
  variantTitle: string | null;
  sku: string | null;
  optionsSnapshot: Record<string, string> | null;
  slug: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  image: string | null;
  taxAmount: number;
  requiresShipping: boolean;
  fulfillmentType: string;
}

export interface PublicPricedCart extends Omit<PricedCart, "lines" | "coupon" | "couponValidation"> {
  lines: PublicPricedCartLine[];
  coupon: Record<string, unknown> | null;
  couponValidation?: ReturnType<typeof toPublicCouponValidationResult>;
}

export interface ShippingRateOption {
  id: string;
  zoneId: string;
  name: string;
  description: string | null;
  amount: number;
}

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  reasonCode?: string;
  message: string;
  coupon: EcommerceCoupon | null;
  discountAmount: number;
  affectedCartItems: string[];
  finalTotals: {
    subtotalAmount: number;
    discountAmount: number;
    shippingAmount: number;
    taxAmount: number;
    totalAmount: number;
  };
}

export function effectiveProductPrice(product: EcommerceProduct, now = new Date()): number {
  if (
    product.salePrice != null &&
    product.salePrice >= 0 &&
    (!product.saleStartAt || product.saleStartAt <= now) &&
    (!product.saleEndAt || product.saleEndAt >= now)
  ) {
    return product.salePrice;
  }

  if (product.discountType === "FIXED" && product.discountValue && product.discountValue > 0) {
    return Math.max(0, product.price - product.discountValue);
  }

  if (product.discountType === "PERCENT" && product.discountValue && product.discountValue > 0) {
    return Math.max(0, Math.round(product.price * (1 - product.discountValue / 100)));
  }

  return product.price;
}

export function effectiveVariantPrice(product: EcommerceProduct, variant: EcommerceProductVariant | undefined, now = new Date()): number {
  if (!variant) return effectiveProductPrice(product, now);
  if (variant.salePrice != null && variant.salePrice >= 0) return variant.salePrice;
  if (variant.price != null && variant.price >= 0) return variant.price;
  return effectiveProductPrice(product, now);
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function computeCouponDiscount(coupon: EcommerceCoupon, eligibleSubtotal: number, shippingAmount: number): number {
  if (coupon.type === "freeShipping") return shippingAmount;
  if (coupon.type === "percentage") {
    const amount = Math.round(eligibleSubtotal * (coupon.value / 100));
    return Math.min(amount, coupon.maxDiscountAmount ?? amount);
  }
  return Math.min(eligibleSubtotal, coupon.value);
}

function invalidCouponResult(
  code: string,
  coupon: EcommerceCoupon | null,
  reasonCode: string,
  message: string,
  subtotalAmount: number,
  shippingAmount: number,
  taxAmount: number,
): CouponValidationResult {
  return {
    valid: false,
    code: normalizeCode(code),
    reasonCode,
    message,
    coupon,
    discountAmount: 0,
    affectedCartItems: [],
    finalTotals: {
      subtotalAmount,
      discountAmount: 0,
      shippingAmount,
      taxAmount,
      totalAmount: Math.max(0, subtotalAmount + shippingAmount + taxAmount),
    },
  };
}

function couponSnapshot(coupon: EcommerceCoupon | null) {
  if (!coupon) return null;
  return {
    id: coupon.id,
    code: coupon.code,
    name: coupon.name,
    type: coupon.type,
    value: coupon.value,
    minOrderAmount: coupon.minOrderAmount,
    maxDiscountAmount: coupon.maxDiscountAmount,
    appliesTo: coupon.appliesTo,
    eligibleProductIds: coupon.eligibleProductIds ?? [],
    eligibleCategoryIds: coupon.eligibleCategoryIds ?? [],
    excludedProductIds: coupon.excludedProductIds ?? [],
    excludedCategoryIds: coupon.excludedCategoryIds ?? [],
  };
}

export function buildCouponSnapshot(coupon: EcommerceCoupon | null): Record<string, unknown> | null {
  return couponSnapshot(coupon);
}

export function toPublicCouponValidationResult(result: CouponValidationResult | undefined): Omit<CouponValidationResult, "coupon"> & {
  coupon: Record<string, unknown> | null;
} | undefined {
  if (!result) return undefined;
  return {
    ...result,
    coupon: couponSnapshot(result.coupon),
  };
}

export function toPublicPricedCart(priced: PricedCart): PublicPricedCart {
  return {
    ...priced,
    lines: priced.lines.map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
      name: line.name,
      variantTitle: line.variantTitle,
      sku: line.sku,
      optionsSnapshot: line.optionsSnapshot,
      slug: line.slug,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      image: line.image,
      taxAmount: line.taxAmount,
      requiresShipping: line.requiresShipping,
      fulfillmentType: line.fulfillmentType,
    })),
    coupon: couponSnapshot(priced.coupon),
    couponValidation: toPublicCouponValidationResult(priced.couponValidation),
  };
}

function isLineEligible(coupon: EcommerceCoupon, line: PricedCartLine): boolean {
  const excludedProductIds = coupon.excludedProductIds ?? [];
  const excludedCategoryIds = coupon.excludedCategoryIds ?? [];
  const eligibleProductIds = coupon.eligibleProductIds ?? [];
  const eligibleCategoryIds = coupon.eligibleCategoryIds ?? [];
  if (excludedProductIds.includes(line.productId)) return false;
  if (line.categoryIds.some((categoryId) => excludedCategoryIds.includes(categoryId))) return false;

  const hasProductRules = eligibleProductIds.length > 0;
  const hasCategoryRules = eligibleCategoryIds.length > 0;
  if (!hasProductRules && !hasCategoryRules) return true;

  return (
    eligibleProductIds.includes(line.productId) ||
    line.categoryIds.some((categoryId) => eligibleCategoryIds.includes(categoryId))
  );
}

export async function validateCouponForCart(input: {
  code: string;
  lines: PricedCartLine[];
  subtotalAmount: number;
  shippingAmount?: number;
  taxAmount?: number;
  customerId?: string | null;
  customerEmail?: string | null;
  existingDiscountAmount?: number;
}): Promise<CouponValidationResult> {
  const shippingAmount = input.shippingAmount ?? 0;
  const taxAmount = input.taxAmount ?? 0;
  const coupon = await storage.ecommerce.getCouponByCode(input.code);
  const now = new Date();
  if (!coupon) return invalidCouponResult(input.code, null, "not_found", "Invalid coupon code", input.subtotalAmount, shippingAmount, taxAmount);
  if (coupon.archivedAt) return invalidCouponResult(input.code, coupon, "archived", "This coupon is no longer available", input.subtotalAmount, shippingAmount, taxAmount);
  if (!coupon.active) return invalidCouponResult(input.code, coupon, "inactive", "This coupon is not active", input.subtotalAmount, shippingAmount, taxAmount);
  if (coupon.startDate && coupon.startDate > now) return invalidCouponResult(input.code, coupon, "scheduled", "This coupon is not active yet", input.subtotalAmount, shippingAmount, taxAmount);
  if (coupon.endDate && coupon.endDate < now) return invalidCouponResult(input.code, coupon, "expired", "This coupon has expired", input.subtotalAmount, shippingAmount, taxAmount);
  if (coupon.maxRedemptions != null && coupon.timesUsed >= coupon.maxRedemptions) {
    return invalidCouponResult(input.code, coupon, "usage_limit_reached", "This coupon has reached its usage limit", input.subtotalAmount, shippingAmount, taxAmount);
  }
  if (coupon.perCustomerLimit != null && coupon.perCustomerLimit > 0 && (input.customerId || input.customerEmail)) {
    const customerUses = await storage.ecommerce.countCouponRedemptions(coupon.id, input.customerId, input.customerEmail);
    if (customerUses >= coupon.perCustomerLimit) {
      return invalidCouponResult(input.code, coupon, "customer_usage_limit_reached", "This coupon has already been used by this customer", input.subtotalAmount, shippingAmount, taxAmount);
    }
  }
  if (coupon.customerEligibility === "specific_emails") {
    const customerEmail = input.customerEmail?.trim().toLowerCase();
    const eligibleEmails = (coupon.eligibleCustomerEmails ?? []).map((email) => email.trim().toLowerCase());
    if (!customerEmail || !eligibleEmails.includes(customerEmail)) {
      return invalidCouponResult(input.code, coupon, "customer_not_eligible", "This coupon is not valid for this customer", input.subtotalAmount, shippingAmount, taxAmount);
    }
  }
  if (coupon.minOrderAmount != null && input.subtotalAmount < coupon.minOrderAmount) {
    return invalidCouponResult(input.code, coupon, "minimum_not_met", "Order minimum has not been met", input.subtotalAmount, shippingAmount, taxAmount);
  }
  if (!coupon.allowStacking && (input.existingDiscountAmount ?? 0) > 0) {
    return invalidCouponResult(input.code, coupon, "stacking_not_allowed", "This coupon cannot be combined with another discount", input.subtotalAmount, shippingAmount, taxAmount);
  }

  const affectedLines = input.lines.filter((line) => isLineEligible(coupon, line));
  const hasItemRules =
    (coupon.eligibleProductIds ?? []).length > 0 ||
    (coupon.eligibleCategoryIds ?? []).length > 0 ||
    (coupon.excludedProductIds ?? []).length > 0 ||
    (coupon.excludedCategoryIds ?? []).length > 0;
  const eligibleSubtotal =
    input.lines.length === 0 && !hasItemRules
      ? input.subtotalAmount
      : affectedLines.reduce((sum, line) => sum + line.lineTotal, 0);
  if (coupon.type !== "freeShipping" && eligibleSubtotal <= 0) {
    return invalidCouponResult(input.code, coupon, "no_eligible_items", "This coupon does not apply to the items in your cart", input.subtotalAmount, shippingAmount, taxAmount);
  }

  const discountAmount = computeCouponDiscount(coupon, eligibleSubtotal, shippingAmount);
  const totalAmount = Math.max(0, input.subtotalAmount - discountAmount + shippingAmount + taxAmount);
  return {
    valid: true,
    code: coupon.code,
    message: "Coupon applied",
    coupon,
    discountAmount,
    affectedCartItems: affectedLines.map((line) => line.productId),
    finalTotals: { subtotalAmount: input.subtotalAmount, discountAmount, shippingAmount, taxAmount, totalAmount },
  };
}

export async function validateCoupon(code: string, subtotalAmount: number): Promise<CouponValidationResult> {
  return validateCouponForCart({ code, lines: [], subtotalAmount });
}

function matchesShippingZone(zone: EcommerceShippingZone, address: z.infer<typeof shippingAddressQuoteSchema>): boolean {
  if (!zone.active) return false;
  const country = address.country.trim().toUpperCase() || "US";
  const state = address.state?.trim().toUpperCase();
  const zoneCountries = (zone.countries ?? []).map((value) => value.trim().toUpperCase()).filter(Boolean);
  const zoneStates = (zone.states ?? []).map((value) => value.trim().toUpperCase()).filter(Boolean);

  if (zoneCountries.length > 0 && !zoneCountries.includes(country)) return false;
  if (zoneStates.length > 0 && (!state || !zoneStates.includes(state))) return false;
  return true;
}

function rateAppliesToSubtotal(rate: EcommerceShippingRate, subtotalAmount: number): boolean {
  if (!rate.active) return false;
  if (rate.minOrderAmount != null && subtotalAmount < rate.minOrderAmount) return false;
  if (rate.maxOrderAmount != null && subtotalAmount > rate.maxOrderAmount) return false;
  return true;
}

export async function getShippingRateOptions(input: {
  subtotalAmount: number;
  address?: z.infer<typeof shippingAddressQuoteSchema>;
}): Promise<ShippingRateOption[]> {
  const address = shippingAddressQuoteSchema.parse(input.address ?? {});
  await assertEcommerceShippingDestinationAllowed(address);
  const [zones, rates] = await Promise.all([
    storage.ecommerce.getShippingZones(),
    storage.ecommerce.getShippingRates(),
  ]);
  const matchingZoneIds = new Set(zones.filter((zone) => matchesShippingZone(zone, address)).map((zone) => zone.id));
  return rates
    .filter((rate) => matchingZoneIds.has(rate.zoneId) && rateAppliesToSubtotal(rate, input.subtotalAmount))
    .sort((a, b) => a.amount - b.amount || a.name.localeCompare(b.name))
    .map((rate) => ({
      id: rate.id,
      zoneId: rate.zoneId,
      name: rate.name,
      description: rate.description,
      amount: rate.amount,
    }));
}

export async function resolveShippingRate(input: {
  shippingRateId?: string;
  subtotalAmount: number;
  address?: z.infer<typeof shippingAddressQuoteSchema>;
}): Promise<ShippingRateOption | null> {
  if (!input.shippingRateId) return null;
  const [zones, rates] = await Promise.all([
    storage.ecommerce.getShippingZones(),
    storage.ecommerce.getShippingRates(),
  ]);
  const address = input.address;
  const activeZones = address
    ? zones.filter((zone) => matchesShippingZone(zone, address))
    : zones.filter((zone) => zone.active);
  const activeZoneIds = new Set(activeZones.map((zone) => zone.id));
  const rate = rates.find((candidate) => candidate.id === input.shippingRateId);
  if (!rate || !activeZoneIds.has(rate.zoneId) || !rateAppliesToSubtotal(rate, input.subtotalAmount)) {
    throw httpError("Selected shipping rate is unavailable", 400);
  }
  return {
    id: rate.id,
    zoneId: rate.zoneId,
    name: rate.name,
    description: rate.description,
    amount: rate.amount,
  };
}

export async function priceCart(input: z.infer<typeof priceCartSchema>): Promise<PricedCart> {
  const parsed = priceCartSchema.parse(input);
  const cartItems = aggregateCartItems(parsed.items);
  const ids = [...new Set(cartItems.map((item) => item.productId))];
  const products = await storage.ecommerce.getProductsByIds(ids);
  const productMap = new Map(products.map((product) => [product.id, product]));

  const productCategories = new Map<string, EcommerceCategory[]>();
  await Promise.all(products.map(async (product) => {
    productCategories.set(product.id, await storage.ecommerce.getProductCategories(product.id));
  }));

  const lines = await Promise.all(cartItems.map(async (item) => {
    const product = productMap.get(item.productId);
    if (!product || product.archivedAt || !product.active || product.status !== "published" || (product.visibility ?? "online") !== "online") {
      throw httpError("One or more products are unavailable", 400);
    }
    const variant = item.variantId
      ? await storage.ecommerce.getProductVariant(item.variantId)
      : await storage.ecommerce.getDefaultProductVariant(product.id);
    if (!variant || variant.productId !== product.id || !variant.active || variant.status !== "active") {
      throw httpError("One or more product variants are unavailable", 400);
    }
    if (variant.trackInventory && !variant.allowBackorder && variant.inventoryQuantity < item.quantity) {
      throw httpError("One or more product variants do not have enough inventory", 400);
    }
    const unitPrice = effectiveVariantPrice(product, variant);
    const taxable = product.taxable ?? true;
    const requiresShipping = product.requiresShipping ?? true;
    const fulfillmentType = product.fulfillmentType ?? "standard";
    const image = variant.image ?? product.primaryImage;
    const sku = variant.sku ?? product.sku;
    return {
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      variantTitle: variant.isDefault ? null : variant.title,
      sku,
      optionsSnapshot: variant.optionValues,
      slug: product.urlSlug,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
      image,
      categoryIds: (productCategories.get(product.id) ?? []).map((category) => category.id),
      taxable,
      taxCategory: product.taxCategory,
      taxAmount: 0,
      requiresShipping,
      fulfillmentType,
      productSnapshot: {
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        variantTitle: variant.isDefault ? null : variant.title,
        sku,
        slug: product.urlSlug,
        image,
        taxable,
        taxCategory: product.taxCategory,
        requiresShipping,
        fulfillmentType,
        weight: variant.weight ?? product.weight,
        weightUnit: variant.weightUnit ?? product.weightUnit,
        options: variant.optionValues,
      },
    };
  }));

  const subtotalAmount = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const shippingRate = await resolveShippingRate({
    shippingRateId: parsed.shippingRateId,
    subtotalAmount,
    address: parsed.shippingAddress,
  });
  const shippingAmount = shippingRate?.amount ?? 0;
  let coupon: EcommerceCoupon | null = null;
  let discountAmount = 0;
  let couponMessage: string | undefined;
  let couponValidation: CouponValidationResult | undefined;

  if (parsed.couponCode?.trim()) {
    const result = await validateCouponForCart({
      code: parsed.couponCode,
      lines,
      subtotalAmount,
      shippingAmount,
      customerId: parsed.customerId,
      customerEmail: parsed.customerEmail,
    });
    couponValidation = result;
    coupon = result.valid ? result.coupon : null;
    discountAmount = result.valid ? result.discountAmount : 0;
    couponMessage = result.message;
  }

  const tax = await calculateEcommerceTax({
    lines,
    subtotalAmount,
    discountAmount,
    shippingAmount,
  });
  const taxAmount = tax.taxAmount;
  const totalAmount = Math.max(0, subtotalAmount - discountAmount + shippingAmount + taxAmount);
  if (couponValidation) {
    couponValidation.finalTotals = {
      ...couponValidation.finalTotals,
      taxAmount,
      totalAmount,
    };
  }
  const linesWithTax = lines.map((line, index) => ({
    ...line,
    taxAmount: tax.lineTaxAmounts[index] ?? 0,
  }));
  return {
    lines: linesWithTax,
    subtotalAmount,
    discountAmount,
    shippingAmount,
    taxAmount,
    totalAmount,
    coupon,
    couponCode: coupon?.code ?? (parsed.couponCode ? normalizeCode(parsed.couponCode) : undefined),
    couponMessage,
    couponValidation,
    shippingRate,
    tax,
  };
}

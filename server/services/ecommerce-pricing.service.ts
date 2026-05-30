import { z } from "zod";
import { storage } from "../storage/index";
import { ecommerceCartItemSchema, type EcommerceCartItem, type EcommerceCategory, type EcommerceCoupon, type EcommerceProduct } from "@shared/schema";

export const priceCartSchema = z.object({
  items: z.array(ecommerceCartItemSchema).min(1),
  couponCode: z.string().optional(),
  customerId: z.string().optional(),
  customerEmail: z.string().email().optional(),
});

export interface PricedCartLine {
  productId: string;
  name: string;
  slug: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  image: string | null;
  categoryIds: string[];
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

export async function priceCart(input: z.infer<typeof priceCartSchema>): Promise<PricedCart> {
  const parsed = priceCartSchema.parse(input);
  const ids = [...new Set(parsed.items.map((item) => item.productId))];
  const products = await storage.ecommerce.getProductsByIds(ids);
  const productMap = new Map(products.map((product) => [product.id, product]));

  const productCategories = new Map<string, EcommerceCategory[]>();
  await Promise.all(products.map(async (product) => {
    productCategories.set(product.id, await storage.ecommerce.getProductCategories(product.id));
  }));

  const lines = parsed.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product || !product.active || product.status !== "published") {
      throw new Error("One or more products are unavailable");
    }
    const unitPrice = effectiveProductPrice(product);
    return {
      productId: product.id,
      name: product.name,
      slug: product.urlSlug,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
      image: product.primaryImage,
      categoryIds: (productCategories.get(product.id) ?? []).map((category) => category.id),
    };
  });

  const subtotalAmount = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  let coupon: EcommerceCoupon | null = null;
  let discountAmount = 0;
  let couponMessage: string | undefined;
  let couponValidation: CouponValidationResult | undefined;

  if (parsed.couponCode?.trim()) {
    const result = await validateCouponForCart({
      code: parsed.couponCode,
      lines,
      subtotalAmount,
      customerId: parsed.customerId,
      customerEmail: parsed.customerEmail,
    });
    couponValidation = result;
    coupon = result.valid ? result.coupon : null;
    discountAmount = result.valid ? result.discountAmount : 0;
    couponMessage = result.message;
  }

  const shippingAmount = 0;
  const taxAmount = 0;
  const totalAmount = Math.max(0, subtotalAmount - discountAmount + shippingAmount + taxAmount);
  return {
    lines,
    subtotalAmount,
    discountAmount,
    shippingAmount,
    taxAmount,
    totalAmount,
    coupon,
    couponCode: coupon?.code ?? (parsed.couponCode ? normalizeCode(parsed.couponCode) : undefined),
    couponMessage,
    couponValidation,
  };
}

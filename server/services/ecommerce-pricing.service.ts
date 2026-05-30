import { z } from "zod";
import { storage } from "../storage/index";
import { ecommerceCartItemSchema, type EcommerceCartItem, type EcommerceCoupon, type EcommerceProduct } from "@shared/schema";

export const priceCartSchema = z.object({
  items: z.array(ecommerceCartItemSchema).min(1),
  couponCode: z.string().optional(),
});

export interface PricedCartLine {
  productId: string;
  name: string;
  slug: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  image: string | null;
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

function computeCouponDiscount(coupon: EcommerceCoupon, subtotal: number): number {
  if (coupon.type === "freeShipping") return 0;
  if (coupon.type === "percentage") {
    const amount = Math.round(subtotal * (coupon.value / 100));
    return Math.min(amount, coupon.maxDiscountAmount ?? amount);
  }
  return Math.min(subtotal, coupon.value);
}

export async function validateCoupon(code: string, subtotalAmount: number): Promise<{
  valid: boolean;
  coupon: EcommerceCoupon | null;
  discountAmount: number;
  message?: string;
}> {
  const coupon = await storage.ecommerce.getCouponByCode(code);
  const now = new Date();
  if (!coupon) return { valid: false, coupon: null, discountAmount: 0, message: "Invalid coupon code" };
  if (!coupon.active) return { valid: false, coupon, discountAmount: 0, message: "This coupon is not active" };
  if (coupon.startDate && coupon.startDate > now) return { valid: false, coupon, discountAmount: 0, message: "This coupon is not active yet" };
  if (coupon.endDate && coupon.endDate < now) return { valid: false, coupon, discountAmount: 0, message: "This coupon has expired" };
  if (coupon.maxRedemptions != null && coupon.timesUsed >= coupon.maxRedemptions) {
    return { valid: false, coupon, discountAmount: 0, message: "This coupon has reached its usage limit" };
  }
  if (coupon.minOrderAmount != null && subtotalAmount < coupon.minOrderAmount) {
    return { valid: false, coupon, discountAmount: 0, message: "Order minimum has not been met" };
  }
  return { valid: true, coupon, discountAmount: computeCouponDiscount(coupon, subtotalAmount) };
}

export async function priceCart(input: { items: EcommerceCartItem[]; couponCode?: string }): Promise<PricedCart> {
  const parsed = priceCartSchema.parse(input);
  const ids = [...new Set(parsed.items.map((item) => item.productId))];
  const products = await storage.ecommerce.getProductsByIds(ids);
  const productMap = new Map(products.map((product) => [product.id, product]));

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
    };
  });

  const subtotalAmount = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  let coupon: EcommerceCoupon | null = null;
  let discountAmount = 0;
  let couponMessage: string | undefined;

  if (parsed.couponCode?.trim()) {
    const result = await validateCoupon(parsed.couponCode, subtotalAmount);
    coupon = result.valid ? result.coupon : null;
    discountAmount = result.valid ? result.discountAmount : 0;
    couponMessage = result.message;
  }

  const shippingAmount = 0;
  const taxAmount = 0;
  const totalAmount = Math.max(0, subtotalAmount - discountAmount + shippingAmount + taxAmount);
  return { lines, subtotalAmount, discountAmount, shippingAmount, taxAmount, totalAmount, coupon, couponMessage };
}

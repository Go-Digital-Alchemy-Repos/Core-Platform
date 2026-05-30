import { describe, expect, it, vi, beforeEach } from "vitest";
import type { EcommerceCoupon, EcommerceProduct } from "@shared/schema";

const mockProducts: EcommerceProduct[] = [];
const mockCoupons: EcommerceCoupon[] = [];

vi.mock("../storage/index", () => ({
  storage: {
    ecommerce: {
      getProductsByIds: vi.fn(async (ids: string[]) => mockProducts.filter((product) => ids.includes(product.id))),
      getCouponByCode: vi.fn(async (code: string) => mockCoupons.find((coupon) => coupon.code === code.toUpperCase())),
    },
  },
}));

describe("ecommerce services", () => {
  beforeEach(() => {
    mockProducts.length = 0;
    mockCoupons.length = 0;
  });

  it("calculates effective sale pricing without trusting client prices", async () => {
    const { priceCart } = await import("../services/ecommerce-pricing.service");
    mockProducts.push({
      id: "p1",
      name: "Test Product",
      tagline: null,
      description: null,
      price: 10000,
      primaryImage: null,
      secondaryImages: [],
      features: [],
      included: [],
      active: true,
      status: "published",
      sku: null,
      tags: [],
      salePrice: 7500,
      discountType: "NONE",
      discountValue: null,
      saleStartAt: null,
      saleEndAt: null,
      metaTitle: null,
      metaDescription: null,
      metaKeywords: null,
      urlSlug: "test-product",
      canonicalUrl: null,
      robotsIndex: true,
      robotsFollow: true,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      mediaId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const priced = await priceCart({ items: [{ productId: "p1", quantity: 2 }] });
    expect(priced.subtotalAmount).toBe(15000);
    expect(priced.totalAmount).toBe(15000);
    expect(priced.lines[0].unitPrice).toBe(7500);
  });

  it("applies fixed coupon discounts with order minimums", async () => {
    const { priceCart } = await import("../services/ecommerce-pricing.service");
    mockProducts.push({
      id: "p1",
      name: "Full Price",
      tagline: null,
      description: null,
      price: 10000,
      primaryImage: null,
      secondaryImages: [],
      features: [],
      included: [],
      active: true,
      status: "published",
      sku: null,
      tags: [],
      salePrice: null,
      discountType: "NONE",
      discountValue: null,
      saleStartAt: null,
      saleEndAt: null,
      metaTitle: null,
      metaDescription: null,
      metaKeywords: null,
      urlSlug: "full-price",
      canonicalUrl: null,
      robotsIndex: true,
      robotsFollow: true,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      mediaId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockCoupons.push({
      id: "c1",
      code: "SAVE20",
      description: null,
      type: "fixed",
      value: 2000,
      minOrderAmount: 5000,
      maxDiscountAmount: null,
      maxRedemptions: null,
      perCustomerLimit: null,
      timesUsed: 0,
      startDate: null,
      endDate: null,
      active: true,
      blockAffiliateCommission: false,
      blockVipDiscount: false,
      minMarginPercent: null,
      autoExpireAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const priced = await priceCart({ items: [{ productId: "p1", quantity: 1 }], couponCode: "save20" });
    expect(priced.discountAmount).toBe(2000);
    expect(priced.totalAmount).toBe(8000);
    expect(priced.coupon?.code).toBe("SAVE20");
  });

  it("validates Stripe key mode separation", async () => {
    const { validateStripeKeyMode } = await import("../services/ecommerce-stripe.service");
    expect(validateStripeKeyMode("test", "pk_test_123", "sk_test_123")).toBeNull();
    expect(validateStripeKeyMode("test", "pk_live_123", "sk_test_123")).toMatch(/Test mode/);
    expect(validateStripeKeyMode("live", "pk_live_123", "sk_test_123")).toMatch(/Live mode/);
  });

  it("computes pending and processed refunds against refundable balance", async () => {
    const { computeRefundedAmount } = await import("../services/ecommerce-refund.service");
    expect(computeRefundedAmount([
      { amount: 1000, status: "processed" },
      { amount: 500, status: "pending" },
      { amount: 200, status: "failed" },
    ])).toBe(1500);
  });
});

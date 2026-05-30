import { describe, expect, it, vi, beforeEach } from "vitest";
import type { EcommerceCoupon, EcommerceOrder, EcommerceProduct } from "@shared/schema";

const mockProducts: EcommerceProduct[] = [];
const mockCoupons: EcommerceCoupon[] = [];
const mockGetOrder = vi.fn();
const mockUpdateOrder = vi.fn();
const mockGetOrderWithDetails = vi.fn();
const mockGetRefundByStripeRefundId = vi.fn();
const mockUpdateRefund = vi.fn();
const mockCreateRefund = vi.fn();
const mockSendEcommerceOrderConfirmation = vi.fn();

vi.mock("../storage/index", () => ({
  storage: {
    ecommerce: {
      getProductsByIds: vi.fn(async (ids: string[]) => mockProducts.filter((product) => ids.includes(product.id))),
      getCouponByCode: vi.fn(async (code: string) => mockCoupons.find((coupon) => coupon.code === code.toUpperCase())),
      getOrder: mockGetOrder,
      updateOrder: mockUpdateOrder,
      getOrderWithDetails: mockGetOrderWithDetails,
      getRefundByStripeRefundId: mockGetRefundByStripeRefundId,
      updateRefund: mockUpdateRefund,
      createRefund: mockCreateRefund,
    },
  },
}));

vi.mock("../services/ecommerce-email.service", () => ({
  sendEcommerceOrderConfirmation: mockSendEcommerceOrderConfirmation,
}));

describe("ecommerce services", () => {
  beforeEach(() => {
    mockProducts.length = 0;
    mockCoupons.length = 0;
    mockGetOrder.mockReset();
    mockUpdateOrder.mockReset();
    mockGetOrderWithDetails.mockReset();
    mockGetRefundByStripeRefundId.mockReset();
    mockUpdateRefund.mockReset();
    mockCreateRefund.mockReset();
    mockSendEcommerceOrderConfirmation.mockReset();
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

  it("marks an ecommerce order paid once and skips duplicate confirmation emails", async () => {
    const { markEcommerceOrderPaid } = await import("../services/ecommerce-order.service");
    const pendingOrder = {
      id: "order-1",
      status: "pending",
      paymentStatus: "unpaid",
      stripePaymentIntentId: "pi_123",
    } as EcommerceOrder;
    const paidOrder = {
      ...pendingOrder,
      status: "paid",
      paymentStatus: "paid",
    } as EcommerceOrder;
    mockGetOrder.mockResolvedValueOnce(pendingOrder).mockResolvedValueOnce(paidOrder);
    mockGetOrderWithDetails.mockResolvedValue({ ...paidOrder, customer: null, items: [], refunds: [], shipments: [] });

    await markEcommerceOrderPaid("order-1", "pi_123");
    await markEcommerceOrderPaid("order-1", "pi_123");

    expect(mockUpdateOrder).toHaveBeenCalledTimes(2);
    expect(mockSendEcommerceOrderConfirmation).toHaveBeenCalledTimes(1);
  });

  it("rejects a paid webhook when the PaymentIntent does not match the order", async () => {
    const { markEcommerceOrderPaid } = await import("../services/ecommerce-order.service");
    mockGetOrder.mockResolvedValue({
      id: "order-1",
      status: "pending",
      paymentStatus: "unpaid",
      stripePaymentIntentId: "pi_expected",
    } as EcommerceOrder);

    await expect(markEcommerceOrderPaid("order-1", "pi_other")).rejects.toThrow(/PaymentIntent/);
    expect(mockUpdateOrder).not.toHaveBeenCalled();
    expect(mockSendEcommerceOrderConfirmation).not.toHaveBeenCalled();
  });

  it("records a Stripe refund webhook and updates order payment status", async () => {
    const { recordStripeRefundWebhook } = await import("../services/ecommerce-refund.service");
    mockGetRefundByStripeRefundId.mockResolvedValue(undefined);
    mockGetOrder.mockResolvedValue({ id: "order-1", totalAmount: 5000 } as EcommerceOrder);
    mockCreateRefund.mockResolvedValue({
      id: "refund-1",
      orderId: "order-1",
      amount: 5000,
      status: "processed",
    });
    mockGetOrderWithDetails.mockResolvedValue({
      id: "order-1",
      totalAmount: 5000,
      paymentStatus: "paid",
      refunds: [{ amount: 5000, status: "processed" }],
    });

    await recordStripeRefundWebhook({
      stripeRefundId: "re_123",
      orderId: "order-1",
      amount: 5000,
      status: "succeeded",
    });

    expect(mockCreateRefund).toHaveBeenCalledWith(expect.objectContaining({
      orderId: "order-1",
      stripeRefundId: "re_123",
      status: "processed",
      type: "full",
    }));
    expect(mockUpdateOrder).toHaveBeenCalledWith("order-1", { paymentStatus: "refunded" });
  });
});

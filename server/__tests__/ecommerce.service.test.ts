import { describe, expect, it, vi, beforeEach } from "vitest";
import type {
  EcommerceCoupon,
  EcommerceOrder,
  EcommerceProduct,
  EcommerceProductVariant,
  EcommerceShippingRate,
  EcommerceShippingZone,
} from "@shared/schema";

const mockProducts: EcommerceProduct[] = [];
const mockVariants: EcommerceProductVariant[] = [];
const mockCoupons: EcommerceCoupon[] = [];
const mockShippingZones: EcommerceShippingZone[] = [];
const mockShippingRates: EcommerceShippingRate[] = [];
const mockGetOrder = vi.fn();
const mockUpdateOrder = vi.fn();
const mockGetOrderWithDetails = vi.fn();
const mockGetRefundByStripeRefundId = vi.fn();
const mockUpdateRefund = vi.fn();
const mockCreateRefund = vi.fn();
const mockGetProductCategories = vi.fn(async (_productId: string) => []);
const mockCountCouponRedemptions = vi.fn(async () => 0);
const mockRecordCouponRedemptionForOrder = vi.fn();
const mockDeductInventoryForPaidOrder = vi.fn();
const mockSendEcommerceOrderConfirmation = vi.fn();
const mockGetDecryptedCategory = vi.fn(async (_category: string) => ({}));
const mockUpsertSetting = vi.fn();
const mockInvalidateCategory = vi.fn();

vi.mock("../storage/index", () => ({
  storage: {
    settings: {
      getDecryptedCategory: mockGetDecryptedCategory,
      upsertSetting: mockUpsertSetting,
      invalidateCategory: mockInvalidateCategory,
    },
    ecommerce: {
      getProductsByIds: vi.fn(async (ids: string[]) => mockProducts.filter((product) => ids.includes(product.id))),
      getProductVariant: vi.fn(async (id: string) => mockVariants.find((variant) => variant.id === id)),
      getDefaultProductVariant: vi.fn(async (productId: string) => mockVariants.find((variant) => variant.productId === productId && variant.isDefault)),
      getCouponByCode: vi.fn(async (code: string) => mockCoupons.find((coupon) => coupon.code === code.toUpperCase())),
      getProductCategories: mockGetProductCategories,
      getShippingZones: vi.fn(async () => mockShippingZones),
      getShippingRates: vi.fn(async (_zoneId?: string) => mockShippingRates),
      countCouponRedemptions: mockCountCouponRedemptions,
      getOrder: mockGetOrder,
      updateOrder: mockUpdateOrder,
      getOrderWithDetails: mockGetOrderWithDetails,
      recordCouponRedemptionForOrder: mockRecordCouponRedemptionForOrder,
      deductInventoryForPaidOrder: mockDeductInventoryForPaidOrder,
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
    mockVariants.length = 0;
    mockCoupons.length = 0;
    mockShippingZones.length = 0;
    mockShippingRates.length = 0;
    mockGetOrder.mockReset();
    mockUpdateOrder.mockReset();
    mockGetOrderWithDetails.mockReset();
    mockGetRefundByStripeRefundId.mockReset();
    mockUpdateRefund.mockReset();
    mockCreateRefund.mockReset();
    mockGetProductCategories.mockReset();
    mockGetProductCategories.mockResolvedValue([]);
    mockCountCouponRedemptions.mockReset();
    mockCountCouponRedemptions.mockResolvedValue(0);
    mockRecordCouponRedemptionForOrder.mockReset();
    mockDeductInventoryForPaidOrder.mockReset();
    mockSendEcommerceOrderConfirmation.mockReset();
    mockGetDecryptedCategory.mockReset();
    mockGetDecryptedCategory.mockResolvedValue({});
    mockUpsertSetting.mockReset();
    mockInvalidateCategory.mockReset();
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
    mockVariants.push({
      id: "v1",
      productId: "p1",
      title: "Default",
      optionSignature: "default",
      optionValues: {},
      sku: null,
      barcode: null,
      price: 10000,
      salePrice: 7500,
      compareAtPrice: null,
      costPerItem: null,
      inventoryQuantity: 0,
      trackInventory: false,
      lowStockThreshold: null,
      allowBackorder: false,
      weight: null,
      weightUnit: "oz",
      image: null,
      status: "active",
      active: true,
      sortOrder: 0,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const priced = await priceCart({ items: [{ productId: "p1", quantity: 2 }] });
    expect(priced.subtotalAmount).toBe(15000);
    expect(priced.totalAmount).toBe(15000);
    expect(priced.lines[0].unitPrice).toBe(7500);
    expect(priced.lines[0].variantId).toBe("v1");
    expect(priced.taxAmount).toBe(0);
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
    mockVariants.push({
      id: "v1",
      productId: "p1",
      title: "Default",
      optionSignature: "default",
      optionValues: {},
      sku: null,
      barcode: null,
      price: 10000,
      salePrice: null,
      compareAtPrice: null,
      costPerItem: null,
      inventoryQuantity: 0,
      trackInventory: false,
      lowStockThreshold: null,
      allowBackorder: false,
      weight: null,
      weightUnit: "oz",
      image: null,
      status: "active",
      active: true,
      sortOrder: 0,
      isDefault: true,
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

  it("prices explicit variants and rejects unavailable inventory", async () => {
    const { priceCart } = await import("../services/ecommerce-pricing.service");
    mockProducts.push({
      id: "p1",
      name: "Variant Product",
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
      urlSlug: "variant-product",
      canonicalUrl: null,
      robotsIndex: true,
      robotsFollow: true,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      mediaId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as EcommerceProduct);
    mockVariants.push({
      id: "v-red",
      productId: "p1",
      title: "Red",
      optionSignature: "color:red",
      optionValues: { Color: "Red" },
      sku: "RED-1",
      barcode: null,
      price: 12000,
      salePrice: null,
      compareAtPrice: null,
      costPerItem: null,
      inventoryQuantity: 1,
      trackInventory: true,
      lowStockThreshold: null,
      allowBackorder: false,
      weight: null,
      weightUnit: "oz",
      image: null,
      status: "active",
      active: true,
      sortOrder: 0,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const priced = await priceCart({ items: [{ productId: "p1", variantId: "v-red", quantity: 1 }] });
    expect(priced.totalAmount).toBe(12000);
    expect(priced.lines[0]).toMatchObject({ variantId: "v-red", sku: "RED-1", variantTitle: "Red" });
    await expect(priceCart({ items: [{ productId: "p1", variantId: "v-red", quantity: 2 }] })).rejects.toThrow(/inventory/);
  });

  it("uses server-side shipping rates selected by id", async () => {
    const { getShippingRateOptions, priceCart } = await import("../services/ecommerce-pricing.service");
    mockProducts.push({
      id: "p1",
      name: "Shippable Product",
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
      urlSlug: "shippable-product",
      canonicalUrl: null,
      robotsIndex: true,
      robotsFollow: true,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      mediaId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as EcommerceProduct);
    mockVariants.push({
      id: "v1",
      productId: "p1",
      title: "Default",
      optionSignature: "default",
      optionValues: {},
      sku: null,
      barcode: null,
      price: 10000,
      salePrice: null,
      compareAtPrice: null,
      costPerItem: null,
      inventoryQuantity: 0,
      trackInventory: false,
      lowStockThreshold: null,
      allowBackorder: false,
      weight: null,
      weightUnit: "oz",
      image: null,
      status: "active",
      active: true,
      sortOrder: 0,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockShippingZones.push({
      id: "zone-us",
      name: "United States",
      countries: ["US"],
      states: [],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockShippingRates.push({
      id: "rate-standard",
      zoneId: "zone-us",
      name: "Standard",
      description: "Ground shipping",
      amount: 995,
      minOrderAmount: null,
      maxOrderAmount: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const options = await getShippingRateOptions({ subtotalAmount: 10000, address: { country: "US", state: "MI" } });
    expect(options).toEqual([expect.objectContaining({ id: "rate-standard", amount: 995 })]);

    const priced = await priceCart({ items: [{ productId: "p1", quantity: 1 }], shippingRateId: "rate-standard" });
    expect(priced.shippingAmount).toBe(995);
    expect(priced.totalAmount).toBe(10995);
  });

  it("calculates manual tax server-side after discounts and optional shipping tax", async () => {
    const { priceCart } = await import("../services/ecommerce-pricing.service");
    mockGetDecryptedCategory.mockResolvedValue({
      ecommerce_tax_enabled: "true",
      ecommerce_tax_manual_rate_bps: "600",
      ecommerce_tax_shipping: "true",
    });
    mockProducts.push({
      id: "p1",
      name: "Taxable Product",
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
      urlSlug: "taxable-product",
      canonicalUrl: null,
      robotsIndex: true,
      robotsFollow: true,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      mediaId: null,
      taxable: true,
      taxCategory: "general",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as EcommerceProduct);
    mockVariants.push({
      id: "v1",
      productId: "p1",
      title: "Default",
      optionSignature: "default",
      optionValues: {},
      sku: null,
      barcode: null,
      price: 10000,
      salePrice: null,
      compareAtPrice: null,
      costPerItem: null,
      inventoryQuantity: 0,
      trackInventory: false,
      lowStockThreshold: null,
      allowBackorder: false,
      weight: null,
      weightUnit: "oz",
      image: null,
      status: "active",
      active: true,
      sortOrder: 0,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockCoupons.push({
      id: "c1",
      code: "SAVE10",
      description: null,
      type: "fixed",
      value: 1000,
      minOrderAmount: null,
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
    } as EcommerceCoupon);
    mockShippingZones.push({
      id: "zone-us",
      name: "United States",
      countries: ["US"],
      states: [],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockShippingRates.push({
      id: "rate-standard",
      zoneId: "zone-us",
      name: "Standard",
      description: null,
      amount: 1000,
      minOrderAmount: null,
      maxOrderAmount: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const priced = await priceCart({
      items: [{ productId: "p1", quantity: 1 }],
      couponCode: "SAVE10",
      shippingRateId: "rate-standard",
    });

    expect(priced.discountAmount).toBe(1000);
    expect(priced.tax).toMatchObject({ provider: "manual", taxableAmount: 10000, rateBps: 600 });
    expect(priced.taxAmount).toBe(600);
    expect(priced.totalAmount).toBe(10600);
    expect(priced.couponValidation?.finalTotals.taxAmount).toBe(600);
  });

  it("rejects expired and exhausted coupons with structured messages", async () => {
    const { validateCoupon } = await import("../services/ecommerce-pricing.service");
    mockCoupons.push({
      id: "c-expired",
      code: "OLD",
      description: null,
      type: "fixed",
      value: 1000,
      minOrderAmount: null,
      maxDiscountAmount: null,
      maxRedemptions: null,
      perCustomerLimit: null,
      timesUsed: 0,
      startDate: null,
      endDate: new Date(Date.now() - 1000),
      active: true,
      blockAffiliateCommission: false,
      blockVipDiscount: false,
      minMarginPercent: null,
      autoExpireAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as EcommerceCoupon);

    const result = await validateCoupon("old", 5000);
    expect(result.valid).toBe(false);
    expect(result.reasonCode).toBe("expired");
    expect(result.message).toMatch(/expired/i);
  });

  it("honors per-customer coupon usage limits", async () => {
    const { validateCouponForCart } = await import("../services/ecommerce-pricing.service");
    mockCountCouponRedemptions.mockResolvedValue(1);
    mockCoupons.push({
      id: "c-limit",
      code: "ONCE",
      description: null,
      type: "fixed",
      value: 1000,
      minOrderAmount: null,
      maxDiscountAmount: null,
      maxRedemptions: null,
      perCustomerLimit: 1,
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
    } as EcommerceCoupon);

    const result = await validateCouponForCart({
      code: "once",
      lines: [],
      subtotalAmount: 5000,
      customerEmail: "buyer@example.com",
    });
    expect(result.valid).toBe(false);
    expect(result.reasonCode).toBe("customer_usage_limit_reached");
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

  it("marks an ecommerce order paid once and retries idempotent inventory deduction", async () => {
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
    expect(mockRecordCouponRedemptionForOrder).toHaveBeenCalledTimes(1);
    expect(mockDeductInventoryForPaidOrder).toHaveBeenCalledTimes(2);
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

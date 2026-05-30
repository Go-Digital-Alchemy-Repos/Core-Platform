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
const mockMarkOrderPaidIfUnpaid = vi.fn();
const mockGetOrderWithDetails = vi.fn();
const mockGetCustomer = vi.fn();
const mockFindOrCreateCustomer = vi.fn();
const mockCreateOrder = vi.fn();
const mockGetFulfillmentsForOrder = vi.fn();
const mockGetRefundByStripeRefundId = vi.fn();
const mockUpdateRefund = vi.fn();
const mockCreateRefund = vi.fn();
const mockGetProductCategories = vi.fn(async (_productId: string) => []);
const mockCountCouponRedemptions = vi.fn(async () => 0);
const mockRecordCouponRedemptionForOrder = vi.fn();
const mockDeductInventoryForPaidOrder = vi.fn();
const mockSendEcommerceOrderConfirmation = vi.fn();
const mockSendEcommerceOrderStatusEmail = vi.fn();
const mockSendEcommerceRefundEmail = vi.fn();
const mockGetDecryptedCategory = vi.fn(async (_category: string) => ({}));
const mockUpsertSetting = vi.fn();
const mockInvalidateCategory = vi.fn();
const mockStripePaymentIntentCreate = vi.fn();
const mockStripePaymentIntentCancel = vi.fn();

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
      markOrderPaidIfUnpaid: mockMarkOrderPaidIfUnpaid,
      getOrderWithDetails: mockGetOrderWithDetails,
      getCustomer: mockGetCustomer,
      findOrCreateCustomer: mockFindOrCreateCustomer,
      createOrder: mockCreateOrder,
      getFulfillmentsForOrder: mockGetFulfillmentsForOrder,
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
  sendEcommerceOrderStatusEmail: mockSendEcommerceOrderStatusEmail,
  sendEcommerceRefundEmail: mockSendEcommerceRefundEmail,
}));

vi.mock("../services/ecommerce-stripe.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/ecommerce-stripe.service")>();
  return {
    ...actual,
    getEcommerceStripeClient: vi.fn(async () => ({
      paymentIntents: {
        create: mockStripePaymentIntentCreate,
        cancel: mockStripePaymentIntentCancel,
      },
    })),
  };
});

describe("ecommerce services", () => {
  beforeEach(() => {
    mockProducts.length = 0;
    mockVariants.length = 0;
    mockCoupons.length = 0;
    mockShippingZones.length = 0;
    mockShippingRates.length = 0;
    mockGetOrder.mockReset();
    mockUpdateOrder.mockReset();
    mockMarkOrderPaidIfUnpaid.mockReset();
    mockGetOrderWithDetails.mockReset();
    mockGetCustomer.mockReset();
    mockFindOrCreateCustomer.mockReset();
    mockCreateOrder.mockReset();
    mockGetFulfillmentsForOrder.mockReset();
    mockGetFulfillmentsForOrder.mockResolvedValue([]);
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
    mockSendEcommerceOrderStatusEmail.mockReset();
    mockSendEcommerceRefundEmail.mockReset();
    mockGetDecryptedCategory.mockReset();
    mockGetDecryptedCategory.mockResolvedValue({});
    mockUpsertSetting.mockReset();
    mockInvalidateCategory.mockReset();
    mockStripePaymentIntentCreate.mockReset();
    mockStripePaymentIntentCreate.mockResolvedValue({
      id: "pi_test",
      client_secret: "pi_test_secret",
    });
    mockStripePaymentIntentCancel.mockReset();
    mockStripePaymentIntentCancel.mockResolvedValue({ id: "pi_test", status: "canceled" });
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
    expect(priced.lines[0]).toMatchObject({
      productSnapshot: expect.objectContaining({ slug: "test-product", taxable: true }),
      requiresShipping: true,
      taxAmount: 0,
    });
  });

  it("rejects archived and hidden products during server-side cart pricing", async () => {
    const { priceCart } = await import("../services/ecommerce-pricing.service");
    mockProducts.push({
      id: "p1",
      name: "Archived Product",
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
      urlSlug: "archived-product",
      canonicalUrl: null,
      robotsIndex: true,
      robotsFollow: true,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      mediaId: null,
      archivedAt: new Date(),
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

    await expect(priceCart({ items: [{ productId: "p1", quantity: 1 }] })).rejects.toThrow(/unavailable/);
    mockProducts[0].archivedAt = null;
    mockProducts[0].visibility = "hidden";
    await expect(priceCart({ items: [{ productId: "p1", quantity: 1 }] })).rejects.toThrow(/unavailable/);
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
    mockShippingZones.push({
      id: "zone-ca",
      name: "California",
      countries: ["US"],
      states: ["CA"],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockShippingRates.push({
      id: "rate-california",
      zoneId: "zone-ca",
      name: "California local",
      description: "California-only delivery",
      amount: 100,
      minOrderAmount: null,
      maxOrderAmount: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const options = await getShippingRateOptions({ subtotalAmount: 10000, address: { country: "US", state: "MI" } });
    expect(options).toEqual([expect.objectContaining({ id: "rate-standard", amount: 995 })]);

    const priced = await priceCart({
      items: [{ productId: "p1", quantity: 1 }],
      shippingRateId: "rate-standard",
      shippingAddress: { country: "US", state: "MI" },
    });
    expect(priced.shippingAmount).toBe(995);
    expect(priced.totalAmount).toBe(10995);
    await expect(priceCart({
      items: [{ productId: "p1", quantity: 1 }],
      shippingRateId: "rate-california",
      shippingAddress: { country: "US", state: "MI" },
    })).rejects.toThrow(/shipping rate is unavailable/);
  });

  it("requires a selected shipping rate for checkout when shippable rates match", async () => {
    const { createEcommercePaymentIntent } = await import("../services/ecommerce-order.service");
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
      requiresShipping: true,
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

    await expect(createEcommercePaymentIntent({
      items: [{ productId: "p1", quantity: 1 }],
      customer: { email: "buyer@example.com", name: "Buyer" },
      shippingAddress: {
        name: "Buyer",
        address: "123 Main St",
        city: "Detroit",
        state: "MI",
        zip: "48201",
        country: "US",
      },
      billingSameAsShipping: true,
    })).rejects.toThrow(/Select a shipping method/);
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });

  it("marks checkout orders failed when Stripe cannot create a PaymentIntent", async () => {
    const { createEcommercePaymentIntent } = await import("../services/ecommerce-order.service");
    const customer = { id: "customer-1", email: "buyer@example.com", name: "Buyer" };
    const order = {
      id: "order-failed-checkout",
      customerId: customer.id,
      status: "pending",
      paymentStatus: "unpaid",
      totalAmount: 5000,
      subtotalAmount: 5000,
      taxAmount: 0,
      shippingAmount: 0,
      discountAmount: 0,
      lookupToken: "lookup-token",
    } as EcommerceOrder;
    mockFindOrCreateCustomer.mockResolvedValue(customer);
    mockCreateOrder.mockResolvedValue(order);
    mockStripePaymentIntentCreate.mockRejectedValue(new Error("Stripe is unavailable"));
    mockProducts.push({
      id: "p-digital",
      name: "Digital Guide",
      tagline: null,
      description: null,
      shortDescription: null,
      productType: "digital",
      vendor: null,
      price: 5000,
      compareAtPrice: null,
      costPerItem: null,
      taxable: true,
      taxCategory: null,
      featured: false,
      visibility: "online",
      publishedAt: null,
      archivedAt: null,
      primaryImage: null,
      secondaryImages: [],
      features: [],
      included: [],
      active: true,
      status: "published",
      sku: "DIGITAL-1",
      tags: [],
      salePrice: null,
      discountType: "NONE",
      discountValue: null,
      saleStartAt: null,
      saleEndAt: null,
      metaTitle: null,
      metaDescription: null,
      metaKeywords: null,
      urlSlug: "digital-guide",
      canonicalUrl: null,
      robotsIndex: true,
      robotsFollow: true,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      physicalProduct: false,
      requiresShipping: false,
      weight: null,
      weightUnit: "oz",
      length: null,
      width: null,
      height: null,
      dimensionUnit: "in",
      shippingProfile: null,
      fulfillmentType: "digital",
      relatedProductIds: [],
      upsellProductIds: [],
      badgeText: null,
      mediaId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockVariants.push({
      id: "v-digital",
      productId: "p-digital",
      title: "Default",
      optionSignature: "default",
      optionValues: {},
      sku: "DIGITAL-1",
      barcode: null,
      price: 5000,
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

    await expect(createEcommercePaymentIntent({
      items: [{ productId: "p-digital", quantity: 1 }],
      customer: { email: customer.email, name: customer.name },
      shippingAddress: {
        name: "Buyer",
        address: "123 Main St",
        city: "Detroit",
        state: "MI",
        zip: "48201",
        country: "US",
      },
      billingSameAsShipping: true,
    })).rejects.toThrow(/Stripe is unavailable/);

    expect(mockCreateOrder).toHaveBeenCalled();
    expect(mockUpdateOrder).toHaveBeenCalledWith(order.id, expect.objectContaining({
      status: "cancelled",
      paymentStatus: "failed",
      notes: expect.stringContaining("Stripe is unavailable"),
    }));
  });

  it("creates checkout PaymentIntents with a deterministic Stripe idempotency key", async () => {
    const { createEcommercePaymentIntent } = await import("../services/ecommerce-order.service");
    const customer = { id: "customer-1", email: "buyer@example.com", name: "Buyer" };
    const order = {
      id: "order-checkout-1",
      customerId: customer.id,
      status: "pending",
      paymentStatus: "unpaid",
      totalAmount: 5000,
      subtotalAmount: 5000,
      taxAmount: 0,
      shippingAmount: 0,
      discountAmount: 0,
      lookupToken: "lookup-token",
    } as EcommerceOrder;
    mockFindOrCreateCustomer.mockResolvedValue(customer);
    mockCreateOrder.mockResolvedValue(order);
    mockUpdateOrder.mockResolvedValue(order);
    mockProducts.push({
      id: "p-digital",
      name: "Digital Guide",
      tagline: null,
      description: null,
      shortDescription: null,
      productType: "digital",
      vendor: null,
      price: 5000,
      compareAtPrice: null,
      costPerItem: null,
      taxable: true,
      taxCategory: null,
      featured: false,
      visibility: "online",
      publishedAt: null,
      archivedAt: null,
      primaryImage: null,
      secondaryImages: [],
      features: [],
      included: [],
      active: true,
      status: "published",
      sku: "DIGITAL-1",
      tags: [],
      salePrice: null,
      discountType: "NONE",
      discountValue: null,
      saleStartAt: null,
      saleEndAt: null,
      metaTitle: null,
      metaDescription: null,
      metaKeywords: null,
      urlSlug: "digital-guide",
      canonicalUrl: null,
      robotsIndex: true,
      robotsFollow: true,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      physicalProduct: false,
      requiresShipping: false,
      weight: null,
      weightUnit: "oz",
      length: null,
      width: null,
      height: null,
      dimensionUnit: "in",
      shippingProfile: null,
      fulfillmentType: "digital",
      relatedProductIds: [],
      upsellProductIds: [],
      badgeText: null,
      mediaId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockVariants.push({
      id: "v-digital",
      productId: "p-digital",
      title: "Default",
      optionSignature: "default",
      optionValues: {},
      sku: "DIGITAL-1",
      barcode: null,
      price: 5000,
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

    await createEcommercePaymentIntent({
      items: [{ productId: "p-digital", quantity: 1 }],
      customer: { email: customer.email, name: customer.name },
      shippingAddress: {
        name: "Buyer",
        address: "123 Main St",
        city: "Detroit",
        state: "MI",
        zip: "48201",
        country: "US",
      },
      billingSameAsShipping: true,
    });

    expect(mockStripePaymentIntentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5000,
        metadata: { orderId: order.id },
      }),
      { idempotencyKey: `ecommerce_order_${order.id}_payment_intent` },
    );
    expect(mockUpdateOrder).toHaveBeenCalledWith(order.id, { stripePaymentIntentId: "pi_test" });
  });

  it("cancels a fresh PaymentIntent when the local order cannot be linked", async () => {
    const { createEcommercePaymentIntent } = await import("../services/ecommerce-order.service");
    const customer = { id: "customer-1", email: "buyer@example.com", name: "Buyer" };
    const order = {
      id: "order-checkout-1",
      customerId: customer.id,
      status: "pending",
      paymentStatus: "unpaid",
      totalAmount: 5000,
      subtotalAmount: 5000,
      taxAmount: 0,
      shippingAmount: 0,
      discountAmount: 0,
      lookupToken: "lookup-token",
    } as EcommerceOrder;
    mockFindOrCreateCustomer.mockResolvedValue(customer);
    mockCreateOrder.mockResolvedValue(order);
    mockUpdateOrder.mockRejectedValueOnce(new Error("database write failed"));
    mockProducts.push({
      id: "p-digital",
      name: "Digital Guide",
      tagline: null,
      description: null,
      shortDescription: null,
      productType: "digital",
      vendor: null,
      price: 5000,
      compareAtPrice: null,
      costPerItem: null,
      taxable: true,
      taxCategory: null,
      featured: false,
      visibility: "online",
      publishedAt: null,
      archivedAt: null,
      primaryImage: null,
      secondaryImages: [],
      features: [],
      included: [],
      active: true,
      status: "published",
      sku: "DIGITAL-1",
      tags: [],
      salePrice: null,
      discountType: "NONE",
      discountValue: null,
      saleStartAt: null,
      saleEndAt: null,
      metaTitle: null,
      metaDescription: null,
      metaKeywords: null,
      urlSlug: "digital-guide",
      canonicalUrl: null,
      robotsIndex: true,
      robotsFollow: true,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      physicalProduct: false,
      requiresShipping: false,
      weight: null,
      weightUnit: "oz",
      length: null,
      width: null,
      height: null,
      dimensionUnit: "in",
      shippingProfile: null,
      fulfillmentType: "digital",
      relatedProductIds: [],
      upsellProductIds: [],
      badgeText: null,
      mediaId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockVariants.push({
      id: "v-digital",
      productId: "p-digital",
      title: "Default",
      optionSignature: "default",
      optionValues: {},
      sku: "DIGITAL-1",
      barcode: null,
      price: 5000,
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

    await expect(createEcommercePaymentIntent({
      items: [{ productId: "p-digital", quantity: 1 }],
      customer: { email: customer.email, name: customer.name },
      shippingAddress: {
        name: "Buyer",
        address: "123 Main St",
        city: "Detroit",
        state: "MI",
        zip: "48201",
        country: "US",
      },
      billingSameAsShipping: true,
    })).rejects.toThrow(/database write failed/);

    expect(mockStripePaymentIntentCreate).toHaveBeenCalled();
    expect(mockStripePaymentIntentCancel).toHaveBeenCalledWith("pi_test");
  });

  it("cancels a PaymentIntent when Stripe omits the client secret", async () => {
    const { createEcommercePaymentIntent } = await import("../services/ecommerce-order.service");
    const customer = { id: "customer-1", email: "buyer@example.com", name: "Buyer" };
    const order = {
      id: "order-checkout-1",
      customerId: customer.id,
      status: "pending",
      paymentStatus: "unpaid",
      totalAmount: 5000,
      subtotalAmount: 5000,
      taxAmount: 0,
      shippingAmount: 0,
      discountAmount: 0,
      lookupToken: "lookup-token",
    } as EcommerceOrder;
    mockFindOrCreateCustomer.mockResolvedValue(customer);
    mockCreateOrder.mockResolvedValue(order);
    mockStripePaymentIntentCreate.mockResolvedValueOnce({ id: "pi_missing_secret", client_secret: null });
    mockProducts.push({
      id: "p-digital",
      name: "Digital Guide",
      price: 5000,
      active: true,
      status: "published",
      visibility: "online",
      archivedAt: null,
      requiresShipping: false,
      productType: "digital",
      fulfillmentType: "digital",
    } as EcommerceProduct);
    mockVariants.push({
      id: "v-digital",
      productId: "p-digital",
      title: "Default",
      price: 5000,
      active: true,
      status: "active",
      isDefault: true,
      trackInventory: false,
      inventoryQuantity: 0,
      allowBackorder: false,
      optionValues: {},
    } as EcommerceProductVariant);

    await expect(createEcommercePaymentIntent({
      items: [{ productId: "p-digital", quantity: 1 }],
      customer: { email: customer.email, name: customer.name },
      shippingAddress: {
        name: "Buyer",
        address: "123 Main St",
        city: "Detroit",
        state: "MI",
        zip: "48201",
        country: "US",
      },
      billingSameAsShipping: true,
    })).rejects.toThrow(/client secret/);

    expect(mockStripePaymentIntentCancel).toHaveBeenCalledWith("pi_missing_secret");
    expect(mockUpdateOrder).toHaveBeenCalledWith(order.id, expect.objectContaining({
      status: "cancelled",
      paymentStatus: "failed",
      notes: expect.stringContaining("client secret"),
    }));
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
    expect(priced.lines[0].taxAmount).toBe(540);
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

  it("sanitizes public coupon validation payloads", async () => {
    const {
      toPublicCouponValidationResult,
      toPublicPricedCart,
      validateCouponForCart,
    } = await import("../services/ecommerce-pricing.service");
    mockCoupons.push({
      id: "c-public",
      code: "SAVE10",
      name: "Save ten",
      description: "Public description",
      notes: "Internal margin note",
      type: "fixed",
      value: 1000,
      minOrderAmount: null,
      maxDiscountAmount: null,
      maxRedemptions: 100,
      perCustomerLimit: 1,
      timesUsed: 0,
      startDate: null,
      endDate: null,
      active: true,
      customerEligibility: "specific_emails",
      eligibleCustomerEmails: ["buyer@example.com"],
      eligibleProductIds: [],
      eligibleCategoryIds: [],
      excludedProductIds: [],
      excludedCategoryIds: [],
      allowStacking: false,
      appliesTo: "subtotal",
      applyBeforeTax: true,
      archivedAt: null,
      createdBy: "admin-1",
      updatedBy: "admin-2",
      blockAffiliateCommission: true,
      blockVipDiscount: true,
      minMarginPercent: 30,
      autoExpireAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as EcommerceCoupon);

    const validationResult = await validateCouponForCart({
      code: "save10",
      lines: [],
      subtotalAmount: 5000,
      customerEmail: "buyer@example.com",
    });
    const publicResult = toPublicCouponValidationResult(validationResult);

    expect(publicResult?.valid).toBe(true);
    expect(publicResult?.coupon).toMatchObject({
      id: "c-public",
      code: "SAVE10",
      name: "Save ten",
      type: "fixed",
      value: 1000,
      minOrderAmount: null,
      maxDiscountAmount: null,
      appliesTo: "subtotal",
      eligibleProductIds: [],
      eligibleCategoryIds: [],
      excludedProductIds: [],
      excludedCategoryIds: [],
    });
    expect(publicResult?.coupon).not.toHaveProperty("notes");
    expect(publicResult?.coupon).not.toHaveProperty("createdBy");
    expect(publicResult?.coupon).not.toHaveProperty("updatedBy");
    expect(publicResult?.coupon).not.toHaveProperty("eligibleCustomerEmails");
    expect(publicResult?.coupon).not.toHaveProperty("perCustomerLimit");
    expect(publicResult?.coupon).not.toHaveProperty("timesUsed");
    expect(publicResult?.coupon).not.toHaveProperty("archivedAt");
    expect(publicResult?.coupon).not.toHaveProperty("createdAt");
    expect(publicResult?.coupon).not.toHaveProperty("updatedAt");
    expect(publicResult?.coupon).not.toHaveProperty("blockAffiliateCommission");
    expect(publicResult?.coupon).not.toHaveProperty("minMarginPercent");

    const publicPriced = toPublicPricedCart({
      lines: [{
        productId: "p1",
        variantId: "v1",
        name: "Guide",
        variantTitle: null,
        sku: "GUIDE",
        optionsSnapshot: null,
        slug: "guide",
        quantity: 1,
        unitPrice: 5000,
        lineTotal: 5000,
        image: null,
        categoryIds: ["cat1"],
        taxable: true,
        taxCategory: "internal-tax-code",
        taxAmount: 0,
        requiresShipping: false,
        fulfillmentType: "digital",
        productSnapshot: { internal: "snapshot" },
      }],
      subtotalAmount: 5000,
      discountAmount: 1000,
      shippingAmount: 0,
      taxAmount: 0,
      totalAmount: 4000,
      coupon: mockCoupons[0],
      couponCode: "SAVE10",
      couponMessage: "Coupon applied",
      couponValidation: validationResult,
      shippingRate: null,
      tax: {
        taxAmount: 0,
        taxableAmount: 0,
        rateBps: 0,
        lineTaxAmounts: [0],
        provider: "none",
      },
    });

    expect(publicPriced.coupon).toMatchObject({ id: "c-public", code: "SAVE10" });
    expect(publicPriced.coupon).not.toHaveProperty("notes");
    expect(publicPriced.couponValidation?.coupon).not.toHaveProperty("createdBy");
    expect(publicPriced.lines[0]).not.toHaveProperty("categoryIds");
    expect(publicPriced.lines[0]).not.toHaveProperty("taxable");
    expect(publicPriced.lines[0]).not.toHaveProperty("taxCategory");
    expect(publicPriced.lines[0]).not.toHaveProperty("productSnapshot");
  });

  it("validates Stripe key mode separation", async () => {
    const {
      getEcommerceStripePublishableKey,
      validateStripeKeyMode,
      validateStripeSettingsKeyModes,
    } = await import("../services/ecommerce-stripe.service");
    expect(validateStripeKeyMode("test", "pk_test_123", "sk_test_123")).toBeNull();
    expect(validateStripeKeyMode("test", "pk_live_123", "sk_test_123")).toMatch(/Test mode/);
    expect(validateStripeKeyMode("live", "pk_live_123", "sk_test_123")).toMatch(/Live mode/);
    expect(validateStripeSettingsKeyModes({
      testPublishableKey: "pk_live_123",
      livePublishableKey: "pk_live_456",
    })).toMatch(/Test mode/);
    expect(validateStripeSettingsKeyModes({
      testPublishableKey: "pk_test_123",
      liveSecretKey: "sk_test_456",
    })).toMatch(/Live mode/);

    mockGetDecryptedCategory.mockResolvedValue({
      active_mode: "live",
      live_publishable_key: "pk_test_wrong",
    });
    await expect(getEcommerceStripePublishableKey()).rejects.toThrow(/Live mode/);
  });

  it("computes pending and processed refunds against refundable balance", async () => {
    const { computeRefundedAmount } = await import("../services/ecommerce-refund.service");
    expect(computeRefundedAmount([
      { amount: 1000, status: "processed" },
      { amount: 500, status: "pending" },
      { amount: 200, status: "failed" },
    ])).toBe(1500);
  });

  it("blocks manual refunds before payment capture or after full refund", async () => {
    const { createEcommerceRefund } = await import("../services/ecommerce-refund.service");
    mockGetOrderWithDetails.mockResolvedValueOnce({
      id: "order-unpaid",
      status: "pending",
      paymentStatus: "unpaid",
      totalAmount: 5000,
      stripePaymentIntentId: null,
      refunds: [],
    });

    await expect(createEcommerceRefund({
      orderId: "order-unpaid",
      amount: 1000,
      source: "manual",
    })).rejects.toThrow(/not been captured/);
    expect(mockCreateRefund).not.toHaveBeenCalled();

    mockGetOrderWithDetails.mockResolvedValueOnce({
      id: "order-refunded",
      status: "paid",
      paymentStatus: "refunded",
      totalAmount: 5000,
      stripePaymentIntentId: "pi_123",
      refunds: [{ amount: 5000, status: "processed" }],
    });

    await expect(createEcommerceRefund({
      orderId: "order-refunded",
      amount: 1000,
      source: "manual",
    })).rejects.toThrow(/fully refunded/);
    expect(mockCreateRefund).not.toHaveBeenCalled();
  });

  it("creates manual refunds only against remaining refundable balance", async () => {
    const { createEcommerceRefund } = await import("../services/ecommerce-refund.service");
    mockGetOrderWithDetails.mockResolvedValueOnce({
      id: "order-paid",
      status: "paid",
      paymentStatus: "paid",
      totalAmount: 5000,
      stripePaymentIntentId: null,
      refunds: [{ amount: 1500, status: "processed" }],
    });

    await expect(createEcommerceRefund({
      orderId: "order-paid",
      amount: 4000,
      source: "manual",
    })).rejects.toThrow(/exceeds refundable balance/);
    expect(mockCreateRefund).not.toHaveBeenCalled();
  });

  it("does not double count a newly created refund returned by the refreshed order", async () => {
    const { createEcommerceRefund } = await import("../services/ecommerce-refund.service");
    const createdRefund = {
      id: "refund-manual-1",
      orderId: "order-partial-refund",
      amount: 3000,
      status: "processed",
    };
    mockCreateRefund.mockResolvedValue(createdRefund);
    mockGetOrderWithDetails.mockResolvedValueOnce({
      id: "order-partial-refund",
      status: "paid",
      paymentStatus: "paid",
      totalAmount: 5000,
      stripePaymentIntentId: null,
      refunds: [],
    }).mockResolvedValueOnce({
      id: "order-partial-refund",
      status: "paid",
      paymentStatus: "paid",
      totalAmount: 5000,
      stripePaymentIntentId: null,
      refunds: [createdRefund],
    });

    await createEcommerceRefund({
      orderId: "order-partial-refund",
      amount: 3000,
      source: "manual",
    });

    expect(mockUpdateOrder).toHaveBeenCalledWith("order-partial-refund", {
      paymentStatus: "partially_refunded",
    });
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
    mockMarkOrderPaidIfUnpaid.mockResolvedValueOnce(paidOrder);
    mockGetOrderWithDetails.mockResolvedValue({ ...paidOrder, customer: null, items: [], refunds: [], shipments: [] });

    await markEcommerceOrderPaid("order-1", "pi_123");
    await markEcommerceOrderPaid("order-1", "pi_123");

    expect(mockMarkOrderPaidIfUnpaid).toHaveBeenCalledTimes(1);
    expect(mockUpdateOrder).not.toHaveBeenCalled();
    expect(mockRecordCouponRedemptionForOrder).toHaveBeenCalledTimes(1);
    expect(mockDeductInventoryForPaidOrder).toHaveBeenCalledTimes(2);
    expect(mockSendEcommerceOrderConfirmation).toHaveBeenCalledTimes(1);
  });

  it("does not send duplicate paid-order effects when another worker wins the paid transition", async () => {
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
    mockGetOrder.mockResolvedValue(pendingOrder);
    mockMarkOrderPaidIfUnpaid.mockResolvedValue(undefined);
    mockGetOrderWithDetails.mockResolvedValue({ ...paidOrder, customer: null, items: [], refunds: [], shipments: [] });

    await markEcommerceOrderPaid("order-1", "pi_123");

    expect(mockMarkOrderPaidIfUnpaid).toHaveBeenCalledWith("order-1", "pi_123");
    expect(mockRecordCouponRedemptionForOrder).not.toHaveBeenCalled();
    expect(mockDeductInventoryForPaidOrder).toHaveBeenCalledTimes(1);
    expect(mockSendEcommerceOrderConfirmation).not.toHaveBeenCalled();
  });

  it("rejects paid-order finalization if a different PaymentIntent wins the transition race", async () => {
    const { markEcommerceOrderPaid } = await import("../services/ecommerce-order.service");
    const pendingOrder = {
      id: "order-1",
      status: "pending",
      paymentStatus: "unpaid",
      stripePaymentIntentId: null,
    } as EcommerceOrder;
    const mismatchedOrder = {
      ...pendingOrder,
      stripePaymentIntentId: "pi_other",
    } as EcommerceOrder;
    mockGetOrder.mockResolvedValueOnce(pendingOrder).mockResolvedValueOnce(mismatchedOrder);
    mockMarkOrderPaidIfUnpaid.mockResolvedValue(undefined);

    await expect(markEcommerceOrderPaid("order-1", "pi_123")).rejects.toThrow(/PaymentIntent/);

    expect(mockMarkOrderPaidIfUnpaid).toHaveBeenCalledWith("order-1", "pi_123");
    expect(mockRecordCouponRedemptionForOrder).not.toHaveBeenCalled();
    expect(mockDeductInventoryForPaidOrder).not.toHaveBeenCalled();
    expect(mockSendEcommerceOrderConfirmation).not.toHaveBeenCalled();
  });

  it("finalizes inventory and payment status when an admin marks an order paid", async () => {
    const { updateAdminEcommerceOrder } = await import("../services/ecommerce-order.service");
    const pendingOrder = {
      id: "order-admin-1",
      status: "pending",
      paymentStatus: "unpaid",
    } as EcommerceOrder;
    const paidOrder = {
      ...pendingOrder,
      status: "paid",
      paymentStatus: "paid",
    } as EcommerceOrder;
    mockGetOrder.mockResolvedValue(pendingOrder);
    mockUpdateOrder.mockResolvedValue(paidOrder);
    mockGetOrderWithDetails.mockResolvedValue({
      ...paidOrder,
      customer: null,
      items: [],
      refunds: [],
      shipments: [],
      fulfillments: [],
    });

    const order = await updateAdminEcommerceOrder("order-admin-1", { status: "paid" });

    expect(order).toBe(paidOrder);
    expect(mockUpdateOrder).toHaveBeenCalledWith("order-admin-1", {
      status: "paid",
      paymentStatus: "paid",
    });
    expect(mockRecordCouponRedemptionForOrder).toHaveBeenCalledWith("order-admin-1");
    expect(mockDeductInventoryForPaidOrder).toHaveBeenCalledWith("order-admin-1");
    expect(mockSendEcommerceOrderStatusEmail).toHaveBeenCalledTimes(1);
  });

  it("does not refinalize inventory when an admin saves an already-paid order", async () => {
    const { updateAdminEcommerceOrder } = await import("../services/ecommerce-order.service");
    const paidOrder = {
      id: "order-admin-2",
      status: "paid",
      paymentStatus: "paid",
    } as EcommerceOrder;
    mockGetOrder.mockResolvedValue(paidOrder);
    mockUpdateOrder.mockResolvedValue(paidOrder);

    await updateAdminEcommerceOrder("order-admin-2", { status: "paid", notes: "Already handled" });

    expect(mockUpdateOrder).toHaveBeenCalledWith("order-admin-2", {
      status: "paid",
      notes: "Already handled",
      paymentStatus: "paid",
    });
    expect(mockRecordCouponRedemptionForOrder).not.toHaveBeenCalled();
    expect(mockDeductInventoryForPaidOrder).not.toHaveBeenCalled();
    expect(mockSendEcommerceOrderStatusEmail).not.toHaveBeenCalled();
  });

  it("blocks admin shipped or delivered transitions for unpaid orders", async () => {
    const { updateAdminEcommerceOrder } = await import("../services/ecommerce-order.service");
    mockGetOrder.mockResolvedValue({
      id: "order-admin-unpaid",
      status: "pending",
      paymentStatus: "unpaid",
    } as EcommerceOrder);

    await expect(updateAdminEcommerceOrder("order-admin-unpaid", { status: "shipped" }))
      .rejects.toThrow(/Only paid orders/);
    await expect(updateAdminEcommerceOrder("order-admin-unpaid", { status: "delivered" }))
      .rejects.toThrow(/Only paid orders/);
    expect(mockUpdateOrder).not.toHaveBeenCalled();
  });

  it("blocks admin shipped or delivered transitions for cancelled orders", async () => {
    const { updateAdminEcommerceOrder } = await import("../services/ecommerce-order.service");
    mockGetOrder.mockResolvedValue({
      id: "order-admin-cancelled",
      status: "cancelled",
      paymentStatus: "paid",
    } as EcommerceOrder);

    await expect(updateAdminEcommerceOrder("order-admin-cancelled", { status: "shipped" }))
      .rejects.toThrow(/Cancelled/);
    await expect(updateAdminEcommerceOrder("order-admin-cancelled", { status: "delivered" }))
      .rejects.toThrow(/Cancelled/);
    await expect(updateAdminEcommerceOrder("order-admin-cancelled", { status: "paid" }))
      .rejects.toThrow(/Cancelled/);
    expect(mockUpdateOrder).not.toHaveBeenCalled();
  });

  it("blocks admin backward transitions after payment or fulfillment", async () => {
    const { updateAdminEcommerceOrder } = await import("../services/ecommerce-order.service");
    mockGetOrder
      .mockResolvedValueOnce({
        id: "order-admin-paid",
        status: "paid",
        paymentStatus: "paid",
      } as EcommerceOrder)
      .mockResolvedValueOnce({
        id: "order-admin-shipped",
        status: "shipped",
        paymentStatus: "paid",
      } as EcommerceOrder)
      .mockResolvedValueOnce({
        id: "order-admin-delivered",
        status: "delivered",
        paymentStatus: "paid",
      } as EcommerceOrder);

    await expect(updateAdminEcommerceOrder("order-admin-paid", { status: "pending" }))
      .rejects.toThrow(/Paid orders/);
    await expect(updateAdminEcommerceOrder("order-admin-shipped", { status: "paid" }))
      .rejects.toThrow(/Shipped orders/);
    await expect(updateAdminEcommerceOrder("order-admin-delivered", { status: "shipped" }))
      .rejects.toThrow(/Delivered orders/);
    expect(mockUpdateOrder).not.toHaveBeenCalled();
  });

  it("allows admin shipped transitions for paid active orders", async () => {
    const { updateAdminEcommerceOrder } = await import("../services/ecommerce-order.service");
    mockGetOrder.mockResolvedValue({
      id: "order-admin-shippable",
      status: "paid",
      paymentStatus: "paid",
    } as EcommerceOrder);
    mockUpdateOrder.mockResolvedValue({
      id: "order-admin-shippable",
      status: "shipped",
      paymentStatus: "paid",
    } as EcommerceOrder);

    await expect(updateAdminEcommerceOrder("order-admin-shippable", { status: "shipped" }))
      .resolves.toMatchObject({ status: "shipped" });
    expect(mockUpdateOrder).toHaveBeenCalledWith("order-admin-shippable", {
      status: "shipped",
      paymentStatus: undefined,
    });
  });

  it("allows shipments only for paid, active ecommerce orders", async () => {
    const { assertEcommerceOrderCanShip } = await import("../services/ecommerce-order.service");

    mockGetOrder.mockResolvedValueOnce({
      id: "order-ship-1",
      status: "paid",
      paymentStatus: "paid",
    } as EcommerceOrder);
    await expect(assertEcommerceOrderCanShip("order-ship-1")).resolves.toMatchObject({ id: "order-ship-1" });

    mockGetOrder.mockResolvedValueOnce({
      id: "order-ship-2",
      status: "paid",
      paymentStatus: "partially_refunded",
    } as EcommerceOrder);
    await expect(assertEcommerceOrderCanShip("order-ship-2")).resolves.toMatchObject({ id: "order-ship-2" });
  });

  it("blocks shipments for unpaid, cancelled, delivered, or missing ecommerce orders", async () => {
    const { assertEcommerceOrderCanShip } = await import("../services/ecommerce-order.service");

    mockGetOrder.mockResolvedValueOnce({
      id: "order-unpaid",
      status: "pending",
      paymentStatus: "unpaid",
    } as EcommerceOrder);
    await expect(assertEcommerceOrderCanShip("order-unpaid")).rejects.toThrow(/paid orders/);

    mockGetOrder.mockResolvedValueOnce({
      id: "order-cancelled",
      status: "cancelled",
      paymentStatus: "paid",
    } as EcommerceOrder);
    await expect(assertEcommerceOrderCanShip("order-cancelled")).rejects.toThrow(/Cancelled/);

    mockGetOrder.mockResolvedValueOnce({
      id: "order-delivered",
      status: "delivered",
      paymentStatus: "paid",
    } as EcommerceOrder);
    await expect(assertEcommerceOrderCanShip("order-delivered")).rejects.toThrow(/Delivered/);

    mockGetOrder.mockResolvedValueOnce(undefined);
    await expect(assertEcommerceOrderCanShip("missing-order")).rejects.toThrow(/Order not found/);
  });

  it("validates fulfillment items against the target order before creation", async () => {
    const { assertEcommerceFulfillmentRequest } = await import("../services/ecommerce-order.service");
    mockGetOrder.mockResolvedValue({
      id: "order-fulfill-1",
      status: "paid",
      paymentStatus: "paid",
    } as EcommerceOrder);
    mockGetOrderWithDetails.mockResolvedValue({
      id: "order-fulfill-1",
      customer: null,
      items: [
        { id: "item-1", quantity: 2 },
        { id: "item-2", quantity: 1 },
      ],
      refunds: [],
      shipments: [],
      fulfillments: [],
    });

    await expect(assertEcommerceFulfillmentRequest("order-fulfill-1", [
      { orderItemId: "item-1", quantity: 2 },
      { orderItemId: "item-2", quantity: 1 },
    ])).resolves.toEqual([
      { orderItemId: "item-1", quantity: 2 },
      { orderItemId: "item-2", quantity: 1 },
    ]);
  });

  it("blocks fulfillment items that are not on the order or exceed ordered quantity", async () => {
    const { assertEcommerceFulfillmentRequest } = await import("../services/ecommerce-order.service");
    mockGetOrder.mockResolvedValue({
      id: "order-fulfill-2",
      status: "paid",
      paymentStatus: "paid",
    } as EcommerceOrder);
    mockGetOrderWithDetails.mockResolvedValue({
      id: "order-fulfill-2",
      customer: null,
      items: [{ id: "item-1", quantity: 2 }],
      refunds: [],
      shipments: [],
      fulfillments: [],
    });

    await expect(assertEcommerceFulfillmentRequest("order-fulfill-2", [
      { orderItemId: "item-missing", quantity: 1 },
    ])).rejects.toThrow(/does not belong/);

    await expect(assertEcommerceFulfillmentRequest("order-fulfill-2", [
      { orderItemId: "item-1", quantity: 3 },
    ])).rejects.toThrow(/exceed/);
  });

  it("blocks fulfillment quantities that exceed the remaining unfulfilled quantity", async () => {
    const { assertEcommerceFulfillmentRequest } = await import("../services/ecommerce-order.service");
    mockGetOrder.mockResolvedValue({
      id: "order-fulfill-3",
      status: "paid",
      paymentStatus: "paid",
    } as EcommerceOrder);
    mockGetOrderWithDetails.mockResolvedValue({
      id: "order-fulfill-3",
      customer: null,
      items: [{ id: "item-1", quantity: 3 }],
      refunds: [],
      shipments: [],
      fulfillments: [],
    });
    mockGetFulfillmentsForOrder.mockResolvedValue([
      {
        id: "fulfillment-1",
        status: "fulfilled",
        items: [{ orderItemId: "item-1", quantity: 2 }],
      },
    ]);

    await expect(assertEcommerceFulfillmentRequest("order-fulfill-3", [
      { orderItemId: "item-1", quantity: 2 },
    ])).rejects.toThrow(/remaining ordered quantity/);
  });

  it("aggregates duplicate fulfillment request lines before validating quantity", async () => {
    const { assertEcommerceFulfillmentRequest } = await import("../services/ecommerce-order.service");
    mockGetOrder.mockResolvedValue({
      id: "order-fulfill-4",
      status: "paid",
      paymentStatus: "paid",
    } as EcommerceOrder);
    mockGetOrderWithDetails.mockResolvedValue({
      id: "order-fulfill-4",
      customer: null,
      items: [{ id: "item-1", quantity: 3 }],
      refunds: [],
      shipments: [],
      fulfillments: [],
    });

    await expect(assertEcommerceFulfillmentRequest("order-fulfill-4", [
      { orderItemId: "item-1", quantity: 2 },
      { orderItemId: "item-1", quantity: 2 },
    ])).rejects.toThrow(/remaining ordered quantity/);
  });

  it("ignores failed or cancelled fulfillments when checking remaining quantity", async () => {
    const { assertEcommerceFulfillmentRequest } = await import("../services/ecommerce-order.service");
    mockGetOrder.mockResolvedValue({
      id: "order-fulfill-5",
      status: "paid",
      paymentStatus: "paid",
    } as EcommerceOrder);
    mockGetOrderWithDetails.mockResolvedValue({
      id: "order-fulfill-5",
      customer: null,
      items: [{ id: "item-1", quantity: 3 }],
      refunds: [],
      shipments: [],
      fulfillments: [],
    });
    mockGetFulfillmentsForOrder.mockResolvedValue([
      {
        id: "fulfillment-1",
        status: "failed",
        items: [{ orderItemId: "item-1", quantity: 3 }],
      },
      {
        id: "fulfillment-2",
        status: "cancelled",
        items: [{ orderItemId: "item-1", quantity: 3 }],
      },
    ]);

    await expect(assertEcommerceFulfillmentRequest("order-fulfill-5", [
      { orderItemId: "item-1", quantity: 3 },
    ])).resolves.toEqual([{ orderItemId: "item-1", quantity: 3 }]);
  });

  it("creates manual paid orders through server-side pricing and inventory deduction", async () => {
    const { createManualEcommerceOrder } = await import("../services/ecommerce-order.service");
    const customer = { id: "customer-1", email: "buyer@example.com", name: "Buyer" };
    const createdOrder = {
      id: "order-manual-1",
      customerId: customer.id,
      status: "paid",
      paymentStatus: "paid",
      totalAmount: 5000,
      lookupToken: "lookup-token",
    } as EcommerceOrder;
    mockGetCustomer.mockResolvedValue(customer);
    mockCreateOrder.mockResolvedValue({ ...createdOrder, customer, items: [], refunds: [], shipments: [], fulfillments: [] });
    mockGetOrderWithDetails.mockResolvedValue({ ...createdOrder, customer, items: [], refunds: [], shipments: [], fulfillments: [] });
    mockProducts.push({
      id: "p-manual",
      name: "Manual Product",
      tagline: null,
      description: null,
      shortDescription: null,
      productType: null,
      vendor: null,
      price: 2500,
      compareAtPrice: null,
      costPerItem: null,
      taxable: true,
      taxCategory: null,
      featured: false,
      visibility: "online",
      publishedAt: null,
      archivedAt: null,
      primaryImage: null,
      secondaryImages: [],
      features: [],
      included: [],
      active: true,
      status: "published",
      sku: "SKU-MANUAL",
      tags: [],
      salePrice: null,
      discountType: "NONE",
      discountValue: null,
      saleStartAt: null,
      saleEndAt: null,
      metaTitle: null,
      metaDescription: null,
      metaKeywords: null,
      urlSlug: "manual-product",
      canonicalUrl: null,
      robotsIndex: true,
      robotsFollow: true,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      physicalProduct: true,
      requiresShipping: true,
      weight: null,
      weightUnit: "oz",
      length: null,
      width: null,
      height: null,
      dimensionUnit: "in",
      shippingProfile: null,
      fulfillmentType: "merchant",
      relatedProductIds: [],
      upsellProductIds: [],
      badgeText: null,
      mediaId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockVariants.push({
      id: "v-manual",
      productId: "p-manual",
      title: "Default",
      optionSignature: "default",
      optionValues: {},
      sku: "SKU-MANUAL",
      barcode: null,
      price: 2500,
      salePrice: null,
      compareAtPrice: null,
      costPerItem: null,
      inventoryQuantity: 10,
      trackInventory: true,
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

    const order = await createManualEcommerceOrder({
      customerId: customer.id,
      items: [{ productId: "p-manual", quantity: 2 }],
      notes: "Counter sale",
    });

    expect(order.id).toBe("order-manual-1");
    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: customer.id,
        status: "paid",
        paymentStatus: "paid",
        subtotalAmount: 5000,
        totalAmount: 5000,
        isManualOrder: true,
        notes: "Counter sale",
      }),
      [expect.objectContaining({
        productId: "p-manual",
        variantId: "v-manual",
        sku: "SKU-MANUAL",
        quantity: 2,
        unitPrice: 2500,
        lineTotal: 5000,
      })],
    );
    expect(mockRecordCouponRedemptionForOrder).toHaveBeenCalledWith("order-manual-1");
    expect(mockDeductInventoryForPaidOrder).toHaveBeenCalledWith("order-manual-1");
  });

  it("rejects manual orders for unknown customers before creating orders", async () => {
    const { createManualEcommerceOrder } = await import("../services/ecommerce-order.service");
    mockGetCustomer.mockResolvedValue(undefined);

    await expect(createManualEcommerceOrder({
      customerId: "missing-customer",
      items: [{ productId: "p1", quantity: 1 }],
    })).rejects.toThrow(/Customer not found/);

    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(mockDeductInventoryForPaidOrder).not.toHaveBeenCalled();
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
    mockCreateRefund.mockResolvedValue({
      id: "refund-1",
      orderId: "order-1",
      amount: 5000,
      status: "processed",
    });
    mockGetOrderWithDetails.mockResolvedValueOnce({
      id: "order-1",
      totalAmount: 5000,
      status: "paid",
      paymentStatus: "paid",
      refunds: [],
    }).mockResolvedValueOnce({
      id: "order-1",
      totalAmount: 5000,
      status: "paid",
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

  it("marks orders refund_pending while Stripe refunds are still pending", async () => {
    const { recordStripeRefundWebhook } = await import("../services/ecommerce-refund.service");
    mockGetRefundByStripeRefundId.mockResolvedValue(undefined);
    mockCreateRefund.mockResolvedValue({
      id: "refund-pending",
      orderId: "order-pending-refund",
      amount: 2500,
      status: "pending",
    });
    mockGetOrderWithDetails.mockResolvedValueOnce({
      id: "order-pending-refund",
      totalAmount: 5000,
      status: "paid",
      paymentStatus: "paid",
      refunds: [],
    }).mockResolvedValueOnce({
      id: "order-pending-refund",
      totalAmount: 5000,
      status: "paid",
      paymentStatus: "paid",
      refunds: [{ amount: 2500, status: "pending" }],
    });

    await recordStripeRefundWebhook({
      stripeRefundId: "re_pending",
      orderId: "order-pending-refund",
      amount: 2500,
      status: "pending",
    });

    expect(mockCreateRefund).toHaveBeenCalledWith(expect.objectContaining({
      orderId: "order-pending-refund",
      status: "pending",
      type: "partial",
    }));
    expect(mockUpdateOrder).toHaveBeenCalledWith("order-pending-refund", { paymentStatus: "refund_pending" });
  });

  it("marks orders refund_failed when Stripe reports a failed refund and no amount was processed", async () => {
    const { recordStripeRefundWebhook } = await import("../services/ecommerce-refund.service");
    mockGetRefundByStripeRefundId.mockResolvedValue({
      id: "refund-failed",
      orderId: "order-failed-refund",
      amount: 2500,
      status: "pending",
    });
    mockUpdateRefund.mockResolvedValue({
      id: "refund-failed",
      orderId: "order-failed-refund",
      amount: 2500,
      status: "failed",
    });
    mockGetOrderWithDetails.mockResolvedValue({
      id: "order-failed-refund",
      totalAmount: 5000,
      status: "paid",
      paymentStatus: "refund_pending",
      refunds: [{ amount: 2500, status: "failed" }],
    });

    await recordStripeRefundWebhook({
      stripeRefundId: "re_failed",
      status: "failed",
    });

    expect(mockUpdateRefund).toHaveBeenCalledWith("refund-failed", expect.objectContaining({
      status: "failed",
    }));
    expect(mockUpdateOrder).toHaveBeenCalledWith("order-failed-refund", { paymentStatus: "refund_failed" });
  });

  it("ignores Stripe refund webhooks that exceed the remaining refundable balance", async () => {
    const { recordStripeRefundWebhook } = await import("../services/ecommerce-refund.service");
    mockGetRefundByStripeRefundId.mockResolvedValue(undefined);
    mockGetOrderWithDetails.mockResolvedValue({
      id: "order-2",
      totalAmount: 5000,
      status: "paid",
      paymentStatus: "partially_refunded",
      refunds: [{ amount: 4000, status: "processed" }],
    });

    await expect(recordStripeRefundWebhook({
      stripeRefundId: "re_over",
      orderId: "order-2",
      amount: 1500,
      status: "succeeded",
    })).resolves.toBeUndefined();

    expect(mockCreateRefund).not.toHaveBeenCalled();
    expect(mockUpdateOrder).not.toHaveBeenCalled();
  });

  it("ignores Stripe refund webhooks for nonrefundable order states", async () => {
    const { recordStripeRefundWebhook } = await import("../services/ecommerce-refund.service");
    mockGetRefundByStripeRefundId.mockResolvedValue(undefined);
    mockGetOrderWithDetails.mockResolvedValue({
      id: "order-3",
      totalAmount: 5000,
      status: "pending",
      paymentStatus: "unpaid",
      refunds: [],
    });

    await expect(recordStripeRefundWebhook({
      stripeRefundId: "re_unpaid",
      orderId: "order-3",
      amount: 1000,
      status: "succeeded",
    })).resolves.toBeUndefined();

    expect(mockCreateRefund).not.toHaveBeenCalled();
    expect(mockUpdateOrder).not.toHaveBeenCalled();
  });
});

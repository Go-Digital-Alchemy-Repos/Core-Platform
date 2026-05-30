import { describe, expect, it } from "vitest";
import type { EcommerceOrderWithDetails } from "../storage/ecommerce.storage";
import { toPublicEcommerceOrderStatus } from "../services/ecommerce-public-order.service";

describe("ecommerce public order status serializer", () => {
  it("removes customer and lookup-token fields from public order status payloads", () => {
    const now = new Date();
    const publicOrder = toPublicEcommerceOrderStatus({
      id: "order-1",
      customerId: "customer-1",
      status: "paid",
      paymentStatus: "paid",
      totalAmount: 12995,
      subtotalAmount: 10000,
      discountAmount: 0,
      shippingAmount: 995,
      taxAmount: 2000,
      couponSnapshot: null,
      stripeTaxCalculationId: null,
      stripePaymentIntentId: "pi_secret",
      stripeSessionId: null,
      couponCode: null,
      isManualOrder: false,
      notes: "internal note",
      customerIp: "127.0.0.1",
      shippingName: "Buyer",
      shippingCompany: null,
      shippingAddress: "123 Main",
      shippingLine2: null,
      shippingCity: "Detroit",
      shippingState: "MI",
      shippingZip: "48201",
      shippingCountry: "US",
      billingSameAsShipping: true,
      billingName: "Buyer",
      billingCompany: null,
      billingAddress: "123 Main",
      billingLine2: null,
      billingCity: "Detroit",
      billingState: "MI",
      billingZip: "48201",
      billingCountry: "US",
      marketingConsentGranted: false,
      metaFbp: "fbp",
      metaFbc: "fbc",
      metaEventSourceUrl: "https://example.com",
      customerUserAgent: "agent",
      lookupToken: "lookup-token",
      createdAt: now,
      updatedAt: now,
      customer: {
        id: "customer-1",
        userId: "user-1",
        email: "buyer@example.com",
        name: "Buyer",
        phone: "555-1212",
        address: "123 Main",
        line2: null,
        city: "Detroit",
        state: "MI",
        zipCode: "48201",
        country: "US",
        avatarUrl: null,
        isDisabled: false,
        passwordHash: "hashed-password",
        sessionInvalidatedAt: now,
        mergedIntoCustomerId: null,
        createdAt: now,
        updatedAt: now,
      },
      items: [{
        id: "item-1",
        orderId: "order-1",
        productId: "product-1",
        variantId: null,
        productName: "Product",
        variantTitle: null,
        sku: "SKU",
        optionsSnapshot: null,
        productSlug: "product",
        image: null,
        productSnapshot: { internal: true },
        taxable: true,
        taxCategory: null,
        taxAmount: 0,
        requiresShipping: true,
        fulfillmentType: "merchant",
        quantity: 1,
        unitPrice: 10000,
        lineTotal: 10000,
      }],
      refunds: [],
      shipments: [],
      fulfillments: [],
    } as EcommerceOrderWithDetails);

    expect(publicOrder).toMatchObject({
      id: "order-1",
      status: "paid",
      items: [{ id: "item-1", productName: "Product", lineTotal: 10000 }],
    });
    expect(JSON.stringify(publicOrder)).not.toContain("hashed-password");
    expect(JSON.stringify(publicOrder)).not.toContain("lookup-token");
    expect(JSON.stringify(publicOrder)).not.toContain("buyer@example.com");
    expect(JSON.stringify(publicOrder)).not.toContain("127.0.0.1");
    expect(JSON.stringify(publicOrder)).not.toContain("pi_secret");
  });
});

import { z } from "zod";
import { storage } from "../storage/index";
import {
  buildCouponSnapshot,
  priceCart,
  priceCartSchema,
  type PricedCartLine,
} from "./ecommerce-pricing.service";
import { getEcommerceStripeClient } from "./ecommerce-stripe.service";
import {
  sendEcommerceOrderConfirmation,
  sendEcommerceOrderStatusEmail,
} from "./ecommerce-email.service";

const addressSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  address: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().default("US"),
});

export const checkoutSchema = priceCartSchema.extend({
  customer: z.object({
    email: z.string().email(),
    name: z.string().min(1),
    phone: z.string().optional(),
  }),
  shippingAddress: addressSchema,
  shippingRateId: z.string().optional(),
  billingSameAsShipping: z.boolean().default(true),
  billingAddress: addressSchema.optional(),
  metaTracking: z.object({
    marketingConsentGranted: z.boolean().optional(),
    fbp: z.string().optional(),
    fbc: z.string().optional(),
    eventSourceUrl: z.string().optional(),
    userAgent: z.string().optional(),
  }).optional(),
});

export const manualOrderSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(z.object({
    productId: z.string().min(1),
    variantId: z.string().min(1).optional(),
    quantity: z.number().int().min(1).max(99),
  })).min(1),
  notes: z.string().optional(),
});

export const adminOrderUpdateSchema = z.object({
  status: z.enum(["pending", "paid", "shipped", "delivered", "cancelled"]).optional(),
  notes: z.string().optional(),
});

function pricedLinesToOrderItems(lines: PricedCartLine[]) {
  return lines.map((line) => ({
    orderId: "",
    productId: line.productId,
    variantId: line.variantId,
    productName: line.name,
    variantTitle: line.variantTitle,
    sku: line.sku,
    optionsSnapshot: line.optionsSnapshot,
    productSlug: line.slug,
    image: line.image,
    productSnapshot: line.productSnapshot,
    taxable: line.taxable,
    taxCategory: line.taxCategory,
    taxAmount: line.taxAmount,
    requiresShipping: line.requiresShipping,
    fulfillmentType: line.fulfillmentType,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineTotal: line.lineTotal,
  }));
}

export async function createEcommercePaymentIntent(input: unknown, requestMeta: { ip?: string | null } = {}) {
  const data = checkoutSchema.parse(input);
  const priced = await priceCart({
    items: data.items,
    couponCode: data.couponCode,
    customerEmail: data.customer.email,
    shippingRateId: data.shippingRateId,
  });
  if (priced.totalAmount <= 0) throw new Error("Order total must be greater than zero");

  const customer = await storage.ecommerce.findOrCreateCustomer({
    email: data.customer.email,
    name: data.customer.name,
    phone: data.customer.phone,
    address: data.shippingAddress.address,
    line2: data.shippingAddress.line2,
    city: data.shippingAddress.city,
    state: data.shippingAddress.state,
    zipCode: data.shippingAddress.zip,
    country: data.shippingAddress.country,
  });

  const billing = data.billingSameAsShipping ? data.shippingAddress : data.billingAddress;
  const order = await storage.ecommerce.createOrder({
    customerId: customer.id,
    status: "pending",
    paymentStatus: "unpaid",
    totalAmount: priced.totalAmount,
    subtotalAmount: priced.subtotalAmount,
    taxAmount: priced.taxAmount,
    shippingAmount: priced.shippingAmount,
    discountAmount: priced.discountAmount,
    couponCode: priced.coupon?.code,
    couponSnapshot: buildCouponSnapshot(priced.coupon),
    customerIp: requestMeta.ip ?? null,
    shippingName: data.shippingAddress.name,
    shippingCompany: data.shippingAddress.company,
    shippingAddress: data.shippingAddress.address,
    shippingLine2: data.shippingAddress.line2,
    shippingCity: data.shippingAddress.city,
    shippingState: data.shippingAddress.state,
    shippingZip: data.shippingAddress.zip,
    shippingCountry: data.shippingAddress.country,
    billingSameAsShipping: data.billingSameAsShipping,
    billingName: billing?.name,
    billingCompany: billing?.company,
    billingAddress: billing?.address,
    billingLine2: billing?.line2,
    billingCity: billing?.city,
    billingState: billing?.state,
    billingZip: billing?.zip,
    billingCountry: billing?.country,
    marketingConsentGranted: data.metaTracking?.marketingConsentGranted ?? false,
    metaFbp: data.metaTracking?.fbp,
    metaFbc: data.metaTracking?.fbc,
    metaEventSourceUrl: data.metaTracking?.eventSourceUrl,
    customerUserAgent: data.metaTracking?.userAgent,
  }, pricedLinesToOrderItems(priced.lines));

  const stripe = await getEcommerceStripeClient();
  const intent = await stripe.paymentIntents.create({
    amount: order.totalAmount,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    receipt_email: customer.email,
    metadata: { orderId: order.id },
  });
  if (!intent.client_secret) {
    throw new Error("Stripe did not return a client secret for this PaymentIntent");
  }

  await storage.ecommerce.updateOrder(order.id, { stripePaymentIntentId: intent.id });

  return {
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    orderId: order.id,
    lookupToken: order.lookupToken,
    priced,
  };
}

export async function createManualEcommerceOrder(input: unknown) {
  const data = manualOrderSchema.parse(input);
  const customer = await storage.ecommerce.getCustomer(data.customerId);
  if (!customer) {
    throw Object.assign(new Error("Customer not found"), { statusCode: 404 });
  }

  const priced = await priceCart({
    items: data.items,
    customerId: customer.id,
    customerEmail: customer.email,
  });
  const order = await storage.ecommerce.createOrder({
    customerId: customer.id,
    status: "paid",
    paymentStatus: "paid",
    subtotalAmount: priced.subtotalAmount,
    totalAmount: priced.totalAmount,
    taxAmount: priced.taxAmount,
    shippingAmount: 0,
    discountAmount: priced.discountAmount,
    couponCode: priced.coupon?.code,
    couponSnapshot: buildCouponSnapshot(priced.coupon),
    isManualOrder: true,
    notes: data.notes,
  }, pricedLinesToOrderItems(priced.lines));

  await storage.ecommerce.recordCouponRedemptionForOrder(order.id);
  await storage.ecommerce.deductInventoryForPaidOrder(order.id);

  const details = await storage.ecommerce.getOrderWithDetails(order.id);
  return details ?? order;
}

export async function updateAdminEcommerceOrder(orderId: string, input: unknown) {
  const data = adminOrderUpdateSchema.parse(input);
  const previous = await storage.ecommerce.getOrder(orderId);
  if (!previous) return undefined;

  const updateData = {
    ...data,
    paymentStatus: data.status === "paid" ? "paid" as const : undefined,
  };
  const order = await storage.ecommerce.updateOrder(orderId, updateData);
  if (!order) return undefined;

  const changedStatus = Boolean(data.status && previous.status !== data.status);
  const newlyPaid = data.status === "paid" && previous.paymentStatus !== "paid";
  if (newlyPaid) {
    await storage.ecommerce.recordCouponRedemptionForOrder(order.id);
    await storage.ecommerce.deductInventoryForPaidOrder(order.id);
  }
  if (changedStatus) {
    const details = await storage.ecommerce.getOrderWithDetails(order.id);
    if (details) await sendEcommerceOrderStatusEmail(details);
  }

  return order;
}

export async function markEcommerceOrderPaid(orderId: string, paymentIntentId: string) {
  const existing = await storage.ecommerce.getOrder(orderId);
  if (!existing) return undefined;
  if (existing.stripePaymentIntentId && existing.stripePaymentIntentId !== paymentIntentId) {
    throw new Error("PaymentIntent does not match this order");
  }
  const alreadyPaid = existing.status === "paid" && existing.paymentStatus === "paid";

  await storage.ecommerce.updateOrder(orderId, {
    status: "paid",
    paymentStatus: "paid",
    stripePaymentIntentId: paymentIntentId,
  });
  if (!alreadyPaid) await storage.ecommerce.recordCouponRedemptionForOrder(orderId);
  await storage.ecommerce.deductInventoryForPaidOrder(orderId);
  const details = await storage.ecommerce.getOrderWithDetails(orderId);
  if (details && !alreadyPaid) await sendEcommerceOrderConfirmation(details);
  return details;
}

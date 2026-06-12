import { z } from "zod";
import { storage } from "../storage/index";
import {
  buildCouponSnapshot,
  getShippingRateOptions,
  priceCart,
  priceCartSchema,
  toPublicPricedCart,
  type PricedCartLine,
} from "./ecommerce-pricing.service";
import { getEcommerceStripeClient } from "./ecommerce-stripe.service";
import {
  sendEcommerceOrderConfirmation,
  sendEcommerceOrderStatusEmail,
} from "./ecommerce-email.service";
import { getEcommerceCustomerAccountSettings } from "./ecommerce-customer-account.service";
import { assertEcommerceShippingDestinationAllowed } from "./ecommerce-store-settings.service";
import { logger } from "../utils/logger";
import { hashPassword } from "../middleware/auth";
import type { User } from "@shared/schema";

const MAX_CHECKOUT_TEXT_LENGTH = 160;
const MAX_CHECKOUT_ADDRESS_LENGTH = 240;
const MAX_CHECKOUT_URL_LENGTH = 2048;
const MAX_CHECKOUT_USER_AGENT_LENGTH = 512;

const addressSchema = z.object({
  name: z.string().trim().min(1).max(MAX_CHECKOUT_TEXT_LENGTH),
  company: z.string().trim().max(MAX_CHECKOUT_TEXT_LENGTH).optional(),
  address: z.string().trim().min(1).max(MAX_CHECKOUT_ADDRESS_LENGTH),
  line2: z.string().trim().max(MAX_CHECKOUT_ADDRESS_LENGTH).optional(),
  city: z.string().trim().min(1).max(MAX_CHECKOUT_TEXT_LENGTH),
  state: z.string().trim().max(MAX_CHECKOUT_TEXT_LENGTH).default(""),
  zip: z.string().trim().min(1).max(40),
  country: z.string().trim().length(2).default("US").transform((value) => value.toUpperCase()),
});

export const checkoutSchema = priceCartSchema.extend({
  customer: z.object({
    email: z.string().trim().email().max(254),
    name: z.string().trim().min(1).max(MAX_CHECKOUT_TEXT_LENGTH),
    phone: z.string().trim().max(40).optional(),
  }),
  shippingAddress: addressSchema,
  billingSameAsShipping: z.boolean().default(true),
  billingAddress: addressSchema.optional(),
  account: z.object({
    mode: z.enum(["guest", "create_account"]).default("guest"),
    password: z.string().min(8).max(128).optional(),
  }).optional(),
  metaTracking: z.object({
    marketingConsentGranted: z.boolean().optional(),
    fbp: z.string().trim().max(MAX_CHECKOUT_TEXT_LENGTH).optional(),
    fbc: z.string().trim().max(MAX_CHECKOUT_TEXT_LENGTH).optional(),
    eventSourceUrl: z.string().trim().url().max(MAX_CHECKOUT_URL_LENGTH).optional(),
    userAgent: z.string().trim().max(MAX_CHECKOUT_USER_AGENT_LENGTH).optional(),
  }).optional(),
});

export const manualOrderSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(z.object({
    productId: z.string().min(1),
    variantId: z.string().min(1).optional(),
    quantity: z.number().int().min(1).max(99),
    discountAmount: z.number().int().min(0).default(0),
  })).min(1),
  notes: z.string().optional(),
  fulfillmentMode: z.enum(["shipping", "pickup", "digital", "custom"]).default("shipping"),
  paymentAction: z.enum(["save_draft", "send_payment_link", "mark_paid"]).default("mark_paid"),
  manualPaymentMethod: z.enum(["cash", "external_card", "check", "other"]).optional(),
  manualPaymentReference: z.string().trim().max(200).optional(),
  customReason: z.string().trim().max(500).optional(),
});

export const manualPaymentSchema = z.object({
  method: z.enum(["cash", "external_card", "check", "other"]),
  reference: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const standalonePaymentRequestSchema = z.object({
  customerId: z.string().min(1).optional(),
  customer: z.object({
    email: z.string().trim().email().max(254),
    name: z.string().trim().min(1).max(MAX_CHECKOUT_TEXT_LENGTH),
  }).optional(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
  amount: z.number().int().min(50).max(99999999),
  reason: z.string().trim().min(3).max(500),
});

export const adminOrderUpdateSchema = z.object({
  status: z.enum(["pending", "paid", "shipped", "delivered", "cancelled"]).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const fulfillmentItemsSchema = z.array(z.object({
  orderItemId: z.string().min(1),
  quantity: z.number().int().min(1),
})).default([]);

const excludedFulfillmentStatuses = new Set(["cancelled", "canceled", "failed"]);

const shippablePaymentStatuses = new Set(["paid", "partially_refunded"]);
const fulfillmentCompleteStatuses = new Set(["shipped", "delivered"]);

function httpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode });
}

function splitCustomerName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] || "Customer", lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) ?? "" };
}

function assertAdminOrderStatusTransition(
  previous: { status: string; paymentStatus: string },
  nextStatus?: string,
) {
  if (!nextStatus || nextStatus === previous.status) return;
  if (previous.status === "cancelled") {
    throw httpError("Cancelled orders cannot be reactivated", 400);
  }
  if (previous.status === "delivered") {
    throw httpError("Delivered orders cannot be moved back to another status", 400);
  }
  if (previous.status === "shipped" && (nextStatus === "pending" || nextStatus === "paid")) {
    throw httpError("Shipped orders cannot be moved back before fulfillment", 400);
  }
  if (nextStatus === "pending" && shippablePaymentStatuses.has(previous.paymentStatus)) {
    throw httpError("Paid orders cannot be moved back to pending", 400);
  }
  if (!fulfillmentCompleteStatuses.has(nextStatus)) return;
  if (!shippablePaymentStatuses.has(previous.paymentStatus)) {
    throw httpError("Only paid orders can be marked shipped or delivered", 400);
  }
}

function pricedLinesToOrderItems(lines: PricedCartLine[], manualDiscountsByLine = new Map<string, number>()) {
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
    lineTotal: Math.max(0, line.lineTotal - (manualDiscountsByLine.get(lineKey(line.productId, line.variantId)) ?? 0)),
  }));
}

function lineKey(productId: string, variantId?: string | null) {
  return `${productId}:${variantId ?? ""}`;
}

function appUrl(path = "") {
  const base = (process.env.APP_URL || "http://localhost:5000").replace(/\/$/, "");
  return `${base}${path}`;
}

function getManualDiscounts(data: z.infer<typeof manualOrderSchema>, lines: PricedCartLine[]) {
  const lineTotals = new Map(lines.map((line) => [lineKey(line.productId, line.variantId), line.lineTotal]));
  const discounts = new Map<string, number>();
  for (const item of data.items) {
    const key = lineKey(item.productId, item.variantId);
    const requestedDiscount = item.discountAmount ?? 0;
    if (requestedDiscount <= 0) continue;
    const lineTotal = lineTotals.get(key) ?? 0;
    if (requestedDiscount > lineTotal) {
      throw httpError("Manual discount cannot exceed the line total.", 400);
    }
    discounts.set(key, (discounts.get(key) ?? 0) + requestedDiscount);
  }
  return discounts;
}

async function createStripeCheckoutSessionForPaymentRequest(params: {
  paymentRequestId: string;
  orderId?: string | null;
  customerEmail: string;
  title: string;
  description?: string | null;
  amount: number;
}) {
  const stripe = await getEcommerceStripeClient();
  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: params.customerEmail,
    success_url: appUrl(`/order-success?orderId=${encodeURIComponent(params.orderId ?? "")}&paymentRequestId=${encodeURIComponent(params.paymentRequestId)}`),
    cancel_url: appUrl(params.orderId ? `/admin/ecommerce/orders` : `/admin/ecommerce/orders`),
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: params.amount,
        product_data: {
          name: params.title,
          description: params.description ?? undefined,
        },
      },
    }],
    metadata: {
      paymentRequestId: params.paymentRequestId,
      ...(params.orderId ? { orderId: params.orderId } : {}),
    },
    payment_intent_data: {
      metadata: {
        paymentRequestId: params.paymentRequestId,
        ...(params.orderId ? { orderId: params.orderId } : {}),
      },
    },
  }, {
    idempotencyKey: `ecommerce_payment_request_${params.paymentRequestId}`,
  });
}

export async function createEcommercePaymentIntent(
  input: unknown,
  requestMeta: { ip?: string | null; user?: User | null } = {},
) {
  const data = checkoutSchema.parse(input);
  const accountSettings = await getEcommerceCustomerAccountSettings();
  const requestedAccountMode = data.account?.mode ?? "guest";
  const checkoutEmail = data.customer.email.trim().toLowerCase();
  const authenticatedUser = requestMeta.user?.role === "client" ? requestMeta.user : null;
  let accountUser = authenticatedUser;
  let accountCreated = false;
  let accountNameParts: { firstName: string; lastName: string } | null = null;

  if (accountSettings.customerAccountMode === "guest_only" && requestedAccountMode === "create_account") {
    throw httpError("Customer accounts are disabled for this store.", 400);
  }
  if (accountSettings.customerAccountMode === "required" && !authenticatedUser && requestedAccountMode !== "create_account") {
    throw httpError("Create or sign in to an account before checkout.", 400);
  }
  if (authenticatedUser && authenticatedUser.email.trim().toLowerCase() !== checkoutEmail) {
    throw httpError("Use the email address attached to your signed-in account.", 400);
  }
  if (!authenticatedUser && requestedAccountMode === "create_account") {
    if (!data.account?.password) {
      throw httpError("Password is required to create an account.", 400);
    }
    const existingUser = await storage.users.getUserByEmail(checkoutEmail);
    if (existingUser) {
      throw httpError("An account already exists for this email. Sign in or reset your password to continue.", 409);
    }
    accountNameParts = splitCustomerName(data.customer.name);
  }

  const shippingAddress = {
    country: data.shippingAddress.country,
    state: data.shippingAddress.state,
  };
  await assertEcommerceShippingDestinationAllowed(shippingAddress);
  const priced = await priceCart({
    items: data.items,
    couponCode: data.couponCode,
    customerEmail: data.customer.email,
    shippingRateId: data.shippingRateId,
    shippingAddress,
  });
  if (!data.shippingRateId && priced.lines.some((line) => line.requiresShipping)) {
    const rates = await getShippingRateOptions({
      subtotalAmount: priced.subtotalAmount,
      address: shippingAddress,
    });
    if (rates.length > 0) throw httpError("Select a shipping method before checkout", 400);
  }
  if (priced.totalAmount <= 0) throw httpError("Order total must be greater than zero", 400);

  const stripe = await getEcommerceStripeClient();
  if (accountNameParts && data.account?.password) {
    accountUser = await storage.users.createUser({
      email: checkoutEmail,
      password: await hashPassword(data.account.password),
      firstName: accountNameParts.firstName,
      lastName: accountNameParts.lastName,
      role: "client",
    });
    accountCreated = true;
  }
  const customer = await storage.ecommerce.findOrCreateCustomer({
    userId: accountUser?.id,
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

  let intent;
  try {
    intent = await stripe.paymentIntents.create({
      amount: order.totalAmount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      receipt_email: customer.email,
      metadata: { orderId: order.id },
    }, {
      idempotencyKey: `ecommerce_order_${order.id}_payment_intent`,
    });
    if (!intent.client_secret) {
      throw new Error("Stripe did not return a client secret for this PaymentIntent");
    }
  } catch (err) {
    if (intent?.id && stripe) {
      try {
        await stripe.paymentIntents.cancel(intent.id);
      } catch (cancelErr) {
        logger.stripe.warn("Failed to cancel ecommerce PaymentIntent without a client secret", {
          orderId: order.id,
          paymentIntentId: intent.id,
          error: cancelErr instanceof Error ? cancelErr.message : String(cancelErr),
        });
      }
    }
    try {
      await storage.ecommerce.updateOrder(order.id, {
        status: "cancelled",
        paymentStatus: "failed",
        notes: `Checkout failed before PaymentIntent creation: ${err instanceof Error ? err.message : String(err)}`,
      });
    } catch (updateErr) {
      logger.stripe.warn("Failed to mark ecommerce checkout order failed after Stripe error", {
        orderId: order.id,
        error: updateErr instanceof Error ? updateErr.message : String(updateErr),
      });
    }
    throw err;
  }

  try {
    const linkedOrder = await storage.ecommerce.updateOrder(order.id, { stripePaymentIntentId: intent.id });
    if (!linkedOrder) throw new Error("Failed to attach Stripe PaymentIntent to ecommerce order");
  } catch (err) {
    try {
      await stripe.paymentIntents.cancel(intent.id);
    } catch (cancelErr) {
      logger.stripe.warn("Failed to cancel orphaned ecommerce PaymentIntent", {
        orderId: order.id,
        paymentIntentId: intent.id,
        error: cancelErr instanceof Error ? cancelErr.message : String(cancelErr),
      });
    }
    throw err;
  }

  return {
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    orderId: order.id,
    lookupToken: order.lookupToken,
    priced: toPublicPricedCart(priced),
    accountCreated,
    accountUser: accountCreated ? accountUser : null,
  };
}

export async function createManualEcommerceOrder(input: unknown) {
  const data = manualOrderSchema.parse(input);
  return createManualEcommerceOrderDraft({ ...data, paymentAction: "mark_paid" });
}

export async function createManualEcommerceOrderDraft(input: unknown, actor?: Pick<User, "id"> | null) {
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
  const manualDiscounts = getManualDiscounts(data, priced.lines);
  const manualDiscountAmount = Array.from(manualDiscounts.values()).reduce((sum, amount) => sum + amount, 0);
  const totalAmount = Math.max(0, priced.totalAmount - manualDiscountAmount);
  if (data.paymentAction !== "save_draft" && totalAmount <= 0) {
    throw httpError("Manual order total must be greater than zero before requesting payment.", 400);
  }
  const isPaid = data.paymentAction === "mark_paid";
  const isPaymentLink = data.paymentAction === "send_payment_link";
  const order = await storage.ecommerce.createOrder({
    customerId: customer.id,
    status: isPaid ? "paid" : "pending",
    paymentStatus: isPaid ? "paid" : isPaymentLink ? "pending_payment" : "unpaid",
    subtotalAmount: priced.subtotalAmount,
    totalAmount,
    taxAmount: priced.taxAmount,
    shippingAmount: 0,
    discountAmount: priced.discountAmount + manualDiscountAmount,
    couponCode: priced.coupon?.code,
    couponSnapshot: buildCouponSnapshot(priced.coupon),
    isManualOrder: true,
    fulfillmentMode: data.fulfillmentMode,
    manualPaymentMethod: isPaid ? data.manualPaymentMethod ?? "other" : isPaymentLink ? "payment_link" : null,
    manualPaymentReference: data.manualPaymentReference,
    manualPaymentMarkedBy: isPaid ? actor?.id ?? null : null,
    manualPaymentMarkedAt: isPaid ? new Date() : null,
    notes: data.notes,
    shippingName: customer.name,
    shippingAddress: customer.address,
    shippingLine2: customer.line2,
    shippingCity: customer.city,
    shippingState: customer.state,
    shippingZip: customer.zipCode,
    shippingCountry: customer.country,
    billingSameAsShipping: true,
  }, pricedLinesToOrderItems(priced.lines, manualDiscounts));

  if (isPaid) {
    await storage.ecommerce.recordCouponRedemptionForOrder(order.id);
    await storage.ecommerce.deductInventoryForPaidOrder(order.id);
  }

  let paymentLink: Awaited<ReturnType<typeof createPaymentLinkForOrder>> | null = null;
  if (isPaymentLink) {
    paymentLink = await createPaymentLinkForOrder(order.id, {
      reason: data.customReason || data.notes || "Manual order payment link",
      createdBy: actor?.id,
    });
  }

  const details = await storage.ecommerce.getOrderWithDetails(order.id);
  return { ...(details ?? order), paymentLink };
}

export async function createPaymentLinkForOrder(orderId: string, options: { reason?: string; createdBy?: string | null } = {}) {
  const order = await storage.ecommerce.getOrderWithDetails(orderId);
  if (!order) throw httpError("Order not found", 404);
  if (order.totalAmount <= 0) throw httpError("Order total must be greater than zero before requesting payment.", 400);
  if (order.paymentStatus === "paid") throw httpError("This order has already been paid.", 400);
  const reason = options.reason?.trim() || "Manual order payment link";
  const request = await storage.ecommerce.createPaymentRequest({
    orderId: order.id,
    customerId: order.customerId,
    customerEmail: order.customer?.email ?? "",
    customerName: order.customer?.name ?? order.shippingName,
    title: `Order #${order.id.slice(0, 8).toUpperCase()}`,
    description: order.items.map((item) => `${item.productName} x ${item.quantity}`).join(", "),
    amount: order.totalAmount,
    currency: "usd",
    status: "draft",
    reason,
    createdBy: options.createdBy ?? null,
  });
  const session = await createStripeCheckoutSessionForPaymentRequest({
    paymentRequestId: request.id,
    orderId: order.id,
    customerEmail: request.customerEmail,
    title: request.title,
    description: request.description,
    amount: request.amount,
  });
  await storage.ecommerce.updatePaymentRequest(request.id, {
    status: "open",
    stripeSessionId: session.id,
    paymentUrl: session.url ?? null,
    expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null,
  });
  await storage.ecommerce.updateOrder(order.id, {
    status: "pending",
    paymentStatus: "pending_payment",
    stripeSessionId: session.id,
    manualPaymentMethod: "payment_link",
  });
  return {
    paymentRequestId: request.id,
    paymentUrl: session.url,
    stripeSessionId: session.id,
  };
}

export async function markManualEcommerceOrderPaid(orderId: string, input: unknown, actor?: Pick<User, "id"> | null) {
  const data = manualPaymentSchema.parse(input);
  const order = await storage.ecommerce.updateOrder(orderId, {
    status: "paid",
    paymentStatus: "paid",
    manualPaymentMethod: data.method,
    manualPaymentReference: data.reference,
    manualPaymentMarkedBy: actor?.id ?? null,
    manualPaymentMarkedAt: new Date(),
    notes: data.notes || undefined,
  });
  if (!order) return undefined;
  if (data.notes?.trim()) {
    await storage.ecommerce.createOrderNote({ orderId, authorId: actor?.id ?? null, body: data.notes.trim() });
  }
  await storage.ecommerce.recordCouponRedemptionForOrder(orderId);
  await storage.ecommerce.deductInventoryForPaidOrder(orderId);
  return storage.ecommerce.getOrderWithDetails(orderId);
}

export async function createStandalonePaymentRequest(input: unknown, actor?: Pick<User, "id"> | null) {
  const data = standalonePaymentRequestSchema.parse(input);
  let customer = data.customerId ? await storage.ecommerce.getCustomer(data.customerId) : undefined;
  if (!customer && data.customer) {
    customer = await storage.ecommerce.findOrCreateCustomer({
      email: data.customer.email,
      name: data.customer.name,
    });
  }
  if (!customer && !data.customer) throw httpError("Choose an existing customer or enter a new customer.", 400);
  const customerEmail = customer?.email ?? data.customer!.email;
  const customerName = customer?.name ?? data.customer!.name;
  const request = await storage.ecommerce.createPaymentRequest({
    customerId: customer?.id ?? null,
    customerEmail,
    customerName,
    title: data.title,
    description: data.description,
    amount: data.amount,
    currency: "usd",
    status: "draft",
    reason: data.reason,
    createdBy: actor?.id ?? null,
  });
  const session = await createStripeCheckoutSessionForPaymentRequest({
    paymentRequestId: request.id,
    customerEmail,
    title: data.title,
    description: data.description,
    amount: data.amount,
  });
  const updated = await storage.ecommerce.updatePaymentRequest(request.id, {
    status: "open",
    stripeSessionId: session.id,
    paymentUrl: session.url ?? null,
    expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null,
  });
  return updated ?? request;
}

export async function reconcileEcommercePaymentRequestSession(sessionId: string, paymentIntentId?: string | null) {
  const request = await storage.ecommerce.markPaymentRequestPaidBySession(sessionId, paymentIntentId);
  if (!request) return undefined;
  if (request.orderId && paymentIntentId) {
    await markEcommerceOrderPaid(request.orderId, paymentIntentId);
  }
  return request;
}

export async function updateAdminEcommerceOrder(orderId: string, input: unknown, actor?: Pick<User, "id"> | null) {
  const data = adminOrderUpdateSchema.parse(input);
  const previous = await storage.ecommerce.getOrder(orderId);
  if (!previous) return undefined;
  assertAdminOrderStatusTransition(previous, data.status);

  const noteBody = data.notes?.trim();
  const updateData = {
    status: data.status,
    notes: noteBody || undefined,
    paymentStatus: data.status === "paid" ? "paid" as const : undefined,
  };
  const order = await storage.ecommerce.updateOrder(orderId, updateData);
  if (!order) return undefined;

  if (noteBody) {
    await storage.ecommerce.createOrderNote({
      orderId: order.id,
      authorId: actor?.id ?? null,
      body: noteBody,
    });
  }

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

export async function assertEcommerceOrderCanShip(orderId: string) {
  const order = await storage.ecommerce.getOrder(orderId);
  if (!order) throw httpError("Order not found", 404);
  if (!shippablePaymentStatuses.has(order.paymentStatus)) {
    throw httpError("Only paid orders can be shipped", 400);
  }
  if (order.status === "cancelled") {
    throw httpError("Cancelled orders cannot be shipped", 400);
  }
  if (order.status === "delivered") {
    throw httpError("Delivered orders cannot receive new shipments", 400);
  }
  return order;
}

export async function assertEcommerceFulfillmentRequest(
  orderId: string,
  input: unknown,
) {
  const items = fulfillmentItemsSchema.parse(input);
  await assertEcommerceOrderCanShip(orderId);
  if (items.length === 0) return items;

  const details = await storage.ecommerce.getOrderWithDetails(orderId);
  if (!details) throw httpError("Order not found", 404);

  const orderItemsById = new Map(details.items.map((item) => [item.id, item]));
  const requestedByOrderItemId = new Map<string, number>();
  for (const item of items) {
    const orderItem = orderItemsById.get(item.orderItemId);
    if (!orderItem) {
      throw httpError("Fulfillment item does not belong to this order", 400);
    }
    requestedByOrderItemId.set(
      item.orderItemId,
      (requestedByOrderItemId.get(item.orderItemId) ?? 0) + item.quantity,
    );
  }

  const fulfillments = await storage.ecommerce.getFulfillmentsForOrder(orderId);
  const fulfilledByOrderItemId = new Map<string, number>();
  for (const fulfillment of fulfillments) {
    if (excludedFulfillmentStatuses.has(fulfillment.status)) continue;
    for (const item of fulfillment.items) {
      fulfilledByOrderItemId.set(
        item.orderItemId,
        (fulfilledByOrderItemId.get(item.orderItemId) ?? 0) + item.quantity,
      );
    }
  }

  for (const [orderItemId, requestedQuantity] of requestedByOrderItemId) {
    const orderItem = orderItemsById.get(orderItemId);
    if (!orderItem) continue;
    const alreadyFulfilled = fulfilledByOrderItemId.get(orderItemId) ?? 0;
    if (requestedQuantity + alreadyFulfilled > orderItem.quantity) {
      throw httpError("Fulfillment quantity cannot exceed the remaining ordered quantity", 400);
    }
  }

  return items;
}

export async function markEcommerceOrderPaid(orderId: string, paymentIntentId: string) {
  const existing = await storage.ecommerce.getOrder(orderId);
  if (!existing) return undefined;
  if (existing.stripePaymentIntentId && existing.stripePaymentIntentId !== paymentIntentId) {
    throw new Error("PaymentIntent does not match this order");
  }
  const wasAlreadyPaid = existing.status === "paid" && existing.paymentStatus === "paid";
  const transitioned = wasAlreadyPaid
    ? undefined
    : await storage.ecommerce.markOrderPaidIfUnpaid(orderId, paymentIntentId);
  if (!wasAlreadyPaid && !transitioned) {
    const current = await storage.ecommerce.getOrder(orderId);
    if (current?.stripePaymentIntentId && current.stripePaymentIntentId !== paymentIntentId) {
      throw new Error("PaymentIntent does not match this order");
    }
  }
  const shouldSendPaidEffects = Boolean(transitioned);

  if (shouldSendPaidEffects) await storage.ecommerce.recordCouponRedemptionForOrder(orderId);
  await storage.ecommerce.deductInventoryForPaidOrder(orderId);
  const details = await storage.ecommerce.getOrderWithDetails(orderId);
  if (details && shouldSendPaidEffects) await sendEcommerceOrderConfirmation(details);
  return details;
}

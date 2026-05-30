import { storage } from "../storage/index";
import { getEcommerceStripeClient } from "./ecommerce-stripe.service";
import { sendEcommerceRefundEmail } from "./ecommerce-email.service";

type RefundStatus = "pending" | "processed" | "failed";

const refundablePaymentStatuses = new Set(["paid", "partially_refunded", "refund_pending", "refund_failed"]);

function refundError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

export function computeRefundedAmount(refunds: Array<{ amount: number; status: string }>): number {
  return refunds
    .filter((refund) => refund.status === "processed" || refund.status === "pending")
    .reduce((sum, refund) => sum + refund.amount, 0);
}

function computeProcessedRefundedAmount(refunds: Array<{ amount: number; status: string }>): number {
  return refunds
    .filter((refund) => refund.status === "processed")
    .reduce((sum, refund) => sum + refund.amount, 0);
}

function deriveRefundPaymentStatus(
  order: { totalAmount: number; paymentStatus?: string | null },
  refunds: Array<{ amount: number; status: string }>,
) {
  const processed = computeProcessedRefundedAmount(refunds);
  const hasPending = refunds.some((refund) => refund.status === "pending");
  const hasFailed = refunds.some((refund) => refund.status === "failed");

  if (hasPending) return "refund_pending";
  if (processed >= order.totalAmount) return "refunded";
  if (processed > 0) return "partially_refunded";
  if (hasFailed) return "refund_failed";
  return order.paymentStatus ?? "paid";
}

export function mapStripeRefundStatus(status: string | null | undefined): RefundStatus {
  if (status === "succeeded") return "processed";
  if (status === "failed" || status === "canceled") return "failed";
  return "pending";
}

export function assertEcommerceOrderCanRefund(order: {
  status?: string | null;
  paymentStatus?: string | null;
  totalAmount: number;
}) {
  if (order.status === "cancelled") {
    throw refundError("Cancelled orders cannot be refunded from ecommerce", 400);
  }
  if (order.paymentStatus === "refunded") {
    throw refundError("Order has already been fully refunded", 400);
  }
  if (!refundablePaymentStatuses.has(order.paymentStatus ?? "")) {
    throw refundError("Order payment has not been captured and cannot be refunded", 400);
  }
  if (order.totalAmount <= 0) {
    throw refundError("Order does not have a refundable balance", 400);
  }
}

async function syncOrderRefundPaymentStatus(orderId: string) {
  const order = await storage.ecommerce.getOrderWithDetails(orderId);
  if (!order) return;
  await storage.ecommerce.updateOrder(order.id, {
    paymentStatus: deriveRefundPaymentStatus(order, order.refunds),
  });
}

export async function createEcommerceRefund(params: {
  orderId: string;
  amount: number;
  reason?: string;
  reasonCode?: string;
  type?: "full" | "partial";
  source?: "stripe" | "manual";
  processedBy?: string;
}) {
  const order = await storage.ecommerce.getOrderWithDetails(params.orderId);
  if (!order) throw new Error("Order not found");
  assertEcommerceOrderCanRefund(order);
  if (params.amount <= 0) throw new Error("Refund amount must be greater than zero");
  const refundable = order.totalAmount - computeRefundedAmount(order.refunds);
  if (params.amount > refundable) throw new Error("Refund amount exceeds refundable balance");

  let stripeRefundId: string | undefined;
  let status = "processed";
  const source = params.source ?? (order.stripePaymentIntentId ? "stripe" : "manual");

  if (source === "stripe") {
    if (!order.stripePaymentIntentId) throw new Error("Order does not have a Stripe payment intent");
    const stripe = await getEcommerceStripeClient();
    const refund = await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
      amount: params.amount,
      reason: params.reasonCode === "fraudulent" ? "fraudulent" : params.reasonCode === "duplicate" ? "duplicate" : "requested_by_customer",
      metadata: { orderId: order.id },
    });
    stripeRefundId = refund.id;
    status = refund.status === "succeeded" ? "processed" : "pending";
  }

  const refund = await storage.ecommerce.createRefund({
    orderId: order.id,
    amount: params.amount,
    reason: params.reason,
    reasonCode: params.reasonCode,
    type: params.type ?? (params.amount === order.totalAmount ? "full" : "partial"),
    source,
    stripeRefundId,
    status,
    processedBy: params.processedBy,
    processedAt: status === "processed" ? new Date() : undefined,
  });

  const refreshed = await storage.ecommerce.getOrderWithDetails(order.id);
  if (refreshed) {
    await storage.ecommerce.updateOrder(order.id, {
      paymentStatus: deriveRefundPaymentStatus(order, [...refreshed.refunds, refund]),
    });
    await sendEcommerceRefundEmail(refreshed, params.amount);
  }
  return refund;
}

export async function recordStripeRefundWebhook(params: {
  stripeRefundId: string;
  orderId?: string;
  amount?: number | null;
  status?: string | null;
}) {
  const status = mapStripeRefundStatus(params.status);
  const existing = await storage.ecommerce.getRefundByStripeRefundId(params.stripeRefundId);
  if (existing) {
    const refund = await storage.ecommerce.updateRefund(existing.id, {
      status,
      processedAt: status === "processed" ? new Date() : existing.processedAt ?? undefined,
    });
    await syncOrderRefundPaymentStatus(existing.orderId);
    return refund;
  }

  if (!params.orderId || !params.amount || params.amount <= 0) return undefined;
  const order = await storage.ecommerce.getOrderWithDetails(params.orderId);
  if (!order) return undefined;
  try {
    assertEcommerceOrderCanRefund(order);
  } catch {
    return undefined;
  }
  const refundable = order.totalAmount - computeRefundedAmount(order.refunds);
  if (params.amount > refundable) return undefined;

  const refund = await storage.ecommerce.createRefund({
    orderId: order.id,
    amount: params.amount,
    type: params.amount >= order.totalAmount ? "full" : "partial",
    source: "stripe",
    stripeRefundId: params.stripeRefundId,
    status,
    processedAt: status === "processed" ? new Date() : undefined,
  });
  await syncOrderRefundPaymentStatus(order.id);
  return refund;
}

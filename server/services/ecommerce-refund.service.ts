import { storage } from "../storage/index";
import { getEcommerceStripeClient } from "./ecommerce-stripe.service";
import { sendEcommerceRefundEmail } from "./ecommerce-email.service";

export function computeRefundedAmount(refunds: Array<{ amount: number; status: string }>): number {
  return refunds
    .filter((refund) => refund.status === "processed" || refund.status === "pending")
    .reduce((sum, refund) => sum + refund.amount, 0);
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
    const refunded = computeRefundedAmount([...refreshed.refunds, refund]);
    await storage.ecommerce.updateOrder(order.id, {
      paymentStatus: refunded >= order.totalAmount ? "refunded" : "partially_refunded",
    });
    await sendEcommerceRefundEmail(refreshed, params.amount);
  }
  return refund;
}

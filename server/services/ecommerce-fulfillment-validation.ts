import type { EcommerceOrder } from "@shared/schema";
export function fulfillmentError(message: string, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}
export function assertOrderShippable(order: EcommerceOrder | undefined) {
  if (!order) throw fulfillmentError("Order not found", 404);
  if (!["paid", "partially_refunded"].includes(order.paymentStatus))
    throw fulfillmentError("Only paid orders can be shipped");
  if (
    ["pending", "rejected"].includes(order.fraudReviewStatus) ||
    ["manual_review", "block"].includes(order.fraudDecision)
  )
    throw fulfillmentError("Review and approve the order risk before fulfillment");
  if (order.status === "cancelled") throw fulfillmentError("Cancelled orders cannot be shipped");
  if (order.status === "delivered")
    throw fulfillmentError("Delivered orders cannot receive new shipments");
  return order;
}
export function assertRemainingFulfillmentQuantities(
  requested: Array<{ orderItemId: string; quantity: number }>,
  ordered: Array<{ id: string; quantity: number }>,
  fulfilled: Array<{ orderItemId: string; quantity: number; status: string }>,
) {
  const remaining = new Map(ordered.map((item) => [item.id, item.quantity]));
  for (const item of fulfilled)
    if (!["failed", "cancelled", "canceled"].includes(item.status))
      remaining.set(item.orderItemId, (remaining.get(item.orderItemId) ?? 0) - item.quantity);
  for (const item of requested) {
    if (!remaining.has(item.orderItemId))
      throw fulfillmentError("Fulfillment item does not belong to this order");
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1)
      throw fulfillmentError("Invalid fulfillment quantity");
    const quantity = remaining.get(item.orderItemId)! - item.quantity;
    if (quantity < 0)
      throw fulfillmentError("Fulfillment quantity cannot exceed the remaining ordered quantity");
    remaining.set(item.orderItemId, quantity);
  }
  return remaining;
}

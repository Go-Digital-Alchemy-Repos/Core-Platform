import { describe, expect, it } from "vitest";
import { getEcommerceOrderStatusBadge, getEcommercePaymentStatusBadge } from "./order-status-labels";

describe("ecommerce order status labels", () => {
  it("formats refund payment statuses for customer and admin screens", () => {
    expect(getEcommercePaymentStatusBadge("refund_pending")).toMatchObject({
      label: "Refund pending",
      variant: "outline",
    });
    expect(getEcommercePaymentStatusBadge("partially_refunded")).toMatchObject({
      label: "Partially refunded",
      variant: "outline",
    });
    expect(getEcommercePaymentStatusBadge("refund_failed")).toMatchObject({
      label: "Refund failed",
      variant: "outline",
    });
  });

  it("humanizes unknown order statuses instead of rendering raw tokens", () => {
    expect(getEcommerceOrderStatusBadge("ready_for_pickup")).toMatchObject({
      label: "Ready For Pickup",
      variant: "outline",
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EcommerceOrder } from "@shared/schema";

const mockGetOrder = vi.fn();
const mockHasProcessedWebhook = vi.fn();
const mockMarkWebhookProcessed = vi.fn();
const mockMarkEcommerceOrderPaid = vi.fn();
const mockRecordStripeRefundWebhook = vi.fn();
const mockGetEcommerceStripeWebhookSecret = vi.fn();

vi.mock("../storage/index", () => ({
  storage: {
    ecommerce: {
      getOrder: mockGetOrder,
      hasProcessedWebhook: mockHasProcessedWebhook,
      markWebhookProcessed: mockMarkWebhookProcessed,
    },
  },
}));

vi.mock("../services/ecommerce-stripe.service", () => ({
  getEcommerceStripeClient: vi.fn(async () => ({
    webhooks: {
      constructEvent: vi.fn(),
    },
  })),
  getEcommerceStripeWebhookSecret: mockGetEcommerceStripeWebhookSecret,
}));

vi.mock("../services/ecommerce-order.service", () => ({
  markEcommerceOrderPaid: mockMarkEcommerceOrderPaid,
}));

vi.mock("../services/ecommerce-refund.service", () => ({
  recordStripeRefundWebhook: mockRecordStripeRefundWebhook,
}));

function eventPayload(type: string, object: Record<string, unknown>) {
  return Buffer.from(JSON.stringify({
    id: `evt_${type.replace(/\W/g, "_")}`,
    type,
    data: { object },
  }));
}

describe("processEcommerceStripeWebhook", () => {
  beforeEach(() => {
    mockGetOrder.mockReset();
    mockHasProcessedWebhook.mockReset();
    mockMarkWebhookProcessed.mockReset();
    mockMarkEcommerceOrderPaid.mockReset();
    mockRecordStripeRefundWebhook.mockReset();
    mockGetEcommerceStripeWebhookSecret.mockReset();
    mockGetEcommerceStripeWebhookSecret.mockResolvedValue(null);
    mockHasProcessedWebhook.mockResolvedValue(false);
    mockMarkWebhookProcessed.mockResolvedValue(true);
  });

  it("marks payment webhooks processed only after paid-order reconciliation succeeds", async () => {
    const { processEcommerceStripeWebhook } = await import("../webhooks/ecommerce-stripe.handler");
    mockGetOrder.mockResolvedValue({
      id: "order-1",
      totalAmount: 5000,
      stripePaymentIntentId: "pi_123",
    } as EcommerceOrder);
    mockMarkEcommerceOrderPaid.mockResolvedValue({ id: "order-1" });

    await processEcommerceStripeWebhook(eventPayload("payment_intent.succeeded", {
      id: "pi_123",
      amount: 5000,
      metadata: { orderId: "order-1" },
    }));

    expect(mockMarkEcommerceOrderPaid).toHaveBeenCalledWith("order-1", "pi_123");
    expect(mockMarkWebhookProcessed).toHaveBeenCalledWith("stripe", "evt_payment_intent_succeeded", "payment_intent.succeeded");
    expect(mockMarkEcommerceOrderPaid.mock.invocationCallOrder[0]).toBeLessThan(
      mockMarkWebhookProcessed.mock.invocationCallOrder[0],
    );
  });

  it("skips duplicate payment webhooks before paid-order side effects", async () => {
    const { processEcommerceStripeWebhook } = await import("../webhooks/ecommerce-stripe.handler");
    mockHasProcessedWebhook.mockResolvedValue(true);

    await processEcommerceStripeWebhook(eventPayload("payment_intent.succeeded", {
      id: "pi_123",
      amount: 5000,
      metadata: { orderId: "order-1" },
    }));

    expect(mockHasProcessedWebhook).toHaveBeenCalledWith("stripe", "evt_payment_intent_succeeded");
    expect(mockGetOrder).not.toHaveBeenCalled();
    expect(mockMarkEcommerceOrderPaid).not.toHaveBeenCalled();
    expect(mockMarkWebhookProcessed).not.toHaveBeenCalled();
  });

  it("does not mark payment webhooks processed when reconciliation fails", async () => {
    const { processEcommerceStripeWebhook } = await import("../webhooks/ecommerce-stripe.handler");
    mockGetOrder.mockResolvedValue({
      id: "order-1",
      totalAmount: 5000,
      stripePaymentIntentId: "pi_123",
    } as EcommerceOrder);
    mockMarkEcommerceOrderPaid.mockRejectedValue(new Error("temporary inventory lock"));

    await expect(processEcommerceStripeWebhook(eventPayload("payment_intent.succeeded", {
      id: "pi_123",
      amount: 5000,
      metadata: { orderId: "order-1" },
    }))).rejects.toThrow(/temporary inventory lock/);

    expect(mockMarkWebhookProcessed).not.toHaveBeenCalled();
  });

  it("marks refund webhooks processed only after refund reconciliation succeeds", async () => {
    const { processEcommerceStripeWebhook } = await import("../webhooks/ecommerce-stripe.handler");
    mockRecordStripeRefundWebhook.mockResolvedValue({ id: "refund-1" });

    await processEcommerceStripeWebhook(eventPayload("refund.updated", {
      id: "re_123",
      amount: 2500,
      status: "succeeded",
      metadata: { orderId: "order-1" },
    }));

    expect(mockRecordStripeRefundWebhook).toHaveBeenCalledWith({
      stripeRefundId: "re_123",
      orderId: "order-1",
      amount: 2500,
      status: "succeeded",
    });
    expect(mockMarkWebhookProcessed).toHaveBeenCalledWith("stripe", "evt_refund_updated", "refund.updated");
    expect(mockRecordStripeRefundWebhook.mock.invocationCallOrder[0]).toBeLessThan(
      mockMarkWebhookProcessed.mock.invocationCallOrder[0],
    );
  });

  it("skips duplicate refund webhooks before refund side effects", async () => {
    const { processEcommerceStripeWebhook } = await import("../webhooks/ecommerce-stripe.handler");
    mockHasProcessedWebhook.mockResolvedValue(true);

    await processEcommerceStripeWebhook(eventPayload("refund.updated", {
      id: "re_123",
      amount: 2500,
      status: "succeeded",
      metadata: { orderId: "order-1" },
    }));

    expect(mockHasProcessedWebhook).toHaveBeenCalledWith("stripe", "evt_refund_updated");
    expect(mockRecordStripeRefundWebhook).not.toHaveBeenCalled();
    expect(mockMarkWebhookProcessed).not.toHaveBeenCalled();
  });
});

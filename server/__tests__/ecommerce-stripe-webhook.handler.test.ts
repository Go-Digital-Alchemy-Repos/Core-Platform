import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EcommerceOrder } from "@shared/schema";

const mocks = vi.hoisted(() => ({
  getOrder: vi.fn(),
  claim: vi.fn(),
  complete: vi.fn(),
  fail: vi.fn(),
  markOrderPaid: vi.fn(),
  reconcilePaymentRequest: vi.fn(),
  recordRisk: vi.fn(),
  recordRefund: vi.fn(),
  getWebhookSecret: vi.fn(),
}));

vi.mock("../storage/index", () => ({
  storage: {
    ecommerce: {
      getOrder: mocks.getOrder,
      claimWebhookProcessing: mocks.claim,
      completeWebhookProcessing: mocks.complete,
      failWebhookProcessing: mocks.fail,
    },
  },
}));

vi.mock("../services/ecommerce-stripe.service", () => ({
  getEcommerceStripeClient: vi.fn(async () => ({
    webhooks: { constructEvent: vi.fn() },
  })),
  getEcommerceStripeWebhookSecret: mocks.getWebhookSecret,
}));

vi.mock("../services/ecommerce-order.service", () => ({
  markEcommerceOrderPaid: mocks.markOrderPaid,
  reconcileEcommercePaymentRequestSession: mocks.reconcilePaymentRequest,
  recordEcommerceStripeRiskOutcome: mocks.recordRisk,
}));

vi.mock("../services/ecommerce-refund.service", () => ({
  recordStripeRefundWebhook: mocks.recordRefund,
}));

function eventPayload(type: string, object: Record<string, unknown>) {
  return Buffer.from(
    JSON.stringify({
      id: `evt_${type.replace(/\W/g, "_")}`,
      type,
      data: { object },
    }),
  );
}

describe("processEcommerceStripeWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getWebhookSecret.mockResolvedValue(null);
    mocks.claim.mockResolvedValue("attempt-token-1");
    mocks.complete.mockResolvedValue(undefined);
    mocks.fail.mockResolvedValue(undefined);
  });

  it("claims and completes a payment webhook around paid-order reconciliation", async () => {
    const { processEcommerceStripeWebhook } = await import("../webhooks/ecommerce-stripe.handler");
    mocks.getOrder.mockResolvedValue({
      id: "order-1",
      totalAmount: 5000,
      stripePaymentIntentId: "pi_123",
    } as EcommerceOrder);
    mocks.markOrderPaid.mockResolvedValue({ id: "order-1" });

    await processEcommerceStripeWebhook(
      eventPayload("payment_intent.succeeded", {
        id: "pi_123",
        amount: 5000,
        metadata: { orderId: "order-1" },
      }),
    );

    expect(mocks.claim).toHaveBeenCalledWith(
      "stripe",
      "evt_payment_intent_succeeded",
      "payment_intent.succeeded",
    );
    expect(mocks.markOrderPaid).toHaveBeenCalledWith("order-1", "pi_123");
    expect(mocks.complete).toHaveBeenCalledWith(
      "stripe",
      "evt_payment_intent_succeeded",
      "attempt-token-1",
    );
  });

  it("skips side effects when another worker owns or completed the event", async () => {
    mocks.claim.mockResolvedValue(null);
    const { processEcommerceStripeWebhook } = await import("../webhooks/ecommerce-stripe.handler");

    await processEcommerceStripeWebhook(
      eventPayload("payment_intent.succeeded", {
        id: "pi_123",
        amount: 5000,
        metadata: { orderId: "order-1" },
      }),
    );

    expect(mocks.getOrder).not.toHaveBeenCalled();
    expect(mocks.markOrderPaid).not.toHaveBeenCalled();
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.fail).not.toHaveBeenCalled();
  });

  it("records a failed payment attempt and rethrows for provider retry", async () => {
    const { processEcommerceStripeWebhook } = await import("../webhooks/ecommerce-stripe.handler");
    mocks.getOrder.mockResolvedValue({
      id: "order-1",
      totalAmount: 5000,
      stripePaymentIntentId: "pi_123",
    } as EcommerceOrder);
    mocks.markOrderPaid.mockRejectedValue(new Error("temporary inventory lock"));

    await expect(
      processEcommerceStripeWebhook(
        eventPayload("payment_intent.succeeded", {
          id: "pi_123",
          amount: 5000,
          metadata: { orderId: "order-1" },
        }),
      ),
    ).rejects.toThrow("temporary inventory lock");

    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.fail).toHaveBeenCalledWith(
      "stripe",
      "evt_payment_intent_succeeded",
      "attempt-token-1",
      "temporary inventory lock",
    );
  });

  it("completes refund delivery only after refund reconciliation succeeds", async () => {
    const { processEcommerceStripeWebhook } = await import("../webhooks/ecommerce-stripe.handler");
    mocks.recordRefund.mockResolvedValue({ id: "refund-1" });

    await processEcommerceStripeWebhook(
      eventPayload("refund.updated", {
        id: "re_123",
        amount: 2500,
        status: "succeeded",
        metadata: { orderId: "order-1" },
      }),
    );

    expect(mocks.recordRefund).toHaveBeenCalledWith({
      stripeRefundId: "re_123",
      orderId: "order-1",
      amount: 2500,
      status: "succeeded",
    });
    expect(mocks.complete).toHaveBeenCalledWith("stripe", "evt_refund_updated", "attempt-token-1");
  });

  it("records refund reconciliation failures for retry", async () => {
    mocks.recordRefund.mockRejectedValue(new Error("temporary refund lock"));
    const { processEcommerceStripeWebhook } = await import("../webhooks/ecommerce-stripe.handler");

    await expect(
      processEcommerceStripeWebhook(
        eventPayload("refund.updated", {
          id: "re_123",
          amount: 2500,
          status: "succeeded",
          metadata: { orderId: "order-1" },
        }),
      ),
    ).rejects.toThrow("temporary refund lock");
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.fail).toHaveBeenCalledWith(
      "stripe",
      "evt_refund_updated",
      "attempt-token-1",
      "temporary refund lock",
    );
  });
});

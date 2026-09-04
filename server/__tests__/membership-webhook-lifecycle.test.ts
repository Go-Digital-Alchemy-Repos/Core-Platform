import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  complete: vi.fn(),
  fail: vi.fn(),
  getSubscription: vi.fn(),
  upsertStripeWebhookSubscriptionWithAudit: vi.fn(),
  updateStripeWebhookSubscriptionStatusWithAudit: vi.fn(),
  getClient: vi.fn(),
  getSecret: vi.fn(),
}));

vi.mock("../storage/index", () => ({
  storage: {
    membership: {
      claimWebhookProcessing: mocks.claim,
      completeWebhookProcessing: mocks.complete,
      failWebhookProcessing: mocks.fail,
      getSubscriptionByProviderSubscriptionId: mocks.getSubscription,
      upsertStripeWebhookSubscriptionWithAudit: mocks.upsertStripeWebhookSubscriptionWithAudit,
      updateStripeWebhookSubscriptionStatusWithAudit:
        mocks.updateStripeWebhookSubscriptionStatusWithAudit,
    },
  },
}));

vi.mock("../services/membership-stripe.service", () => ({
  getMembershipStripeClient: mocks.getClient,
  getMembershipStripeWebhookSecret: mocks.getSecret,
}));

vi.mock("../utils/logger", () => ({
  logger: { stripe: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } },
}));

function eventPayload(type: string, object: Record<string, unknown> = {}) {
  return Buffer.from(
    JSON.stringify({ id: "evt_membership_1", type, data: { object: { id: "obj_1", ...object } } }),
  );
}

describe("membership webhook delivery lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getClient.mockResolvedValue({ webhooks: { constructEvent: vi.fn() } });
    mocks.getSecret.mockResolvedValue("");
    mocks.claim.mockResolvedValue("attempt-token-1");
    mocks.complete.mockResolvedValue(undefined);
    mocks.fail.mockResolvedValue(undefined);
    mocks.upsertStripeWebhookSubscriptionWithAudit.mockResolvedValue({ id: "membership-1" });
    mocks.updateStripeWebhookSubscriptionStatusWithAudit.mockResolvedValue({ id: "membership-1" });
  });

  it("completes a claimed delivery after its handler succeeds", async () => {
    const { handleMembershipStripeWebhook } =
      await import("../services/membership-webhook.service");

    await expect(
      handleMembershipStripeWebhook(eventPayload("unhandled.event"), undefined),
    ).resolves.toEqual({ received: true });
    expect(mocks.claim).toHaveBeenCalledWith("stripe", "evt_membership_1", "unhandled.event");
    expect(mocks.complete).toHaveBeenCalledWith("stripe", "evt_membership_1", "attempt-token-1");
    expect(mocks.fail).not.toHaveBeenCalled();
  });

  it("skips a delivery when another worker already owns or completed it", async () => {
    mocks.claim.mockResolvedValue(null);
    const { handleMembershipStripeWebhook } =
      await import("../services/membership-webhook.service");

    await expect(
      handleMembershipStripeWebhook(eventPayload("unhandled.event"), undefined),
    ).resolves.toEqual({ received: true, duplicate: true });
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.fail).not.toHaveBeenCalled();
  });

  it("uses one atomic storage operation for a completed Stripe checkout and its audit event", async () => {
    const { handleMembershipStripeWebhook } =
      await import("../services/membership-webhook.service");

    await handleMembershipStripeWebhook(
      eventPayload("checkout.session.completed", {
        mode: "subscription",
        customer: "cus_1",
        subscription: "sub_1",
        metadata: { userId: "user_1", planId: "plan_1", priceId: "price_1" },
      }),
      undefined,
    );

    expect(mocks.upsertStripeWebhookSubscriptionWithAudit).toHaveBeenCalledWith({
      userId: "user_1",
      data: expect.objectContaining({
        status: "active",
        providerSubscriptionId: "sub_1",
        providerCheckoutSessionId: "obj_1",
      }),
      action: "stripe_checkout_completed",
      metadata: { sessionId: "obj_1" },
    });
    expect(mocks.complete).toHaveBeenCalledWith("stripe", "evt_membership_1", "attempt-token-1");
  });

  it("uses one atomic storage operation for an invoice status and its audit event", async () => {
    const { handleMembershipStripeWebhook } =
      await import("../services/membership-webhook.service");

    await handleMembershipStripeWebhook(
      eventPayload("invoice.payment_succeeded", { subscription: "sub_1" }),
      undefined,
    );

    expect(mocks.updateStripeWebhookSubscriptionStatusWithAudit).toHaveBeenCalledWith({
      providerSubscriptionId: "sub_1",
      status: "active",
      lastPaymentFailedAt: null,
      action: "stripe_invoice_paid",
      metadata: { invoiceId: "obj_1" },
    });
  });

  it("records a failed delivery and rethrows so Stripe can retry it", async () => {
    mocks.updateStripeWebhookSubscriptionStatusWithAudit.mockRejectedValue(
      new Error("temporary database failure"),
    );
    const { handleMembershipStripeWebhook } =
      await import("../services/membership-webhook.service");

    await expect(
      handleMembershipStripeWebhook(
        eventPayload("invoice.payment_succeeded", { subscription: "sub_1" }),
        undefined,
      ),
    ).rejects.toThrow("temporary database failure");
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.fail).toHaveBeenCalledWith(
      "stripe",
      "evt_membership_1",
      "attempt-token-1",
      "temporary database failure",
    );
  });
});

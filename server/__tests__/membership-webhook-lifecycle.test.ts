import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  complete: vi.fn(),
  fail: vi.fn(),
  getSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  createAuditEvent: vi.fn(),
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
      updateSubscription: mocks.updateSubscription,
      createAuditEvent: mocks.createAuditEvent,
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

  it("records a failed delivery and rethrows so Stripe can retry it", async () => {
    mocks.getSubscription.mockRejectedValue(new Error("temporary database failure"));
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

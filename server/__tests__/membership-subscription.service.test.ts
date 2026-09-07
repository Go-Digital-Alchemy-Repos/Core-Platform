import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upsertWithAudit: vi.fn(),
  updateWithAudit: vi.fn(),
  getPlan: vi.fn(),
  getPrice: vi.fn(),
}));

vi.mock("../storage/index", () => ({
  storage: {
    membership: {
      upsertSubscriptionForUserWithAudit: mocks.upsertWithAudit,
      updateSubscriptionWithAudit: mocks.updateWithAudit,
      getPlan: mocks.getPlan,
      getPrice: mocks.getPrice,
    },
  },
}));

describe("membership subscription service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upsertWithAudit.mockResolvedValue({ id: "membership-1" });
    mocks.updateWithAudit.mockResolvedValue({ id: "membership-1", userId: "user-1" });
    mocks.getPlan.mockResolvedValue({ id: "plan-1", status: "active", isFree: true });
    mocks.getPrice.mockResolvedValue({ id: "price-1", planId: "plan-1", active: true, amount: 0 });
  });

  it("writes manual membership assignment and audit evidence atomically", async () => {
    const { assignManualMembership } = await import("../services/membership-subscription.service");

    await assignManualMembership("admin-1", { userId: "user-1", status: "active" });

    expect(mocks.upsertWithAudit).toHaveBeenCalledWith({
      userId: "user-1",
      data: expect.objectContaining({ source: "manual", status: "active" }),
      audit: {
        actorUserId: "admin-1",
        action: "membership_assigned",
        note: null,
        metadata: { planId: null, status: "active" },
      },
    });
  });

  it("writes a membership status transition and its audit evidence atomically", async () => {
    const { updateMembershipSubscriptionStatus } =
      await import("../services/membership-subscription.service");

    await updateMembershipSubscriptionStatus("admin-1", "membership-1", "canceled", "requested");

    expect(mocks.updateWithAudit).toHaveBeenCalledWith({
      subscriptionId: "membership-1",
      data: expect.objectContaining({ status: "canceled", canceledAt: expect.any(Date) }),
      audit: {
        actorUserId: "admin-1",
        action: "membership_canceled",
        note: "requested",
        metadata: { status: "canceled" },
      },
    });
  });

  it("writes a free membership activation and its audit evidence atomically", async () => {
    const { createMembershipCheckoutSession } =
      await import("../services/membership-stripe.service");

    await createMembershipCheckoutSession({
      userId: "user-1",
      userEmail: "member@example.test",
      planId: "plan-1",
      priceId: "price-1",
      successUrl: "http://localhost:5001/membership/success",
      cancelUrl: "http://localhost:5001/membership/cancel",
    });

    expect(mocks.upsertWithAudit).toHaveBeenCalledWith({
      userId: "user-1",
      data: expect.objectContaining({
        planId: "plan-1",
        priceId: "price-1",
        status: "active",
        source: "free",
      }),
      audit: {
        action: "free_membership_started",
        metadata: { planId: "plan-1", priceId: "price-1" },
      },
    });
  });
});

import { describe, expect, it, vi } from "vitest";
import type { MembershipSubscription } from "@shared/schema";

vi.mock("../storage/index", () => ({
  storage: {
    membership: {
      getActiveSubscriptionForUser: vi.fn(),
      getPlanEntitlements: vi.fn(),
      getAccessRule: vi.fn(),
    },
  },
}));

import { isSubscriptionCurrentlyActive } from "./membership-access.service";

function subscription(overrides: Partial<MembershipSubscription>): MembershipSubscription {
  return {
    id: "sub-1",
    userId: "user-1",
    planId: "plan-1",
    priceId: "price-1",
    status: "active",
    source: "manual",
    provider: null,
    providerCustomerId: null,
    providerSubscriptionId: null,
    providerCheckoutSessionId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    trialEndsAt: null,
    canceledAt: null,
    suspendedAt: null,
    expiresAt: null,
    lastPaymentFailedAt: null,
    adminNotes: null,
    metadata: {},
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

describe("isSubscriptionCurrentlyActive", () => {
  const now = new Date("2026-06-13T12:00:00.000Z");

  it("allows active, trialing, manual, and past-due memberships within their period", () => {
    for (const status of ["active", "trialing", "manual", "past_due"]) {
      expect(
        isSubscriptionCurrentlyActive(
          subscription({
            status,
            currentPeriodEnd: new Date("2026-06-20T12:00:00.000Z"),
          }),
          now,
        ),
      ).toBe(true);
    }
  });

  it("rejects canceled, expired, suspended, and incomplete memberships", () => {
    for (const status of ["canceled", "expired", "suspended", "incomplete"]) {
      expect(isSubscriptionCurrentlyActive(subscription({ status }), now)).toBe(false);
    }
  });

  it("rejects suspended or expired memberships even when status is active", () => {
    expect(
      isSubscriptionCurrentlyActive(
        subscription({
          status: "active",
          suspendedAt: new Date("2026-06-12T12:00:00.000Z"),
        }),
        now,
      ),
    ).toBe(false);
    expect(
      isSubscriptionCurrentlyActive(
        subscription({
          status: "active",
          expiresAt: new Date("2026-06-12T12:00:00.000Z"),
        }),
        now,
      ),
    ).toBe(false);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetDecryptedCategory = vi.fn();
const mockGetActiveFraudBlocks = vi.fn();
const mockCountFraudEventsByIdentity = vi.fn();
const mockFindRecentDuplicateFraudEvent = vi.fn();
const mockCreateFraudEvent = vi.fn();
const mockUpsertSetting = vi.fn();
const mockInvalidateCategory = vi.fn();

vi.mock("../storage/index", () => ({
  storage: {
    settings: {
      getDecryptedCategory: mockGetDecryptedCategory,
      upsertSetting: mockUpsertSetting,
      invalidateCategory: mockInvalidateCategory,
    },
    ecommerce: {
      getActiveFraudBlocks: mockGetActiveFraudBlocks,
      countFraudEventsByIdentity: mockCountFraudEventsByIdentity,
      findRecentDuplicateFraudEvent: mockFindRecentDuplicateFraudEvent,
      createFraudEvent: mockCreateFraudEvent,
    },
  },
}));

describe("ecommerce fraud service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDecryptedCategory.mockResolvedValue({});
    mockGetActiveFraudBlocks.mockResolvedValue([]);
    mockCountFraudEventsByIdentity.mockResolvedValue({ ipAttempts: 0, emailAttempts: 0 });
    mockFindRecentDuplicateFraudEvent.mockResolvedValue(undefined);
    mockCreateFraudEvent.mockImplementation(async (event) => ({
      id: "fraud-event-1",
      createdAt: new Date(),
      ...event,
    }));
  });

  it("defaults billing and shipping mismatches to manual review", async () => {
    const { evaluateEcommerceFraud } = await import("../services/ecommerce-fraud.service");
    const result = await evaluateEcommerceFraud({
      email: "buyer@example.com",
      amount: 5000,
      quantity: 1,
      ip: "203.0.113.10",
      billingSameAsShipping: false,
      shippingAddress: {
        address: "1 Home St",
        city: "Detroit",
        state: "MI",
        zip: "48201",
        country: "US",
      },
      billingAddress: {
        address: "2 Billing St",
        city: "Detroit",
        state: "MI",
        zip: "48201",
        country: "US",
      },
    });

    expect(result.decision).toBe("manual_review");
    expect(result.matchedRules.map((rule) => rule.code)).toContain("billing_shipping_mismatch");
  });

  it("blocks emails on an active fraud block before payment", async () => {
    const { evaluateEcommerceFraud } = await import("../services/ecommerce-fraud.service");
    mockGetActiveFraudBlocks.mockResolvedValue([
      {
        id: "block-1",
        type: "email",
        value: "blocked@example.com",
        reason: "Card testing",
        active: true,
        expiresAt: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await evaluateEcommerceFraud({
      email: "blocked@example.com",
      amount: 5000,
      quantity: 1,
      shippingAddress: {
        address: "1 Home St",
        city: "Detroit",
        state: "MI",
        zip: "48201",
        country: "US",
      },
      billingSameAsShipping: true,
    });

    expect(result.decision).toBe("block");
    expect(result.score).toBe(100);
  });

  it("blocks rapid checkout attempts by IP velocity", async () => {
    const { evaluateEcommerceFraud } = await import("../services/ecommerce-fraud.service");
    mockCountFraudEventsByIdentity.mockResolvedValue({ ipAttempts: 8, emailAttempts: 0 });

    const result = await evaluateEcommerceFraud({
      email: "buyer@example.com",
      amount: 5000,
      quantity: 1,
      ip: "203.0.113.10",
      shippingAddress: {
        address: "1 Home St",
        city: "Detroit",
        state: "MI",
        zip: "48201",
        country: "US",
      },
      billingSameAsShipping: true,
    });

    expect(result.decision).toBe("block");
    expect(result.matchedRules.map((rule) => rule.code)).toContain("velocity_ip");
  });
});

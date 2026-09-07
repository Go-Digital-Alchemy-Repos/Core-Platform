import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getExpired: vi.fn(),
  getOrder: vi.fn(),
  updateOrder: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("../storage", () => ({
  storage: {
    ecommerce: {
      getExpiredEcommerceInventoryReservationOrderIds: mocks.getExpired,
      getOrder: mocks.getOrder,
      updateOrder: mocks.updateOrder,
    },
  },
}));

vi.mock("./ecommerce-stripe.service", () => ({
  getEcommerceStripeClient: vi.fn(async () => ({
    paymentIntents: { cancel: mocks.cancel },
  })),
}));

vi.mock("../utils/logger", () => ({
  logger: {
    app: { error: vi.fn(), info: vi.fn() },
    stripe: { warn: vi.fn() },
  },
}));

describe("ecommerce inventory reservations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getExpired.mockResolvedValue([]);
    mocks.updateOrder.mockResolvedValue(undefined);
  });

  it("cancels the expired PaymentIntent before releasing its inventory reservation", async () => {
    mocks.getExpired.mockResolvedValue(["order-1"]);
    mocks.getOrder.mockResolvedValue({
      id: "order-1",
      status: "pending",
      paymentStatus: "unpaid",
      stripePaymentIntentId: "pi_123",
    });
    mocks.cancel.mockResolvedValue({ id: "pi_123", status: "canceled" });
    const { expireEcommerceInventoryReservations } =
      await import("./ecommerce-inventory-reservations.service");

    await expect(
      expireEcommerceInventoryReservations(new Date("2026-09-04T00:00:00.000Z")),
    ).resolves.toEqual({ cancelled: 1, pending: 0 });
    expect(mocks.cancel).toHaveBeenCalledWith("pi_123");
    expect(mocks.updateOrder).toHaveBeenCalledWith("order-1", {
      status: "cancelled",
      paymentStatus: "failed",
    });
    expect(mocks.cancel.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.updateOrder.mock.invocationCallOrder[0],
    );
  });

  it("keeps the reservation active when Stripe cannot confirm cancellation", async () => {
    mocks.getExpired.mockResolvedValue(["order-1"]);
    mocks.getOrder.mockResolvedValue({
      id: "order-1",
      status: "pending",
      paymentStatus: "unpaid",
      stripePaymentIntentId: "pi_123",
    });
    mocks.cancel.mockRejectedValue(new Error("already succeeded"));
    const { expireEcommerceInventoryReservations } =
      await import("./ecommerce-inventory-reservations.service");

    await expect(expireEcommerceInventoryReservations()).resolves.toEqual({
      cancelled: 0,
      pending: 1,
    });
    expect(mocks.updateOrder).not.toHaveBeenCalled();
  });
});

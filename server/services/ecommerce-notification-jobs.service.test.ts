import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  complete: vi.fn(),
  retry: vi.fn(),
  getOrderWithDetails: vi.fn(),
  getRefund: vi.fn(),
  getShipment: vi.fn(),
  sendConfirmation: vi.fn(),
  sendRefund: vi.fn(),
  sendShipment: vi.fn(),
  sendStatus: vi.fn(),
}));

vi.mock("../storage", () => ({
  storage: {
    ecommerce: {
      claimNextEcommerceNotificationJob: mocks.claim,
      completeEcommerceNotificationJob: mocks.complete,
      retryEcommerceNotificationJob: mocks.retry,
      getOrderWithDetails: mocks.getOrderWithDetails,
      getRefund: mocks.getRefund,
      getShipment: mocks.getShipment,
    },
  },
}));

vi.mock("./ecommerce-email.service", () => ({
  sendEcommerceOrderConfirmation: mocks.sendConfirmation,
  sendEcommerceRefundEmail: mocks.sendRefund,
  sendEcommerceShipmentEmail: mocks.sendShipment,
  sendEcommerceOrderStatusEmail: mocks.sendStatus,
}));

vi.mock("../utils/logger", () => ({
  logger: {
    app: { error: vi.fn(), info: vi.fn() },
    email: { error: vi.fn(), warn: vi.fn() },
  },
}));

describe("ecommerce notification jobs", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.claim.mockResolvedValue(undefined);
    mocks.complete.mockResolvedValue({ id: "job-1", status: "sent" });
    mocks.retry.mockResolvedValue({ id: "job-1", status: "queued" });
    mocks.getOrderWithDetails.mockResolvedValue({
      id: "order-1",
      customer: { email: "buyer@test" },
    });
    mocks.sendConfirmation.mockResolvedValue(true);
    mocks.getRefund.mockResolvedValue({
      id: "refund-1",
      orderId: "order-1",
      amount: 1250,
      status: "processed",
    });
    mocks.sendRefund.mockResolvedValue(true);
    mocks.getShipment.mockResolvedValue({ id: "shipment-1", orderId: "order-1" });
    mocks.sendShipment.mockResolvedValue(true);
    mocks.sendStatus.mockResolvedValue(true);
  });

  it("delivers an atomically queued receipt and marks the claimed job sent", async () => {
    mocks.claim
      .mockResolvedValueOnce({
        id: "job-1",
        type: "order_confirmation",
        orderId: "order-1",
        processingToken: "claim-1",
        attemptCount: 1,
      })
      .mockResolvedValueOnce(undefined);

    const { runEcommerceNotificationJobs } = await import("./ecommerce-notification-jobs.service");
    const result = await runEcommerceNotificationJobs(new Date("2026-09-04T00:00:00.000Z"));

    expect(mocks.sendConfirmation).toHaveBeenCalledWith(expect.objectContaining({ id: "order-1" }));
    expect(mocks.complete).toHaveBeenCalledWith(
      "job-1",
      "claim-1",
      new Date("2026-09-04T00:00:00.000Z"),
    );
    expect(result).toEqual({ completed: 1, retried: 0, failed: 0 });
  });

  it("requeues a failed delivery with exponential backoff", async () => {
    mocks.claim
      .mockResolvedValueOnce({
        id: "job-1",
        type: "order_confirmation",
        orderId: "order-1",
        processingToken: "claim-1",
        attemptCount: 2,
      })
      .mockResolvedValueOnce(undefined);
    mocks.sendConfirmation.mockResolvedValue(false);

    const { runEcommerceNotificationJobs } = await import("./ecommerce-notification-jobs.service");
    const now = new Date("2026-09-04T00:00:00.000Z");
    const result = await runEcommerceNotificationJobs(now);

    expect(mocks.retry).toHaveBeenCalledWith(
      expect.objectContaining({ id: "job-1", attemptCount: 2 }),
      new Date("2026-09-04T00:01:00.000Z"),
      expect.any(Error),
      now,
    );
    expect(result).toEqual({ completed: 0, retried: 1, failed: 0 });
  });

  it("delivers a processed refund through the durable notification worker", async () => {
    mocks.claim
      .mockResolvedValueOnce({
        id: "job-refund-1",
        type: "refund_confirmation",
        orderId: "order-1",
        refundId: "refund-1",
        processingToken: "claim-refund-1",
        attemptCount: 1,
      })
      .mockResolvedValueOnce(undefined);

    const { runEcommerceNotificationJobs } = await import("./ecommerce-notification-jobs.service");
    const now = new Date("2026-09-04T00:00:00.000Z");
    await expect(runEcommerceNotificationJobs(now)).resolves.toEqual({
      completed: 1,
      retried: 0,
      failed: 0,
    });
    expect(mocks.sendRefund).toHaveBeenCalledWith(expect.objectContaining({ id: "order-1" }), 1250);
    expect(mocks.complete).toHaveBeenCalledWith("job-refund-1", "claim-refund-1", now);
  });

  it("delivers a shipment through the durable notification worker", async () => {
    mocks.claim
      .mockResolvedValueOnce({
        id: "job-shipment-1",
        type: "shipment_confirmation",
        orderId: "order-1",
        shipmentId: "shipment-1",
        processingToken: "claim-shipment-1",
        attemptCount: 1,
      })
      .mockResolvedValueOnce(undefined);

    const { runEcommerceNotificationJobs } = await import("./ecommerce-notification-jobs.service");
    await expect(runEcommerceNotificationJobs()).resolves.toEqual({
      completed: 1,
      retried: 0,
      failed: 0,
    });
    expect(mocks.sendShipment).toHaveBeenCalledWith(
      expect.objectContaining({ id: "order-1" }),
      expect.objectContaining({ id: "shipment-1" }),
    );
  });

  it("delivers an order status change through the durable notification worker", async () => {
    mocks.claim
      .mockResolvedValueOnce({
        id: "job-status-1",
        type: "order_status",
        orderId: "order-1",
        statusValue: "shipped",
        processingToken: "claim-status-1",
        attemptCount: 1,
      })
      .mockResolvedValueOnce(undefined);

    const { runEcommerceNotificationJobs } = await import("./ecommerce-notification-jobs.service");
    const now = new Date("2026-09-04T00:00:00.000Z");
    await expect(runEcommerceNotificationJobs(now)).resolves.toEqual({
      completed: 1,
      retried: 0,
      failed: 0,
    });
    expect(mocks.sendStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: "order-1" }),
      "shipped",
    );
    expect(mocks.complete).toHaveBeenCalledWith("job-status-1", "claim-status-1", now);
  });

  it("reports a dead-lettered job after the final attempt", async () => {
    mocks.claim
      .mockResolvedValueOnce({
        id: "job-1",
        type: "order_confirmation",
        orderId: "order-1",
        processingToken: "claim-1",
        attemptCount: 5,
      })
      .mockResolvedValueOnce(undefined);
    mocks.sendConfirmation.mockRejectedValue(new Error("mail transport unavailable"));
    mocks.retry.mockResolvedValue({ id: "job-1", status: "failed" });

    const { runEcommerceNotificationJobs } = await import("./ecommerce-notification-jobs.service");
    const result = await runEcommerceNotificationJobs(new Date("2026-09-04T00:00:00.000Z"));

    expect(result).toEqual({ completed: 0, retried: 0, failed: 1 });
  });

  it("gives later jobs fresh claim times after a slow batch exceeds the lease timeout", async () => {
    vi.useFakeTimers();
    const startedAt = new Date("2026-09-04T00:00:00.000Z");
    const secondClaimAt = new Date("2026-09-04T00:11:00.000Z");
    const completedAt = new Date("2026-09-04T00:11:05.000Z");
    vi.setSystemTime(startedAt);
    for (const id of ["1", "2"]) {
      mocks.claim.mockResolvedValueOnce({
        id: `job-${id}`,
        type: "order_confirmation",
        orderId: "order-1",
        processingToken: `claim-${id}`,
        attemptCount: 1,
      });
    }
    mocks.sendConfirmation
      .mockImplementationOnce(async () => {
        vi.setSystemTime(secondClaimAt);
        return true;
      })
      .mockImplementationOnce(async () => {
        vi.setSystemTime(completedAt);
        return true;
      });

    const { runEcommerceNotificationJobs } = await import("./ecommerce-notification-jobs.service");
    await expect(runEcommerceNotificationJobs(undefined, 2)).resolves.toEqual({
      completed: 2,
      retried: 0,
      failed: 0,
    });

    expect(mocks.claim).toHaveBeenNthCalledWith(1, startedAt);
    expect(mocks.claim).toHaveBeenNthCalledWith(2, secondClaimAt);
    expect(mocks.complete).toHaveBeenNthCalledWith(1, "job-1", "claim-1", secondClaimAt);
    expect(mocks.complete).toHaveBeenNthCalledWith(2, "job-2", "claim-2", completedAt);
  });

  it("starts retry backoff when a slow delivery fails using the injected live clock", async () => {
    vi.useFakeTimers();
    const startedAt = new Date("2026-09-04T00:00:00.000Z");
    const failedAt = new Date("2026-09-04T00:11:00.000Z");
    vi.setSystemTime(startedAt);
    mocks.claim.mockResolvedValueOnce({
      id: "job-1",
      type: "order_confirmation",
      orderId: "order-1",
      processingToken: "claim-1",
      attemptCount: 2,
    });
    const deliveryError = new Error("mail transport unavailable");
    mocks.sendConfirmation.mockImplementationOnce(async () => {
      vi.setSystemTime(failedAt);
      throw deliveryError;
    });

    const { runEcommerceNotificationJobs } = await import("./ecommerce-notification-jobs.service");
    const clock = vi.fn(() => new Date());
    await expect(runEcommerceNotificationJobs(clock, 1)).resolves.toEqual({
      completed: 0,
      retried: 1,
      failed: 0,
    });

    expect(mocks.claim).toHaveBeenCalledWith(startedAt);
    expect(mocks.retry).toHaveBeenCalledWith(
      expect.objectContaining({ id: "job-1", processingToken: "claim-1", attemptCount: 2 }),
      new Date("2026-09-04T00:12:00.000Z"),
      deliveryError,
      failedAt,
    );
    expect(mocks.complete).not.toHaveBeenCalled();
  });
  it("finishes the current claimed delivery but does not claim another job after stop", async () => {
    let stopping = false;
    mocks.claim.mockResolvedValue({
      id: "job-1",
      type: "order_confirmation",
      orderId: "order-1",
      processingToken: "claim-1",
      attemptCount: 1,
    });
    mocks.sendConfirmation.mockImplementationOnce(async () => {
      stopping = true;
      return true;
    });
    const { runEcommerceNotificationJobs } = await import("./ecommerce-notification-jobs.service");
    await expect(runEcommerceNotificationJobs(undefined, 25, () => stopping)).resolves.toEqual({
      completed: 1,
      retried: 0,
      failed: 0,
    });
    expect(mocks.complete).toHaveBeenCalledWith("job-1", "claim-1", expect.any(Date));
    expect(mocks.claim).toHaveBeenCalledTimes(1);
  });
});

import { afterEach, expect, it, vi } from "vitest";
import { startShippingQuoteMaintenance } from "./ecommerce-shipping-quote-maintenance.service";

const logs = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn() }));
vi.mock("../utils/logger", () => ({ logger: { app: logs } }));
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

it("drains active maintenance without overlap and prevents another run after stop", async () => {
  vi.useFakeTimers();
  let finish!: (value: { expired: number; redacted: number }) => void;
  const maintain = vi.fn(
    () =>
      new Promise<{ expired: number; redacted: number }>((resolve) => {
        finish = resolve;
      }),
  );
  const worker = startShippingQuoteMaintenance({ maintain });
  await vi.advanceTimersByTimeAsync(90_000);
  expect(maintain).toHaveBeenCalledExactlyOnceWith(100);
  let drained = false;
  const stopping = worker.stop().then(() => {
    drained = true;
  });
  await Promise.resolve();
  expect(drained).toBe(false);
  finish({ expired: 1, redacted: 2 });
  await stopping;
  await vi.advanceTimersByTimeAsync(90_000);
  expect(maintain).toHaveBeenCalledTimes(1);
  expect(logs.info).toHaveBeenCalledWith("Shipping quote maintenance completed", {
    expired: 1,
    redacted: 2,
  });
});

it("retries a failed batch without logging private database errors", async () => {
  vi.useFakeTimers();
  const maintain = vi
    .fn()
    .mockRejectedValueOnce(new Error("private stored address"))
    .mockResolvedValue({ expired: 0, redacted: 0 });
  const worker = startShippingQuoteMaintenance({ maintain });
  await vi.advanceTimersByTimeAsync(0);
  expect(logs.warn).toHaveBeenCalledExactlyOnceWith(
    "Shipping quote maintenance failed; retry scheduled",
  );
  await vi.advanceTimersByTimeAsync(30_000);
  expect(maintain).toHaveBeenCalledTimes(2);
  expect(logs.info).not.toHaveBeenCalled();
  await worker.stop();
});

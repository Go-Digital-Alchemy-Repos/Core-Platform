import { storage } from "../storage";
import { logger } from "../utils/logger";
import { recordDomainOutcome } from "../utils/metrics";
import {
  sendEcommerceOrderConfirmation,
  sendEcommerceOrderStatusEmail,
  sendEcommerceRefundEmail,
  sendEcommerceShipmentEmail,
} from "./ecommerce-email.service";

const CHECK_INTERVAL_MS = 30_000;
const MAX_JOBS_PER_RUN = 25;
const RETRY_BASE_MS = 30_000;
const RETRY_MAX_MS = 30 * 60_000;

export function ecommerceNotificationRetryAt(attemptCount: number, now = new Date()) {
  const delay = Math.min(RETRY_BASE_MS * 2 ** Math.max(attemptCount - 1, 0), RETRY_MAX_MS);
  return new Date(now.getTime() + delay);
}

async function dispatchEcommerceNotificationJob(job: {
  type: string;
  orderId: string;
  refundId?: string | null;
  shipmentId?: string | null;
  statusValue?: string | null;
}): Promise<boolean> {
  const order = await storage.ecommerce.getOrderWithDetails(job.orderId);
  if (!order) throw new Error("ecommerce_notification_order_not_found");
  if (job.type === "order_confirmation") return sendEcommerceOrderConfirmation(order);
  if (job.type === "refund_confirmation") {
    if (!job.refundId) throw new Error("ecommerce_notification_refund_not_found");
    const refund = await storage.ecommerce.getRefund(job.refundId);
    if (!refund || refund.orderId !== order.id || refund.status !== "processed") {
      throw new Error("ecommerce_notification_refund_not_found");
    }
    return sendEcommerceRefundEmail(order, refund.amount);
  }
  if (job.type === "shipment_confirmation") {
    if (!job.shipmentId) throw new Error("ecommerce_notification_shipment_not_found");
    const shipment = await storage.ecommerce.getShipment(job.shipmentId);
    if (!shipment || shipment.orderId !== order.id) {
      throw new Error("ecommerce_notification_shipment_not_found");
    }
    return sendEcommerceShipmentEmail(order, shipment);
  }
  if (job.type === "order_status") {
    if (!job.statusValue) throw new Error("ecommerce_notification_status_not_found");
    return sendEcommerceOrderStatusEmail(order, job.statusValue);
  }
  throw new Error("unsupported_ecommerce_notification_type");
}

export async function runEcommerceNotificationJobs(
  clock: Date | (() => Date) = () => new Date(),
  maxJobs = MAX_JOBS_PER_RUN,
) {
  // Explicit dates preserve fixed-clock test callers. Workers use a fresh clock
  // reading for each operation so later jobs do not inherit the batch's lease.
  const getNow = typeof clock === "function" ? clock : () => clock;
  let completed = 0;
  let retried = 0;
  let failed = 0;

  for (let index = 0; index < maxJobs; index += 1) {
    const job = await storage.ecommerce.claimNextEcommerceNotificationJob(getNow());
    if (!job) break;
    if (!job.processingToken) {
      logger.email.error(
        "Ecommerce notification job was claimed without a processing token",
        undefined,
        {
          jobId: job.id,
        },
      );
      continue;
    }

    try {
      const delivered = await dispatchEcommerceNotificationJob(job);
      if (!delivered) throw new Error("ecommerce_notification_transport_unavailable");
      const updated = await storage.ecommerce.completeEcommerceNotificationJob(
        job.id,
        job.processingToken,
        getNow(),
      );
      if (updated) completed += 1;
    } catch (error) {
      const failedAt = getNow();
      const updated = await storage.ecommerce.retryEcommerceNotificationJob(
        { ...job, processingToken: job.processingToken },
        ecommerceNotificationRetryAt(job.attemptCount, failedAt),
        error,
        failedAt,
      );
      if (updated?.status === "failed") failed += 1;
      else if (updated) retried += 1;
      logger.email.warn("Ecommerce notification job delivery failed", {
        jobId: job.id,
        type: job.type,
        attemptCount: job.attemptCount,
      });
    }
  }

  if (completed) recordDomainOutcome("notification", "completed", completed);
  if (retried) recordDomainOutcome("notification", "retried", retried);
  if (failed) recordDomainOutcome("notification", "failed", failed);
  return { completed, retried, failed };
}

export function startEcommerceNotificationJobService() {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const result = await runEcommerceNotificationJobs();
      if (result.completed || result.retried || result.failed) {
        logger.app.info("Ecommerce notification jobs processed", result);
      }
    } catch (error) {
      logger.app.error("Ecommerce notification worker failed", error);
    } finally {
      running = false;
    }
  };

  setInterval(() => void run(), CHECK_INTERVAL_MS);
  void run();
  logger.app.info("Ecommerce notification worker started");
}

import { startStoppableWorker } from "../utils/runtime-lifecycle";
import { storage } from "../storage";
import { logger } from "../utils/logger";
import { recordDomainOutcome } from "../utils/metrics";
import { getEcommerceStripeClient } from "./ecommerce-stripe.service";

const CHECK_INTERVAL_MS = 30_000;
const MAX_RESERVATIONS_PER_RUN = 25;

/**
 * A reservation stays active until Stripe confirms cancellation. This prevents
 * an expired PaymentIntent from later consuming stock newly reserved elsewhere.
 */
export async function expireEcommerceInventoryReservations(
  now = new Date(),
  maxReservations = MAX_RESERVATIONS_PER_RUN,
  isStopping: () => boolean = () => false,
) {
  const orderIds = await storage.ecommerce.getExpiredEcommerceInventoryReservationOrderIds(
    now,
    maxReservations,
  );
  if (!orderIds.length) return { cancelled: 0, pending: 0 };

  const stripe = await getEcommerceStripeClient();
  let cancelled = 0;
  let pending = 0;
  for (const orderId of orderIds) {
    if (isStopping()) break;
    const order = await storage.ecommerce.getOrder(orderId);
    if (!order || order.status !== "pending" || order.paymentStatus !== "unpaid") continue;
    if (!order.stripePaymentIntentId) {
      await storage.ecommerce.updateOrder(order.id, {
        status: "cancelled",
        paymentStatus: "failed",
      });
      cancelled += 1;
      continue;
    }
    try {
      await stripe.paymentIntents.cancel(order.stripePaymentIntentId);
      await storage.ecommerce.updateOrder(order.id, {
        status: "cancelled",
        paymentStatus: "failed",
      });
      cancelled += 1;
    } catch {
      pending += 1;
      logger.stripe.warn("Ecommerce reservation payment cancellation is still pending", {
        orderId: order.id,
        paymentIntentId: order.stripePaymentIntentId,
      });
    }
  }
  if (cancelled) recordDomainOutcome("inventory_reservation", "expired_cancelled", cancelled);
  if (pending) recordDomainOutcome("inventory_reservation", "cancellation_pending", pending);
  return { cancelled, pending };
}

export function startEcommerceInventoryReservationService() {
  const worker = startStoppableWorker({
    intervalMs: CHECK_INTERVAL_MS,
    run: async (isStopping) => {
      const result = await expireEcommerceInventoryReservations(undefined, undefined, isStopping);
      if (result.cancelled || result.pending)
        logger.app.info("Ecommerce inventory reservations processed", result);
    },
    onError: (error) => logger.app.error("Ecommerce inventory reservation worker failed", error),
  });
  logger.app.info("Ecommerce inventory reservation worker started");
  return worker;
}

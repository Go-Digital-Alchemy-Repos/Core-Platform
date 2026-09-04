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
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const result = await expireEcommerceInventoryReservations();
      if (result.cancelled || result.pending) {
        logger.app.info("Ecommerce inventory reservations processed", result);
      }
    } catch (error) {
      logger.app.error("Ecommerce inventory reservation worker failed", error);
    } finally {
      running = false;
    }
  };

  setInterval(() => void run(), CHECK_INTERVAL_MS);
  void run();
  logger.app.info("Ecommerce inventory reservation worker started");
}

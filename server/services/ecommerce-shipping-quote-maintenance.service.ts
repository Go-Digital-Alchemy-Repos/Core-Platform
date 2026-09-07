import { startStoppableWorker } from "../utils/runtime-lifecycle";
import { logger } from "../utils/logger";

/** Database-only maintenance continues even when new provider requests are disabled. */
export function startShippingQuoteMaintenance(service: {
  maintain(batchSize: number): Promise<{ expired: number; redacted: number }>;
}) {
  return startStoppableWorker({
    intervalMs: 30_000,
    run: async () => {
      const result = await service.maintain(100);
      if (result.expired || result.redacted)
        logger.app.info("Shipping quote maintenance completed", {
          expired: result.expired,
          redacted: result.redacted,
        });
    },
    // Database errors can contain stored values; never forward the raw error.
    onError: () => logger.app.warn("Shipping quote maintenance failed; retry scheduled"),
  });
}

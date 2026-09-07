import { Router } from "express";
import type { RequestHandler } from "express";
import type { ShippingQuoteService } from "../../services/ecommerce-shipping-quote-orchestration";
import { asyncHandler } from "../../middleware/error-handler";
import { noStorePrivateResponse } from "../../middleware/security";
import { paramString } from "../../utils/params";

/** Unmounted. The integrating admin router supplies its real admin and ecommerce guards. */
export function createShippingQuoteRouter(
  service: ShippingQuoteService,
  guards: {
    requireAdmin: RequestHandler;
    requireEcommerceEnabled: RequestHandler;
  },
) {
  const router = Router();
  router.use(guards.requireAdmin, guards.requireEcommerceEnabled, noStorePrivateResponse);
  router.get(
    "/shipping/providers/easypost/quote-readiness",
    asyncHandler(async (_req, res) => {
      res.json(await service.readiness());
    }),
  );
  router.post(
    "/orders/:orderId/shipping-quotes",
    asyncHandler(async (req, res) => {
      const result = await service.create(
        paramString(req.params.orderId),
        req.get("Idempotency-Key") ?? "",
        req.body,
      );
      res.status(result.statusCode).json(result.quote);
    }),
  );
  router.get(
    "/orders/:orderId/shipping-quotes/:attemptId",
    asyncHandler(async (req, res) => {
      res.json(
        await service.read(paramString(req.params.orderId), paramString(req.params.attemptId)),
      );
    }),
  );
  return router;
}

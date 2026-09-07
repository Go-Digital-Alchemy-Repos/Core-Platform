import { z } from "zod";

export const SHIPPING_LABEL_REQUEST_VERSION = 1 as const;
// Match existing opaque quote/result identifiers: quote IDs are varchar/UUID, not integers.
const identifier = z.string().min(1).max(128);

/** Confirmation only. The server must resolve ownership, identity and price from the quote. */
export const shippingLabelPurchaseRequestSchema = z
  .object({
    version: z.literal(SHIPPING_LABEL_REQUEST_VERSION),
    quoteAttemptId: identifier,
    rateId: identifier,
    confirmedRateAmount: z.number().int().min(0).max(2_147_483_647),
    currency: z.literal("USD"),
  })
  .strict();
export type ShippingLabelPurchaseRequest = z.infer<typeof shippingLabelPurchaseRequestSchema>;

export const SHIPPING_LABEL_PURCHASE_STATES = [
  "claimed",
  "dispatching",
  "purchased",
  "unknown",
  "rejected",
  "cancelled_before_dispatch",
] as const;
export type ShippingLabelPurchaseObservationSource = "preflight" | "buy" | "reconciliation";
export type ShippingLabelPurchaseState = (typeof SHIPPING_LABEL_PURCHASE_STATES)[number];

/**
 * Pure permission policy, not a lock, CAS, provider-error classifier or dispatch authorization.
 * The caller must use authoritative persisted state/intent/fence and atomically enforce the
 * same predicates on its write. A successful claimed→dispatching write records intent before
 * buy I/O. Preflight may instead discover existing purchase without recording Core buy intent.
 * A completion requires independently verified evidence; unknown never grants rebuy.
 */
export function canTransitionShippingLabelPurchase(input: {
  state: ShippingLabelPurchaseState;
  nextState: ShippingLabelPurchaseState;
  currentFence: string;
  expectedFence: string;
  dispatchIntentRecorded: boolean;
  observationSource?: ShippingLabelPurchaseObservationSource;
}): boolean {
  if (
    !identifier.safeParse(input.currentFence).success ||
    !identifier.safeParse(input.expectedFence).success ||
    input.currentFence !== input.expectedFence
  )
    return false;

  if (input.nextState === "purchased") {
    if (input.state === "claimed" && input.dispatchIntentRecorded === false)
      return input.observationSource === "preflight";
    return (
      (input.state === "dispatching" || input.state === "unknown") &&
      input.dispatchIntentRecorded === true &&
      (input.observationSource === "buy" || input.observationSource === "reconciliation")
    );
  }
  // Observation provenance is meaningful only for a positive purchase transition.
  if (input.observationSource !== undefined) return false;

  if (input.state === "claimed" && input.dispatchIntentRecorded === false)
    return input.nextState === "dispatching" || input.nextState === "cancelled_before_dispatch";

  if (
    (input.state === "dispatching" || input.state === "unknown") &&
    input.dispatchIntentRecorded === true
  )
    return (
      input.nextState === "rejected" ||
      (input.state === "dispatching" && input.nextState === "unknown")
    );

  // Terminal outcomes are immutable here. Refund/void and reconciliation observations have
  // separate lifecycles; neither can reopen a terminal purchase or imply another buy.
  return false;
}

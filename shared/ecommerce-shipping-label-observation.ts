import { z } from "zod";

const id = (prefix: string) => z.string().regex(new RegExp(`^${prefix}_[A-Za-z0-9]{1,100}$`));
const carrierText = z
  .string()
  .min(1)
  .max(200)
  .refine(
    (value) =>
      !Array.from(value).some(
        (c) => c.charCodeAt(0) < 32 || (c.charCodeAt(0) >= 127 && c.charCodeAt(0) <= 159),
      ),
  );
const feeType = z
  .string()
  .min(1)
  .max(100)
  .refine((value) =>
    Array.from(value).every((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126),
  );
export function normalizeShippingLabelFeeDecimal(value: unknown): string {
  if (typeof value !== "string" || !/^-?(0|[1-9][0-9]{0,9})(\.[0-9]{1,12})?$/.test(value))
    throw new Error("Invalid shipping fee decimal");
  const [whole, fraction = ""] = value.split(".");
  const significant = fraction.replace(/0+$/, "");
  if ((whole === "0" || whole === "-0") && !significant) return "0";
  return whole + (significant ? `.${significant}` : "");
}
export const shippingLabelVerifiedRateSchema = z
  .object({
    providerRateId: id("rate"),
    providerShipmentId: id("shp"),
    carrierAccountId: id("ca"),
    mode: z.literal("test"),
    carrier: carrierText,
    service: carrierText,
    amount: z.number().int().min(0).max(2147483647),
    currency: z.literal("USD"),
  })
  .strict();
export type ShippingLabelVerifiedRate = z.infer<typeof shippingLabelVerifiedRateSchema>;
export const shippingLabelExactFeeSchema = z
  .object({
    type: feeType,
    usdDecimal: z.string().refine((value) => {
      try {
        return normalizeShippingLabelFeeDecimal(value) === value;
      } catch {
        return false;
      }
    }),
    charged: z.boolean(),
    refunded: z.boolean(),
  })
  .strict();
export type ShippingLabelExactFee = z.infer<typeof shippingLabelExactFeeSchema>;
const match = z.enum(["matches", "mismatch", "unverifiable"]);
export const shippingLabelReviewCodeSchema = z.enum([
  "selected_rate_missing",
  "selected_rate_invalid",
  "selection_mismatch",
  "input_mismatch",
  "input_unverifiable",
  "price_mismatch",
  "fees_unverifiable",
  "tracking_unavailable",
  "label_metadata_unavailable",
]);
export const shippingLabelSafeReasonSchema = z.enum([
  "transport_timeout",
  "transport_failure",
  "invalid_response",
  "identity_mismatch",
  "purchase_in_progress",
  "already_purchased",
  "access_unavailable",
  "not_found",
  "provider_error",
]);
export const shippingLabelPurchaseEvidenceSchema = z
  .object({
    providerShipmentId: id("shp"),
    mode: z.literal("test"),
    evidence: z.enum(["postage_label", "selected_rate", "both"]),
    postageLabelId: id("pl").nullable(),
    trackingCode: z
      .string()
      .min(1)
      .max(200)
      .refine(
        (value) =>
          !Array.from(value).some(
            (c) => c.charCodeAt(0) < 32 || (c.charCodeAt(0) >= 127 && c.charCodeAt(0) <= 159),
          ),
      )
      .nullable(),
    asset: z.enum(["missing", "disabled_pending_origin_policy"]),
    finances: z
      .object({
        selectedPostage: shippingLabelVerifiedRateSchema.nullable(),
        fees: z.array(shippingLabelExactFeeSchema).max(100).nullable(),
        finalTotalKnown: z.literal(false),
      })
      .strict(),
    selection: match,
    inputs: match,
    price: match,
    reviewCodes: z.array(shippingLabelReviewCodeSchema).max(9),
  })
  .strict()
  .superRefine((value, context) => {
    const hasLabel = value.postageLabelId !== null,
      hasRate = value.finances.selectedPostage !== null;
    const flags = new Set(value.reviewCodes);
    const rateFlags =
      Number(flags.has("selected_rate_missing")) + Number(flags.has("selected_rate_invalid"));
    const exactFlags = [
      ["fees_unverifiable", value.finances.fees === null],
      ["tracking_unavailable", value.trackingCode === null],
      ["label_metadata_unavailable", !hasLabel],
      ["selection_mismatch", value.selection === "mismatch"],
      ["input_mismatch", value.inputs === "mismatch"],
      ["input_unverifiable", value.inputs === "unverifiable"],
      ["price_mismatch", value.price === "mismatch"],
    ] as const;
    if (
      exactFlags.some(([flag, required]) => flags.has(flag) !== required) ||
      rateFlags !== (hasRate ? 0 : 1) ||
      (hasRate && (value.selection === "unverifiable" || value.price === "unverifiable")) ||
      (!hasLabel && !hasRate) ||
      value.evidence !== (hasLabel ? (hasRate ? "both" : "postage_label") : "selected_rate") ||
      value.asset !== (hasLabel ? "disabled_pending_origin_policy" : "missing") ||
      (value.finances.selectedPostage &&
        value.finances.selectedPostage.providerShipmentId !== value.providerShipmentId) ||
      new Set(value.reviewCodes).size !== value.reviewCodes.length ||
      (!hasRate && (value.selection !== "unverifiable" || value.price !== "unverifiable"))
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Inconsistent shipping purchase observation",
      });
  });
export type ShippingLabelPurchaseEvidence = z.infer<typeof shippingLabelPurchaseEvidenceSchema>;
const purchase = z
  .object({ kind: z.literal("purchase_observed"), purchase: shippingLabelPurchaseEvidenceSchema })
  .strict();
const unresolved = z
  .object({ kind: z.literal("unresolved"), reason: shippingLabelSafeReasonSchema })
  .strict();
const negative = z
  .object({
    kind: z.literal("no_purchase_evidence"),
    providerShipmentId: id("shp"),
    mode: z.literal("test"),
    candidateRate: shippingLabelVerifiedRateSchema.nullable(),
    inputs: match,
    rate: z.enum(["matches", "missing", "mismatch", "unverifiable"]),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.candidateRate &&
        value.candidateRate.providerShipmentId !== value.providerShipmentId) ||
      (!value.candidateRate && (value.rate === "matches" || value.rate === "mismatch"))
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Inconsistent shipping read observation",
      });
  });
export const shippingLabelReadObservationSchema = z.union([purchase, negative, unresolved]);
export const shippingLabelBuyObservationSchema = z.union([purchase, unresolved]);
export type ShippingLabelReadObservation = z.infer<typeof shippingLabelReadObservationSchema>;
export type ShippingLabelBuyObservation = z.infer<typeof shippingLabelBuyObservationSchema>;

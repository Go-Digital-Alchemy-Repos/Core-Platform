import { z } from "zod";

const identifier = z.string().min(1).max(128);
const label = z.string().min(1).max(200);
export const shippingQuoteDisplayRateSchema = z
  .object({
    id: identifier,
    carrier: label,
    service: label,
    amount: z.number().int().min(0).max(2147483647),
    currency: z.literal("USD"),
    estimatedDays: z.number().int().min(0).max(365).nullable(),
    deliveryGuaranteed: z.boolean().nullable(),
  })
  .strict();

/** Admin display only: no addresses, tokens, credentials, account IDs or raw provider data. */
export const shippingQuoteResultSchema = z
  .object({
    id: identifier,
    status: z.enum(["pending", "quoted", "unavailable", "unknown"]),
    provider: z.literal("easypost"),
    mode: z.literal("test"),
    stale: z.boolean(),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    errorCode: z
      .enum([
        "provider_rejected",
        "no_rates",
        "configuration_changed",
        "request_timeout",
        "transport_error",
        "invalid_response",
        "interrupted",
      ])
      .nullable(),
    rates: z.array(shippingQuoteDisplayRateSchema).max(200),
  })
  .strict()
  .superRefine((result, context) => {
    const allowedErrors = {
      pending: [null],
      quoted: [null],
      unavailable: ["provider_rejected", "no_rates", "configuration_changed"],
      unknown: ["request_timeout", "transport_error", "invalid_response", "interrupted"],
    } as const;
    if (
      !(allowedErrors[result.status] as readonly (string | null)[]).includes(result.errorCode) ||
      new Set(result.rates.map((rate) => rate.id)).size !== result.rates.length
    )
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid quote result state" });

    if ((result.status === "quoted") !== result.rates.length > 0)
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Quote rates do not match status" });
  });
export type ShippingQuoteResult = z.infer<typeof shippingQuoteResultSchema>;

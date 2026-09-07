import { z } from "zod";

export const SHIPPING_QUOTE_CONTRACT_VERSION = "1.0.0" as const;
const identifier = z.string().trim().min(1).max(128);
const measurement = z.number().finite().positive().max(1_000_000);

/** Structural limits are not a promise that a carrier accepts a package. */
export const shippingQuoteParcelSchema = z
  .object({
    weight: measurement,
    weightUnit: z.enum(["oz", "lb", "g", "kg"]),
    dimensions: z
      .object({
        length: measurement,
        width: measurement,
        height: measurement,
        unit: z.enum(["in", "cm", "mm"]),
      })
      .strict()
      .optional(),
  })
  .strict();

/** Addresses, currency, credentials and provider identity are resolved server-side. */
export const shippingQuoteRequestSchema = z
  .object({
    version: z.literal(SHIPPING_QUOTE_CONTRACT_VERSION),
    locationId: identifier,
    items: z
      .array(
        z
          .object({
            orderItemId: identifier,
            quantity: z.number().int().positive().max(1_000_000),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    parcel: shippingQuoteParcelSchema,
  })
  .strict()
  .superRefine((request, context) => {
    const seen = new Set<string>();
    request.items.forEach((item, index) => {
      if (seen.has(item.orderItemId))
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choose each order item once",
          path: ["items", index, "orderItemId"],
        });
      seen.add(item.orderItemId);
    });
  });

export type ShippingQuoteRequest = z.infer<typeof shippingQuoteRequestSchema>;

/** Provider USD strings become integer cents without floating-point multiplication. */
export function parseShippingQuoteUsdCents(value: unknown): number {
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(value))
    throw new Error("Invalid USD shipping rate");
  const [whole, fractional = ""] = value.split(".");
  const cents = BigInt(whole) * 100n + BigInt(fractional.padEnd(2, "0"));
  // Match PostgreSQL integer money columns; never truncate or wrap an amount.
  if (cents > 2_147_483_647n) throw new Error("USD shipping rate exceeds supported amount");
  return Number(cents);
}

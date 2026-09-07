import { z } from "zod";

export const shippingQuoteReadinessSchema = z
  .object({
    implemented: z.boolean(),
    configured: z.boolean(),
    approvedTestCredentials: z.boolean(),
    enabled: z.boolean(),
    mode: z.literal("test"),
    reasonCode: z
      .enum(["not_configured", "test_approval_required", "provider_inactive", "production_mode"])
      .nullable(),
  })
  .strict();
export type ShippingQuoteReadiness = z.infer<typeof shippingQuoteReadinessSchema>;

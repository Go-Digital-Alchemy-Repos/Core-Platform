import { z } from "zod";

export const ecommerceOrderStatusLookupSchema = z.object({
  orderId: z.string().trim().min(1).max(128),
  email: z.string().trim().email().max(254),
  token: z.string().trim().min(1).max(128),
});

export function isEcommerceOrderLookupAuthorized(
  details: { lookupToken: string; customer: { email: string } | null },
  params: { email: string; token: string },
): boolean {
  if (!details.customer) return false;
  if (details.customer.email.trim().toLowerCase() !== params.email.trim().toLowerCase())
    return false;
  return details.lookupToken === params.token;
}

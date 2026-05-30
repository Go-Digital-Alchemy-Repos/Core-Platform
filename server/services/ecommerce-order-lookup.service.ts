export function isEcommerceOrderLookupAuthorized(
  details: { lookupToken: string; customer: { email: string } | null },
  params: { email: string; token: string },
): boolean {
  if (!details.customer) return false;
  if (details.customer.email.trim().toLowerCase() !== params.email.trim().toLowerCase()) return false;
  return details.lookupToken === params.token;
}

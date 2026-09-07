import { z } from "zod";
import { shippingQuoteResultSchema } from "@shared/ecommerce-shipping-quote-result";
import { shippingQuoteRequestSchema } from "@shared/ecommerce-shipping-quote";

const prefix = "core.shipping-quote.v1:";
const ownerKey = `${prefix}owner`;
const field = z.string().max(64);
export const quoteDraftSchema = z
  .object({
    locationId: z.string().max(128),
    quantities: z.record(z.string().max(128), field).refine((v) => Object.keys(v).length <= 100),
    weight: field,
    weightUnit: z.enum(["oz", "lb", "g", "kg"]),
    length: field,
    width: field,
    height: field,
    dimensionUnit: z.enum(["in", "cm", "mm"]),
  })
  .strict();
export type QuoteDraft = z.infer<typeof quoteDraftSchema>;
const requestSchema = z
  .object({
    key: z.string().uuid(),
    body: shippingQuoteRequestSchema,
    attemptId: z.string().min(1).max(128).optional(),
  })
  .strict();
const historyEntrySchema = z
  .object({
    draft: quoteDraftSchema,
    request: requestSchema,
    result: shippingQuoteResultSchema.optional(),
  })
  .strict();
const sessionSchema = z
  .object({
    draft: quoteDraftSchema,
    request: requestSchema.optional(),
    history: z.array(historyEntrySchema).max(5).optional(),
  })
  .strict();
export type QuoteSession = z.infer<typeof sessionSchema>;
export function clearQuoteSessions() {
  try {
    for (const key of Object.keys(sessionStorage))
      if (key.startsWith(prefix)) sessionStorage.removeItem(key);
  } catch {
    /* Storage may be disabled. */
  }
}
export function setQuoteSessionOwner(userId: string | null) {
  try {
    if (sessionStorage.getItem(ownerKey) !== userId) clearQuoteSessions();
    if (userId) sessionStorage.setItem(ownerKey, userId);
  } catch {
    /* The panel reports unavailable durable recovery before submitting. */
  }
}
function key(userId: string, orderId: string) {
  return `${prefix}${encodeURIComponent(userId)}:${encodeURIComponent(orderId)}`;
}
export function readQuoteSession(userId: string, orderId: string): QuoteSession | null {
  try {
    if (sessionStorage.getItem(ownerKey) !== userId) return null;
    const raw = sessionStorage.getItem(key(userId, orderId));
    if (!raw) return null;
    if (raw.length > 24000) throw new Error("Oversized quote draft");
    return sessionSchema.parse(JSON.parse(raw));
  } catch {
    try {
      sessionStorage.removeItem(key(userId, orderId));
    } catch {
      /* Unavailable storage. */
    }
    return null;
  }
}
/** Never dispatch a new POST unless its immutable recovery identity was saved successfully. */
export function writeQuoteSession(userId: string, orderId: string, value: QuoteSession): boolean {
  try {
    if (sessionStorage.getItem(ownerKey) !== userId) return false;
    const serialized = JSON.stringify(sessionSchema.parse(value));
    const currentKey = key(userId, orderId);
    const entries = Object.keys(sessionStorage).filter(
      (k) => k.startsWith(prefix) && k !== ownerKey && k !== currentKey,
    );
    // Do not evict unresolved attempts to make room for a new request.
    if (
      entries.length >= 20 ||
      serialized.length > 24000 ||
      entries.reduce((n, k) => n + (sessionStorage.getItem(k)?.length ?? 0), serialized.length) >
        100000
    )
      return false;
    sessionStorage.setItem(currentKey, serialized);
    return true;
  } catch {
    return false;
  }
}

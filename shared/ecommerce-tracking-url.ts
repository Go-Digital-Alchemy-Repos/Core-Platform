import { z } from "zod";

/** Existing records are untrusted too: render only explicit HTTP(S) links. */
export function getSafeEcommerceTrackingUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (
    Array.from(value).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) ||
    value.includes("\\")
  )
    return null;
  const text = value.trim();
  if (!text || text.length > 2048 || !/^https?:\/\//i.test(text)) return null;
  try {
    const url = new URL(text);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password
    )
      return null;
    // Preserve the accepted spelling so existing atomic request hashes remain stable.
    return text;
  } catch {
    return null;
  }
}
export const ecommerceTrackingUrlSchema = z
  .string()
  .max(2048)
  .refine(
    (value) => getSafeEcommerceTrackingUrl(value) !== null,
    "Use an HTTP(S) tracking URL without credentials or control characters",
  )
  .transform((value) => getSafeEcommerceTrackingUrl(value)!);

/** Legacy create/update APIs also accept blank as an absent optional URL. */
export const optionalEcommerceTrackingUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  ecommerceTrackingUrlSchema.nullish(),
);

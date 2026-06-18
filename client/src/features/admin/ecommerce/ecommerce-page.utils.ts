import type { Coupon } from "./ecommerce-page.types";

export function cents(value: string): number {
  return Math.round((Number(value) || 0) * 100);
}

export function csv(value: string): string[] {
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function moneyInput(value?: number | null): string {
  return value == null ? "" : (value / 100).toFixed(2);
}

export function dateTimeInput(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

export function nullableCents(value: string): number | null {
  return value.trim() ? cents(value) : null;
}

export function nullableInt(value: string): number | null {
  return value.trim() ? Number(value) || 0 : null;
}

export function couponStatus(coupon: Coupon): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  const now = Date.now();
  if (coupon.archivedAt) return { label: "Archived", variant: "outline" };
  if (!coupon.active) return { label: "Inactive", variant: "secondary" };
  if (coupon.startDate && new Date(coupon.startDate).getTime() > now) return { label: "Scheduled", variant: "outline" };
  if (coupon.endDate && new Date(coupon.endDate).getTime() < now) return { label: "Expired", variant: "destructive" };
  if (coupon.maxRedemptions != null && coupon.timesUsed >= coupon.maxRedemptions) {
    return { label: "Usage limit reached", variant: "destructive" };
  }
  return { label: "Active", variant: "default" };
}

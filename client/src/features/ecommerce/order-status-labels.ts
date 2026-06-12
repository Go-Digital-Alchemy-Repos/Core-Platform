import type { BadgeProps } from "@/components/ui/badge";

type BadgeVariant = BadgeProps["variant"];

export interface EcommerceStatusBadge {
  label: string;
  variant: BadgeVariant;
  className?: string;
}

function humanizeStatus(status: string): string {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getEcommerceOrderStatusBadge(status: string): EcommerceStatusBadge {
  const badges: Record<string, EcommerceStatusBadge> = {
    pending: { label: "Pending", variant: "secondary" },
    paid: { label: "Paid", variant: "default" },
    shipped: { label: "Shipped", variant: "outline", className: "border-blue-200 bg-blue-50 text-blue-700" },
    delivered: { label: "Delivered", variant: "outline", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    cancelled: { label: "Cancelled", variant: "destructive" },
  };

  return badges[status] ?? { label: humanizeStatus(status), variant: "outline" };
}

export function getEcommercePaymentStatusBadge(status: string): EcommerceStatusBadge {
  const badges: Record<string, EcommerceStatusBadge> = {
    unpaid: { label: "Unpaid", variant: "secondary" },
    pending_payment: { label: "Pending payment", variant: "outline", className: "border-amber-200 bg-amber-50 text-amber-700" },
    paid: { label: "Paid", variant: "default" },
    failed: { label: "Failed", variant: "destructive" },
    refund_pending: { label: "Refund pending", variant: "outline", className: "border-amber-200 bg-amber-50 text-amber-700" },
    partially_refunded: { label: "Partially refunded", variant: "outline", className: "border-sky-200 bg-sky-50 text-sky-700" },
    refunded: { label: "Refunded", variant: "outline", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    refund_failed: { label: "Refund failed", variant: "outline", className: "border-red-200 bg-red-50 text-red-700" },
  };

  return badges[status] ?? { label: humanizeStatus(status), variant: "outline" };
}

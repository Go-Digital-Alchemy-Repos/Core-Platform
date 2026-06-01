import { renderEmailShell, sendEmail } from "./email.service";
import { logger } from "../utils/logger";
import type { EcommerceOrderWithDetails } from "../storage/ecommerce.storage";
import type { EcommerceShipment } from "@shared/schema";

function money(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function orderUrl(order: { id: string; lookupToken: string }, email: string): string {
  const base = (process.env.APP_URL || "").replace(/\/$/, "");
  const params = new URLSearchParams({ orderId: order.id, email, token: order.lookupToken });
  return `${base}/orders/status?${params.toString()}`;
}

export async function sendEcommerceOrderConfirmation(order: EcommerceOrderWithDetails): Promise<void> {
  if (!order.customer?.email) return;
  const lines = order.items
    .map((item) => `<li>${item.productName} x ${item.quantity}: ${money(item.lineTotal)}</li>`)
    .join("");
  const body = `
    <p>Hi ${order.customer.name || "there"},</p>
    <p>Your order has been received and is being processed.</p>
    <ul>${lines}</ul>
    <p><strong>Total:</strong> ${money(order.totalAmount)}</p>
    <p><a href="${orderUrl(order, order.customer.email)}">View order status</a></p>
  `;
  const html = await renderEmailShell("Order confirmation", body);
  const ok = await sendEmail(order.customer.email, `Order confirmed #${order.id.slice(0, 8)}`, html);
  if (!ok) logger.email.warn("Failed to send ecommerce order confirmation", { orderId: order.id });
}

export async function sendEcommerceOrderStatusEmail(order: EcommerceOrderWithDetails): Promise<void> {
  if (!order.customer?.email) return;
  const body = `<p>Your order status is now <strong>${order.status}</strong>.</p><p><a href="${orderUrl(order, order.customer.email)}">View order status</a></p>`;
  const html = await renderEmailShell("Order status updated", body);
  await sendEmail(order.customer.email, `Order status updated #${order.id.slice(0, 8)}`, html);
}

export async function sendEcommerceOrderStatusLinkEmail(order: EcommerceOrderWithDetails): Promise<void> {
  if (!order.customer?.email) return;
  const body = `
    <p>Hi ${order.customer.name || "there"},</p>
    <p>Use the secure link below to view tracking, shipment, refund, and payment status for your order.</p>
    <p><a href="${orderUrl(order, order.customer.email)}">View order status</a></p>
    <p>If you did not request this link, you can safely ignore this email.</p>
  `;
  const html = await renderEmailShell("Your secure order status link", body);
  await sendEmail(order.customer.email, `Order status link #${order.id.slice(0, 8)}`, html);
}

export async function sendEcommerceShipmentEmail(
  order: EcommerceOrderWithDetails,
  shipment: EcommerceShipment,
): Promise<boolean> {
  if (!order.customer?.email) return false;
  const trackingMarkup = shipment.trackingUrl
    ? `<p><a href="${shipment.trackingUrl}">Track your shipment</a></p>`
    : shipment.trackingNumber
      ? `<p><strong>Tracking number:</strong> ${shipment.trackingNumber}</p>`
      : "";
  const body = `
    <p>Hi ${order.customer.name || "there"},</p>
    <p>Your order has shipped.</p>
    <p><strong>Carrier:</strong> ${shipment.carrier || "Carrier pending"}</p>
    ${trackingMarkup}
    <p><a href="${orderUrl(order, order.customer.email)}">View order status</a></p>
  `;
  const html = await renderEmailShell("Shipping notification", body);
  const ok = await sendEmail(order.customer.email, `Order shipped #${order.id.slice(0, 8)}`, html);
  if (!ok) logger.email.warn("Failed to send ecommerce shipment notification", {
    orderId: order.id,
    shipmentId: shipment.id,
  });
  return ok;
}

export async function sendEcommerceRefundEmail(order: EcommerceOrderWithDetails, amount: number): Promise<void> {
  if (!order.customer?.email) return;
  const html = await renderEmailShell("Refund update", `<p>A refund of ${money(amount)} has been recorded for your order.</p>`);
  await sendEmail(order.customer.email, `Refund update #${order.id.slice(0, 8)}`, html);
}

import { renderEmailShell, sendEmail } from "./email.service";
import { logger } from "../utils/logger";
import { buildPublicSiteUrl } from "../config/client-stack-origins";
import type { EcommerceOrderWithDetails } from "../storage/ecommerce.storage";
import type { EcommerceShipment } from "@shared/schema";

function money(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function orderUrl(order: { id: string; lookupToken: string }, email: string): string {
  const params = new URLSearchParams({ orderId: order.id, email, token: order.lookupToken });
  const path = `/orders/status?${params.toString()}`;
  return buildPublicSiteUrl(path) ?? path;
}

export async function sendEcommerceOrderConfirmation(
  order: EcommerceOrderWithDetails,
): Promise<boolean> {
  if (!order.customer?.email) return true;
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
  const ok = await sendEmail(
    order.customer.email,
    `Order confirmed #${order.id.slice(0, 8)}`,
    html,
  );
  if (!ok) logger.email.warn("Failed to send ecommerce order confirmation", { orderId: order.id });
  return ok;
}

export async function sendEcommerceOrderStatusEmail(
  order: EcommerceOrderWithDetails,
  status = order.status,
): Promise<boolean> {
  if (!order.customer?.email) return true;
  const body = `<p>Your order status is now <strong>${status}</strong>.</p><p><a href="${orderUrl(order, order.customer.email)}">View order status</a></p>`;
  const html = await renderEmailShell("Order status updated", body);
  return sendEmail(order.customer.email, `Order status updated #${order.id.slice(0, 8)}`, html);
}

export async function sendEcommerceOrderStatusLinkEmail(
  order: EcommerceOrderWithDetails,
): Promise<void> {
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
  const shippedItems = (order.fulfillments ?? [])
    .filter((fulfillment) => fulfillment.shipmentId === shipment.id)
    .flatMap((fulfillment) => fulfillment.items ?? []);
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
    );
  let trackingUrl: string | null = null;
  try {
    const parsed = new URL(shipment.trackingUrl ?? "");
    if (["https:", "http:"].includes(parsed.protocol)) trackingUrl = parsed.href;
  } catch {
    /* Legacy malformed tracking values remain plain text. */
  }
  const trackingMarkup = trackingUrl
    ? `<p><a href="${escape(trackingUrl)}">Track your shipment</a></p>`
    : shipment.trackingNumber
      ? `<p><strong>Tracking number:</strong> ${escape(shipment.trackingNumber)}</p>`
      : "";
  const itemMarkup = shippedItems.length
    ? `<ul>${shippedItems.map((item) => `<li>${escape(order.items.find((line) => line.id === item.orderItemId)?.productName ?? "Item")} x ${item.quantity}</li>`).join("")}</ul>`
    : "";
  const body = `
    <p>Hi ${escape(order.customer.name || "there")},</p>
    <p>${shippedItems.length ? "A shipment for your order is on its way." : "Your order has shipped."}</p>
    ${itemMarkup}
    <p><strong>Carrier:</strong> ${escape(shipment.carrier || "Carrier pending")}</p>
    ${trackingMarkup}
    <p><a href="${escape(orderUrl(order, order.customer.email))}">View order status</a></p>
  `;
  const html = await renderEmailShell("Shipping notification", body);
  const ok = await sendEmail(
    order.customer.email,
    `${shippedItems.length ? "Shipment update" : "Order shipped"} #${order.id.slice(0, 8)}`,
    html,
  );
  if (!ok)
    logger.email.warn("Failed to send ecommerce shipment notification", {
      orderId: order.id,
      shipmentId: shipment.id,
    });
  return ok;
}

export async function sendEcommerceRefundEmail(
  order: EcommerceOrderWithDetails,
  amount: number,
): Promise<boolean> {
  if (!order.customer?.email) return true;
  const html = await renderEmailShell(
    "Refund update",
    `<p>A refund of ${money(amount)} has been recorded for your order.</p>`,
  );
  const ok = await sendEmail(order.customer.email, `Refund update #${order.id.slice(0, 8)}`, html);
  if (!ok) logger.email.warn("Failed to send ecommerce refund notification", { orderId: order.id });
  return ok;
}

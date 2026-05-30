import type { EcommerceOrderWithDetails } from "../storage/ecommerce.storage";

export function toPublicEcommerceOrderStatus(order: EcommerceOrderWithDetails) {
  return {
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalAmount: order.totalAmount,
    subtotalAmount: order.subtotalAmount,
    discountAmount: order.discountAmount,
    shippingAmount: order.shippingAmount,
    taxAmount: order.taxAmount,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      variantTitle: item.variantTitle,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      image: item.image,
    })),
    shipments: order.shipments.map((shipment) => ({
      id: shipment.id,
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
      status: shipment.status,
      shippedAt: shipment.shippedAt,
      emailSentAt: shipment.emailSentAt,
    })),
    refunds: order.refunds.map((refund) => ({
      id: refund.id,
      amount: refund.amount,
      status: refund.status,
      createdAt: refund.createdAt,
    })),
  };
}

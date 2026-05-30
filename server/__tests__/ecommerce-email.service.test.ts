import { describe, expect, it, vi, beforeEach } from "vitest";
import type { EcommerceShipment } from "@shared/schema";
import type { EcommerceOrderWithDetails } from "../storage/ecommerce.storage";

const mockRenderEmailShell = vi.fn(async (_title: string, body: string) => `<html>${body}</html>`);
const mockSendEmail = vi.fn(async () => true);

vi.mock("../services/email.service", () => ({
  renderEmailShell: mockRenderEmailShell,
  sendEmail: mockSendEmail,
}));

vi.mock("../utils/logger", () => ({
  logger: {
    email: { warn: vi.fn() },
  },
}));

describe("ecommerce email service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends shipment notifications with tracking details", async () => {
    const { sendEcommerceShipmentEmail } = await import("../services/ecommerce-email.service");
    const order = {
      id: "order-12345678",
      lookupToken: "lookup-token",
      totalAmount: 10000,
      customer: { id: "customer-1", email: "buyer@example.com", name: "Buyer" },
      items: [],
      refunds: [],
      shipments: [],
      fulfillments: [],
    } as unknown as EcommerceOrderWithDetails;
    const shipment = {
      id: "shipment-1",
      orderId: order.id,
      carrier: "UPS",
      trackingNumber: "1Z999",
      trackingUrl: "https://track.example.com/1Z999",
      status: "shipped",
      shippedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as EcommerceShipment;

    const ok = await sendEcommerceShipmentEmail(order, shipment);

    expect(ok).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledWith(
      "buyer@example.com",
      "Order shipped #order-12",
      expect.stringContaining("https://track.example.com/1Z999"),
    );
  });
});

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

  it("describes only the linked shipped subset and escapes product names", async () => {
    const { sendEcommerceShipmentEmail } = await import("../services/ecommerce-email.service");
    const order = {
      id: "order-partial",
      lookupToken: "synthetic",
      customer: { email: "buyer@example.test", name: "Buyer" },
      items: [
        { id: "item1", productName: "<Apple>", quantity: 5 },
        { id: "item2", productName: "Unshipped", quantity: 2 },
      ],
      fulfillments: [{ shipmentId: "ship1", items: [{ orderItemId: "item1", quantity: 1 }] }],
    } as unknown as EcommerceOrderWithDetails;
    await sendEcommerceShipmentEmail(order, { id: "ship1", carrier: "UPS" } as EcommerceShipment);
    expect(mockSendEmail).toHaveBeenCalledWith(
      "buyer@example.test",
      "Shipment update #order-pa",
      expect.stringContaining("&lt;Apple&gt; x 1"),
    );
    expect(mockRenderEmailShell.mock.calls[0][1]).not.toContain("Unshipped");
    expect(mockRenderEmailShell.mock.calls[0][1]).not.toContain("Your order has shipped");
  });

  it("escapes shipment text and attributes and drops unsafe legacy tracking links", async () => {
    const { sendEcommerceShipmentEmail } = await import("../services/ecommerce-email.service");
    const order = {
      id: "order",
      lookupToken: "token",
      customer: { email: "buyer@example.test", name: '<img src=x onerror="bad">' },
      items: [],
      fulfillments: [],
    } as unknown as EcommerceOrderWithDetails;
    const shipment = {
      id: "ship",
      carrier: "<b>evil</b>",
      trackingNumber: '"><img src=x>',
      trackingUrl: "javascript:alert(1)",
    } as EcommerceShipment;
    await sendEcommerceShipmentEmail(order, shipment);
    const html = mockRenderEmailShell.mock.calls[0][1];
    expect(html).toContain("&lt;img");
    expect(html).toContain("&lt;b&gt;evil&lt;/b&gt;");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("javascript:");
    await sendEcommerceShipmentEmail(order, {
      ...shipment,
      trackingUrl: 'https://track.example.test/?a=1&b="quoted"',
    });
    expect(mockRenderEmailShell.mock.calls[1][1]).toContain("a=1&amp;b=%22quoted%22");
  });

  it("uses the public site origin for customer order-status links", async () => {
    const originalPublicSiteOrigin = process.env.PUBLIC_SITE_ORIGIN;
    const originalAppUrl = process.env.APP_URL;
    process.env.PUBLIC_SITE_ORIGIN = "https://www.example.com";
    process.env.APP_URL = "https://admin.example.com";
    try {
      const { sendEcommerceOrderStatusLinkEmail } =
        await import("../services/ecommerce-email.service");
      const order = {
        id: "order-12345678",
        lookupToken: "lookup-token",
        customer: { id: "customer-1", email: "buyer@example.com", name: "Buyer" },
        items: [],
        refunds: [],
        shipments: [],
        fulfillments: [],
      } as unknown as EcommerceOrderWithDetails;

      await sendEcommerceOrderStatusLinkEmail(order);

      expect(mockSendEmail).toHaveBeenCalledWith(
        "buyer@example.com",
        "Order status link #order-12",
        expect.stringContaining("https://www.example.com/orders/status?"),
      );
    } finally {
      if (originalPublicSiteOrigin === undefined) delete process.env.PUBLIC_SITE_ORIGIN;
      else process.env.PUBLIC_SITE_ORIGIN = originalPublicSiteOrigin;
      if (originalAppUrl === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = originalAppUrl;
    }
  });
});

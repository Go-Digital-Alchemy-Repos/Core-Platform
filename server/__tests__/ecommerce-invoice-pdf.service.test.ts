import { describe, expect, it } from "vitest";
import type { EcommerceOrderWithDetails } from "../storage/ecommerce.storage";
import { renderEcommerceInvoicePdf } from "../services/ecommerce-invoice-pdf.service";

describe("ecommerce invoice PDF service", () => {
  it("renders a PDF invoice for a customer order", async () => {
    const pdf = await renderEcommerceInvoicePdf({
      id: "9fb5c5a2-79d0-447b-90cc-82c2f9f8395f",
      status: "paid",
      paymentStatus: "paid",
      subtotalAmount: 2900,
      discountAmount: 500,
      shippingAmount: 695,
      taxAmount: 216,
      totalAmount: 3311,
      createdAt: new Date("2026-05-30T12:00:00Z"),
      shippingName: "Mike Dickerman",
      shippingCompany: null,
      shippingAddress: "120 Monroe Center St NW",
      shippingLine2: "Suite 400",
      shippingCity: "Grand Rapids",
      shippingState: "MI",
      shippingZip: "49503",
      shippingCountry: "US",
      items: [
        {
          id: "item-1",
          productName: "Family Transition Conversation Cards",
          variantTitle: "Default",
          quantity: 1,
          unitPrice: 2900,
          lineTotal: 2900,
        },
      ],
      shipments: [],
    } as EcommerceOrderWithDetails);

    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(1000);
  });
});

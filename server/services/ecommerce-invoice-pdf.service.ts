import PDFDocument from "pdfkit";
import type { EcommerceOrderWithDetails } from "../storage/ecommerce.storage";

function formatCurrency(cents: number | null | undefined) {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function addressLines(order: EcommerceOrderWithDetails) {
  return [
    order.shippingName,
    order.shippingCompany,
    order.shippingAddress,
    order.shippingLine2,
    [order.shippingCity, order.shippingState, order.shippingZip].filter(Boolean).join(", "),
    order.shippingCountry,
  ].filter((line): line is string => Boolean(line));
}

function writeKeyValue(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number) {
  doc.font("Helvetica").fontSize(9).fillColor("#667085").text(label, x, y);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text(value || "-", x, y + 14);
}

export async function renderEcommerceInvoicePdf(order: EcommerceOrderWithDetails): Promise<Buffer> {
  const doc = new PDFDocument({ size: "LETTER", margin: 54, bufferPages: true });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const invoiceNumber = order.id.slice(0, 8).toUpperCase();
  const paidLabel = order.paymentStatus === "paid" ? "Paid invoice" : "Order invoice";
  doc.font("Helvetica-Bold").fontSize(24).fillColor("#111827").text("Core Platform", 54, 54);
  doc.font("Helvetica").fontSize(10).fillColor("#667085").text("Customer order invoice", 54, 84);
  doc.font("Helvetica-Bold").fontSize(22).fillColor("#111827").text(paidLabel, 360, 54, { align: "right" });
  doc.font("Helvetica").fontSize(10).fillColor("#667085").text(`Invoice #${invoiceNumber}`, 360, 84, { align: "right" });

  doc.moveTo(54, 120).lineTo(558, 120).strokeColor("#D0D5DD").lineWidth(1).stroke();

  writeKeyValue(doc, "Order", `#${invoiceNumber}`, 54, 144);
  writeKeyValue(doc, "Placed", formatDate(order.createdAt), 190, 144);
  writeKeyValue(doc, "Payment status", order.paymentStatus.replaceAll("_", " "), 326, 144);
  writeKeyValue(doc, "Order status", order.status, 462, 144);

  doc.roundedRect(54, 206, 240, 120, 6).strokeColor("#D0D5DD").stroke();
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827").text("Ship to", 72, 224);
  const lines = addressLines(order);
  if (lines.length) {
    doc.font("Helvetica").fontSize(10).fillColor("#344054");
    lines.forEach((line, index) => doc.text(line, 72, 248 + index * 15));
  } else {
    doc.font("Helvetica").fontSize(10).fillColor("#667085").text("Shipping address was not captured for this order.", 72, 248, { width: 190 });
  }

  doc.roundedRect(318, 206, 240, 120, 6).strokeColor("#D0D5DD").stroke();
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827").text("Totals", 336, 224);
  const totalRows: Array<[string, string, boolean?]> = [
    ["Subtotal", formatCurrency(order.subtotalAmount)],
    ["Discount", `-${formatCurrency(order.discountAmount)}`],
    ["Shipping", formatCurrency(order.shippingAmount)],
    ["Tax", formatCurrency(order.taxAmount)],
    ["Total", formatCurrency(order.totalAmount), true],
  ];
  totalRows.forEach(([label, value, strong], index) => {
    const y = 248 + index * 15;
    doc.font(strong ? "Helvetica-Bold" : "Helvetica").fontSize(strong ? 11 : 10).fillColor(strong ? "#111827" : "#344054");
    doc.text(label, 336, y);
    doc.text(value, 450, y, { width: 86, align: "right" });
  });

  let y = 366;
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#111827").text("Items", 54, y);
  y += 24;
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#667085");
  doc.text("Item", 54, y);
  doc.text("Qty", 350, y, { width: 40, align: "right" });
  doc.text("Unit", 408, y, { width: 60, align: "right" });
  doc.text("Line total", 488, y, { width: 70, align: "right" });
  y += 16;
  doc.moveTo(54, y).lineTo(558, y).strokeColor("#D0D5DD").stroke();
  y += 12;

  order.items.forEach((item) => {
    if (y > 690) {
      doc.addPage();
      y = 54;
    }
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text(item.productName, 54, y, { width: 270 });
    if (item.variantTitle) {
      doc.font("Helvetica").fontSize(9).fillColor("#667085").text(item.variantTitle, 54, y + 14, { width: 270 });
    }
    doc.font("Helvetica").fontSize(10).fillColor("#344054");
    doc.text(String(item.quantity), 350, y, { width: 40, align: "right" });
    doc.text(formatCurrency(item.unitPrice), 408, y, { width: 60, align: "right" });
    doc.text(formatCurrency(item.lineTotal), 488, y, { width: 70, align: "right" });
    y += item.variantTitle ? 42 : 30;
  });

  y += 12;
  doc.moveTo(54, y).lineTo(558, y).strokeColor("#D0D5DD").stroke();
  y += 24;
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827").text("Shipment information", 54, y);
  y += 20;
  if (order.shipments.length) {
    order.shipments.forEach((shipment) => {
      doc.font("Helvetica").fontSize(10).fillColor("#344054").text(
        `${shipment.carrier || "Carrier pending"} - ${shipment.trackingNumber || "Tracking pending"} - ${shipment.status}`,
        54,
        y,
        { width: 504 },
      );
      y += 16;
    });
  } else {
    doc.font("Helvetica").fontSize(10).fillColor("#667085").text("Tracking will appear once the order ships.", 54, y);
  }

  doc.font("Helvetica").fontSize(8).fillColor("#98A2B3").text(
    "This invoice was generated from the customer's Core Platform account.",
    54,
    742,
    { width: 504, align: "center" },
  );

  doc.end();
  return finished;
}

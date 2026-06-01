import { and, eq, ilike, isNull } from "drizzle-orm";
import { db, pool } from "../db";
import {
  ecommerceCustomers,
  ecommerceOrderItems,
  ecommerceOrders,
  ecommerceProductVariants,
  ecommerceProducts,
  ecommerceRefunds,
  ecommerceShipments,
  users,
} from "@shared/schema";

function argValue(name: string, fallback?: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function trackingUrl(carrier: string, trackingNumber: string) {
  if (carrier.toLowerCase() === "ups") {
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(trackingNumber)}`;
  }
  if (carrier.toLowerCase() === "usps") {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackingNumber)}`;
  }
  return null;
}

async function main() {
  const email = argValue("--email", "mike@godigitalalchemy.com")!.trim().toLowerCase();

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    throw new Error(`No user found for ${email}. Sign in once or create the account before seeding orders.`);
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || "Mike Dickerman";
  const [existingCustomer] = await db
    .select()
    .from(ecommerceCustomers)
    .where(eq(ecommerceCustomers.email, email))
    .limit(1);

  const customer = existingCustomer
    ? (await db
      .update(ecommerceCustomers)
      .set({
        userId: user.id,
        name,
        phone: "(616) 555-0144",
        address: "120 Monroe Center St NW",
        line2: "Suite 400",
        city: "Grand Rapids",
        state: "MI",
        zipCode: "49503",
        country: "US",
        updatedAt: new Date(),
      })
      .where(eq(ecommerceCustomers.id, existingCustomer.id))
      .returning())[0]
    : (await db.insert(ecommerceCustomers).values({
      userId: user.id,
      email,
      name,
      phone: "(616) 555-0144",
      address: "120 Monroe Center St NW",
      line2: "Suite 400",
      city: "Grand Rapids",
      state: "MI",
      zipCode: "49503",
      country: "US",
    }).returning())[0];

  const seededOrders = await db
    .select()
    .from(ecommerceOrders)
    .where(and(
      eq(ecommerceOrders.customerId, customer.id),
      ilike(ecommerceOrders.notes, "Seeded customer portal demo:%"),
    ));

  if (seededOrders.length >= 3) {
    console.log(`Customer ${email} already has ${seededOrders.length} seeded portal demo orders.`);
    return;
  }

  const products = await db
    .select()
    .from(ecommerceProducts)
    .where(and(
      eq(ecommerceProducts.active, true),
      eq(ecommerceProducts.status, "published"),
      isNull(ecommerceProducts.archivedAt),
    ))
    .limit(5);

  if (products.length === 0) {
    throw new Error("No active published ecommerce products found. Seed products before seeding customer orders.");
  }

  const variants = await db.select().from(ecommerceProductVariants);
  const demos = [
    { status: "delivered", paymentStatus: "paid", days: 42, carrier: "UPS", tracking: "1Z999AA10123456784", refund: 0 },
    { status: "shipped", paymentStatus: "paid", days: 8, carrier: "USPS", tracking: "9400111202555012345678", refund: 0 },
    { status: "paid", paymentStatus: "partially_refunded", days: 2, carrier: null, tracking: null, refund: 1200 },
  ];

  for (let i = seededOrders.length; i < demos.length; i += 1) {
    const demo = demos[i];
    const product = products[i % products.length];
    const variant = variants.find((item) => item.productId === product.id && item.isDefault)
      ?? variants.find((item) => item.productId === product.id)
      ?? null;
    const quantity = i === 1 ? 2 : 1;
    const unitPrice = variant?.salePrice ?? variant?.price ?? product.salePrice ?? product.price;
    const subtotalAmount = unitPrice * quantity;
    const shippingAmount = product.requiresShipping ? (i === 0 ? 995 : 695) : 0;
    const taxAmount = Math.round((subtotalAmount + shippingAmount) * 0.06);
    const discountAmount = i === 2 ? 500 : 0;
    const totalAmount = subtotalAmount + shippingAmount + taxAmount - discountAmount;
    const createdAt = daysAgo(demo.days);

    await db.transaction(async (tx) => {
      const [order] = await tx.insert(ecommerceOrders).values({
        customerId: customer.id,
        status: demo.status,
        paymentStatus: demo.paymentStatus,
        subtotalAmount,
        shippingAmount,
        taxAmount,
        discountAmount,
        totalAmount,
        isManualOrder: true,
        notes: `Seeded customer portal demo: ${demo.status}`,
        shippingName: customer.name,
        shippingAddress: customer.address,
        shippingLine2: customer.line2,
        shippingCity: customer.city,
        shippingState: customer.state,
        shippingZip: customer.zipCode,
        shippingCountry: customer.country,
        billingSameAsShipping: true,
        billingName: customer.name,
        billingAddress: customer.address,
        billingLine2: customer.line2,
        billingCity: customer.city,
        billingState: customer.state,
        billingZip: customer.zipCode,
        billingCountry: customer.country,
        createdAt,
        updatedAt: createdAt,
      }).returning();

      await tx.insert(ecommerceOrderItems).values({
        orderId: order.id,
        productId: product.id,
        variantId: variant?.id,
        productName: product.name,
        variantTitle: variant?.title,
        sku: variant?.sku ?? product.sku,
        optionsSnapshot: variant?.optionValues ?? null,
        productSlug: product.urlSlug,
        image: variant?.image ?? product.primaryImage,
        productSnapshot: {
          name: product.name,
          urlSlug: product.urlSlug,
          type: product.productType,
          vendor: product.vendor,
        },
        taxable: product.taxable,
        taxCategory: product.taxCategory,
        taxAmount,
        requiresShipping: product.requiresShipping,
        fulfillmentType: product.fulfillmentType,
        quantity,
        unitPrice,
        lineTotal: subtotalAmount,
      });

      if (demo.carrier && demo.tracking) {
        await tx.insert(ecommerceShipments).values({
          orderId: order.id,
          carrier: demo.carrier,
          trackingNumber: demo.tracking,
          trackingUrl: trackingUrl(demo.carrier, demo.tracking),
          status: demo.status === "delivered" ? "delivered" : "in_transit",
          shippedBy: user.id,
          shippedAt: daysAgo(Math.max(1, demo.days - 3)),
          emailSentAt: daysAgo(Math.max(1, demo.days - 3)),
          createdAt,
          updatedAt: new Date(),
        });
      }

      if (demo.refund > 0) {
        await tx.insert(ecommerceRefunds).values({
          orderId: order.id,
          amount: demo.refund,
          reason: "Customer portal demo partial refund",
          reasonCode: "demo",
          type: "partial",
          source: "manual",
          status: "processed",
          processedBy: user.id,
          processedAt: daysAgo(1),
          createdAt: daysAgo(1),
          updatedAt: daysAgo(1),
        });
      }

      console.log(`Seeded ${demo.status} order ${order.id} for ${email}`);
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";
import { paramString } from "../../utils/params";
import {
  insertEcommerceCategorySchema,
  insertEcommerceCouponSchema,
  insertEcommerceProductSchema,
  insertEcommerceShipmentSchema,
  insertEcommerceShippingRateSchema,
  insertEcommerceShippingZoneSchema,
} from "@shared/schema";
import {
  getMaskedEcommerceStripeStatus,
  testEcommerceStripeConnection,
  validateStripeKeyMode,
  type EcommerceStripeMode,
} from "../../services/ecommerce-stripe.service";
import { createEcommerceRefund } from "../../services/ecommerce-refund.service";
import { sendEcommerceOrderStatusEmail } from "../../services/ecommerce-email.service";

const router = Router();

const productPayloadSchema = insertEcommerceProductSchema.extend({
  categoryIds: z.array(z.string()).default([]),
});

router.get("/products", asyncHandler(async (_req, res) => {
  const products = await storage.ecommerce.getProducts();
  const withCategories = await Promise.all(products.map(async (product) => ({
    ...product,
    categories: await storage.ecommerce.getProductCategories(product.id),
  })));
  res.json(withCategories);
}));

router.post("/products", asyncHandler(async (req, res) => {
  const { categoryIds, ...data } = productPayloadSchema.parse(req.body);
  res.status(201).json(await storage.ecommerce.createProduct(data, categoryIds));
}));

router.put("/products/:id", asyncHandler(async (req, res) => {
  const parsed = productPayloadSchema.partial().parse(req.body);
  const { categoryIds, ...data } = parsed;
  const product = await storage.ecommerce.updateProduct(paramString(req.params.id), data, categoryIds);
  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  res.json(product);
}));

router.delete("/products/:id", asyncHandler(async (req, res) => {
  await storage.ecommerce.deleteProduct(paramString(req.params.id));
  res.json({ success: true });
}));

router.get("/categories", asyncHandler(async (_req, res) => {
  res.json(await storage.ecommerce.getCategories(false));
}));

router.post("/categories", asyncHandler(async (req, res) => {
  res.status(201).json(await storage.ecommerce.createCategory(insertEcommerceCategorySchema.parse(req.body)));
}));

router.put("/categories/:id", asyncHandler(async (req, res) => {
  const category = await storage.ecommerce.updateCategory(paramString(req.params.id), insertEcommerceCategorySchema.partial().parse(req.body));
  if (!category) {
    res.status(404).json({ message: "Category not found" });
    return;
  }
  res.json(category);
}));

router.delete("/categories/:id", asyncHandler(async (req, res) => {
  await storage.ecommerce.deleteCategory(paramString(req.params.id));
  res.json({ success: true });
}));

router.get("/coupons", asyncHandler(async (_req, res) => {
  res.json(await storage.ecommerce.getCoupons());
}));

router.post("/coupons", asyncHandler(async (req, res) => {
  res.status(201).json(await storage.ecommerce.createCoupon(insertEcommerceCouponSchema.parse(req.body)));
}));

router.put("/coupons/:id", asyncHandler(async (req, res) => {
  const coupon = await storage.ecommerce.updateCoupon(paramString(req.params.id), insertEcommerceCouponSchema.partial().parse(req.body));
  if (!coupon) {
    res.status(404).json({ message: "Coupon not found" });
    return;
  }
  res.json(coupon);
}));

router.delete("/coupons/:id", asyncHandler(async (req, res) => {
  await storage.ecommerce.deleteCoupon(paramString(req.params.id));
  res.json({ success: true });
}));

router.get("/orders", asyncHandler(async (_req, res) => {
  res.json(await storage.ecommerce.getOrders());
}));

router.get("/orders/:id", asyncHandler(async (req, res) => {
  const order = await storage.ecommerce.getOrderWithDetails(paramString(req.params.id));
  if (!order) {
    res.status(404).json({ message: "Order not found" });
    return;
  }
  res.json(order);
}));

router.put("/orders/:id", asyncHandler(async (req, res) => {
  const data = z.object({
    status: z.enum(["pending", "paid", "shipped", "delivered", "cancelled"]).optional(),
    notes: z.string().optional(),
  }).parse(req.body);
  const previous = await storage.ecommerce.getOrder(paramString(req.params.id));
  const order = await storage.ecommerce.updateOrder(paramString(req.params.id), data);
  if (!order) {
    res.status(404).json({ message: "Order not found" });
    return;
  }
  if (data.status && previous?.status !== data.status) {
    const details = await storage.ecommerce.getOrderWithDetails(order.id);
    if (details) await sendEcommerceOrderStatusEmail(details);
  }
  res.json(order);
}));

router.post("/orders/manual", asyncHandler(async (req, res) => {
  const data = z.object({
    customerId: z.string().min(1),
    items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1) })).min(1),
    notes: z.string().optional(),
  }).parse(req.body);
  const products = await storage.ecommerce.getProductsByIds(data.items.map((item) => item.productId));
  const productMap = new Map(products.map((product) => [product.id, product]));
  const lines = data.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new Error("Product not found");
    return { product, quantity: item.quantity, lineTotal: product.price * item.quantity };
  });
  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  res.status(201).json(await storage.ecommerce.createOrder({
    customerId: data.customerId,
    status: "paid",
    paymentStatus: "paid",
    subtotalAmount: total,
    totalAmount: total,
    taxAmount: 0,
    shippingAmount: 0,
    discountAmount: 0,
    isManualOrder: true,
    notes: data.notes,
  }, lines.map((line) => ({
    orderId: "",
    productId: line.product.id,
    productName: line.product.name,
    quantity: line.quantity,
    unitPrice: line.product.price,
    lineTotal: line.lineTotal,
  }))));
}));

router.post("/refunds", asyncHandler(async (req, res) => {
  const data = z.object({
    orderId: z.string(),
    amount: z.number().int().min(1),
    reason: z.string().optional(),
    reasonCode: z.string().optional(),
    type: z.enum(["full", "partial"]).optional(),
    source: z.enum(["stripe", "manual"]).optional(),
  }).parse(req.body);
  res.status(201).json(await createEcommerceRefund({ ...data, processedBy: req.user?.id }));
}));

router.get("/shipping/zones", asyncHandler(async (_req, res) => {
  res.json(await storage.ecommerce.getShippingZones());
}));

router.post("/shipping/zones", asyncHandler(async (req, res) => {
  res.status(201).json(await storage.ecommerce.createShippingZone(insertEcommerceShippingZoneSchema.parse(req.body)));
}));

router.put("/shipping/zones/:id", asyncHandler(async (req, res) => {
  const zone = await storage.ecommerce.updateShippingZone(paramString(req.params.id), insertEcommerceShippingZoneSchema.partial().parse(req.body));
  if (!zone) {
    res.status(404).json({ message: "Shipping zone not found" });
    return;
  }
  res.json(zone);
}));

router.delete("/shipping/zones/:id", asyncHandler(async (req, res) => {
  await storage.ecommerce.deleteShippingZone(paramString(req.params.id));
  res.json({ success: true });
}));

router.get("/shipping/rates", asyncHandler(async (req, res) => {
  res.json(await storage.ecommerce.getShippingRates(typeof req.query.zoneId === "string" ? req.query.zoneId : undefined));
}));

router.post("/shipping/rates", asyncHandler(async (req, res) => {
  res.status(201).json(await storage.ecommerce.createShippingRate(insertEcommerceShippingRateSchema.parse(req.body)));
}));

router.put("/shipping/rates/:id", asyncHandler(async (req, res) => {
  const rate = await storage.ecommerce.updateShippingRate(paramString(req.params.id), insertEcommerceShippingRateSchema.partial().parse(req.body));
  if (!rate) {
    res.status(404).json({ message: "Shipping rate not found" });
    return;
  }
  res.json(rate);
}));

router.delete("/shipping/rates/:id", asyncHandler(async (req, res) => {
  await storage.ecommerce.deleteShippingRate(paramString(req.params.id));
  res.json({ success: true });
}));

router.post("/orders/:orderId/shipments", asyncHandler(async (req, res) => {
  const shipment = await storage.ecommerce.createShipment(insertEcommerceShipmentSchema.parse({
    ...req.body,
    orderId: paramString(req.params.orderId),
    shippedBy: req.user?.id,
  }));
  await storage.ecommerce.updateOrder(paramString(req.params.orderId), { status: "shipped" });
  res.status(201).json(shipment);
}));

router.get("/settings/stripe", asyncHandler(async (_req, res) => {
  res.json(await getMaskedEcommerceStripeStatus());
}));

router.put("/settings/stripe", asyncHandler(async (req, res) => {
  const data = z.object({
    activeMode: z.enum(["test", "live"]).default("test"),
    testPublishableKey: z.string().optional(),
    testSecretKey: z.string().optional(),
    testWebhookSecret: z.string().optional(),
    livePublishableKey: z.string().optional(),
    liveSecretKey: z.string().optional(),
    liveWebhookSecret: z.string().optional(),
  }).parse(req.body);

  const activeError = validateStripeKeyMode(
    data.activeMode as EcommerceStripeMode,
    data.activeMode === "live" ? data.livePublishableKey : data.testPublishableKey,
    data.activeMode === "live" ? data.liveSecretKey : data.testSecretKey,
  );
  if (activeError) {
    res.status(400).json({ message: activeError });
    return;
  }

  const writes = [
    storage.settings.upsertSetting("active_mode", data.activeMode, "ecommerce_stripe", false),
  ];
  if (data.testPublishableKey !== undefined) writes.push(storage.settings.upsertSetting("test_publishable_key", data.testPublishableKey, "ecommerce_stripe", false));
  if (data.livePublishableKey !== undefined) writes.push(storage.settings.upsertSetting("live_publishable_key", data.livePublishableKey, "ecommerce_stripe", false));
  if (data.testSecretKey) writes.push(storage.settings.upsertSetting("test_secret_key", data.testSecretKey, "ecommerce_stripe", true));
  if (data.liveSecretKey) writes.push(storage.settings.upsertSetting("live_secret_key", data.liveSecretKey, "ecommerce_stripe", true));
  if (data.testWebhookSecret) writes.push(storage.settings.upsertSetting("test_webhook_secret", data.testWebhookSecret, "ecommerce_stripe", true));
  if (data.liveWebhookSecret) writes.push(storage.settings.upsertSetting("live_webhook_secret", data.liveWebhookSecret, "ecommerce_stripe", true));
  await Promise.all(writes);
  storage.settings.invalidateCategory("ecommerce_stripe");
  res.json(await getMaskedEcommerceStripeStatus());
}));

router.post("/settings/stripe/test", asyncHandler(async (_req, res) => {
  res.json(await testEcommerceStripeConnection());
}));

export default router;

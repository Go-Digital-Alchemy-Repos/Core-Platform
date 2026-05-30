import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";
import { paramString } from "../../utils/params";
import {
  insertEcommerceCategorySchema,
  insertEcommerceCouponSchema,
  insertEcommerceFulfillmentLocationSchema,
  insertEcommerceFulfillmentSchema,
  insertEcommerceProductMediaSchema,
  insertEcommerceProductSchema,
  insertEcommerceProductVariantSchema,
  insertEcommerceShipmentSchema,
  insertEcommerceShippingProviderSchema,
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
import {
  sendEcommerceOrderStatusEmail,
  sendEcommerceShipmentEmail,
} from "../../services/ecommerce-email.service";
import {
  ECOMMERCE_SHIPPING_PROVIDER_REGISTRY,
  getMissingShippingProviderCredentialLabels,
  getShippingProviderCredentialCategory,
  getShippingProviderDefinition,
  mergeShippingProviderStatuses,
} from "../../services/ecommerce-shipping-provider.service";
import { inferCarrierTrackingUrl } from "../../services/ecommerce-shipping-carrier.service";
import {
  ecommerceTaxSettingsSchema,
  getEcommerceTaxSettings,
  saveEcommerceTaxSettings,
} from "../../services/ecommerce-tax.service";
import { requireEcommerceEnabled } from "../../middleware/site-features";

const router = Router();

router.use(requireEcommerceEnabled);

const productPayloadSchema = insertEcommerceProductSchema.extend({
  categoryIds: z.array(z.string()).default([]),
});

async function validateCategoryParent(categoryId: string | null, parentId: string | null | undefined) {
  if (!parentId) return;
  if (categoryId && parentId === categoryId) {
    throw Object.assign(new Error("A category cannot be its own parent"), { statusCode: 400 });
  }

  const categories = await storage.ecommerce.getCategories(false);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  if (!categoryMap.has(parentId)) {
    throw Object.assign(new Error("Parent category not found"), { statusCode: 400 });
  }

  let cursor = categoryMap.get(parentId);
  while (cursor?.parentId) {
    if (categoryId && cursor.parentId === categoryId) {
      throw Object.assign(new Error("A category cannot be moved under one of its subcategories"), {
        statusCode: 400,
      });
    }
    cursor = categoryMap.get(cursor.parentId);
  }
}

router.get("/products", asyncHandler(async (_req, res) => {
  const products = await storage.ecommerce.getProducts();
  const withCategories = await Promise.all(products.map(async (product) => ({
    ...product,
    categories: await storage.ecommerce.getProductCategories(product.id),
    variants: await storage.ecommerce.getProductVariants(product.id),
    media: await storage.ecommerce.getProductMedia(product.id),
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

router.get("/products/:id/variants", asyncHandler(async (req, res) => {
  res.json(await storage.ecommerce.getProductVariants(paramString(req.params.id)));
}));

router.put("/products/:id/variants/:variantId", asyncHandler(async (req, res) => {
  const productId = paramString(req.params.id);
  const variantId = paramString(req.params.variantId);
  const existing = await storage.ecommerce.getProductVariant(variantId);
  if (!existing || existing.productId !== productId) {
    res.status(404).json({ message: "Variant not found" });
    return;
  }
  const variant = await storage.ecommerce.updateProductVariant(
    variantId,
    insertEcommerceProductVariantSchema.partial().parse(req.body),
  );
  res.json(variant);
}));

router.post("/products/:id/media", asyncHandler(async (req, res) => {
  const productId = paramString(req.params.id);
  const product = await storage.ecommerce.getProduct(productId);
  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  const media = await storage.ecommerce.createProductMedia(
    insertEcommerceProductMediaSchema.parse({ ...req.body, productId }),
  );
  res.status(201).json(media);
}));

router.delete("/products/:id", asyncHandler(async (req, res) => {
  await storage.ecommerce.deleteProduct(paramString(req.params.id));
  res.json({ success: true });
}));

router.get("/categories", asyncHandler(async (_req, res) => {
  res.json(await storage.ecommerce.getCategories(false));
}));

router.post("/categories", asyncHandler(async (req, res) => {
  const data = insertEcommerceCategorySchema.parse(req.body);
  await validateCategoryParent(null, data.parentId);
  res.status(201).json(await storage.ecommerce.createCategory(data));
}));

router.put("/categories/:id", asyncHandler(async (req, res) => {
  const categoryId = paramString(req.params.id);
  const data = insertEcommerceCategorySchema.partial().parse(req.body);
  await validateCategoryParent(categoryId, data.parentId);
  const category = await storage.ecommerce.updateCategory(categoryId, data);
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

router.get("/coupons", asyncHandler(async (req, res) => {
  res.json(await storage.ecommerce.getCoupons({
    includeArchived: req.query.includeArchived === "true",
    search: typeof req.query.search === "string" ? req.query.search : undefined,
  }));
}));

router.get("/coupons/:id/report", asyncHandler(async (req, res) => {
  const report = await storage.ecommerce.getCouponReport(paramString(req.params.id));
  if (!report) {
    res.status(404).json({ message: "Coupon not found" });
    return;
  }
  res.json(report);
}));

router.get("/coupons/:id", asyncHandler(async (req, res) => {
  const coupon = await storage.ecommerce.getCoupon(paramString(req.params.id));
  if (!coupon) {
    res.status(404).json({ message: "Coupon not found" });
    return;
  }
  res.json(coupon);
}));

router.post("/coupons", asyncHandler(async (req, res) => {
  const data = insertEcommerceCouponSchema.parse({ ...req.body, createdBy: req.user?.id, updatedBy: req.user?.id });
  res.status(201).json(await storage.ecommerce.createCoupon(data));
}));

router.post("/coupons/:id/duplicate", asyncHandler(async (req, res) => {
  const data = z.object({ code: z.string().min(1) }).parse(req.body);
  const coupon = await storage.ecommerce.duplicateCoupon(paramString(req.params.id), data.code);
  if (!coupon) {
    res.status(404).json({ message: "Coupon not found" });
    return;
  }
  res.status(201).json(coupon);
}));

router.put("/coupons/:id", asyncHandler(async (req, res) => {
  const coupon = await storage.ecommerce.updateCoupon(
    paramString(req.params.id),
    insertEcommerceCouponSchema.partial().parse({ ...req.body, updatedBy: req.user?.id }),
  );
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
    productSlug: line.product.urlSlug,
    image: line.product.primaryImage,
    productSnapshot: {
      productId: line.product.id,
      productName: line.product.name,
      slug: line.product.urlSlug,
      image: line.product.primaryImage,
      taxable: line.product.taxable,
      taxCategory: line.product.taxCategory,
      requiresShipping: line.product.requiresShipping,
      fulfillmentType: line.product.fulfillmentType,
    },
    taxable: line.product.taxable,
    taxCategory: line.product.taxCategory,
    requiresShipping: line.product.requiresShipping,
    fulfillmentType: line.product.fulfillmentType,
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

router.get("/shipping/locations", asyncHandler(async (_req, res) => {
  res.json(await storage.ecommerce.getFulfillmentLocations());
}));

router.post("/shipping/locations", asyncHandler(async (req, res) => {
  res.status(201).json(await storage.ecommerce.createFulfillmentLocation(
    insertEcommerceFulfillmentLocationSchema.parse(req.body),
  ));
}));

router.put("/shipping/locations/:id", asyncHandler(async (req, res) => {
  const location = await storage.ecommerce.updateFulfillmentLocation(
    paramString(req.params.id),
    insertEcommerceFulfillmentLocationSchema.partial().parse(req.body),
  );
  if (!location) {
    res.status(404).json({ message: "Fulfillment location not found" });
    return;
  }
  res.json(location);
}));

router.get("/shipping/providers", asyncHandler(async (_req, res) => {
  const credentialStatus: Record<string, Record<string, boolean>> = {};
  await Promise.all(ECOMMERCE_SHIPPING_PROVIDER_REGISTRY.map(async (definition) => {
    const settings = await storage.settings.getDecryptedCategory(
      getShippingProviderCredentialCategory(definition.provider),
    );
    credentialStatus[definition.provider] = Object.fromEntries(
      definition.setupFields.map((field) => [field.key, Boolean(settings[field.key])]),
    );
  }));
  res.json(mergeShippingProviderStatuses(await storage.ecommerce.getShippingProviders(), credentialStatus));
}));

router.get("/shipping/providers/:provider/readiness", asyncHandler(async (req, res) => {
  const provider = paramString(req.params.provider);
  const definition = getShippingProviderDefinition(provider);
  if (!definition) {
    res.status(404).json({ message: "Shipping provider not found" });
    return;
  }

  const [settings, configuredProviders] = await Promise.all([
    storage.settings.getDecryptedCategory(getShippingProviderCredentialCategory(provider)),
    storage.ecommerce.getShippingProviders(),
  ]);
  const credentialStatus = {
    [provider]: Object.fromEntries(definition.setupFields.map((field) => [field.key, Boolean(settings[field.key])])),
  };
  const [status] = mergeShippingProviderStatuses(
    configuredProviders.filter((configuredProvider) => configuredProvider.provider === provider),
    credentialStatus,
  ).filter((candidate) => candidate.provider === provider);
  res.json(status);
}));

router.put("/shipping/providers/:provider", asyncHandler(async (req, res) => {
  const provider = paramString(req.params.provider);
  const definition = getShippingProviderDefinition(provider);
  if (!definition) {
    res.status(404).json({ message: "Shipping provider not found" });
    return;
  }

  const data = insertEcommerceShippingProviderSchema.partial().extend({
    displayName: z.string().min(1),
    type: z.enum(["direct_carrier", "aggregator", "workflow", "marketplace"]),
  }).parse({ ...req.body, provider });

  if (data.active) {
    const settings = await storage.settings.getDecryptedCategory(getShippingProviderCredentialCategory(provider));
    const missingCredentialLabels = getMissingShippingProviderCredentialLabels(definition, settings);
    if (missingCredentialLabels.length > 0) {
      res.status(400).json({
        message: `Save ${missingCredentialLabels.join(", ")} before activating ${definition.displayName}.`,
        missingCredentialLabels,
      });
      return;
    }
  }

  res.json(await storage.ecommerce.upsertShippingProvider({
    provider,
    displayName: data.displayName,
    type: data.type,
    capabilities: data.capabilities ?? [],
    settings: data.settings ?? {},
    testMode: data.testMode ?? true,
    active: data.active ?? false,
    connectedAt: data.active ? data.connectedAt ?? new Date() : data.connectedAt ?? null,
  }));
}));

router.put("/shipping/providers/:provider/credentials", asyncHandler(async (req, res) => {
  const provider = paramString(req.params.provider);
  const definition = getShippingProviderDefinition(provider);
  if (!definition) {
    res.status(404).json({ message: "Shipping provider not found" });
    return;
  }

  const credentials = z.record(z.string(), z.string()).parse(req.body.credentials ?? {});
  const category = getShippingProviderCredentialCategory(provider);
  const writes = definition.setupFields
    .map((field) => ({ field, value: credentials[field.key]?.trim() }))
    .filter((entry): entry is { field: typeof definition.setupFields[number]; value: string } => Boolean(entry.value))
    .map(({ field, value }) => storage.settings.upsertSetting(field.key, value, category, field.secret ?? true));

  await Promise.all(writes);
  storage.settings.invalidateCategory(category);

  const settings = await storage.settings.getDecryptedCategory(category);
  res.json({
    provider,
    setupFields: definition.setupFields.map((field) => ({
      key: field.key,
      label: field.label,
      secret: field.secret ?? true,
      hasValue: Boolean(settings[field.key]),
    })),
  });
}));

router.post("/orders/:orderId/shipments", asyncHandler(async (req, res) => {
  const orderId = paramString(req.params.orderId);
  const shipmentPayload = insertEcommerceShipmentSchema.parse({
    ...req.body,
    orderId,
    shippedBy: req.user?.id,
  });
  const shipment = await storage.ecommerce.createShipment({
    ...shipmentPayload,
    trackingUrl: inferCarrierTrackingUrl(shipmentPayload),
  });
  await storage.ecommerce.updateOrder(orderId, { status: "shipped" });
  const details = await storage.ecommerce.getOrderWithDetails(orderId);
  if (details && await sendEcommerceShipmentEmail(details, shipment)) {
    const updatedShipment = await storage.ecommerce.updateShipment(shipment.id, { emailSentAt: new Date() });
    res.status(201).json(updatedShipment ?? shipment);
    return;
  }
  res.status(201).json(shipment);
}));

router.get("/orders/:orderId/fulfillments", asyncHandler(async (req, res) => {
  res.json(await storage.ecommerce.getFulfillmentsForOrder(paramString(req.params.orderId)));
}));

router.post("/orders/:orderId/fulfillments", asyncHandler(async (req, res) => {
  const body = z.object({
    fulfillment: insertEcommerceFulfillmentSchema.omit({ orderId: true }),
    items: z.array(z.object({
      orderItemId: z.string().min(1),
      quantity: z.number().int().min(1),
    })).default([]),
  }).parse(req.body);

  res.status(201).json(await storage.ecommerce.createFulfillment(
    {
      ...body.fulfillment,
      orderId: paramString(req.params.orderId),
      trackingUrl: inferCarrierTrackingUrl(body.fulfillment),
    },
    body.items,
  ));
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

router.get("/settings/tax", asyncHandler(async (_req, res) => {
  res.json(await getEcommerceTaxSettings());
}));

router.put("/settings/tax", asyncHandler(async (req, res) => {
  res.json(await saveEcommerceTaxSettings(ecommerceTaxSettingsSchema.parse(req.body)));
}));

export default router;

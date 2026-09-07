import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";
import { paramString } from "../../utils/params";
import {
  insertEcommerceCategorySchema,
  insertEcommerceCouponSchema,
  insertEcommerceCustomerSchema,
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
  validateStripeSettingsKeyModes,
  type EcommerceStripeMode,
} from "../../services/ecommerce-stripe.service";
import {
  createEcommerceRefund,
  reconcileEcommerceRefund,
} from "../../services/ecommerce-refund.service";
import { ECOMMERCE_REFUND_PROVIDERS } from "../../services/ecommerce-payment-gateway-refund.service";
import {
  adminOrderUpdateSchema,
  assertEcommerceFulfillmentRequest,
  assertEcommerceOrderCanShip,
  createManualEcommerceOrder,
  createManualEcommerceOrderDraft,
  createPaymentLinkForOrder,
  createStandalonePaymentRequest,
  fulfillmentItemsSchema,
  markManualEcommerceOrderPaid,
  manualOrderSchema,
  manualPaymentSchema,
  standalonePaymentRequestSchema,
  updateAdminEcommerceOrder,
} from "../../services/ecommerce-order.service";
import { replayEcommerceStripeWebhook } from "../../webhooks/ecommerce-stripe.handler";
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
import {
  ecommerceCustomerAccountSettingsSchema,
  getEcommerceCustomerAccountSettings,
  saveEcommerceCustomerAccountSettings,
} from "../../services/ecommerce-customer-account.service";
import {
  getEcommerceStoreSettings,
  saveEcommerceStoreSettings,
} from "../../services/ecommerce-store-settings.service";
import {
  createEcommerceFraudBlock,
  deleteEcommerceFraudBlock,
  ecommerceFraudSettingsSchema,
  getEcommerceFraudSettings,
  getEcommerceSecurityOverview,
  reviewEcommerceOrderFraud,
  saveEcommerceFraudSettings,
} from "../../services/ecommerce-fraud.service";
import { ecommerceStoreSettingsSchema } from "@shared/ecommerce-shipping-settings";
import { requireEcommerceEnabled } from "../../middleware/site-features";
import { noStorePrivateResponse } from "../../middleware/security";

const router = Router();

router.use(requireEcommerceEnabled);
router.use(noStorePrivateResponse);

function toWebhookDeliverySummary(delivery: {
  eventId: string;
  eventType: string;
  status: string;
  attemptCount: number;
  startedAt: Date;
  completedAt: Date | null;
  processedAt: Date | null;
  lastError: string | null;
}) {
  return {
    eventId: delivery.eventId,
    eventType: delivery.eventType,
    status: delivery.status,
    attemptCount: delivery.attemptCount,
    startedAt: delivery.startedAt,
    completedAt: delivery.completedAt,
    processedAt: delivery.processedAt,
    hasFailure: Boolean(delivery.lastError),
  };
}

function toNotificationJobSummary(job: {
  id: string;
  type: string;
  status: string;
  orderId: string;
  attemptCount: number;
  createdAt: Date;
  failedAt: Date | null;
  lastErrorCode: string | null;
}) {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    orderId: job.orderId,
    attemptCount: job.attemptCount,
    createdAt: job.createdAt,
    failedAt: job.failedAt,
    hasFailure: Boolean(job.lastErrorCode),
  };
}

const productPayloadSchema = insertEcommerceProductSchema.extend({
  categoryIds: z.array(z.string()).default([]),
});

async function validateCategorySlug(categoryId: string | null, slug: string | null | undefined) {
  if (!slug) return;

  const normalizedSlug = slug.trim().toLowerCase();
  const categories = await storage.ecommerce.getCategories(false);
  const existingCategory = categories.find(
    (category) => category.slug.toLowerCase() === normalizedSlug,
  );
  if (existingCategory && existingCategory.id !== categoryId) {
    throw Object.assign(new Error("A category with this slug already exists"), { statusCode: 409 });
  }
}

async function validateProductSlug(productId: string | null, slug: string | null | undefined) {
  if (!slug) return;

  const normalizedSlug = slug.trim().toLowerCase();
  const products = await storage.ecommerce.getProducts({ includeArchived: true });
  const existingProduct = products.find(
    (product) => product.urlSlug.toLowerCase() === normalizedSlug,
  );
  if (existingProduct && existingProduct.id !== productId) {
    throw Object.assign(new Error("A product with this URL slug already exists"), {
      statusCode: 409,
    });
  }
}

router.get(
  "/products",
  asyncHandler(async (_req, res) => {
    const products = await storage.ecommerce.getProducts();
    const withCategories = await Promise.all(
      products.map(async (product) => ({
        ...product,
        categories: await storage.ecommerce.getProductCategories(product.id),
        variants: await storage.ecommerce.getProductVariants(product.id),
        media: await storage.ecommerce.getProductMedia(product.id),
      })),
    );
    res.json(withCategories);
  }),
);

router.post(
  "/products",
  asyncHandler(async (req, res) => {
    const { categoryIds, ...data } = productPayloadSchema.parse(req.body);
    await validateProductSlug(null, data.urlSlug);
    res.status(201).json(await storage.ecommerce.createProduct(data, categoryIds));
  }),
);

router.put(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const productId = paramString(req.params.id);
    const parsed = productPayloadSchema.partial().parse(req.body);
    const { categoryIds, ...data } = parsed;
    await validateProductSlug(productId, data.urlSlug);
    const product = await storage.ecommerce.updateProduct(productId, data, categoryIds);
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    res.json(product);
  }),
);

router.get(
  "/products/:id/variants",
  asyncHandler(async (req, res) => {
    res.json(await storage.ecommerce.getProductVariants(paramString(req.params.id)));
  }),
);

router.put(
  "/products/:id/variants/:variantId",
  asyncHandler(async (req, res) => {
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
  }),
);

router.post(
  "/products/:id/media",
  asyncHandler(async (req, res) => {
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
  }),
);

router.delete(
  "/products/:id",
  asyncHandler(async (req, res) => {
    await storage.ecommerce.deleteProduct(paramString(req.params.id));
    res.json({ success: true });
  }),
);

router.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    res.json(await storage.ecommerce.getCategories(false));
  }),
);

router.post(
  "/categories",
  asyncHandler(async (req, res) => {
    const data = insertEcommerceCategorySchema.parse(req.body);
    await validateCategorySlug(null, data.slug);
    res.status(201).json(await storage.ecommerce.createCategory(data));
  }),
);

router.put(
  "/categories/:id",
  asyncHandler(async (req, res) => {
    const categoryId = paramString(req.params.id);
    const data = insertEcommerceCategorySchema.partial().parse(req.body);
    await validateCategorySlug(categoryId, data.slug);
    const category = await storage.ecommerce.updateCategory(categoryId, data);
    if (!category) {
      res.status(404).json({ message: "Category not found" });
      return;
    }
    res.json(category);
  }),
);

router.delete(
  "/categories/:id",
  asyncHandler(async (req, res) => {
    await storage.ecommerce.deleteCategory(paramString(req.params.id));
    res.json({ success: true });
  }),
);

router.get(
  "/coupons",
  asyncHandler(async (req, res) => {
    res.json(
      await storage.ecommerce.getCoupons({
        includeArchived: req.query.includeArchived === "true",
        search: typeof req.query.search === "string" ? req.query.search : undefined,
      }),
    );
  }),
);

router.get(
  "/coupons/:id/report",
  asyncHandler(async (req, res) => {
    const report = await storage.ecommerce.getCouponReport(paramString(req.params.id));
    if (!report) {
      res.status(404).json({ message: "Coupon not found" });
      return;
    }
    res.json(report);
  }),
);

router.get(
  "/coupons/:id",
  asyncHandler(async (req, res) => {
    const coupon = await storage.ecommerce.getCoupon(paramString(req.params.id));
    if (!coupon) {
      res.status(404).json({ message: "Coupon not found" });
      return;
    }
    res.json(coupon);
  }),
);

router.post(
  "/coupons",
  asyncHandler(async (req, res) => {
    const data = insertEcommerceCouponSchema.parse({
      ...req.body,
      createdBy: req.user?.id,
      updatedBy: req.user?.id,
    });
    res.status(201).json(await storage.ecommerce.createCoupon(data));
  }),
);

router.post(
  "/coupons/:id/duplicate",
  asyncHandler(async (req, res) => {
    const data = z.object({ code: z.string().min(1) }).parse(req.body);
    const coupon = await storage.ecommerce.duplicateCoupon(paramString(req.params.id), data.code);
    if (!coupon) {
      res.status(404).json({ message: "Coupon not found" });
      return;
    }
    res.status(201).json(coupon);
  }),
);

router.put(
  "/coupons/:id",
  asyncHandler(async (req, res) => {
    const coupon = await storage.ecommerce.updateCoupon(
      paramString(req.params.id),
      insertEcommerceCouponSchema.partial().parse({ ...req.body, updatedBy: req.user?.id }),
    );
    if (!coupon) {
      res.status(404).json({ message: "Coupon not found" });
      return;
    }
    res.json(coupon);
  }),
);

router.delete(
  "/coupons/:id",
  asyncHandler(async (req, res) => {
    await storage.ecommerce.deleteCoupon(paramString(req.params.id));
    res.json({ success: true });
  }),
);

router.get(
  "/orders",
  asyncHandler(async (_req, res) => {
    res.json(await storage.ecommerce.getOrders());
  }),
);

router.get(
  "/customers",
  asyncHandler(async (req, res) => {
    res.json(
      await storage.ecommerce.searchCustomers(
        typeof req.query.search === "string" ? req.query.search : undefined,
      ),
    );
  }),
);

router.post(
  "/customers",
  asyncHandler(async (req, res) => {
    const customer = await storage.ecommerce.findOrCreateCustomer(
      insertEcommerceCustomerSchema.parse(req.body),
    );
    res.status(201).json(customer);
  }),
);

router.get(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const order = await storage.ecommerce.getOrderWithDetails(paramString(req.params.id));
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    res.json(order);
  }),
);

router.put(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const order = await updateAdminEcommerceOrder(
      paramString(req.params.id),
      adminOrderUpdateSchema.parse(req.body),
      req.user,
    );
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    res.json(order);
  }),
);

router.post(
  "/orders/manual",
  asyncHandler(async (req, res) => {
    res.status(201).json(await createManualEcommerceOrder(manualOrderSchema.parse(req.body)));
  }),
);

router.post(
  "/orders/manual-draft",
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(await createManualEcommerceOrderDraft(manualOrderSchema.parse(req.body), req.user));
  }),
);

router.post(
  "/orders/:id/payment-link",
  asyncHandler(async (req, res) => {
    const data = z.object({ reason: z.string().trim().min(1).max(500).optional() }).parse(req.body);
    res.status(201).json(
      await createPaymentLinkForOrder(paramString(req.params.id), {
        reason: data.reason,
        createdBy: req.user?.id,
      }),
    );
  }),
);

router.post(
  "/orders/:id/mark-paid",
  asyncHandler(async (req, res) => {
    const order = await markManualEcommerceOrderPaid(
      paramString(req.params.id),
      manualPaymentSchema.parse(req.body),
      req.user,
    );
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    res.json(order);
  }),
);

router.post(
  "/orders/:id/fraud-review",
  asyncHandler(async (req, res) => {
    const order = await reviewEcommerceOrderFraud(
      paramString(req.params.id),
      req.body,
      req.user?.id,
    );
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    res.json(order);
  }),
);

router.post(
  "/payment-requests",
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(
        await createStandalonePaymentRequest(
          standalonePaymentRequestSchema.parse(req.body),
          req.user,
        ),
      );
  }),
);

router.post(
  "/refunds",
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        orderId: z.string(),
        amount: z.number().int().min(1),
        reason: z.string().optional(),
        reasonCode: z.string().optional(),
        type: z.enum(["full", "partial"]).optional(),
        source: z.enum(["manual", ...ECOMMERCE_REFUND_PROVIDERS]).optional(),
      })
      .parse(req.body);
    res.status(201).json(await createEcommerceRefund({ ...data, processedBy: req.user?.id }));
  }),
);

router.post(
  "/refunds/:id/reconcile",
  asyncHandler(async (req, res) => {
    res.json(await reconcileEcommerceRefund(paramString(req.params.id)));
  }),
);

router.get(
  "/webhooks/stripe",
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        status: z.enum(["processing", "processed", "failed"]).optional(),
        limit: z.coerce.number().int().min(1).max(100).optional(),
      })
      .parse(req.query);
    const deliveries = await storage.ecommerce.listWebhookProcessing({
      provider: "stripe",
      status: query.status,
      limit: query.limit,
    });
    res.json(deliveries.map(toWebhookDeliverySummary));
  }),
);

router.get(
  "/notification-jobs",
  asyncHandler(async (req, res) => {
    const rawLimit = typeof req.query.limit === "string" ? Number(req.query.limit) : 50;
    const limit = Number.isSafeInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;
    const jobs = await storage.ecommerce.getEcommerceNotificationJobs({ status: "failed", limit });
    res.json(jobs.map(toNotificationJobSummary));
  }),
);

router.post(
  "/notification-jobs/:id/retry",
  asyncHandler(async (req, res) => {
    const jobId = z.string().uuid().parse(req.params.id);
    const job = await storage.ecommerce.requeueFailedEcommerceNotificationJob(
      jobId,
      req.user?.id ?? null,
    );
    if (!job) {
      res.status(404).json({ message: "A failed notification job was not found" });
      return;
    }
    res.json(toNotificationJobSummary(job));
  }),
);

router.post(
  "/webhooks/stripe/:eventId/replay",
  asyncHandler(async (req, res) => {
    const eventId = z
      .string()
      .trim()
      .regex(/^evt_[A-Za-z0-9]+$/)
      .max(255)
      .parse(req.params.eventId);
    res.json(await replayEcommerceStripeWebhook(eventId));
  }),
);

router.get(
  "/shipping/zones",
  asyncHandler(async (_req, res) => {
    res.json(await storage.ecommerce.getShippingZones());
  }),
);

router.post(
  "/shipping/zones",
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(
        await storage.ecommerce.createShippingZone(
          insertEcommerceShippingZoneSchema.parse(req.body),
        ),
      );
  }),
);

router.put(
  "/shipping/zones/:id",
  asyncHandler(async (req, res) => {
    const zone = await storage.ecommerce.updateShippingZone(
      paramString(req.params.id),
      insertEcommerceShippingZoneSchema.partial().parse(req.body),
    );
    if (!zone) {
      res.status(404).json({ message: "Shipping zone not found" });
      return;
    }
    res.json(zone);
  }),
);

router.delete(
  "/shipping/zones/:id",
  asyncHandler(async (req, res) => {
    await storage.ecommerce.deleteShippingZone(paramString(req.params.id));
    res.json({ success: true });
  }),
);

router.get(
  "/shipping/rates",
  asyncHandler(async (req, res) => {
    res.json(
      await storage.ecommerce.getShippingRates(
        typeof req.query.zoneId === "string" ? req.query.zoneId : undefined,
      ),
    );
  }),
);

router.post(
  "/shipping/rates",
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(
        await storage.ecommerce.createShippingRate(
          insertEcommerceShippingRateSchema.parse(req.body),
        ),
      );
  }),
);

router.put(
  "/shipping/rates/:id",
  asyncHandler(async (req, res) => {
    const rate = await storage.ecommerce.updateShippingRate(
      paramString(req.params.id),
      insertEcommerceShippingRateSchema.partial().parse(req.body),
    );
    if (!rate) {
      res.status(404).json({ message: "Shipping rate not found" });
      return;
    }
    res.json(rate);
  }),
);

router.delete(
  "/shipping/rates/:id",
  asyncHandler(async (req, res) => {
    await storage.ecommerce.deleteShippingRate(paramString(req.params.id));
    res.json({ success: true });
  }),
);

router.get(
  "/shipping/locations",
  asyncHandler(async (_req, res) => {
    res.json(await storage.ecommerce.getFulfillmentLocations());
  }),
);

router.post(
  "/shipping/locations",
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(
        await storage.ecommerce.createFulfillmentLocation(
          insertEcommerceFulfillmentLocationSchema.parse(req.body),
        ),
      );
  }),
);

router.put(
  "/shipping/locations/:id",
  asyncHandler(async (req, res) => {
    const location = await storage.ecommerce.updateFulfillmentLocation(
      paramString(req.params.id),
      insertEcommerceFulfillmentLocationSchema.partial().parse(req.body),
    );
    if (!location) {
      res.status(404).json({ message: "Fulfillment location not found" });
      return;
    }
    res.json(location);
  }),
);

router.get(
  "/shipping/providers",
  asyncHandler(async (_req, res) => {
    const credentialStatus: Record<string, Record<string, boolean>> = {};
    await Promise.all(
      ECOMMERCE_SHIPPING_PROVIDER_REGISTRY.map(async (definition) => {
        const settings = await storage.settings.getDecryptedCategory(
          getShippingProviderCredentialCategory(definition.provider),
        );
        credentialStatus[definition.provider] = Object.fromEntries(
          definition.setupFields.map((field) => [field.key, Boolean(settings[field.key])]),
        );
      }),
    );
    res.json(
      mergeShippingProviderStatuses(
        await storage.ecommerce.getShippingProviders(),
        credentialStatus,
      ),
    );
  }),
);

router.get(
  "/shipping/providers/:provider/readiness",
  asyncHandler(async (req, res) => {
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
      [provider]: Object.fromEntries(
        definition.setupFields.map((field) => [field.key, Boolean(settings[field.key])]),
      ),
    };
    const [status] = mergeShippingProviderStatuses(
      configuredProviders.filter((configuredProvider) => configuredProvider.provider === provider),
      credentialStatus,
    ).filter((candidate) => candidate.provider === provider);
    res.json(status);
  }),
);

router.put(
  "/shipping/providers/:provider",
  asyncHandler(async (req, res) => {
    const provider = paramString(req.params.provider);
    const definition = getShippingProviderDefinition(provider);
    if (!definition) {
      res.status(404).json({ message: "Shipping provider not found" });
      return;
    }

    const data = insertEcommerceShippingProviderSchema
      .partial()
      .extend({
        displayName: z.string().min(1),
        type: z.enum(["direct_carrier", "aggregator", "workflow", "marketplace"]),
      })
      .parse({ ...req.body, provider });

    if (data.active) {
      const settings = await storage.settings.getDecryptedCategory(
        getShippingProviderCredentialCategory(provider),
      );
      const missingCredentialLabels = getMissingShippingProviderCredentialLabels(
        definition,
        settings,
      );
      if (missingCredentialLabels.length > 0) {
        res.status(400).json({
          message: `Save ${missingCredentialLabels.join(", ")} before activating ${definition.displayName}.`,
          missingCredentialLabels,
        });
        return;
      }
    }

    res.json(
      await storage.ecommerce.upsertShippingProvider({
        provider,
        displayName: data.displayName,
        type: data.type,
        capabilities: data.capabilities ?? [],
        settings: data.settings ?? {},
        testMode: data.testMode ?? true,
        active: data.active ?? false,
        connectedAt: data.active ? (data.connectedAt ?? new Date()) : (data.connectedAt ?? null),
      }),
    );
  }),
);

router.put(
  "/shipping/providers/:provider/credentials",
  asyncHandler(async (req, res) => {
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
      .filter((entry): entry is { field: (typeof definition.setupFields)[number]; value: string } =>
        Boolean(entry.value),
      )
      .map(({ field, value }) =>
        storage.settings.upsertSetting(field.key, value, category, field.secret ?? true),
      );

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
  }),
);

router.post(
  "/orders/:orderId/ship-and-fulfill",
  asyncHandler(async (req, res) => {
    const result = await storage.ecommerce.shipAndFulfillOrder(
      paramString(req.params.orderId),
      req.get("Idempotency-Key") ?? "",
      req.body,
      req.user?.id ?? null,
    );
    res.status(result.replayed ? 200 : 201).json(result);
  }),
);

router.post(
  "/orders/:orderId/shipments",
  asyncHandler(async (req, res) => {
    const orderId = paramString(req.params.orderId);
    await assertEcommerceOrderCanShip(orderId);
    const shipmentPayload = insertEcommerceShipmentSchema.parse({
      ...req.body,
      orderId,
      shippedBy: req.user?.id,
    });
    const shipment = await storage.ecommerce.createShipmentAndMarkOrderShipped({
      ...shipmentPayload,
      trackingUrl: inferCarrierTrackingUrl(shipmentPayload),
    });
    res.status(201).json(shipment);
  }),
);

router.get(
  "/orders/:orderId/fulfillments",
  asyncHandler(async (req, res) => {
    res.json(await storage.ecommerce.getFulfillmentsForOrder(paramString(req.params.orderId)));
  }),
);

router.post(
  "/orders/:orderId/fulfillments",
  asyncHandler(async (req, res) => {
    const orderId = paramString(req.params.orderId);
    const body = z
      .object({
        fulfillment: insertEcommerceFulfillmentSchema.omit({ orderId: true }),
        items: fulfillmentItemsSchema,
      })
      .parse(req.body);
    const items = await assertEcommerceFulfillmentRequest(orderId, body.items);

    res.status(201).json(
      await storage.ecommerce.createFulfillment(
        {
          ...body.fulfillment,
          orderId,
          trackingUrl: inferCarrierTrackingUrl(body.fulfillment),
        },
        items,
      ),
    );
  }),
);

router.get(
  "/settings/stripe",
  asyncHandler(async (_req, res) => {
    res.json(await getMaskedEcommerceStripeStatus());
  }),
);

router.put(
  "/settings/stripe",
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        activeMode: z.enum(["test", "live"]).default("test"),
        testPublishableKey: z.string().optional(),
        testSecretKey: z.string().optional(),
        testWebhookSecret: z.string().optional(),
        livePublishableKey: z.string().optional(),
        liveSecretKey: z.string().optional(),
        liveWebhookSecret: z.string().optional(),
      })
      .parse(req.body);

    const activeError = validateStripeKeyMode(
      data.activeMode as EcommerceStripeMode,
      data.activeMode === "live" ? data.livePublishableKey : data.testPublishableKey,
      data.activeMode === "live" ? data.liveSecretKey : data.testSecretKey,
    );
    const keyModeError = activeError ?? validateStripeSettingsKeyModes(data);
    if (keyModeError) {
      res.status(400).json({ message: keyModeError });
      return;
    }

    const writes: { key: string; value: string; category: string; isSecret: boolean }[] = [
      { key: "active_mode", value: data.activeMode, category: "ecommerce_stripe", isSecret: false },
    ];
    const fields = [
      ["testPublishableKey", "test_publishable_key", false],
      ["livePublishableKey", "live_publishable_key", false],
      ["testSecretKey", "test_secret_key", true],
      ["liveSecretKey", "live_secret_key", true],
      ["testWebhookSecret", "test_webhook_secret", true],
      ["liveWebhookSecret", "live_webhook_secret", true],
    ] as const;
    for (const [field, key, isSecret] of fields) {
      const value = data[field];
      if (value !== undefined && (!isSecret || value))
        writes.push({ key, value, category: "ecommerce_stripe", isSecret });
    }
    await storage.settings.upsertSettings(writes);
    res.json(await getMaskedEcommerceStripeStatus());
  }),
);

router.post(
  "/settings/stripe/test",
  asyncHandler(async (_req, res) => {
    res.json(await testEcommerceStripeConnection());
  }),
);

router.get(
  "/settings/tax",
  asyncHandler(async (_req, res) => {
    res.json(await getEcommerceTaxSettings());
  }),
);

router.put(
  "/settings/tax",
  asyncHandler(async (req, res) => {
    res.json(await saveEcommerceTaxSettings(ecommerceTaxSettingsSchema.parse(req.body)));
  }),
);

router.get(
  "/settings/customer-accounts",
  asyncHandler(async (_req, res) => {
    res.json(await getEcommerceCustomerAccountSettings());
  }),
);

router.put(
  "/settings/customer-accounts",
  asyncHandler(async (req, res) => {
    res.json(
      await saveEcommerceCustomerAccountSettings(
        ecommerceCustomerAccountSettingsSchema.parse(req.body),
      ),
    );
  }),
);

router.get(
  "/settings/store",
  asyncHandler(async (_req, res) => {
    res.json(await getEcommerceStoreSettings());
  }),
);

router.put(
  "/settings/store",
  asyncHandler(async (req, res) => {
    res.json(await saveEcommerceStoreSettings(ecommerceStoreSettingsSchema.parse(req.body)));
  }),
);

router.get(
  "/security/settings",
  asyncHandler(async (_req, res) => {
    res.json(await getEcommerceFraudSettings());
  }),
);

router.put(
  "/security/settings",
  asyncHandler(async (req, res) => {
    res.json(await saveEcommerceFraudSettings(ecommerceFraudSettingsSchema.parse(req.body)));
  }),
);

router.get(
  "/security/overview",
  asyncHandler(async (_req, res) => {
    res.json(await getEcommerceSecurityOverview());
  }),
);

router.get(
  "/security/events",
  asyncHandler(async (req, res) => {
    res.json(
      await storage.ecommerce.getFraudEvents({
        limit: typeof req.query.limit === "string" ? Number(req.query.limit) || 100 : 100,
        decision:
          typeof req.query.decision === "string" && req.query.decision !== "all"
            ? req.query.decision
            : undefined,
        search: typeof req.query.search === "string" ? req.query.search : undefined,
      }),
    );
  }),
);

router.get(
  "/security/blocks",
  asyncHandler(async (_req, res) => {
    res.json(await storage.ecommerce.getActiveFraudBlocks());
  }),
);

router.post(
  "/security/blocks",
  asyncHandler(async (req, res) => {
    res.status(201).json(await createEcommerceFraudBlock(req.body, req.user?.id));
  }),
);

router.delete(
  "/security/blocks/:id",
  asyncHandler(async (req, res) => {
    const block = await deleteEcommerceFraudBlock(paramString(req.params.id));
    if (!block) {
      res.status(404).json({ message: "Fraud block not found" });
      return;
    }
    res.json(block);
  }),
);

export default router;

import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { paramString } from "../utils/params";
import {
  getShippingRateOptions,
  priceCart,
  priceCartSchema,
  shippingAddressQuoteSchema,
  toPublicCouponValidationResult,
  toPublicPricedCart,
  validateCoupon,
} from "../services/ecommerce-pricing.service";
import { createEcommercePaymentIntent } from "../services/ecommerce-order.service";
import { ecommerceOrderStatusLookupSchema } from "../services/ecommerce-order-lookup.service";
import { getPublicProductCategories, toPublicEcommerceProduct } from "../services/ecommerce-public-product.service";
import { toPublicEcommerceOrderStatus } from "../services/ecommerce-public-order.service";
import { getEcommerceStripePublishableKey, getEcommerceStripeMode } from "../services/ecommerce-stripe.service";
import { requireEcommerceEnabled } from "../middleware/site-features";
import { ecommerceCheckoutLimiter, ecommerceOrderLookupLimiter, ecommercePricingLimiter, noStorePrivateResponse } from "../middleware/security";

const router = Router();

router.use(requireEcommerceEnabled);

router.get(
  "/products",
  asyncHandler(async (_req, res) => {
    const products = await storage.ecommerce.getProducts({ publicOnly: true });
    res.json(await Promise.all(products.map(async (product) => toPublicEcommerceProduct({
      product,
      categories: await storage.ecommerce.getProductCategories(product.id),
      variants: await storage.ecommerce.getProductVariants(product.id),
      media: await storage.ecommerce.getProductMedia(product.id),
    }))));
  }),
);

router.get(
  "/products/:slug",
  asyncHandler(async (req, res) => {
    const product = await storage.ecommerce.getProductBySlug(paramString(req.params.slug));
    if (!product || product.archivedAt || !product.active || product.status !== "published" || product.visibility !== "online") {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    res.json(toPublicEcommerceProduct({
      product,
      categories: await storage.ecommerce.getProductCategories(product.id),
      variants: await storage.ecommerce.getProductVariants(product.id),
      media: await storage.ecommerce.getProductMedia(product.id),
    }));
  }),
);

router.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    res.json(getPublicProductCategories(await storage.ecommerce.getCategories(true)));
  }),
);

router.get(
  "/stripe/config",
  noStorePrivateResponse,
  asyncHandler(async (_req, res) => {
    res.json({
      publishableKey: await getEcommerceStripePublishableKey(),
      mode: await getEcommerceStripeMode(),
    });
  }),
);

router.post(
  "/cart/price",
  ecommercePricingLimiter,
  noStorePrivateResponse,
  asyncHandler(async (req, res) => {
    res.json(toPublicPricedCart(await priceCart(priceCartSchema.parse(req.body))));
  }),
);

router.post(
  "/shipping/rates",
  ecommercePricingLimiter,
  noStorePrivateResponse,
  asyncHandler(async (req, res) => {
    const data = z.object({
      items: priceCartSchema.shape.items,
      address: shippingAddressQuoteSchema,
    }).parse(req.body);
    const priced = await priceCart({ items: data.items });
    res.json(await getShippingRateOptions({
      subtotalAmount: priced.subtotalAmount,
      address: data.address,
    }));
  }),
);

router.post(
  "/coupons/validate",
  ecommercePricingLimiter,
  noStorePrivateResponse,
  asyncHandler(async (req, res) => {
    const data = z.object({
      code: z.string().min(1),
      subtotalAmount: z.number().int().min(0).optional(),
      items: priceCartSchema.shape.items.optional(),
      customerEmail: z.string().email().optional(),
    }).parse(req.body);
    if (data.items?.length) {
      const priced = await priceCart({ items: data.items, couponCode: data.code, customerEmail: data.customerEmail });
      res.json(toPublicCouponValidationResult(priced.couponValidation));
      return;
    }
    res.json(toPublicCouponValidationResult(await validateCoupon(data.code, data.subtotalAmount ?? 0)));
  }),
);

router.post(
  "/checkout/payment-intent",
  ecommerceCheckoutLimiter,
  noStorePrivateResponse,
  asyncHandler(async (req, res) => {
    res.status(201).json(await createEcommercePaymentIntent(req.body, { ip: req.ip }));
  }),
);

router.post(
  "/orders/status",
  ecommerceOrderLookupLimiter,
  noStorePrivateResponse,
  asyncHandler(async (req, res) => {
    const data = ecommerceOrderStatusLookupSchema.parse(req.body);
    const order = await storage.ecommerce.getOrderForLookup(data);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    res.json(toPublicEcommerceOrderStatus(order));
  }),
);

export default router;

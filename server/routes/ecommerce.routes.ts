import { Router } from "express";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { validateBody } from "../middleware/validation";
import { paramString } from "../utils/params";
import {
  getShippingRateOptions,
  couponValidationRequestSchema,
  priceCart,
  priceCartSchema,
  shippingRateQuoteRequestSchema,
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
  validateBody(priceCartSchema),
  asyncHandler(async (req, res) => {
    res.json(toPublicPricedCart(await priceCart(req.body)));
  }),
);

router.post(
  "/shipping/rates",
  ecommercePricingLimiter,
  noStorePrivateResponse,
  validateBody(shippingRateQuoteRequestSchema),
  asyncHandler(async (req, res) => {
    const data = req.body;
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
  validateBody(couponValidationRequestSchema),
  asyncHandler(async (req, res) => {
    const data = req.body;
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
  validateBody(ecommerceOrderStatusLookupSchema),
  asyncHandler(async (req, res) => {
    const order = await storage.ecommerce.getOrderForLookup(req.body);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    res.json(toPublicEcommerceOrderStatus(order));
  }),
);

export default router;

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
  validateCoupon,
} from "../services/ecommerce-pricing.service";
import { createEcommercePaymentIntent } from "../services/ecommerce-order.service";
import { getEcommerceStripePublishableKey, getEcommerceStripeMode } from "../services/ecommerce-stripe.service";
import { requireEcommerceEnabled } from "../middleware/site-features";
import { ecommerceCheckoutLimiter, ecommerceOrderLookupLimiter } from "../middleware/security";

const router = Router();

router.use(requireEcommerceEnabled);

router.get(
  "/products",
  asyncHandler(async (_req, res) => {
    const products = await storage.ecommerce.getProducts({ publicOnly: true });
    res.json(await Promise.all(products.map(async (product) => ({
      ...product,
      categories: await storage.ecommerce.getProductCategories(product.id),
      variants: (await storage.ecommerce.getProductVariants(product.id)).filter((variant) => variant.active && variant.status === "active"),
      media: await storage.ecommerce.getProductMedia(product.id),
    }))));
  }),
);

router.get(
  "/products/:slug",
  asyncHandler(async (req, res) => {
    const product = await storage.ecommerce.getProductBySlug(paramString(req.params.slug));
    if (!product || !product.active || product.status !== "published") {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    const categories = await storage.ecommerce.getProductCategories(product.id);
    const variants = (await storage.ecommerce.getProductVariants(product.id)).filter((variant) => variant.active && variant.status === "active");
    const media = await storage.ecommerce.getProductMedia(product.id);
    res.json({ ...product, categories, variants, media });
  }),
);

router.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    res.json(await storage.ecommerce.getCategories(true));
  }),
);

router.get(
  "/stripe/config",
  asyncHandler(async (_req, res) => {
    res.json({
      publishableKey: await getEcommerceStripePublishableKey(),
      mode: await getEcommerceStripeMode(),
    });
  }),
);

router.post(
  "/cart/price",
  asyncHandler(async (req, res) => {
    res.json(await priceCart(priceCartSchema.parse(req.body)));
  }),
);

router.post(
  "/shipping/rates",
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
  asyncHandler(async (req, res) => {
    const data = z.object({
      code: z.string().min(1),
      subtotalAmount: z.number().int().min(0).optional(),
      items: priceCartSchema.shape.items.optional(),
      customerEmail: z.string().email().optional(),
    }).parse(req.body);
    if (data.items?.length) {
      const priced = await priceCart({ items: data.items, couponCode: data.code, customerEmail: data.customerEmail });
      res.json(priced.couponValidation);
      return;
    }
    res.json(await validateCoupon(data.code, data.subtotalAmount ?? 0));
  }),
);

router.post(
  "/checkout/payment-intent",
  ecommerceCheckoutLimiter,
  asyncHandler(async (req, res) => {
    res.status(201).json(await createEcommercePaymentIntent(req.body, { ip: req.ip }));
  }),
);

router.post(
  "/orders/status",
  ecommerceOrderLookupLimiter,
  asyncHandler(async (req, res) => {
    const data = z.object({
      orderId: z.string().min(1),
      email: z.string().email(),
      token: z.string().min(1),
    }).parse(req.body);
    const order = await storage.ecommerce.getOrderForLookup(data);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    res.json(order);
  }),
);

export default router;

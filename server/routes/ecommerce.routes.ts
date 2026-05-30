import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { paramString } from "../utils/params";
import { priceCart, priceCartSchema, validateCoupon } from "../services/ecommerce-pricing.service";
import { createEcommercePaymentIntent } from "../services/ecommerce-order.service";
import { getEcommerceStripePublishableKey, getEcommerceStripeMode } from "../services/ecommerce-stripe.service";
import { requireEcommerceEnabled } from "../middleware/site-features";

const router = Router();

router.use(requireEcommerceEnabled);

router.get(
  "/products",
  asyncHandler(async (_req, res) => {
    const products = await storage.ecommerce.getProducts({ publicOnly: true });
    res.json(await Promise.all(products.map(async (product) => ({
      ...product,
      categories: await storage.ecommerce.getProductCategories(product.id),
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
    res.json({ ...product, categories });
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
  "/coupons/validate",
  asyncHandler(async (req, res) => {
    const data = z.object({ code: z.string().min(1), subtotalAmount: z.number().int().min(0) }).parse(req.body);
    res.json(await validateCoupon(data.code, data.subtotalAmount));
  }),
);

router.post(
  "/checkout/payment-intent",
  asyncHandler(async (req, res) => {
    res.status(201).json(await createEcommercePaymentIntent(req.body, { ip: req.ip }));
  }),
);

router.post(
  "/orders/status",
  asyncHandler(async (req, res) => {
    const data = z.object({
      orderId: z.string().min(1),
      email: z.string().email(),
      token: z.string().optional(),
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

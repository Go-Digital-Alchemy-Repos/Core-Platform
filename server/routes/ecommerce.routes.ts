import { Router } from "express";
import { z } from "zod";
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
import { checkoutSchema, createEcommercePaymentIntent } from "../services/ecommerce-order.service";
import { ecommerceOrderStatusLookupSchema } from "../services/ecommerce-order-lookup.service";
import { getPublicProductCategories, toPublicEcommerceProduct } from "../services/ecommerce-public-product.service";
import { toPublicEcommerceOrderStatus } from "../services/ecommerce-public-order.service";
import { getEcommerceCustomerAccountSettings } from "../services/ecommerce-customer-account.service";
import { getEcommerceStoreSettings } from "../services/ecommerce-store-settings.service";
import { sendEcommerceOrderStatusLinkEmail } from "../services/ecommerce-email.service";
import { getEcommerceStripePublishableKey, getEcommerceStripeMode } from "../services/ecommerce-stripe.service";
import { requireEcommerceEnabled } from "../middleware/site-features";
import { authenticateToken, generateToken, optionalAuth, requireRole, setTokenCookie } from "../middleware/auth";
import { ecommerceCheckoutLimiter, ecommerceOrderLookupLimiter, ecommercePricingLimiter, noStorePrivateResponse } from "../middleware/security";

const router = Router();

router.use(requireEcommerceEnabled);

const orderStatusLinkSchema = z.object({
  orderId: z.string().trim().min(1).max(128),
  email: z.string().trim().email().max(254),
});

const accountProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(160),
  lastName: z.string().trim().max(160).optional().default(""),
  phone: z.string().trim().max(40).optional(),
});

const accountAddressSchema = z.object({
  label: z.string().trim().min(1).max(80).default("Home"),
  name: z.string().trim().max(160).optional(),
  company: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().min(1).max(240),
  line2: z.string().trim().max(240).optional(),
  city: z.string().trim().min(1).max(160),
  state: z.string().trim().min(1).max(160),
  zipCode: z.string().trim().min(1).max(40),
  country: z.string().trim().length(2).default("US").transform((value) => value.toUpperCase()),
  isDefault: z.boolean().default(false),
});

const accountPreferencesSchema = z.object({
  marketingEmailOptIn: z.boolean().default(false),
  orderSmsOptIn: z.boolean().default(false),
});

async function getOrCreateSignedInCustomer(user: NonNullable<Express.Request["user"]>) {
  const existing = await storage.ecommerce.getCustomerByUserId(user.id);
  if (existing) return existing;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;
  return storage.ecommerce.findOrCreateCustomer({
    userId: user.id,
    email: user.email,
    name: displayName,
  });
}

function toAccountCustomer(customer: Awaited<ReturnType<typeof getOrCreateSignedInCustomer>>) {
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    line2: customer.line2,
    city: customer.city,
    state: customer.state,
    zipCode: customer.zipCode,
    country: customer.country,
    marketingEmailOptIn: customer.marketingEmailOptIn,
    orderSmsOptIn: customer.orderSmsOptIn,
  };
}

function toAccountAddress(address: Awaited<ReturnType<typeof storage.ecommerce.createCustomerAddress>>) {
  return {
    id: address.id,
    label: address.label,
    name: address.name,
    company: address.company,
    phone: address.phone,
    address: address.address,
    line2: address.line2,
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
    country: address.country,
    isDefault: address.isDefault,
  };
}

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

router.get(
  "/checkout/settings",
  noStorePrivateResponse,
  asyncHandler(async (_req, res) => {
    const [accountSettings, storeSettings] = await Promise.all([
      getEcommerceCustomerAccountSettings(),
      getEcommerceStoreSettings(),
    ]);
    res.json({ ...accountSettings, store: storeSettings });
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
  optionalAuth,
  noStorePrivateResponse,
  validateBody(checkoutSchema),
  asyncHandler(async (req, res) => {
    const result = await createEcommercePaymentIntent(req.body, { ip: req.ip, user: req.user ?? null });
    if (result.accountUser) {
      setTokenCookie(res, generateToken(result.accountUser));
    }
    const { accountUser: _accountUser, ...payload } = result;
    res.status(201).json(payload);
  }),
);

router.post(
  "/orders/status-link",
  ecommerceOrderLookupLimiter,
  noStorePrivateResponse,
  validateBody(orderStatusLinkSchema),
  asyncHandler(async (req, res) => {
    const details = await storage.ecommerce.getOrderWithDetails(req.body.orderId);
    if (details && details.customer?.email.trim().toLowerCase() === req.body.email.trim().toLowerCase()) {
      await sendEcommerceOrderStatusLinkEmail(details);
    }
    res.json({ message: "If that order matches this email, a secure status link has been sent." });
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

router.use("/account", authenticateToken, requireRole("client", "admin", "editor"), noStorePrivateResponse);

router.get(
  "/account",
  asyncHandler(async (req, res) => {
    const customer = await getOrCreateSignedInCustomer(req.user!);
    const orders = await storage.ecommerce.getOrdersForCustomer(customer.id);
    res.json({
      customer: toAccountCustomer(customer),
      addresses: (await storage.ecommerce.getCustomerAddresses(customer.id)).map(toAccountAddress),
      recentOrders: orders.slice(0, 5).map(toPublicEcommerceOrderStatus),
      orderCount: orders.length,
      openShipmentCount: orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length,
    });
  }),
);

router.get(
  "/account/orders",
  asyncHandler(async (req, res) => {
    const customer = await getOrCreateSignedInCustomer(req.user!);
    const orders = await storage.ecommerce.getOrdersForCustomer(customer.id);
    res.json(orders.map(toPublicEcommerceOrderStatus));
  }),
);

router.get(
  "/account/orders/:id",
  asyncHandler(async (req, res) => {
    const customer = await getOrCreateSignedInCustomer(req.user!);
    const order = await storage.ecommerce.getOrderWithDetails(paramString(req.params.id));
    if (!order || order.customerId !== customer.id) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    res.json(toPublicEcommerceOrderStatus(order));
  }),
);

router.get(
  "/account/addresses",
  asyncHandler(async (req, res) => {
    const customer = await getOrCreateSignedInCustomer(req.user!);
    res.json((await storage.ecommerce.getCustomerAddresses(customer.id)).map(toAccountAddress));
  }),
);

router.post(
  "/account/addresses",
  validateBody(accountAddressSchema),
  asyncHandler(async (req, res) => {
    const customer = await getOrCreateSignedInCustomer(req.user!);
    const address = await storage.ecommerce.createCustomerAddress({ ...req.body, customerId: customer.id });
    res.status(201).json(toAccountAddress(address));
  }),
);

router.put(
  "/account/addresses/:id",
  validateBody(accountAddressSchema),
  asyncHandler(async (req, res) => {
    const customer = await getOrCreateSignedInCustomer(req.user!);
    const address = await storage.ecommerce.updateCustomerAddress(customer.id, paramString(req.params.id), req.body);
    if (!address) {
      res.status(404).json({ message: "Address not found" });
      return;
    }
    res.json(toAccountAddress(address));
  }),
);

router.delete(
  "/account/addresses/:id",
  asyncHandler(async (req, res) => {
    const customer = await getOrCreateSignedInCustomer(req.user!);
    const address = await storage.ecommerce.deleteCustomerAddress(customer.id, paramString(req.params.id));
    if (!address) {
      res.status(404).json({ message: "Address not found" });
      return;
    }
    res.status(204).end();
  }),
);

router.post(
  "/account/addresses/:id/default",
  asyncHandler(async (req, res) => {
    const customer = await getOrCreateSignedInCustomer(req.user!);
    const address = await storage.ecommerce.setDefaultCustomerAddress(customer.id, paramString(req.params.id));
    if (!address) {
      res.status(404).json({ message: "Address not found" });
      return;
    }
    res.json(toAccountAddress(address));
  }),
);

router.put(
  "/account/profile",
  validateBody(accountProfileSchema),
  asyncHandler(async (req, res) => {
    const customer = await getOrCreateSignedInCustomer(req.user!);
    const name = [req.body.firstName, req.body.lastName].filter(Boolean).join(" ").trim();
    await storage.users.updateUser(req.user!.id, {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
    });
    const updated = await storage.ecommerce.updateCustomer(customer.id, {
      name,
      phone: req.body.phone,
    });
    res.json(toAccountCustomer(updated ?? customer));
  }),
);

router.put(
  "/account/address",
  validateBody(accountAddressSchema),
  asyncHandler(async (req, res) => {
    const customer = await getOrCreateSignedInCustomer(req.user!);
    const customerAddress = {
      address: req.body.address,
      line2: req.body.line2,
      city: req.body.city,
      state: req.body.state,
      zipCode: req.body.zipCode,
      country: req.body.country,
    };
    const updated = await storage.ecommerce.updateCustomer(customer.id, customerAddress);
    const [defaultAddress] = await storage.ecommerce.getCustomerAddresses(customer.id);
    if (defaultAddress) {
      await storage.ecommerce.updateCustomerAddress(customer.id, defaultAddress.id, { ...req.body, isDefault: true });
    } else {
      await storage.ecommerce.createCustomerAddress({ ...req.body, customerId: customer.id, isDefault: true });
    }
    res.json(toAccountCustomer(updated ?? customer));
  }),
);

router.put(
  "/account/preferences",
  validateBody(accountPreferencesSchema),
  asyncHandler(async (req, res) => {
    const customer = await getOrCreateSignedInCustomer(req.user!);
    const updated = await storage.ecommerce.updateCustomer(customer.id, req.body);
    res.json(toAccountCustomer(updated ?? customer));
  }),
);

export default router;

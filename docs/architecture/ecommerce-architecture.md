# Ecommerce Architecture

The ecommerce module is a feature-gated commerce layer built on the existing Express, Drizzle, Stripe, settings, email, and CMS systems.

## Deployment Boundary

Ecommerce is currently single-client. Under
[ADR-005](../adr/005-isolated-client-stacks.md), every client receives a separate Core Platform
application/database and separately built React site, with its own configuration, storage, providers,
recovery, monitoring, and releases. This is repeatable deployment, not a shared multi-tenant system.

## Client Routes

The storefront is route-level lazy loaded from `client/src/App.tsx`:

- `/shop`
- `/products/:slug`
- `/cart`
- `/checkout`
- `/order/success`
- `/order/status`

Admin management lives under `/admin/ecommerce` and uses tabbed views for products, categories, coupons, orders, shipping, refunds, and Stripe configuration.

## API Routes

Public ecommerce routes are mounted at `/api/ecommerce` and are guarded by the ecommerce site feature middleware.

| Endpoint                                      | Purpose                                          |
| --------------------------------------------- | ------------------------------------------------ |
| `GET /api/ecommerce/products`                 | List public active/published products            |
| `GET /api/ecommerce/products/:slug`           | Fetch a public product by slug                   |
| `GET /api/ecommerce/categories`               | List active public categories                    |
| `GET /api/ecommerce/stripe/config`            | Return ecommerce Stripe publishable key and mode |
| `POST /api/ecommerce/cart/price`              | Price a cart payload                             |
| `POST /api/ecommerce/coupons/validate`        | Validate a coupon for a subtotal                 |
| `POST /api/ecommerce/checkout/payment-intent` | Create an order and Stripe payment intent        |
| `POST /api/ecommerce/orders/status`           | Customer-facing order lookup                     |

Admin ecommerce routes are mounted at `/api/admin/ecommerce` and require admin access. They are also guarded by the ecommerce site feature middleware.

| Area            | Capabilities                                           |
| --------------- | ------------------------------------------------------ |
| Products        | List, create, update, delete                           |
| Categories      | List, create, update, delete                           |
| Coupons         | List, create, update, delete                           |
| Orders          | List, detail, update status/notes, create manual order |
| Refunds         | Create full or partial refunds                         |
| Shipping        | Manage zones, rates, and shipments                     |
| Stripe settings | Read masked status, save settings, test connection     |

## Data Model

The ecommerce schema includes:

- `ecommerce_products`
- `ecommerce_categories`
- `ecommerce_product_categories`
- `ecommerce_customers`
- `ecommerce_orders`
- `ecommerce_order_items`
- `ecommerce_coupons`
- `ecommerce_coupon_redemptions`
- `ecommerce_refunds`
- `ecommerce_shipping_zones`
- `ecommerce_shipping_rates`
- `ecommerce_shipments`
- `ecommerce_integration_settings`
- `ecommerce_processed_webhook_events`

The schema stores money in integer cents. Product slugs, category slugs, order lookup tokens, Stripe payment intent IDs, Stripe refund IDs, and processed webhook event IDs have unique indexes where appropriate.

## Service Layer

The module uses focused services:

- `ecommerce-pricing.service.ts` prices carts and validates coupons.
- `ecommerce-order.service.ts` creates payment-intent orders and marks paid orders.
- `ecommerce-stripe.service.ts` resolves configured Stripe mode, clients, publishable keys, and webhook secrets.
- `ecommerce-refund.service.ts` creates refund records and integrates with Stripe refund behavior.
- `ecommerce-email.service.ts` sends order-status email.
- `system-ecommerce.service.ts` seeds starter categories and products.

Storage is centralized in `server/storage/ecommerce.storage.ts`.

## Webhook Processing

Ecommerce Stripe webhook events are processed separately from the existing subscription Stripe handler. Delivery state is stored in `ecommerce_processed_webhook_events`. An atomic claim prevents concurrent workers from starting the same event, failed attempts remain retryable, stale attempts can be reclaimed after five minutes, and per-attempt tokens keep expired workers from overwriting a newer attempt.

Current webhook behavior:

- `payment_intent.succeeded` validates the PaymentIntent identity and amount against the order, then reconciles paid-order effects.
- `checkout.session.completed` reconciles payment requests.
- `refund.created` and `refund.updated` reconcile refund records and order payment status.
- A successful handler marks the delivery `processed`; a thrown failure records bounded diagnostic text and returns an error so Stripe can retry.

In production, an ecommerce Stripe webhook secret is required before unsigned ecommerce webhooks can be accepted.

## Feature Gate

The ecommerce module is controlled by `enable_ecommerce` in the `system_configuration` settings category. The shared default is enabled, and the runtime falls back to defaults if system configuration cannot be read.

The gate currently protects:

- Public ecommerce API routes
- Admin ecommerce API routes
- Public/admin route availability through site configuration-aware navigation and frontend checks

Turning the gate off hides access without deleting ecommerce data.

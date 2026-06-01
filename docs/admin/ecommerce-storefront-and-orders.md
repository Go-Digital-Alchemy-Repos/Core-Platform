# Ecommerce Storefront And Orders

The ecommerce app adds a public shop, product detail pages, cart checkout, order lookup, and an admin management area for catalog and order operations.

## Where To Find It

- Public shop: `/shop`
- Product pages: `/shop/:slug`
- Cart: `/cart`
- Checkout: `/checkout`
- Order success: `/order/success`
- Order lookup/status: `/order/status`
- Admin ecommerce: `Admin > Ecommerce`
- Feature toggle: `Admin > Settings > System Configuration > Enable Ecommerce`

If ecommerce is disabled in system configuration, the storefront, checkout, and ecommerce admin API return unavailable responses. Existing catalog, order, and customer data is preserved.

## Catalog Management

The admin ecommerce area includes tabs for:

- Products
- Categories
- Coupons
- Orders
- Shipping
- Refunds
- Stripe settings

Products support draft or published status, active/inactive visibility, price and sale price, SKU, tags, feature lists, included-item lists, images, URL slug, and SEO metadata. Public product listings only show products that are both active and published.

Categories support active/inactive state, slug, description, image, parent ID, and sort order. Products can be associated to one or more categories.

## Checkout And Pricing

The cart pricing service calculates:

- Subtotal
- Discounts
- Shipping
- Tax placeholder values
- Total

Coupons support fixed amount, percentage, and free-shipping types. Coupon rules include minimum order amount, maximum discount amount, maximum redemptions, per-customer limit, active windows, and optional guardrail fields for affiliate/VIP/margin handling.

Checkout creates ecommerce orders and Stripe payment intents. Stripe confirmation is handled through the ecommerce Stripe webhook flow before orders are marked paid.

## Orders, Refunds, And Shipping

Orders store customer, billing, shipping, marketing consent, line-item, payment, and lookup-token data. Admins can view orders, change status, create manual orders, issue full or partial refunds, and add shipments.

Order statuses:

- Pending
- Paid
- Shipped
- Delivered
- Cancelled

Payment statuses:

- Unpaid
- Paid
- Refund pending
- Partially refunded
- Refunded
- Refund failed

Creating a shipment moves the order to `shipped`. Order status changes can trigger ecommerce order-status email notifications.

## Stripe Settings

Ecommerce uses its own Stripe settings category. Admins can configure:

- Active mode: test or live
- Test publishable key
- Test secret key
- Test webhook secret
- Live publishable key
- Live secret key
- Live webhook secret

Secret keys are stored as secret settings. The admin status view masks configured values and exposes booleans for whether secret values are present.

## Seeded Storefront Content

System bootstrap seeds starter shop categories, products, a CMS shop page shell, and a main navigation shop item when they are missing. The bootstrap is additive: it does not overwrite existing products or manually edited menu items.

## Operational Notes

- Keep products in draft until copy, price, image, slug, and SEO metadata are ready.
- Use the site feature toggle to hide ecommerce for non-commerce sites.
- Verify Stripe mode and webhook secret before testing checkout.
- Use order lookup tokens for customer-facing status checks instead of exposing admin order detail routes.
- Do not store live credentials in source files, seed data, screenshots, or documentation.

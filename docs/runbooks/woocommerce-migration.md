# WooCommerce Migration Runbook

## Scope And Launch Position

The first migration phase imports the WooCommerce REST API JSON representation of:

- product categories, including parent references and remote category images;
- simple, physical products;
- product descriptions, publication state, SKU, prices, tax class, sale window, tags, inventory, backorder policy, category assignments, and remote image references.

The importer deliberately blocks customer and order payloads. It also blocks variable, grouped,
external, virtual, and downloadable products. Attributes, shipping dimensions/classes, related and
upsell products, plugin metadata, and other unrepresented fields are reported explicitly. A warning
means the catalog record can be rehearsed while the named field is omitted. An error prevents all
writes.

This phase is suitable only when simple physical catalog migration is useful on its own. It is not a
complete WooCommerce replacement gate if the client requires historical customer/order access,
variable products, subscriptions, digital delivery, tax history, refunds, or fulfillment history in
Core Platform at launch.

## Safety Properties

- Dry-run is the default. `--apply` is required to write.
- Apply requires `WOOCOMMERCE_IMPORT_TARGET` and a matching `--confirm-target` argument.
- Every category, product, default variant, and product-media ID is derived deterministically from
  its WooCommerce external ID. Replaying the same source cannot create another copy.
- Target slug and SKU collisions with records not owned by this deterministic mapping block apply.
- The entire catalog apply runs in one database transaction. A validation or database error rolls
  back that attempt.
- A rerun treats the WooCommerce source as authoritative for imported product/category fields.
  Imported product category assignments and media references are replaced with the current source
  values. Unrelated products and categories are not deleted.
- Descriptions are sanitized to a conservative HTML allowlist. Media URLs must be HTTP(S); the
  importer references source media and does not fetch or copy it.
- Reports contain counts, monetary totals, hashed source references, issue codes, and field names.
  They do not contain customer/order payloads, names, emails, addresses, or payment data. Report
  files are created with owner-only permissions.

## Prepare The Source Export

1. Record the WooCommerce version, enabled commerce plugins, store currency, currency minor-unit
   precision, product count by type/status, category count, and export timestamp.
2. Inventory all capabilities that affect catalog or checkout: variations, subscriptions, bundles,
   memberships, downloads, tax plugins, custom fields, shipping classes, coupons, refunds, and
   fulfillment integrations. Assign an owner and disposition to every unsupported capability.
3. Export `wp-json/wc/v3/products/categories` and `wp-json/wc/v3/products` with pagination until the
   API returns no more records. Keep credentials in a protected credential store or environment;
   never put consumer secrets in this repository, a command transcript, a report, or a committed
   file.
4. Save either separate JSON arrays or a bundle shaped as follows:

```json
{
  "categories": [],
  "products": [],
  "customers": [],
  "orders": []
}
```

The WooCommerce admin CSV format is not accepted in this phase. Convert it to the REST API field
shape with a reviewed client-specific transform or export through the REST API. Store raw exports
outside the repository on encrypted storage, restrict file permissions, and define a deletion date.
Do not include `customers` or `orders` in a catalog-phase bundle; if present, they intentionally
block apply.

## Offline Validation

Install dependencies, then validate without connecting to a target database:

```bash
npm run import:woocommerce -- \
  --categories-file /secure/export/categories.json \
  --products-file /secure/export/products.json \
  --currency-decimals 2 \
  --offline \
  --report /secure/reports/woo-offline-dry-run.json
```

Exit status `0` means there are no blocking issues. Status `2` means the report contains validation
errors. Review every warning; warnings are launch decisions, not silent discards. Confirm that:

- `source` and `planned` counts match;
- `productPriceTotal` matches an independently calculated sum of regular/base product prices in
  integer minor units;
- every unsupported field has an accepted disposition;
- no customer or order records were supplied;
- the source fingerprint is recorded in the migration ticket.

## Staging Rehearsal

Use a dedicated, non-production client stack and database. Do not point this command at a shared or
production database.

1. Provision the isolated stack through the separately approved deployment runbook.
2. Run all application migrations and verify database readiness.
3. Set a human-readable target label in that stack, for example:

   ```bash
   export WOOCOMMERCE_IMPORT_TARGET=client-acme-staging-rehearsal-1
   ```

4. Take and retain a pre-import database backup using the approved backup workflow.
5. Run the database-aware dry-run. This checks existing target IDs, slugs, and SKUs and reports the
   target's current reconciliation state:

   ```bash
   npm run import:woocommerce -- \
     --file /secure/export/woo-catalog.json \
     --report /secure/reports/woo-target-dry-run.json
   ```

6. Resolve every error. Never rename or delete an existing target record merely to make the import
   pass without confirming ownership.
7. Apply only after the dry-run report is approved:

   ```bash
   npm run import:woocommerce -- \
     --file /secure/export/woo-catalog.json \
     --apply \
     --confirm-target client-acme-staging-rehearsal-1 \
     --report /secure/reports/woo-apply.json
   ```

8. Require report status `reconciled`. Compare expected and target-after category count, product
   count, base-price total, media-reference count, and category-assignment count.
9. Run the same apply command a second time. Counts and monetary totals must remain unchanged. This
   is the rehearsal evidence for idempotency.
10. Inspect a sample containing published/draft, on-sale/full-price, taxable/non-taxable,
    in-stock/out-of-stock, backordered, multi-category, and multi-image products. Verify admin edit,
    storefront rendering, cart pricing, image access, and HTML output.

## Redirect Inventory

The importer does not use the old WooCommerce `permalink` as the new product canonical URL; target
product pages retain their Core Platform canonical URL. Generate a protected starting inventory
during dry-run with `--redirect-inventory /secure/reports/woo-product-redirects.csv`. The command
does not create redirects. Complete and approve an inventory with at least:

| Old URL               | New URL                     | Source product reference        | HTTP status | Verified |
| --------------------- | --------------------------- | ------------------------------- | ----------- | -------- |
| WooCommerce permalink | `/products/<imported-slug>` | deterministic product reference | `301`       | yes/no   |

Include product, category, paginated shop, cart, checkout, account, order-status, feed, sitemap, and
campaign URLs. Detect duplicate destinations and URL-encoding/trailing-slash differences. Import
redirects through the established CMS redirect workflow only after review; this catalog tool does
not mutate redirects or infrastructure.

## Cutover Checklist

1. Meet all catalog-phase launch gates below and obtain client approval for every intentionally
   unsupported capability.
2. Freeze WooCommerce catalog edits or record a delta-export boundary. Export categories/products
   again after the freeze.
3. Repeat offline and target dry-runs. Compare the new fingerprint and explain every count or total
   change from rehearsal.
4. Take a fresh target backup and record the restore procedure, owner, and rollback deadline.
5. Apply the final catalog and require `reconciled` status. Re-run once to demonstrate stable totals.
6. Perform storefront, cart, server pricing, tax configuration, shipping, payment test-mode,
   inventory, email, search/feed/sitemap, and redirect checks using non-production payment methods.
7. Execute DNS/deployment cutover only through the separately approved deployment runbook.

## Rollback Decision And Clean Retry

An individual failed import attempt needs no cleanup because its transaction is rolled back. For a
successful rehearsal that must be reset, restore the isolated target's pre-import backup instead of
hand-deleting deterministic records. Verify readiness after restore, correct the source or mapping,
run dry-run again, and apply as a new rehearsal.

Before cutover, define objective rollback triggers such as reconciliation mismatch, material price
errors, checkout failure, unavailable media above the accepted threshold, missing critical
redirects, or an unsupported product capability discovered after approval. If a trigger fires
inside the agreed rollback window, stop new target checkout, follow the deployment runbook to return
traffic to the preserved WooCommerce site, and restore the target backup only if needed for a clean
retry. Preserve reports and timestamps, but never attach raw customer/order exports to an incident
ticket.

Do not use ad hoc SQL deletion as rollback. A rerun is safe for correcting imported records, but it
is source-authoritative and will replace imported product media and category assignments.

## Post-Cutover Verification

- Reconcile published/draft counts, category counts, base-price total, and sampled sale prices.
- Crawl the redirect inventory and verify status, destination, canonical URL, and no redirect loops.
- Verify storefront visibility, product structured data, image availability, cart repricing,
  inventory behavior, shipping/tax settings, checkout, signed payment webhook reconciliation,
  email, search, feed, sitemap, and error monitoring.
- Monitor 404s, checkout/payment failures, media failures, and inventory anomalies through the
  agreed rollback window.
- Retain sanitized reports according to the migration evidence policy. Securely delete raw exports
  on the documented retention date.
- Keep WooCommerce read-only for the agreed historical-access period when customer/order history was
  not migrated.

## Phased Remainder And Launch Gates

| Phase           | Required capability                                                                           | Launch gate                                                                                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 (implemented) | Categories and simple physical products                                                       | Two idempotent isolated rehearsals; zero blocking issues; counts/totals and samples approved                                                                                       |
| 2               | Options, variations, dimensions, shipping classes, related/upsell links, local media transfer | Variant combination/SKU/inventory and media-byte reconciliation pass                                                                                                               |
| 3               | Customers and addresses                                                                       | Data-processing approval, minimization/retention rules, consent mapping, normalized-email duplicate policy, account-linking policy, and access-control tests pass                  |
| 4               | Historical orders, items, coupons, refunds, tax, shipments, notes                             | Immutable snapshots, currency/tax rounding, payment/refund status mapping, guest lookup policy, PII-safe errors, count and gross/discount/tax/shipping/refund/net totals reconcile |
| 5               | Delta sync and final cutover                                                                  | Freeze/delta boundary is repeatable, redirects pass, rollback drill passes, post-cutover monitoring owner is assigned                                                              |

Core Platform must not be presented as the complete replacement until every client-used capability
has either passed its launch gate or has an explicit, client-approved alternative such as retained
read-only WooCommerce history.

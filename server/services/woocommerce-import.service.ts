import { createHash } from "node:crypto";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";

const wooSourceIdSchema = z.union([
  z.number().int().nonnegative(),
  z.string().trim().regex(/^\d+$/),
]);

const wooReferenceSchema = z.object({
  id: wooSourceIdSchema,
  name: z.string().optional(),
  slug: z.string().optional(),
});

const wooImageSchema = z
  .object({
    id: wooSourceIdSchema.optional(),
    src: z.string(),
    name: z.string().optional(),
    alt: z.string().optional(),
  })
  .passthrough();

const wooCategorySchema = z
  .object({
    id: wooSourceIdSchema,
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().optional().default(""),
    parent: wooSourceIdSchema.optional().default(0),
    image: wooImageSchema.nullish(),
    menu_order: z.number().int().optional().default(0),
  })
  .passthrough();

const wooProductSchema = z
  .object({
    id: wooSourceIdSchema,
    name: z.string().min(1),
    slug: z.string().min(1),
    permalink: z.string().url().optional(),
    type: z.string().optional().default("simple"),
    status: z.string().optional().default("draft"),
    featured: z.boolean().optional().default(false),
    catalog_visibility: z.string().optional().default("visible"),
    description: z.string().optional().default(""),
    short_description: z.string().optional().default(""),
    sku: z.string().optional().default(""),
    price: z.string().optional().default(""),
    regular_price: z.string().optional().default(""),
    sale_price: z.string().optional().default(""),
    on_sale: z.boolean().optional().default(false),
    taxable: z.boolean().optional(),
    tax_status: z.string().optional().default("taxable"),
    tax_class: z.string().optional().default(""),
    manage_stock: z.boolean().optional().default(false),
    stock_quantity: z.number().int().nullable().optional(),
    backorders: z.string().optional().default("no"),
    virtual: z.boolean().optional().default(false),
    downloadable: z.boolean().optional().default(false),
    downloads: z.array(z.unknown()).optional().default([]),
    categories: z.array(wooReferenceSchema).optional().default([]),
    tags: z.array(wooReferenceSchema).optional().default([]),
    images: z.array(wooImageSchema).optional().default([]),
    attributes: z.array(z.unknown()).optional().default([]),
    variations: z.array(wooSourceIdSchema).optional().default([]),
    grouped_products: z.array(wooSourceIdSchema).optional().default([]),
    external_url: z.string().optional().default(""),
    button_text: z.string().optional().default(""),
    related_ids: z.array(wooSourceIdSchema).optional().default([]),
    upsell_ids: z.array(wooSourceIdSchema).optional().default([]),
    cross_sell_ids: z.array(wooSourceIdSchema).optional().default([]),
    weight: z.string().optional().default(""),
    dimensions: z.object({ length: z.string(), width: z.string(), height: z.string() }).optional(),
    shipping_class: z.string().optional().default(""),
    date_created: z.string().nullish(),
    date_modified: z.string().nullish(),
    date_on_sale_from: z.string().nullish(),
    date_on_sale_to: z.string().nullish(),
    meta_data: z.array(z.unknown()).optional().default([]),
  })
  .passthrough();

const importEntitiesSchema = z
  .object({
    categories: z.array(z.unknown()).optional().default([]),
    products: z.array(z.unknown()).optional().default([]),
    customers: z.array(z.unknown()).optional().default([]),
    orders: z.array(z.unknown()).optional().default([]),
  })
  .passthrough();

const importEnvelopeSchema = z
  .object({
    contract: z.literal("core.woocommerce-import"),
    contractVersion: z.literal("1.0.0"),
    source: z
      .object({
        system: z.literal("woocommerce"),
        storeId: z.string().trim().min(1).max(200),
        baseUrl: z.string().url(),
        woocommerceVersion: z.string().trim().min(1),
        wordpressTimezone: z.string().trim().min(1),
        currency: z.string().regex(/^[A-Z]{3}$/),
        currencyMinorUnits: z.number().int().min(0).max(4),
        exportedAt: z.string().datetime({ offset: true }),
        highWaterMark: z.string().trim().min(1).max(200),
      })
      .strict(),
    entities: importEntitiesSchema,
  })
  .strict();

const allowedHtmlTags = [
  "p",
  "br",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "h2",
  "h3",
  "h4",
  "a",
];

export type WooImportIssueSeverity = "warning" | "error";

export interface WooImportIssue {
  severity: WooImportIssueSeverity;
  code: string;
  entity: "bundle" | "category" | "product" | "customer" | "order";
  sourceRef?: string;
  field?: string;
  message: string;
  disposition?: "mapped" | "excluded-approved" | "manual-transform" | "quarantined";
}

export interface WooImportCategory {
  sourceId: string;
  targetId: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  image: string | null;
  sortOrder: number;
  active: boolean;
}

export interface WooImportMedia {
  targetId: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  primary: boolean;
}

export interface WooImportProduct {
  sourceId: string;
  targetId: string;
  defaultVariantId: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  price: number;
  salePrice: number | null;
  compareAtPrice: number | null;
  taxable: boolean;
  taxCategory: string | null;
  featured: boolean;
  visibility: string;
  publishedAt: Date | null;
  active: boolean;
  status: "draft" | "published";
  sku: string | null;
  tags: string[];
  urlSlug: string;
  sourcePermalink: string | null;
  saleStartAt: Date | null;
  saleEndAt: Date | null;
  primaryImage: string | null;
  secondaryImages: string[];
  categoryIds: string[];
  media: WooImportMedia[];
  inventoryQuantity: number;
  trackInventory: boolean;
  allowBackorder: boolean;
}

interface WooImportOperationBase {
  externalId: string;
  targetId: string;
  dependencies: string[];
  normalizedSourceHash: string;
}

export type WooImportOperation =
  | (WooImportOperationBase & {
      entityType: "category";
      targetType: "ecommerce_category";
      targetRecord: WooImportCategory;
    })
  | (WooImportOperationBase & {
      entityType: "product";
      targetType: "ecommerce_product";
      targetRecord: WooImportProduct;
    });

export interface WooImportTargetMapping {
  entityType: "category" | "product";
  externalId: string;
  targetType: "ecommerce_category" | "ecommerce_product";
  targetId: string;
  normalizedSourceHash: string;
  targetBaselineHash: string;
  lifecycleState: "active" | "manual_review" | "rolled_back";
}

export interface WooImportTargetSnapshot {
  mappings: WooImportTargetMapping[];
  categories: Array<{ id: string; slug: string; targetHash: string }>;
  products: Array<{
    id: string;
    urlSlug: string;
    sku: string | null;
    targetHash: string;
  }>;
}

export interface WooImportTargetInspection {
  matchedExternalIds: string[];
  issues: WooImportIssue[];
}

export interface WooImportPlan {
  contract: "core.woocommerce-import";
  contractVersion: "1.0.0";
  sourceStoreId: string | null;
  highWaterMark: string | null;
  currency: string | null;
  currencyMinorUnits: number | null;
  enabledPhases: [1];
  fingerprint: string;
  categories: WooImportCategory[];
  products: WooImportProduct[];
  operations: WooImportOperation[];
  issues: WooImportIssue[];
  reconciliation: {
    source: { categories: number; products: number; productPriceTotal: number };
    planned: { categories: number; products: number; productPriceTotal: number };
    unsupported: { customers: number; orders: number };
  };
}

export function wooSourceRef(entity: string, id: unknown) {
  return `${entity}:${createHash("sha256").update(String(id)).digest("hex").slice(0, 12)}`;
}

export function deterministicWooCommerceId(entity: string, externalId: string) {
  const bytes = Buffer.from(
    createHash("sha256").update(`core-platform:woocommerce:${entity}:${externalId}`).digest("hex"),
    "hex",
  ).subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sanitizeWooHtml(value: string) {
  const sanitized = sanitizeHtml(value, {
    allowedTags: allowedHtmlTags,
    allowedAttributes: { a: ["href", "title", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    },
  }).trim();
  return sanitized || null;
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function moneyToMinorUnits(value: string, decimals: number) {
  if (!value.trim()) return null;
  const match = value.trim().match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) return undefined;
  const fraction = match[2] ?? "";
  if (fraction.length > decimals) return undefined;
  const multiplier = 10 ** decimals;
  const result = Number(match[1]) * multiplier + Number(fraction.padEnd(decimals, "0") || 0);
  return Number.isSafeInteger(result) ? result : undefined;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function hasMeaningfulValue(value: unknown) {
  if (value == null || value === "" || value === false) return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === "object" && Object.keys(value as object).length === 0) return false;
  return true;
}

function unsupportedFields(
  value: Record<string, unknown>,
  known: Set<string>,
  entity: WooImportIssue["entity"],
  ref: string,
  prefix?: string,
) {
  return Object.entries(value)
    .filter(([key, item]) => !known.has(key) && hasMeaningfulValue(item))
    .map<WooImportIssue>(([field]) => ({
      severity: "warning",
      code: "unsupported_field",
      entity,
      sourceRef: ref,
      field: prefix ? `${prefix}.${field}` : field,
      message: `WooCommerce field '${prefix ? `${prefix}.${field}` : field}' is not represented and will not be imported.`,
    }));
}

const knownCategoryFields = new Set(Object.keys(wooCategorySchema.shape));
const knownProductFields = new Set(Object.keys(wooProductSchema.shape));
const knownImageFields = new Set(Object.keys(wooImageSchema.shape));

export function buildWooCommerceCatalogPlan(rawInput: unknown): WooImportPlan {
  const issues: WooImportIssue[] = [];
  const envelopeResult = importEnvelopeSchema.safeParse(rawInput);
  if (!envelopeResult.success) {
    return {
      contract: "core.woocommerce-import",
      contractVersion: "1.0.0",
      sourceStoreId: null,
      highWaterMark: null,
      currency: null,
      currencyMinorUnits: null,
      enabledPhases: [1],
      fingerprint: createHash("sha256").update(stableJson(rawInput)).digest("hex"),
      categories: [],
      products: [],
      operations: [],
      issues: [
        {
          severity: "error",
          code: "invalid_envelope",
          entity: "bundle",
          message: "Input must match the core.woocommerce-import v1.0.0 source envelope.",
        },
      ],
      reconciliation: {
        source: { categories: 0, products: 0, productPriceTotal: 0 },
        planned: { categories: 0, products: 0, productPriceTotal: 0 },
        unsupported: { customers: 0, orders: 0 },
      },
    };
  }

  const envelope = envelopeResult.data;
  const bundle = envelope.entities;
  const currencyDecimals = envelope.source.currencyMinorUnits;
  for (const field of Object.keys(bundle)) {
    if (["categories", "products", "customers", "orders"].includes(field)) continue;
    issues.push({
      severity: "warning",
      code: "unsupported_bundle_field",
      entity: "bundle",
      field,
      message: `Bundle field '${field}' is not recognized and will not be imported.`,
    });
  }
  if (bundle.customers.length) {
    issues.push({
      severity: "error",
      code: "customer_import_not_enabled",
      entity: "customer",
      message: `${bundle.customers.length} customer record(s) were supplied. Customer import is blocked to avoid persisting unreviewed personal data.`,
    });
  }
  if (bundle.orders.length) {
    issues.push({
      severity: "error",
      code: "order_import_not_enabled",
      entity: "order",
      message: `${bundle.orders.length} order record(s) were supplied. Historical order import is blocked until payment, refund, tax, and fulfillment semantics are implemented.`,
    });
  }

  const categories: WooImportCategory[] = [];
  const categoryBySourceId = new Map<string, WooImportCategory>();
  const categorySlugs = new Map<string, string>();

  for (const rawCategory of bundle.categories) {
    const parsed = wooCategorySchema.safeParse(rawCategory);
    const rawId =
      rawCategory && typeof rawCategory === "object"
        ? (rawCategory as Record<string, unknown>).id
        : "invalid";
    const ref = wooSourceRef("category", rawId);
    if (!parsed.success) {
      issues.push({
        severity: "error",
        code: "invalid_category",
        entity: "category",
        sourceRef: ref,
        message: "Category is missing a valid id, name, or slug.",
      });
      continue;
    }

    const sourceId = String(parsed.data.id);
    if (categoryBySourceId.has(sourceId)) {
      issues.push({
        severity: "error",
        code: "duplicate_external_id",
        entity: "category",
        sourceRef: ref,
        field: "id",
        message: "The category external id appears more than once.",
      });
      continue;
    }
    const slugOwner = categorySlugs.get(parsed.data.slug);
    if (slugOwner && slugOwner !== sourceId) {
      issues.push({
        severity: "error",
        code: "duplicate_source_slug",
        entity: "category",
        sourceRef: ref,
        field: "slug",
        message: "The category slug appears on more than one source category.",
      });
      continue;
    }

    const imageUrl = parsed.data.image?.src?.trim() || null;
    if (imageUrl && !isHttpUrl(imageUrl)) {
      issues.push({
        severity: "error",
        code: "invalid_media_url",
        entity: "category",
        sourceRef: ref,
        field: "image.src",
        message: "Category image must use an http or https URL.",
      });
    }

    const sanitizedDescription = sanitizeWooHtml(parsed.data.description);
    if (parsed.data.description.trim() && sanitizedDescription !== parsed.data.description.trim()) {
      issues.push({
        severity: "warning",
        code: "html_sanitized",
        entity: "category",
        sourceRef: ref,
        field: "description",
        message: "Unsupported or unsafe category-description HTML was removed.",
        disposition: "mapped",
      });
    }
    const category: WooImportCategory = {
      sourceId,
      targetId: deterministicWooCommerceId("category", sourceId),
      name: parsed.data.name.trim(),
      slug: parsed.data.slug.trim(),
      description: sanitizedDescription,
      parentId:
        String(parsed.data.parent) === "0"
          ? null
          : deterministicWooCommerceId("category", String(parsed.data.parent)),
      image: imageUrl && isHttpUrl(imageUrl) ? imageUrl : null,
      sortOrder: parsed.data.menu_order,
      active: true,
    };
    categories.push(category);
    categoryBySourceId.set(sourceId, category);
    categorySlugs.set(category.slug, sourceId);
    issues.push(
      ...unsupportedFields(
        rawCategory as Record<string, unknown>,
        knownCategoryFields,
        "category",
        ref,
      ),
    );
    if (parsed.data.image) {
      issues.push(
        ...unsupportedFields(parsed.data.image, knownImageFields, "category", ref, "image"),
      );
    }
  }

  for (const category of categories) {
    if (
      category.parentId &&
      !categories.some((candidate) => candidate.targetId === category.parentId)
    ) {
      issues.push({
        severity: "error",
        code: "missing_category_parent",
        entity: "category",
        sourceRef: wooSourceRef("category", category.sourceId),
        field: "parent",
        message: "Category parent is not present in this import bundle.",
      });
    }
  }

  for (const category of categories) {
    const visited = new Set<string>();
    let current: WooImportCategory | undefined = category;
    while (current?.parentId) {
      if (visited.has(current.targetId)) {
        issues.push({
          severity: "error",
          code: "category_parent_cycle",
          entity: "category",
          sourceRef: wooSourceRef("category", category.sourceId),
          field: "parent",
          message: "Category parent relationships contain a cycle.",
        });
        break;
      }
      visited.add(current.targetId);
      current = categories.find((candidate) => candidate.targetId === current?.parentId);
    }
  }

  const products: WooImportProduct[] = [];
  const productIds = new Set<string>();
  const productSlugs = new Map<string, string>();
  const productSkus = new Map<string, string>();

  for (const rawProduct of bundle.products) {
    const parsed = wooProductSchema.safeParse(rawProduct);
    const rawId =
      rawProduct && typeof rawProduct === "object"
        ? (rawProduct as Record<string, unknown>).id
        : "invalid";
    const ref = wooSourceRef("product", rawId);
    if (!parsed.success) {
      issues.push({
        severity: "error",
        code: "invalid_product",
        entity: "product",
        sourceRef: ref,
        message: "Product is missing required fields or contains invalid field types.",
      });
      continue;
    }

    const sourceId = String(parsed.data.id);
    if (productIds.has(sourceId)) {
      issues.push({
        severity: "error",
        code: "duplicate_external_id",
        entity: "product",
        sourceRef: ref,
        field: "id",
        message: "The product external id appears more than once.",
      });
      continue;
    }
    productIds.add(sourceId);

    if (parsed.data.type !== "simple") {
      issues.push({
        severity: "error",
        code: "unsupported_product_type",
        entity: "product",
        sourceRef: ref,
        field: "type",
        message: "Only WooCommerce simple products are supported in this phase.",
      });
      continue;
    }
    if (parsed.data.virtual || parsed.data.downloadable || parsed.data.downloads.length) {
      issues.push({
        severity: "error",
        code: "unsupported_digital_delivery",
        entity: "product",
        sourceRef: ref,
        field: "downloadable",
        message: "Virtual/downloadable product delivery cannot yet be represented safely.",
      });
      continue;
    }
    if (parsed.data.permalink && !isHttpUrl(parsed.data.permalink)) {
      issues.push({
        severity: "error",
        code: "invalid_permalink_url",
        entity: "product",
        sourceRef: ref,
        field: "permalink",
        message: "Product permalink must use an http or https URL.",
      });
      continue;
    }
    if (!["publish", "draft"].includes(parsed.data.status)) {
      issues.push({
        severity: "error",
        code: "unsupported_product_status",
        entity: "product",
        sourceRef: ref,
        field: "status",
        message: "This WooCommerce publication status is not represented in phase one.",
      });
      continue;
    }
    if (!["visible", "hidden"].includes(parsed.data.catalog_visibility)) {
      issues.push({
        severity: "error",
        code: "unsupported_catalog_visibility",
        entity: "product",
        sourceRef: ref,
        field: "catalog_visibility",
        message: "This WooCommerce catalog visibility is not represented in phase one.",
      });
      continue;
    }
    if (!["taxable", "none"].includes(parsed.data.tax_status)) {
      issues.push({
        severity: "error",
        code: "unsupported_tax_status",
        entity: "product",
        sourceRef: ref,
        field: "tax_status",
        message: "This WooCommerce tax status is not represented in phase one.",
      });
      continue;
    }
    if (parsed.data.backorders === "notify") {
      issues.push({
        severity: "warning",
        code: "backorder_notification_not_imported",
        entity: "product",
        sourceRef: ref,
        field: "backorders",
        message:
          "Backorders remain enabled, but WooCommerce's customer notification mode is not represented.",
      });
    }

    const basePrice = moneyToMinorUnits(
      parsed.data.regular_price || parsed.data.price,
      currencyDecimals,
    );
    const currentPrice = moneyToMinorUnits(parsed.data.price, currencyDecimals);
    const salePrice = moneyToMinorUnits(parsed.data.sale_price, currencyDecimals);
    if (
      basePrice == null ||
      basePrice === undefined ||
      currentPrice === undefined ||
      salePrice === undefined
    ) {
      issues.push({
        severity: "error",
        code: "invalid_money",
        entity: "product",
        sourceRef: ref,
        field: "price",
        message: `Product prices must be non-negative decimal strings with at most ${currencyDecimals} fractional digits.`,
      });
      continue;
    }
    if (parsed.data.on_sale && salePrice == null) {
      issues.push({
        severity: "error",
        code: "missing_sale_price",
        entity: "product",
        sourceRef: ref,
        field: "sale_price",
        message: "An on-sale product must provide an explicit sale price.",
      });
      continue;
    }

    const existingSlug = productSlugs.get(parsed.data.slug);
    if (existingSlug && existingSlug !== sourceId) {
      issues.push({
        severity: "error",
        code: "duplicate_source_slug",
        entity: "product",
        sourceRef: ref,
        field: "slug",
        message: "The product slug appears on more than one source product.",
      });
      continue;
    }
    const normalizedSku = parsed.data.sku.trim() || null;
    if (normalizedSku) {
      const existingSku = productSkus.get(normalizedSku.toLowerCase());
      if (existingSku && existingSku !== sourceId) {
        issues.push({
          severity: "error",
          code: "duplicate_source_sku",
          entity: "product",
          sourceRef: ref,
          field: "sku",
          message: "The product SKU appears on more than one source product.",
        });
        continue;
      }
      productSkus.set(normalizedSku.toLowerCase(), sourceId);
    }

    const media: WooImportMedia[] = [];
    for (const [index, image] of parsed.data.images.entries()) {
      if (!isHttpUrl(image.src)) {
        issues.push({
          severity: "error",
          code: "invalid_media_url",
          entity: "product",
          sourceRef: ref,
          field: `images[${index}].src`,
          message: "Product image must use an http or https URL.",
        });
        continue;
      }
      const mediaExternalId = image.id == null ? image.src : String(image.id);
      media.push({
        targetId: deterministicWooCommerceId(`product-media:${sourceId}`, mediaExternalId),
        url: image.src,
        altText: image.alt?.trim() || image.name?.trim() || null,
        sortOrder: index,
        primary: index === 0,
      });
      issues.push(
        ...unsupportedFields(image, knownImageFields, "product", ref, `images[${index}]`),
      );
    }

    const categoryIds: string[] = [];
    for (const categoryRef of parsed.data.categories) {
      const category = categoryBySourceId.get(String(categoryRef.id));
      if (!category) {
        issues.push({
          severity: "error",
          code: "missing_category_reference",
          entity: "product",
          sourceRef: ref,
          field: "categories",
          message: "A referenced category is not present in the categories import array.",
        });
      } else {
        categoryIds.push(category.targetId);
      }
    }

    const materialUnsupported: Array<[string, unknown]> = [
      ["attributes", parsed.data.attributes],
      ["variations", parsed.data.variations],
      ["grouped_products", parsed.data.grouped_products],
      ["external_url", parsed.data.external_url],
      ["button_text", parsed.data.button_text],
      ["related_ids", parsed.data.related_ids],
      ["upsell_ids", parsed.data.upsell_ids],
      ["cross_sell_ids", parsed.data.cross_sell_ids],
      ["weight", parsed.data.weight],
      ["dimensions", parsed.data.dimensions],
      ["shipping_class", parsed.data.shipping_class],
      ["meta_data", parsed.data.meta_data],
      ["date_modified", parsed.data.date_modified],
    ];
    for (const [field, value] of materialUnsupported) {
      if (!hasMeaningfulValue(value)) continue;
      issues.push({
        severity: "warning",
        code: "unsupported_field",
        entity: "product",
        sourceRef: ref,
        field,
        message: `WooCommerce field '${field}' is not represented in this catalog phase and will not be imported.`,
      });
    }

    const sanitizedDescription = sanitizeWooHtml(parsed.data.description);
    const sanitizedShortDescription = sanitizeWooHtml(parsed.data.short_description);
    for (const [field, original, sanitized] of [
      ["description", parsed.data.description, sanitizedDescription],
      ["short_description", parsed.data.short_description, sanitizedShortDescription],
    ] as const) {
      if (original.trim() && sanitized !== original.trim()) {
        issues.push({
          severity: "warning",
          code: "html_sanitized",
          entity: "product",
          sourceRef: ref,
          field,
          message: `Unsupported or unsafe ${field} HTML was removed.`,
          disposition: "mapped",
        });
      }
    }
    const publishedAt = parseDate(parsed.data.date_created);
    if (parsed.data.date_created && !publishedAt) {
      issues.push({
        severity: "error",
        code: "invalid_source_date",
        entity: "product",
        sourceRef: ref,
        field: "date_created",
        message: "Invalid source publication date cannot be ordered safely.",
      });
    }
    for (const [field, value] of [
      ["date_on_sale_from", parsed.data.date_on_sale_from],
      ["date_on_sale_to", parsed.data.date_on_sale_to],
    ] as const) {
      if (value && !parseDate(value)) {
        issues.push({
          severity: "error",
          code: "invalid_source_date",
          entity: "product",
          sourceRef: ref,
          field,
          message: `Invalid ${field} value cannot be mapped safely.`,
        });
      }
    }

    const status = parsed.data.status === "publish" ? "published" : "draft";
    const targetId = deterministicWooCommerceId("product", sourceId);
    const effectivePrice = currentPrice ?? salePrice ?? basePrice;
    products.push({
      sourceId,
      targetId,
      defaultVariantId: deterministicWooCommerceId("product-variant", sourceId),
      name: parsed.data.name.trim(),
      description: sanitizedDescription,
      shortDescription: sanitizedShortDescription,
      price: basePrice,
      salePrice: parsed.data.on_sale ? (salePrice ?? effectivePrice) : null,
      compareAtPrice: parsed.data.on_sale ? basePrice : null,
      taxable: parsed.data.taxable ?? parsed.data.tax_status === "taxable",
      taxCategory: parsed.data.tax_class.trim() || null,
      featured: parsed.data.featured,
      visibility: parsed.data.catalog_visibility === "hidden" ? "hidden" : "online",
      publishedAt: status === "published" ? (publishedAt ?? new Date(0)) : null,
      active: status === "published",
      status,
      sku: normalizedSku,
      tags: parsed.data.tags
        .map((tag) => tag.name?.trim())
        .filter((tag): tag is string => Boolean(tag)),
      urlSlug: parsed.data.slug.trim(),
      sourcePermalink: parsed.data.permalink ?? null,
      saleStartAt: parseDate(parsed.data.date_on_sale_from),
      saleEndAt: parseDate(parsed.data.date_on_sale_to),
      primaryImage: media[0]?.url ?? null,
      secondaryImages: media.slice(1).map((item) => item.url),
      categoryIds: [...new Set(categoryIds)],
      media,
      inventoryQuantity: parsed.data.manage_stock ? (parsed.data.stock_quantity ?? 0) : 0,
      trackInventory: parsed.data.manage_stock,
      allowBackorder: parsed.data.backorders !== "no",
    });
    productSlugs.set(parsed.data.slug, sourceId);
    issues.push(
      ...unsupportedFields(
        rawProduct as Record<string, unknown>,
        knownProductFields,
        "product",
        ref,
      ),
    );
  }

  const sourcePriceTotal = products.reduce((total, product) => total + product.price, 0);
  const operations: WooImportOperation[] = [
    ...categories.map<WooImportOperation>((category) => ({
      entityType: "category",
      externalId: category.sourceId,
      targetType: "ecommerce_category",
      targetId: category.targetId,
      dependencies: category.parentId ? [category.parentId] : [],
      normalizedSourceHash: createHash("sha256").update(stableJson(category)).digest("hex"),
      targetRecord: category,
    })),
    ...products.map<WooImportOperation>((product) => ({
      entityType: "product",
      externalId: product.sourceId,
      targetType: "ecommerce_product",
      targetId: product.targetId,
      dependencies: product.categoryIds,
      normalizedSourceHash: createHash("sha256").update(stableJson(product)).digest("hex"),
      targetRecord: product,
    })),
  ];
  return {
    contract: "core.woocommerce-import",
    contractVersion: "1.0.0",
    sourceStoreId: envelope.source.storeId,
    highWaterMark: envelope.source.highWaterMark,
    currency: envelope.source.currency,
    currencyMinorUnits: envelope.source.currencyMinorUnits,
    enabledPhases: [1],
    fingerprint: createHash("sha256").update(stableJson(envelope)).digest("hex"),
    categories,
    products,
    operations,
    issues,
    reconciliation: {
      source: {
        categories: bundle.categories.length,
        products: bundle.products.length,
        productPriceTotal: sourcePriceTotal,
      },
      planned: {
        categories: categories.length,
        products: products.length,
        productPriceTotal: sourcePriceTotal,
      },
      unsupported: { customers: bundle.customers.length, orders: bundle.orders.length },
    },
  };
}

export function assertWooCommercePlanCanApply(plan: WooImportPlan) {
  const { errors, undispositionedWarnings } = wooCommercePlanBlockers(plan);
  if (errors.length) {
    throw new Error(`WooCommerce import blocked by ${errors.length} validation error(s)`);
  }
  if (undispositionedWarnings.length) {
    throw new Error(
      `WooCommerce import blocked by ${undispositionedWarnings.length} undispositioned warning(s)`,
    );
  }
}

export function wooCommercePlanBlockers(plan: WooImportPlan) {
  return {
    errors: plan.issues.filter((issue) => issue.severity === "error"),
    undispositionedWarnings: plan.issues.filter(
      (issue) => issue.severity === "warning" && !issue.disposition,
    ),
  };
}

export function buildWooCommerceDryRunReport(plan: WooImportPlan) {
  const blockers = wooCommercePlanBlockers(plan);
  return {
    contract: plan.contract,
    contractVersion: plan.contractVersion,
    sourceStoreId: plan.sourceStoreId,
    highWaterMark: plan.highWaterMark,
    currency: plan.currency,
    currencyMinorUnits: plan.currencyMinorUnits,
    fingerprint: plan.fingerprint,
    mode: "dry-run-offline" as const,
    status:
      blockers.errors.length || blockers.undispositionedWarnings.length
        ? ("blocked" as const)
        : ("ready" as const),
    counts: {
      categories: plan.categories.length,
      products: plan.products.length,
      operations: plan.operations.length,
      errors: blockers.errors.length,
      warnings: plan.issues.filter((issue) => issue.severity === "warning").length,
      undispositionedWarnings: blockers.undispositionedWarnings.length,
    },
    reconciliation: plan.reconciliation,
    issues: plan.issues,
  };
}

export function inspectWooCommerceTarget(
  plan: WooImportPlan,
  target: WooImportTargetSnapshot,
): WooImportTargetInspection {
  const issues: WooImportIssue[] = [];
  const matchedExternalIds: string[] = [];
  const mappingBySource = new Map(
    target.mappings.map((mapping) => [`${mapping.entityType}:${mapping.externalId}`, mapping]),
  );
  const mappedTargetIds = new Set(target.mappings.map((mapping) => mapping.targetId));
  const categoriesById = new Map(target.categories.map((category) => [category.id, category]));
  const categoryIdBySlug = new Map(
    target.categories.map((category) => [category.slug, category.id]),
  );
  const productsById = new Map(target.products.map((product) => [product.id, product]));
  const productIdBySlug = new Map(target.products.map((product) => [product.urlSlug, product.id]));
  const productIdBySku = new Map(
    target.products
      .filter((product) => product.sku)
      .map((product) => [product.sku!.toLowerCase(), product.id]),
  );

  for (const operation of plan.operations) {
    const sourceRef = wooSourceRef(operation.entityType, operation.externalId);
    const mapping = mappingBySource.get(`${operation.entityType}:${operation.externalId}`);
    const targetRecord =
      operation.entityType === "category"
        ? categoriesById.get(operation.targetId)
        : productsById.get(operation.targetId);

    if (
      mapping &&
      (mapping.targetId !== operation.targetId || mapping.targetType !== operation.targetType)
    ) {
      issues.push({
        severity: "error",
        code: "mapping_target_conflict",
        entity: operation.entityType,
        sourceRef,
        message: "The durable source mapping points to a different target identity.",
      });
      continue;
    }
    if (mapping?.lifecycleState !== undefined && mapping.lifecycleState !== "active") {
      issues.push({
        severity: "error",
        code: "mapping_not_active",
        entity: operation.entityType,
        sourceRef,
        message: "The durable source mapping requires operator review before reuse.",
      });
      continue;
    }
    if (targetRecord && !mapping && !mappedTargetIds.has(operation.targetId)) {
      issues.push({
        severity: "error",
        code: "unowned_target_identity",
        entity: operation.entityType,
        sourceRef,
        message:
          "The deterministic target identity already exists without source ownership evidence.",
      });
      continue;
    }
    if (mapping && !targetRecord) {
      issues.push({
        severity: "error",
        code: "mapped_target_missing",
        entity: operation.entityType,
        sourceRef,
        message: "The durable source mapping refers to a missing target record.",
      });
      continue;
    }
    if (mapping && targetRecord && targetRecord.targetHash !== mapping.targetBaselineHash) {
      issues.push({
        severity: "error",
        code: "target_edited_since_import",
        entity: operation.entityType,
        sourceRef,
        message: "The mapped target changed after its last imported baseline.",
      });
      continue;
    }

    if (operation.entityType === "category") {
      const slugOwner = categoryIdBySlug.get(operation.targetRecord.slug);
      if (slugOwner && slugOwner !== operation.targetId) {
        issues.push({
          severity: "error",
          code: "target_slug_conflict",
          entity: "category",
          sourceRef,
          field: "slug",
          message: "A different target category already owns this slug.",
        });
        continue;
      }
    } else {
      const product = operation.targetRecord;
      const slugOwner = productIdBySlug.get(product.urlSlug);
      const skuOwner = product.sku ? productIdBySku.get(product.sku.toLowerCase()) : undefined;
      if (slugOwner && slugOwner !== operation.targetId) {
        issues.push({
          severity: "error",
          code: "target_slug_conflict",
          entity: "product",
          sourceRef,
          field: "slug",
          message: "A different target product already owns this slug.",
        });
        continue;
      }
      if (skuOwner && skuOwner !== operation.targetId) {
        issues.push({
          severity: "error",
          code: "target_sku_conflict",
          entity: "product",
          sourceRef,
          field: "sku",
          message: "A different target product variant already owns this SKU.",
        });
        continue;
      }
    }

    if (mapping?.normalizedSourceHash === operation.normalizedSourceHash) {
      matchedExternalIds.push(`${operation.entityType}:${operation.externalId}`);
    }
  }

  return { matchedExternalIds, issues };
}

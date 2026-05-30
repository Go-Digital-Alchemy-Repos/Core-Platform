import type {
  EcommerceCategory,
  EcommerceProduct,
  EcommerceProductMedia,
  EcommerceProductVariant,
} from "@shared/schema";

export interface PublicEcommerceCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  image: string | null;
  sortOrder: number;
}

export interface PublicEcommerceProductVariant {
  id: string;
  productId: string;
  title: string;
  optionSignature: string;
  optionValues: Record<string, string>;
  sku: string | null;
  price: number | null;
  salePrice: number | null;
  compareAtPrice: number | null;
  weight: number | null;
  weightUnit: string;
  image: string | null;
  sortOrder: number;
  isDefault: boolean;
}

export interface PublicEcommerceProductMedia {
  id: string;
  productId: string;
  variantId: string | null;
  url: string;
  type: string;
  altText: string | null;
  sortOrder: number;
  primary: boolean;
}

export interface PublicEcommerceProduct {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  shortDescription: string | null;
  productType: string | null;
  vendor: string | null;
  price: number;
  compareAtPrice: number | null;
  taxable: boolean;
  featured: boolean;
  visibility: string;
  publishedAt: Date | null;
  primaryImage: string | null;
  secondaryImages: string[];
  features: string[];
  included: string[];
  active: boolean;
  status: string;
  sku: string | null;
  tags: string[];
  salePrice: number | null;
  discountType: string;
  discountValue: number | null;
  saleStartAt: Date | null;
  saleEndAt: Date | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  urlSlug: string;
  canonicalUrl: string | null;
  robotsIndex: boolean;
  robotsFollow: boolean;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  physicalProduct: boolean;
  requiresShipping: boolean;
  weight: number | null;
  weightUnit: string;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: string;
  shippingProfile: string | null;
  fulfillmentType: string;
  relatedProductIds: string[];
  upsellProductIds: string[];
  badgeText: string | null;
  categories: PublicEcommerceCategory[];
  variants: PublicEcommerceProductVariant[];
  media: PublicEcommerceProductMedia[];
}

export function getPublicProductCategories(categories: EcommerceCategory[]): PublicEcommerceCategory[] {
  return categories
    .filter((category) => category.active)
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentId: category.parentId,
      image: category.image,
      sortOrder: category.sortOrder,
    }));
}

export function getPublicProductVariants(variants: EcommerceProductVariant[]): PublicEcommerceProductVariant[] {
  return variants
    .filter((variant) => variant.active && variant.status === "active")
    .map((variant) => ({
      id: variant.id,
      productId: variant.productId,
      title: variant.title,
      optionSignature: variant.optionSignature,
      optionValues: variant.optionValues,
      sku: variant.sku,
      price: variant.price,
      salePrice: variant.salePrice,
      compareAtPrice: variant.compareAtPrice,
      weight: variant.weight,
      weightUnit: variant.weightUnit,
      image: variant.image,
      sortOrder: variant.sortOrder,
      isDefault: variant.isDefault,
    }));
}

export function getPublicProductMedia(media: EcommerceProductMedia[]): PublicEcommerceProductMedia[] {
  return media.map((item) => ({
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    url: item.url,
    type: item.type,
    altText: item.altText,
    sortOrder: item.sortOrder,
    primary: item.primary,
  }));
}

export function toPublicEcommerceProduct(input: {
  product: EcommerceProduct;
  categories?: EcommerceCategory[];
  variants?: EcommerceProductVariant[];
  media?: EcommerceProductMedia[];
}): PublicEcommerceProduct {
  const { product } = input;
  return {
    id: product.id,
    name: product.name,
    tagline: product.tagline,
    description: product.description,
    shortDescription: product.shortDescription,
    productType: product.productType,
    vendor: product.vendor,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    taxable: product.taxable,
    featured: product.featured,
    visibility: product.visibility,
    publishedAt: product.publishedAt,
    primaryImage: product.primaryImage,
    secondaryImages: product.secondaryImages,
    features: product.features,
    included: product.included,
    active: product.active,
    status: product.status,
    sku: product.sku,
    tags: product.tags,
    salePrice: product.salePrice,
    discountType: product.discountType,
    discountValue: product.discountValue,
    saleStartAt: product.saleStartAt,
    saleEndAt: product.saleEndAt,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    metaKeywords: product.metaKeywords,
    urlSlug: product.urlSlug,
    canonicalUrl: product.canonicalUrl,
    robotsIndex: product.robotsIndex,
    robotsFollow: product.robotsFollow,
    ogTitle: product.ogTitle,
    ogDescription: product.ogDescription,
    ogImage: product.ogImage,
    physicalProduct: product.physicalProduct,
    requiresShipping: product.requiresShipping,
    weight: product.weight,
    weightUnit: product.weightUnit,
    length: product.length,
    width: product.width,
    height: product.height,
    dimensionUnit: product.dimensionUnit,
    shippingProfile: product.shippingProfile,
    fulfillmentType: product.fulfillmentType,
    relatedProductIds: product.relatedProductIds,
    upsellProductIds: product.upsellProductIds,
    badgeText: product.badgeText,
    categories: getPublicProductCategories(input.categories ?? []),
    variants: getPublicProductVariants(input.variants ?? []),
    media: getPublicProductMedia(input.media ?? []),
  };
}

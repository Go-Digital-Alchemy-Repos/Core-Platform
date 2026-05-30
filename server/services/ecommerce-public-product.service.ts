import type { EcommerceCategory, EcommerceProductVariant } from "@shared/schema";

export function getPublicProductCategories(categories: EcommerceCategory[]): EcommerceCategory[] {
  return categories.filter((category) => category.active);
}

export function getPublicProductVariants(variants: EcommerceProductVariant[]): EcommerceProductVariant[] {
  return variants.filter((variant) => variant.active && variant.status === "active");
}

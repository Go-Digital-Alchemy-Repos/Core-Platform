import { z } from "zod";
import { storage } from "../storage/index";
import type { PricedCartLine } from "./ecommerce-pricing.service";

const TAX_CATEGORY = "ecommerce_tax";

const booleanSetting = (value: string | undefined, fallback = false): boolean => {
  if (value == null || value === "") return fallback;
  return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
};

const numberSetting = (value: string | undefined, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const ecommerceTaxSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  manualRateBps: z.number().int().min(0).max(2500).default(0),
  taxShipping: z.boolean().default(false),
  stripeTaxEnabled: z.boolean().default(false),
});

export type EcommerceTaxSettings = z.infer<typeof ecommerceTaxSettingsSchema>;

export interface EcommerceTaxCalculation {
  taxAmount: number;
  taxableAmount: number;
  rateBps: number;
  provider: "none" | "manual";
  lineTaxAmounts: number[];
}

export async function getEcommerceTaxSettings(): Promise<EcommerceTaxSettings> {
  const settings = await storage.settings.getDecryptedCategory(TAX_CATEGORY);
  return ecommerceTaxSettingsSchema.parse({
    enabled: booleanSetting(settings.ecommerce_tax_enabled),
    manualRateBps: numberSetting(settings.ecommerce_tax_manual_rate_bps),
    taxShipping: booleanSetting(settings.ecommerce_tax_shipping),
    stripeTaxEnabled: booleanSetting(settings.ecommerce_stripe_tax_enabled),
  });
}

export async function saveEcommerceTaxSettings(
  input: EcommerceTaxSettings,
): Promise<EcommerceTaxSettings> {
  const settings = ecommerceTaxSettingsSchema.parse(input);
  await Promise.all([
    storage.settings.upsertSetting(
      "ecommerce_tax_enabled",
      String(settings.enabled),
      TAX_CATEGORY,
      false,
    ),
    storage.settings.upsertSetting(
      "ecommerce_tax_manual_rate_bps",
      String(settings.manualRateBps),
      TAX_CATEGORY,
      false,
    ),
    storage.settings.upsertSetting(
      "ecommerce_tax_shipping",
      String(settings.taxShipping),
      TAX_CATEGORY,
      false,
    ),
    storage.settings.upsertSetting(
      "ecommerce_stripe_tax_enabled",
      String(settings.stripeTaxEnabled),
      TAX_CATEGORY,
      false,
    ),
  ]);
  storage.settings.invalidateCategory(TAX_CATEGORY);
  return settings;
}

export async function calculateEcommerceTax(input: {
  lines: PricedCartLine[];
  subtotalAmount: number;
  discountAmount: number;
  shippingAmount: number;
}): Promise<EcommerceTaxCalculation> {
  const settings = await getEcommerceTaxSettings();
  if (!settings.enabled) {
    return {
      taxAmount: 0,
      taxableAmount: 0,
      rateBps: 0,
      provider: "none",
      lineTaxAmounts: input.lines.map(() => 0),
    };
  }

  const discountRatio =
    input.subtotalAmount > 0
      ? Math.min(1, Math.max(0, input.discountAmount / input.subtotalAmount))
      : 0;
  const lineTaxableAmounts = input.lines.map((line) =>
    line.taxable ? Math.max(0, Math.round(line.lineTotal * (1 - discountRatio))) : 0,
  );
  const discountedTaxableSubtotal = lineTaxableAmounts.reduce((sum, amount) => sum + amount, 0);
  const taxableShipping = settings.taxShipping ? input.shippingAmount : 0;
  const taxableAmount = Math.max(0, discountedTaxableSubtotal + taxableShipping);
  const rateBps = settings.manualRateBps;
  const taxAmount = Math.round((taxableAmount * rateBps) / 10000);
  const lineTaxTotal = Math.round((discountedTaxableSubtotal * rateBps) / 10000);
  let allocatedLineTax = 0;
  const lastTaxableIndex = lineTaxableAmounts.reduce(
    (last, amount, index) => (amount > 0 ? index : last),
    -1,
  );
  const lineTaxAmounts = lineTaxableAmounts.map((amount, index) => {
    if (amount <= 0) return 0;
    if (index === lastTaxableIndex) return lineTaxTotal - allocatedLineTax;
    const lineTax = Math.round((lineTaxTotal * amount) / discountedTaxableSubtotal);
    allocatedLineTax += lineTax;
    return lineTax;
  });

  return {
    taxAmount,
    taxableAmount,
    rateBps,
    provider: "manual",
    lineTaxAmounts,
  };
}

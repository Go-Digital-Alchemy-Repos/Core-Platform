import {
  ecommerceStoreSettingsSchema,
  getCountriesForShippingMode,
  getRegionOptions,
  type EcommerceStoreSettings,
} from "@shared/ecommerce-shipping-settings";
import { storage } from "../storage/index";

const SETTINGS_CATEGORY = "ecommerce_store";
const SETTINGS_KEY = "ecommerce_store_settings";

function httpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode });
}

export function getDefaultEcommerceStoreSettings(): EcommerceStoreSettings {
  return ecommerceStoreSettingsSchema.parse({
    storeOrigin: { country: "US" },
    shippingDestinationMode: "us_only",
    allowedCountries: ["US"],
  });
}

export async function getEcommerceStoreSettings(): Promise<EcommerceStoreSettings> {
  if (typeof storage.settings.getSetting !== "function") {
    return getDefaultEcommerceStoreSettings();
  }
  const rawSettings = await storage.settings.getSetting(SETTINGS_KEY);
  if (!rawSettings) return getDefaultEcommerceStoreSettings();

  try {
    const parsed = JSON.parse(rawSettings) as unknown;
    const settings = ecommerceStoreSettingsSchema.parse(parsed);
    return {
      ...settings,
      allowedCountries: getCountriesForShippingMode(
        settings.shippingDestinationMode,
        settings.allowedCountries,
      ),
    };
  } catch {
    return getDefaultEcommerceStoreSettings();
  }
}

export async function saveEcommerceStoreSettings(input: unknown): Promise<EcommerceStoreSettings> {
  const settings = ecommerceStoreSettingsSchema.parse(input);
  const normalizedSettings: EcommerceStoreSettings = {
    ...settings,
    allowedCountries: getCountriesForShippingMode(
      settings.shippingDestinationMode,
      settings.allowedCountries,
    ),
  };

  await storage.settings.upsertSetting(
    SETTINGS_KEY,
    JSON.stringify(normalizedSettings),
    SETTINGS_CATEGORY,
    false,
  );
  storage.settings.invalidateCategory(SETTINGS_CATEGORY);
  return normalizedSettings;
}

export async function assertEcommerceShippingDestinationAllowed(address: {
  country?: string | null;
  state?: string | null;
}) {
  const settings = await getEcommerceStoreSettings();
  const country = (address.country || "US").trim().toUpperCase();
  const state = (address.state || "").trim().toUpperCase();
  const allowedCountries = getCountriesForShippingMode(
    settings.shippingDestinationMode,
    settings.allowedCountries,
  );

  if (!allowedCountries.includes(country)) {
    throw httpError("This store is not configured to ship to the selected country.", 400);
  }

  const regionOptions = getRegionOptions(country);
  if (regionOptions.length > 0) {
    const validRegions = new Set<string>(regionOptions.map(([code]) => code));
    if (!validRegions.has(state)) {
      throw httpError("Choose a valid state or province for the selected country.", 400);
    }
  }

  return { country, state, allowedCountries };
}

import { z } from "zod";

export const ECOMMERCE_SHIPPING_DESTINATION_MODES = [
  "us_only",
  "us_canada",
  "worldwide",
  "custom",
] as const;

export type EcommerceShippingDestinationMode = typeof ECOMMERCE_SHIPPING_DESTINATION_MODES[number];

export const ECOMMERCE_TIMEZONES = [
  ["America/New_York", "Eastern Time"],
  ["America/Chicago", "Central Time"],
  ["America/Denver", "Mountain Time"],
  ["America/Phoenix", "Arizona Time"],
  ["America/Los_Angeles", "Pacific Time"],
  ["America/Anchorage", "Alaska Time"],
  ["Pacific/Honolulu", "Hawaii Time"],
  ["America/Toronto", "Toronto"],
  ["America/Vancouver", "Vancouver"],
  ["Europe/London", "London"],
  ["Europe/Paris", "Central Europe"],
  ["Australia/Sydney", "Sydney"],
] as const;

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export const US_STATES = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["DC", "District of Columbia"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
] as const;

export const CANADIAN_PROVINCES = [
  ["AB", "Alberta"],
  ["BC", "British Columbia"],
  ["MB", "Manitoba"],
  ["NB", "New Brunswick"],
  ["NL", "Newfoundland and Labrador"],
  ["NS", "Nova Scotia"],
  ["NT", "Northwest Territories"],
  ["NU", "Nunavut"],
  ["ON", "Ontario"],
  ["PE", "Prince Edward Island"],
  ["QC", "Quebec"],
  ["SK", "Saskatchewan"],
  ["YT", "Yukon"],
] as const;

export const COMMON_ECOMMERCE_COUNTRIES = [
  ["US", "United States"],
  ["CA", "Canada"],
  ["GB", "United Kingdom"],
  ["AU", "Australia"],
  ["NZ", "New Zealand"],
  ["IE", "Ireland"],
  ["DE", "Germany"],
  ["FR", "France"],
  ["IT", "Italy"],
  ["ES", "Spain"],
  ["NL", "Netherlands"],
  ["BE", "Belgium"],
  ["SE", "Sweden"],
  ["NO", "Norway"],
  ["DK", "Denmark"],
  ["FI", "Finland"],
  ["CH", "Switzerland"],
  ["JP", "Japan"],
  ["SG", "Singapore"],
  ["MX", "Mexico"],
] as const;

export function getCountryLabel(countryCode: string) {
  const normalizedCountry = countryCode.trim().toUpperCase();
  return COMMON_ECOMMERCE_COUNTRIES.find(([code]) => code === normalizedCountry)?.[1] ?? normalizedCountry;
}

export const ecommerceStoreOriginSchema = z.object({
  name: z.string().trim().max(160).default(""),
  address: z.string().trim().max(240).default(""),
  line2: z.string().trim().max(240).default(""),
  city: z.string().trim().max(160).default(""),
  state: z.string().trim().max(80).default(""),
  zip: z.string().trim().max(40).default(""),
  country: z.string().trim().length(2).default("US").transform((value) => value.toUpperCase()),
});

export const ecommerceStoreSettingsSchema = z.object({
  storeOrigin: ecommerceStoreOriginSchema.default({}),
  storeTimezone: z.string().trim().default("America/New_York").refine(isValidTimeZone, {
    message: "Store timezone must be a valid IANA timezone, such as America/New_York",
  }),
  shippingDestinationMode: z.enum(ECOMMERCE_SHIPPING_DESTINATION_MODES).default("us_only"),
  allowedCountries: z.array(z.string().trim().length(2).transform((value) => value.toUpperCase())).default(["US"]),
});

export type EcommerceStoreSettings = z.infer<typeof ecommerceStoreSettingsSchema>;

export function getCountriesForShippingMode(
  mode: EcommerceShippingDestinationMode,
  customCountries: string[] = [],
) {
  if (mode === "us_only") return ["US"];
  if (mode === "us_canada") return ["US", "CA"];
  if (mode === "worldwide") return COMMON_ECOMMERCE_COUNTRIES.map(([code]) => code);
  return [...new Set(customCountries.map((country) => country.trim().toUpperCase()).filter(Boolean))];
}

export function getRegionOptions(country: string) {
  const normalizedCountry = country.trim().toUpperCase();
  if (normalizedCountry === "US") return US_STATES;
  if (normalizedCountry === "CA") return CANADIAN_PROVINCES;
  return [];
}

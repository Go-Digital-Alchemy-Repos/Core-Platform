export interface SiteFeatures {
  cmsEnabled: boolean;
  directoryEnabled: boolean;
  blogEnabled: boolean;
  eventsEnabled: boolean;
  crmEnabled: boolean;
  ecommerceEnabled: boolean;
  membershipEnabled: boolean;
  careersEnabled: boolean;
  portfolioEnabled: boolean;
}

export const DEFAULT_SITE_FEATURES: SiteFeatures = {
  cmsEnabled: true,
  directoryEnabled: true,
  blogEnabled: true,
  eventsEnabled: true,
  crmEnabled: true,
  ecommerceEnabled: true,
  membershipEnabled: true,
  careersEnabled: true,
  portfolioEnabled: true,
};

export function normalizeBooleanSetting(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on", "enabled"].includes(normalized)) return true;
    if (["false", "0", "no", "off", "disabled"].includes(normalized)) return false;
  }
  return fallback;
}

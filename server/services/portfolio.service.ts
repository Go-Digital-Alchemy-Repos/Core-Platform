import { storage } from "../storage";
import { portfolioSettingsSchema, type PortfolioSettings } from "@shared/schema";

export const DEFAULT_PORTFOLIO_SETTINGS: PortfolioSettings = portfolioSettingsSchema.parse({});

function normalizeBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on", "enabled"].includes(normalized)) return true;
    if (["false", "0", "no", "off", "disabled"].includes(normalized)) return false;
  }
  return fallback;
}

export async function getPortfolioSettings(): Promise<PortfolioSettings> {
  const settings = await storage.settings.getDecryptedCategory("portfolio");
  return portfolioSettingsSchema.parse({
    industryPreset: settings.industry_preset ?? DEFAULT_PORTFOLIO_SETTINGS.industryPreset,
    archiveLayout: settings.archive_layout ?? DEFAULT_PORTFOLIO_SETTINGS.archiveLayout,
    archiveEyebrow: settings.archive_eyebrow ?? DEFAULT_PORTFOLIO_SETTINGS.archiveEyebrow,
    archiveHeading: settings.archive_heading ?? DEFAULT_PORTFOLIO_SETTINGS.archiveHeading,
    archiveSubheading: settings.archive_subheading ?? DEFAULT_PORTFOLIO_SETTINGS.archiveSubheading,
    projectsLabel: settings.projects_label ?? DEFAULT_PORTFOLIO_SETTINGS.projectsLabel,
    projectLabel: settings.project_label ?? DEFAULT_PORTFOLIO_SETTINGS.projectLabel,
    showSearch: normalizeBoolean(settings.show_search, DEFAULT_PORTFOLIO_SETTINGS.showSearch),
    showIndustryFilter: normalizeBoolean(settings.show_industry_filter, DEFAULT_PORTFOLIO_SETTINGS.showIndustryFilter),
    showCategoryFilter: normalizeBoolean(settings.show_category_filter, DEFAULT_PORTFOLIO_SETTINGS.showCategoryFilter),
    showLocationFilter: normalizeBoolean(settings.show_location_filter, DEFAULT_PORTFOLIO_SETTINGS.showLocationFilter),
    sharingEnabled: normalizeBoolean(settings.sharing_enabled, DEFAULT_PORTFOLIO_SETTINGS.sharingEnabled),
    defaultCtaLabel: settings.default_cta_label ?? DEFAULT_PORTFOLIO_SETTINGS.defaultCtaLabel,
    defaultCtaUrl: settings.default_cta_url ?? DEFAULT_PORTFOLIO_SETTINGS.defaultCtaUrl,
  });
}

export async function savePortfolioSettings(settings: PortfolioSettings): Promise<PortfolioSettings> {
  const parsed = portfolioSettingsSchema.parse(settings);
  const values: Record<string, string> = {
    industry_preset: parsed.industryPreset,
    archive_layout: parsed.archiveLayout,
    archive_eyebrow: parsed.archiveEyebrow,
    archive_heading: parsed.archiveHeading,
    archive_subheading: parsed.archiveSubheading,
    projects_label: parsed.projectsLabel,
    project_label: parsed.projectLabel,
    show_search: String(parsed.showSearch),
    show_industry_filter: String(parsed.showIndustryFilter),
    show_category_filter: String(parsed.showCategoryFilter),
    show_location_filter: String(parsed.showLocationFilter),
    sharing_enabled: String(parsed.sharingEnabled),
    default_cta_label: parsed.defaultCtaLabel,
    default_cta_url: parsed.defaultCtaUrl,
  };

  await Promise.all(
    Object.entries(values).map(([key, value]) =>
      storage.settings.upsertSetting(key, value, "portfolio", false),
    ),
  );
  return parsed;
}

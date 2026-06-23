import { describe, expect, it } from "vitest";
import {
  PORTFOLIO_INDUSTRIES,
  insertPortfolioProjectSchema,
  portfolioSettingsSchema,
} from "./portfolio";

describe("portfolio schema", () => {
  it("defines the expected industry presets", () => {
    expect(PORTFOLIO_INDUSTRIES).toEqual([
      "real_estate",
      "web_development",
      "artist_creative",
      "generic",
    ]);
  });

  it("applies settings defaults", () => {
    expect(portfolioSettingsSchema.parse({})).toMatchObject({
      industryPreset: "generic",
      archiveLayout: "grid",
      sharingEnabled: true,
    });
  });

  it("validates project slugs", () => {
    const valid = insertPortfolioProjectSchema.safeParse({
      title: "Case Study",
      slug: "case-study",
    });
    const invalid = insertPortfolioProjectSchema.safeParse({
      title: "Case Study",
      slug: "Case Study",
    });
    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });
});

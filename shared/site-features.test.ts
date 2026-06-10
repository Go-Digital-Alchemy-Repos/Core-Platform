import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_FEATURES, normalizeBooleanSetting } from "./site-features";

describe("site features", () => {
  it("enables cms by default", () => {
    expect(DEFAULT_SITE_FEATURES.cmsEnabled).toBe(true);
  });

  it("enables ecommerce by default", () => {
    expect(DEFAULT_SITE_FEATURES.ecommerceEnabled).toBe(true);
  });

  it("enables careers by default", () => {
    expect(DEFAULT_SITE_FEATURES.careersEnabled).toBe(true);
  });

  it("normalizes disabled feature settings", () => {
    expect(normalizeBooleanSetting("off", true)).toBe(false);
    expect(normalizeBooleanSetting("enabled", false)).toBe(true);
  });
});

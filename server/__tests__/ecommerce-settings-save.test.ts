import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ upsertSettings: vi.fn(), getDecryptedCategory: vi.fn() }));
vi.mock("../storage/index", () => ({ storage: { settings: state } }));
import { saveEcommerceTaxSettings } from "../services/ecommerce-tax.service";
import { saveEcommerceFraudSettings } from "../services/ecommerce-fraud.service";

describe("ecommerce settings atomic save boundaries", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    state.upsertSettings.mockResolvedValue([]);
    state.getDecryptedCategory.mockResolvedValue({});
  });
  it("writes all tax fields in one batch", async () => {
    await saveEcommerceTaxSettings({
      enabled: true,
      manualRateBps: 650,
      taxShipping: true,
      stripeTaxEnabled: false,
    });
    expect(state.upsertSettings).toHaveBeenCalledOnce();
    expect(state.upsertSettings.mock.calls[0][0]).toEqual([
      { key: "ecommerce_tax_enabled", value: "true", category: "ecommerce_tax", isSecret: false },
      {
        key: "ecommerce_tax_manual_rate_bps",
        value: "650",
        category: "ecommerce_tax",
        isSecret: false,
      },
      { key: "ecommerce_tax_shipping", value: "true", category: "ecommerce_tax", isSecret: false },
      {
        key: "ecommerce_stripe_tax_enabled",
        value: "false",
        category: "ecommerce_tax",
        isSecret: false,
      },
    ]);
  });
  it("keeps fraud policy and supplied license together and secrets out of policy JSON", async () => {
    await saveEcommerceFraudSettings({ maxMindLicenseKey: "synthetic-license" });
    expect(state.upsertSettings).toHaveBeenCalledOnce();
    const entries = state.upsertSettings.mock.calls[0][0];
    expect(entries).toHaveLength(2);
    expect(entries[1]).toMatchObject({
      key: "maxmind_license_key",
      value: "synthetic-license",
      isSecret: true,
    });
    expect(entries[0].value).not.toContain("synthetic-license");
  });
  it("preserves the existing license when an empty secret is submitted", async () => {
    await saveEcommerceFraudSettings({ maxMindLicenseKey: "" });
    expect(state.upsertSettings.mock.calls[0][0]).toHaveLength(1);
  });
  it("propagates batch failure without a follow-up success read", async () => {
    state.upsertSettings.mockRejectedValue(new Error("database failed"));
    await expect(saveEcommerceFraudSettings({ maxMindLicenseKey: "synthetic" })).rejects.toThrow(
      "database failed",
    );
    expect(state.getDecryptedCategory).not.toHaveBeenCalled();
  });
});

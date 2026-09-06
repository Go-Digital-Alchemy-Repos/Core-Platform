import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetDecryptedCategory, mockUpsertSetting } = vi.hoisted(() => ({
  mockGetDecryptedCategory: vi.fn(),
  mockUpsertSetting: vi.fn(),
}));

vi.mock("../storage/index", () => ({
  storage: {
    settings: {
      getDecryptedCategory: mockGetDecryptedCategory,
      upsertSetting: mockUpsertSetting,
    },
  },
}));

vi.mock("../utils/logger", () => ({
  logger: { stripe: { info: vi.fn() } },
}));

describe("membership Stripe settings", () => {
  beforeEach(() => {
    mockGetDecryptedCategory.mockReset().mockResolvedValue({
      membership_stripe_mode: "live",
      membership_stripe_publishable_key: "pk_existing",
      membership_stripe_secret_key: "sk_existing",
      membership_stripe_webhook_secret: "whsec_existing",
      membership_stripe_customer_portal_enabled: "true",
    });
    mockUpsertSetting.mockReset().mockResolvedValue(undefined);
  });

  it("preserves existing credentials when submitted credential values are blank", async () => {
    const { saveMembershipStripeSettings } = await import("../services/membership-stripe.service");

    await saveMembershipStripeSettings({
      mode: "live",
      customerPortalEnabled: false,
      publishableKey: " ",
      secretKey: "",
      webhookSecret: "\t",
    });

    expect(mockUpsertSetting).toHaveBeenCalledTimes(2);
    expect(mockUpsertSetting.mock.calls.map(([key]) => key)).toEqual([
      "membership_stripe_mode",
      "membership_stripe_customer_portal_enabled",
    ]);
  });

  it("requires an explicit clear flag to erase a stored credential", async () => {
    const { saveMembershipStripeSettings } = await import("../services/membership-stripe.service");

    await saveMembershipStripeSettings({ clearSecretKey: true });

    expect(mockUpsertSetting).toHaveBeenCalledWith(
      "membership_stripe_secret_key",
      "",
      "membership_stripe",
      true,
    );
  });

  it("rejects contradictory set and clear instructions", async () => {
    const { normalizeMembershipStripeSettingsInput } =
      await import("../services/membership-stripe.service");

    expect(() =>
      normalizeMembershipStripeSettingsInput({ secretKey: "sk_new", clearSecretKey: true }),
    ).toThrow("cannot be set and cleared");
  });

  it("accepts only configured application origins for Stripe return URLs", async () => {
    const { assertMembershipReturnUrl } = await import("../services/membership-stripe.service");
    const env = {
      NODE_ENV: "production",
      APP_URL: "https://app.example.test",
      TRUSTED_ORIGINS: "https://site.example.test",
    } as NodeJS.ProcessEnv;

    expect(() =>
      assertMembershipReturnUrl(
        "https://site.example.test/membership?checkout=success",
        "Success URL",
        env,
      ),
    ).not.toThrow();
    expect(() =>
      assertMembershipReturnUrl("https://attacker.example/collect", "Success URL", env),
    ).toThrow("trusted application origin");
    expect(() => assertMembershipReturnUrl("javascript:alert(1)", "Success URL", env)).toThrow(
      "safe HTTP URL",
    );
  });
});

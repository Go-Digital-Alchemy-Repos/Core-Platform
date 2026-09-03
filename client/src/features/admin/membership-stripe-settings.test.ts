import { describe, expect, it } from "vitest";
import { buildMembershipStripeSettingsPayload } from "./membership-stripe-settings";

describe("buildMembershipStripeSettingsPayload", () => {
  it("omits blank credentials so an ordinary settings save preserves stored keys", () => {
    expect(
      buildMembershipStripeSettingsPayload({
        mode: "live",
        publishableKey: "  ",
        secretKey: "",
        webhookSecret: "\t",
        customerPortalEnabled: false,
      }),
    ).toEqual({ mode: "live", customerPortalEnabled: false });
  });

  it("trims and includes credentials that an administrator replaces", () => {
    expect(
      buildMembershipStripeSettingsPayload({
        mode: "test",
        publishableKey: " pk_test_new ",
        secretKey: " sk_test_new ",
        webhookSecret: " whsec_new ",
        customerPortalEnabled: true,
      }),
    ).toEqual({
      mode: "test",
      customerPortalEnabled: true,
      publishableKey: "pk_test_new",
      secretKey: "sk_test_new",
      webhookSecret: "whsec_new",
    });
  });
});

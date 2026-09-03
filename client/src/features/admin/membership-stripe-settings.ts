export interface MembershipStripeSettingsForm {
  mode: "test" | "live";
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  customerPortalEnabled: boolean;
}

export function buildMembershipStripeSettingsPayload(form: MembershipStripeSettingsForm) {
  const payload: {
    mode: MembershipStripeSettingsForm["mode"];
    customerPortalEnabled: boolean;
    publishableKey?: string;
    secretKey?: string;
    webhookSecret?: string;
  } = {
    mode: form.mode,
    customerPortalEnabled: form.customerPortalEnabled,
  };

  const publishableKey = form.publishableKey.trim();
  const secretKey = form.secretKey.trim();
  const webhookSecret = form.webhookSecret.trim();
  if (publishableKey) payload.publishableKey = publishableKey;
  if (secretKey) payload.secretKey = secretKey;
  if (webhookSecret) payload.webhookSecret = webhookSecret;
  return payload;
}

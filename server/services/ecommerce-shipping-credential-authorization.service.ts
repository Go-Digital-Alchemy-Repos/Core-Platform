import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { db } from "../db";
import {
  systemSettings,
  ecommerceShippingProviders,
  type InsertEcommerceShippingProvider,
} from "@shared/schema";
import { decryptSettingValueStrict, encryptSettingValue } from "../storage/settings.storage";

type Database = typeof db;
export type ShippingCredentialTx = Parameters<Parameters<Database["transaction"]>[0]>[0];
const CATEGORY = "ecommerce_shipping_provider_easypost";
const key = (field: string) => `${CATEGORY}__${field}`;
export const EASYPOST_CREDENTIAL_KEYS = {
  apiKey: key("apiKey"),
  generation: key("credentialGenerationId"),
  approval: key("approvedTestGenerationId"),
} as const;
export const EASYPOST_CREDENTIAL_LOCK =
  "core:ecommerce:shipping:easypost:credential-authorization:v1";
const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export class ShippingCredentialAuthorizationError extends Error {
  constructor(
    public readonly code:
      | "credentials_unapproved"
      | "credential_generation_changed"
      | "provider_inactive"
      | "provider_not_test"
      | "credential_configuration_invalid"
      | "credential_write_failed"
      | "authorization_unavailable",
  ) {
    super("Shipping test credential authorization failed");
    this.name = "ShippingCredentialAuthorizationError";
  }
}
export type AuthorizedEasyPostTestCredentials = {
  provider: "easypost";
  mode: "test";
  apiKey: string;
  credentialGenerationId: string;
  approvedCredentialGenerationId: string;
};
export async function lockEasyPostCredentialAuthorization(tx: ShippingCredentialTx): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${EASYPOST_CREDENTIAL_LOCK}))`);
}

export async function readEasyPostCredentialState(tx: ShippingCredentialTx) {
  const rows = await tx.select().from(systemSettings).where(eq(systemSettings.category, CATEGORY));
  const [provider] = await tx
    .select()
    .from(ecommerceShippingProviders)
    .where(eq(ecommerceShippingProviders.provider, "easypost"));
  const values = new Map(rows.map((row) => [row.key, row]));
  const secret = values.get(EASYPOST_CREDENTIAL_KEYS.apiKey);
  const generation = values.get(EASYPOST_CREDENTIAL_KEYS.generation);
  const approval = values.get(EASYPOST_CREDENTIAL_KEYS.approval);
  // Legacy keys have no implicit generation or approval, even when readable by setup UI.
  if (!secret?.isSecret || !generation || generation.isSecret || !uuid(generation.value))
    throw new ShippingCredentialAuthorizationError("credential_configuration_invalid");
  let apiKey: string;
  try {
    apiKey = decryptSettingValueStrict(secret.value);
  } catch {
    throw new ShippingCredentialAuthorizationError("credential_configuration_invalid");
  }
  if (!apiKey.trim())
    throw new ShippingCredentialAuthorizationError("credential_configuration_invalid");
  return {
    apiKey,
    generation: generation.value,
    approval: approval && !approval.isSecret ? approval.value : "",
    provider,
  };
}
export async function readAuthorizedEasyPostTestCredentials(
  tx: ShippingCredentialTx,
): Promise<AuthorizedEasyPostTestCredentials> {
  try {
    await lockEasyPostCredentialAuthorization(tx);
    const state = await readEasyPostCredentialState(tx);
    if (!state.provider?.active)
      throw new ShippingCredentialAuthorizationError("provider_inactive");
    if (!state.provider.testMode)
      throw new ShippingCredentialAuthorizationError("provider_not_test");
    if (!uuid(state.approval) || state.approval !== state.generation)
      throw new ShippingCredentialAuthorizationError("credentials_unapproved");
    return {
      provider: "easypost",
      mode: "test",
      apiKey: state.apiKey,
      credentialGenerationId: state.generation,
      approvedCredentialGenerationId: state.approval,
    };
  } catch (error) {
    if (error instanceof ShippingCredentialAuthorizationError) throw error;
    throw new ShippingCredentialAuthorizationError("authorization_unavailable");
  }
}
export type EasyPostQuoteAuthorizationReadiness = {
  implemented: true;
  configured: boolean;
  approvedTestCredentials: boolean;
  enabled: boolean;
  mode: "test";
  reasonCode:
    | null
    | "not_configured"
    | "test_approval_required"
    | "provider_inactive"
    | "production_mode";
};
export async function readEasyPostQuoteAuthorizationReadiness(
  tx: ShippingCredentialTx,
): Promise<EasyPostQuoteAuthorizationReadiness> {
  try {
    await lockEasyPostCredentialAuthorization(tx);
    const state = await readEasyPostCredentialState(tx);
    const approved = uuid(state.approval) && state.approval === state.generation;
    const reasonCode = !state.provider?.active
      ? "provider_inactive"
      : !state.provider.testMode
        ? "production_mode"
        : !approved
          ? "test_approval_required"
          : null;
    return {
      implemented: true,
      configured: true,
      approvedTestCredentials: approved,
      enabled: reasonCode === null,
      mode: "test",
      reasonCode,
    };
  } catch (error) {
    if (
      error instanceof ShippingCredentialAuthorizationError &&
      error.code === "credential_configuration_invalid"
    )
      return {
        implemented: true,
        configured: false,
        approvedTestCredentials: false,
        enabled: false,
        mode: "test",
        reasonCode: "not_configured",
      };
    throw new ShippingCredentialAuthorizationError("authorization_unavailable");
  }
}
export async function recheckEasyPostTestGeneration(
  tx: ShippingCredentialTx,
  expectedGeneration: string,
) {
  const captured = await readAuthorizedEasyPostTestCredentials(tx);
  if (!uuid(expectedGeneration) || captured.credentialGenerationId !== expectedGeneration)
    throw new ShippingCredentialAuthorizationError("credential_generation_changed");
  return captured;
}
async function write(
  tx: ShippingCredentialTx,
  entries: { key: string; value: string; isSecret: boolean }[],
) {
  await tx
    .insert(systemSettings)
    .values(entries.map((entry) => ({ ...entry, category: CATEGORY, updatedAt: new Date() })))
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: {
        value: sql`excluded.value`,
        category: sql`excluded.category`,
        isSecret: sql`excluded.is_secret`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
}
async function invalidate() {
  const { storage } = await import("../storage/index");
  storage.settings.invalidateAll();
}
export async function rotateEasyPostCredentials(
  database: Database,
  apiKey: string,
  actorId?: string,
): Promise<string | null> {
  const value = apiKey.trim();
  if (!value) return null;
  try {
    const encrypted = encryptSettingValue(value),
      generation = randomUUID();
    await database.transaction(async (tx) => {
      await lockEasyPostCredentialAuthorization(tx);
      const { invalidateEasyPostLabelAuthorizationForRotation } =
        await import("./ecommerce-shipping-label-authorization.service");
      await invalidateEasyPostLabelAuthorizationForRotation(tx, generation, actorId);
      await write(tx, [
        { key: EASYPOST_CREDENTIAL_KEYS.apiKey, value: encrypted, isSecret: true },
        { key: EASYPOST_CREDENTIAL_KEYS.generation, value: generation, isSecret: false },
        { key: EASYPOST_CREDENTIAL_KEYS.approval, value: "", isSecret: false },
      ]);
    });
    await invalidate();
    return generation;
  } catch {
    throw new ShippingCredentialAuthorizationError("credential_write_failed");
  }
}
/** Internal operation only: caller must separately hold owner-approved test-key workflow evidence. */
export async function approveEasyPostTestGeneration(
  database: Database,
  expectedGeneration: string,
) {
  if (!uuid(expectedGeneration))
    throw new ShippingCredentialAuthorizationError("credential_generation_changed");
  try {
    await database.transaction(async (tx) => {
      await lockEasyPostCredentialAuthorization(tx);
      const state = await readEasyPostCredentialState(tx);
      if (state.generation !== expectedGeneration)
        throw new ShippingCredentialAuthorizationError("credential_generation_changed");
      if (!state.provider?.testMode)
        throw new ShippingCredentialAuthorizationError("provider_not_test");
      await write(tx, [
        { key: EASYPOST_CREDENTIAL_KEYS.approval, value: expectedGeneration, isSecret: false },
      ]);
    });
    await invalidate();
    return {
      credentialGenerationId: expectedGeneration,
      approvedCredentialGenerationId: expectedGeneration,
    };
  } catch (error) {
    if (error instanceof ShippingCredentialAuthorizationError) throw error;
    throw new ShippingCredentialAuthorizationError("credential_write_failed");
  }
}
export async function saveEasyPostProviderConfiguration(
  database: Database,
  data: InsertEcommerceShippingProvider,
) {
  if (data.provider !== "easypost")
    throw new ShippingCredentialAuthorizationError("credential_configuration_invalid");
  try {
    const result = await database.transaction(async (tx) => {
      await lockEasyPostCredentialAuthorization(tx);
      const [provider] = await tx
        .insert(ecommerceShippingProviders)
        .values(data)
        .onConflictDoUpdate({
          target: ecommerceShippingProviders.provider,
          set: { ...data, updatedAt: new Date() },
        })
        .returning();
      return provider;
    });
    await invalidate();
    return result;
  } catch {
    throw new ShippingCredentialAuthorizationError("credential_write_failed");
  }
}

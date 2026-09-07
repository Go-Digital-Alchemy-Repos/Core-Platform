import type { db } from "../db";
import type { SettingsStorage } from "../storage/settings.storage";
import {
  getShippingProviderCredentialCategory,
  getShippingProviderDefinition,
} from "./ecommerce-shipping-provider.service";

type CredentialStorage = Pick<SettingsStorage, "getDecryptedCategory" | "upsertSettings"> &
  Partial<Pick<SettingsStorage, "invalidateAll">>;

function definitionFor(provider: string) {
  const definition = getShippingProviderDefinition(provider);
  if (!definition) throw new Error("Shipping provider not found");
  return definition;
}

export function shippingCredentialStorageKey(provider: string, field: string): string {
  const definition = definitionFor(provider);
  if (!definition.setupFields.some((candidate) => candidate.key === field))
    throw new Error("Shipping credential field not found");
  return `${getShippingProviderCredentialCategory(provider)}__${field}`;
}

/** Internal credentials only. Public handlers must return presence flags, never values. */
export async function readShippingProviderCredentials(
  settings: CredentialStorage,
  provider: string,
): Promise<Record<string, string>> {
  const definition = definitionFor(provider);
  // Category filtering is the legacy ownership boundary: never use a global key lookup.
  let stored: Record<string, string>;
  try {
    stored = await settings.getDecryptedCategory(getShippingProviderCredentialCategory(provider));
  } catch {
    // Database errors can contain query parameters; never forward credential material.
    throw new Error("Shipping credentials could not be read");
  }
  return Object.fromEntries(
    definition.setupFields.map((field) => {
      const key = shippingCredentialStorageKey(provider, field.key);
      return [
        field.key,
        Object.prototype.hasOwnProperty.call(stored, key) ? stored[key] : (stored[field.key] ?? ""),
      ];
    }),
  );
}

/** Blank/omitted fields retain existing values. All supplied fields commit atomically. */
export async function saveShippingProviderCredentials(
  settings: CredentialStorage,
  provider: string,
  credentials: Record<string, string>,
  authorizationDatabase?: typeof db,
  actorId?: string,
) {
  const definition = definitionFor(provider);
  const category = getShippingProviderCredentialCategory(provider);
  const entries = definition.setupFields.flatMap((field) => {
    const value = credentials[field.key]?.trim();
    return value
      ? [
          {
            key: shippingCredentialStorageKey(provider, field.key),
            value,
            category,
            isSecret: field.secret ?? true,
          },
        ]
      : [];
  });
  if (entries.length) {
    try {
      if (provider === "easypost") {
        const { rotateEasyPostCredentials } =
          await import("./ecommerce-shipping-credential-authorization.service");
        const database = authorizationDatabase ?? (await import("../db")).db;
        await rotateEasyPostCredentials(database, credentials.apiKey.trim(), actorId);
        settings.invalidateAll?.();
      } else await settings.upsertSettings(entries);
    } catch {
      throw new Error("Shipping credentials could not be saved");
    }
  }
  const stored = await readShippingProviderCredentials(settings, provider);
  return {
    provider,
    setupFields: definition.setupFields.map((field) => ({
      key: field.key,
      label: field.label,
      secret: field.secret ?? true,
      hasValue: Boolean(stored[field.key]),
    })),
  };
}

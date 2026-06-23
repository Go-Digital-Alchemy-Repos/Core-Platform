import { z } from "zod";
import { storage } from "../storage/index";

const SETTINGS_CATEGORY = "ecommerce_customer_accounts";
const ACCOUNT_MODE_KEY = "ecommerce_customer_account_mode";

export const ecommerceCustomerAccountModeSchema = z.enum(["optional", "required", "guest_only"]);

export const ecommerceCustomerAccountSettingsSchema = z.object({
  customerAccountMode: ecommerceCustomerAccountModeSchema.default("optional"),
});

export type EcommerceCustomerAccountMode = z.infer<typeof ecommerceCustomerAccountModeSchema>;
export type EcommerceCustomerAccountSettings = z.infer<
  typeof ecommerceCustomerAccountSettingsSchema
>;

export async function getEcommerceCustomerAccountSettings(): Promise<EcommerceCustomerAccountSettings> {
  if (typeof storage.settings.getSetting !== "function") {
    return { customerAccountMode: "optional" };
  }
  const rawMode = await storage.settings.getSetting(ACCOUNT_MODE_KEY);
  const parsedMode = ecommerceCustomerAccountModeSchema.safeParse(rawMode ?? "optional");
  return { customerAccountMode: parsedMode.success ? parsedMode.data : "optional" };
}

export async function saveEcommerceCustomerAccountSettings(
  input: unknown,
): Promise<EcommerceCustomerAccountSettings> {
  const settings = ecommerceCustomerAccountSettingsSchema.parse(input);
  await storage.settings.upsertSetting(
    ACCOUNT_MODE_KEY,
    settings.customerAccountMode,
    SETTINGS_CATEGORY,
    false,
  );
  storage.settings.invalidateCategory(SETTINGS_CATEGORY);
  return getEcommerceCustomerAccountSettings();
}

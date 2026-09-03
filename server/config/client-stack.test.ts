import { describe, expect, it } from "vitest";
import { validateClientStackEnvironment } from "./client-stack";

function completeEnvironment(): NodeJS.ProcessEnv {
  return {
    CLIENT_STACK_ID: "pilot-acme",
    DATABASE_URL: "postgresql://app:secret@postgres.railway.internal:5432/railway",
    SESSION_SECRET: "a-unique-session-secret-that-is-long-enough",
    APP_URL: "https://shop.example.com",
    TRUSTED_ORIGINS: "https://shop.example.com",
    STRIPE_SECRET_KEY: "sk_test_placeholder",
    STRIPE_PUBLISHABLE_KEY: "pk_test_placeholder",
    STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "587",
    SMTP_USER: "mailer",
    SMTP_PASS: "placeholder",
    SMTP_FROM: "Shop <orders@example.com>",
    SYSTEM_BACKUPS_ENABLED: "true",
    BACKUP_R2_ACCOUNT_ID: "account",
    BACKUP_R2_ACCESS_KEY_ID: "access",
    BACKUP_R2_SECRET_ACCESS_KEY: "secret",
    BACKUP_R2_BUCKET_NAME: "client-backups",
    BACKUP_R2_PREFIX: "production/pilot-acme",
  };
}

describe("validateClientStackEnvironment", () => {
  it("accepts an isolated ecommerce stack with all operational dependencies", () => {
    const result = validateClientStackEnvironment(completeEnvironment(), {
      ecommerce: true,
      email: true,
      backups: true,
    });

    expect(result).toEqual({
      stackId: "pilot-acme",
      corePlatformOrigin: "https://shop.example.com",
      errors: [],
    });
  });

  it("rejects non-canonical origins, weak secrets, and a shared backup prefix", () => {
    const env = completeEnvironment();
    env.SESSION_SECRET = "short";
    env.APP_URL = "https://shop.example.com/store";
    env.TRUSTED_ORIGINS = "https://other.example.com/,https://other.example.com/";
    env.BACKUP_R2_PREFIX = "production/shared";

    const result = validateClientStackEnvironment(env, { backups: true });

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("SESSION_SECRET"),
        expect.stringContaining("APP_URL must be an origin only"),
        expect.stringContaining("TRUSTED_ORIGINS must include the exact APP_URL"),
        expect.stringContaining("duplicate origins"),
        expect.stringContaining("BACKUP_R2_PREFIX must contain CLIENT_STACK_ID"),
      ]),
    );
  });

  it("requires feature credentials only when their launch gates are selected", () => {
    const env = completeEnvironment();
    delete env.STRIPE_WEBHOOK_SECRET;
    delete env.SMTP_PASS;
    delete env.BACKUP_R2_BUCKET_NAME;
    env.SYSTEM_BACKUPS_ENABLED = "false";

    expect(validateClientStackEnvironment(env).errors).toEqual([]);
    expect(
      validateClientStackEnvironment(env, {
        ecommerce: true,
        email: true,
        backups: true,
      }).errors,
    ).toEqual(
      expect.arrayContaining([
        "STRIPE_WEBHOOK_SECRET is required",
        "SMTP_PASS is required",
        "SYSTEM_BACKUPS_ENABLED must be true",
        "BACKUP_R2_BUCKET_NAME is required",
      ]),
    );
  });
});

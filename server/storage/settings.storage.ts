import { eq } from "drizzle-orm";
import { db } from "../db";
import { systemSettings, type SystemSetting } from "@shared/schema";
import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

function getKey(): Buffer {
  return crypto.createHash("sha256").update(SECRET).digest();
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text: string): string {
  const [ivHex, encrypted] = text.split(":");
  if (!ivHex || !encrypted) return text;
  try {
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return text;
  }
}

export class SettingsStorage {
  async getSetting(key: string): Promise<string | null> {
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    if (!setting) return null;
    return setting.isSecret ? decrypt(setting.value) : setting.value;
  }

  async getSettingsByCategory(category: string): Promise<SystemSetting[]> {
    return db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.category, category));
  }

  async getAllSettings(): Promise<SystemSetting[]> {
    return db.select().from(systemSettings);
  }

  async upsertSetting(
    key: string,
    value: string,
    category: string,
    isSecret: boolean
  ): Promise<SystemSetting> {
    const storedValue = isSecret ? encrypt(value) : value;
    const existing = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));

    if (existing.length > 0) {
      const [updated] = await db
        .update(systemSettings)
        .set({ value: storedValue, category, isSecret, updatedAt: new Date() })
        .where(eq(systemSettings.key, key))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(systemSettings)
      .values({ key, value: storedValue, category, isSecret })
      .returning();
    return created;
  }

  async deleteSetting(key: string): Promise<void> {
    await db.delete(systemSettings).where(eq(systemSettings.key, key));
  }

  async getDecryptedValue(key: string): Promise<string | null> {
    return this.getSetting(key);
  }

  async getDecryptedCategory(category: string): Promise<Record<string, string>> {
    const settings = await this.getSettingsByCategory(category);
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.isSecret ? decrypt(s.value) : s.value;
    }
    return result;
  }
}

import { eq } from "drizzle-orm";
import { db } from "../db";
import { systemSettings, type SystemSetting } from "@shared/schema";
import crypto from "crypto";
import { logger } from "../utils/logger";

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

function decrypt(text: string, settingKey?: string): string {
  const [ivHex, encrypted] = text.split(":");
  if (!ivHex || !encrypted) return text;
  try {
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    logger.db.warn("Decryption failed, returning raw value", { settingKey: settingKey ?? "unknown" });
    return text;
  }
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 60_000;

export class SettingsStorage {
  private categoryCache = new Map<string, CacheEntry<Record<string, string>>>();
  private settingCache = new Map<string, CacheEntry<string | null>>();
  private categoryKeyIndex = new Map<string, Set<string>>();
  private ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  private isFresh<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
    return !!entry && Date.now() < entry.expiresAt;
  }

  private trackKeyCategory(key: string, category: string): void {
    let keys = this.categoryKeyIndex.get(category);
    if (!keys) {
      keys = new Set();
      this.categoryKeyIndex.set(category, keys);
    }
    keys.add(key);
  }

  invalidateCategory(category: string): void {
    this.categoryCache.delete(category);
    const keysToRemove = this.categoryKeyIndex.get(category);
    if (keysToRemove) {
      for (const key of Array.from(keysToRemove)) {
        this.settingCache.delete(key);
      }
      this.categoryKeyIndex.delete(category);
    }
  }

  invalidateAll(): void {
    this.categoryCache.clear();
    this.settingCache.clear();
    this.categoryKeyIndex.clear();
  }

  async getSetting(key: string): Promise<string | null> {
    const cached = this.settingCache.get(key);
    if (this.isFresh(cached)) return cached.data;

    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    if (!setting) {
      this.settingCache.set(key, { data: null, expiresAt: Date.now() + this.ttlMs });
      return null;
    }
    const value = setting.isSecret ? decrypt(setting.value, key) : setting.value;
    this.settingCache.set(key, { data: value, expiresAt: Date.now() + this.ttlMs });
    this.trackKeyCategory(key, setting.category);
    return value;
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

    this.settingCache.delete(key);

    let result: SystemSetting;
    if (existing.length > 0) {
      const oldCategory = existing[0].category;
      if (oldCategory !== category) {
        this.invalidateCategory(oldCategory);
      }
      const [updated] = await db
        .update(systemSettings)
        .set({ value: storedValue, category, isSecret, updatedAt: new Date() })
        .where(eq(systemSettings.key, key))
        .returning();
      result = updated;
    } else {
      const [created] = await db
        .insert(systemSettings)
        .values({ key, value: storedValue, category, isSecret })
        .returning();
      result = created;
    }

    this.invalidateCategory(category);
    return result;
  }

  async deleteSetting(key: string): Promise<void> {
    const [existing] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    this.settingCache.delete(key);
    await db.delete(systemSettings).where(eq(systemSettings.key, key));
    if (existing) {
      this.invalidateCategory(existing.category);
    }
  }

  async getDecryptedValue(key: string): Promise<string | null> {
    return this.getSetting(key);
  }

  async getDecryptedCategory(category: string): Promise<Record<string, string>> {
    const cached = this.categoryCache.get(category);
    if (this.isFresh(cached)) return cached.data;

    const settings = await this.getSettingsByCategory(category);
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.isSecret ? decrypt(s.value, s.key) : s.value;
    }
    this.categoryCache.set(category, { data: result, expiresAt: Date.now() + this.ttlMs });
    return result;
  }
}

export const COOKIE_CONSENT_STORAGE_KEY = "tck_cookie_consent";
export const COOKIE_CONSENT_COOKIE_NAME = "tck_cookie_consent";
export const COOKIE_CONSENT_DURATION_DAYS = 60;
export const COOKIE_CONSENT_VERSION = 1;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface CookieConsentPreferences {
  essential: true;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface CookieConsentRecord {
  version: number;
  dismissedAt: string;
  expiresAt: string;
  preferences: CookieConsentPreferences;
}

export const DEFAULT_COOKIE_CONSENT_PREFERENCES: CookieConsentPreferences = {
  essential: true,
  preferences: false,
  analytics: false,
  marketing: false,
};

export function buildCookieConsentRecord(
  preferences: Partial<CookieConsentPreferences> = {},
  now = new Date(),
): CookieConsentRecord {
  const expiresAt = new Date(now.getTime() + COOKIE_CONSENT_DURATION_DAYS * DAY_IN_MS);

  return {
    version: COOKIE_CONSENT_VERSION,
    dismissedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    preferences: {
      ...DEFAULT_COOKIE_CONSENT_PREFERENCES,
      ...preferences,
      essential: true,
    },
  };
}

export function parseCookieConsentRecord(value: string | null | undefined): CookieConsentRecord | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<CookieConsentRecord>;
    if (
      parsed.version !== COOKIE_CONSENT_VERSION ||
      !parsed.dismissedAt ||
      !parsed.expiresAt ||
      !parsed.preferences
    ) {
      return null;
    }

    return {
      version: COOKIE_CONSENT_VERSION,
      dismissedAt: String(parsed.dismissedAt),
      expiresAt: String(parsed.expiresAt),
      preferences: {
        essential: true,
        preferences: Boolean(parsed.preferences.preferences),
        analytics: Boolean(parsed.preferences.analytics),
        marketing: Boolean(parsed.preferences.marketing),
      },
    };
  } catch {
    return null;
  }
}

export function isCookieConsentRecordActive(record: CookieConsentRecord | null, now = new Date()): boolean {
  if (!record) return false;
  const expiresAt = Date.parse(record.expiresAt);
  if (Number.isNaN(expiresAt)) return false;
  return expiresAt > now.getTime();
}

export function readCookieConsentRecord(): CookieConsentRecord | null {
  if (typeof window === "undefined") return null;
  return parseCookieConsentRecord(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
}

export function writeCookieConsentRecord(record: CookieConsentRecord) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const serialized = JSON.stringify(record);
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, serialized);

  const maxAge = COOKIE_CONSENT_DURATION_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_CONSENT_COOKIE_NAME}=${encodeURIComponent(serialized)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

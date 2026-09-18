export const COOKIE_CONSENT_STORAGE_KEY = "dnd_cookie_consent";
export const COOKIE_CONSENT_VERSION = 1;

export type CookieConsentPreferences = {
  version: typeof COOKIE_CONSENT_VERSION;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export type CookieConsentStatus = "unknown" | "decided";

export function defaultOptionalPreferences(): Pick<
  CookieConsentPreferences,
  "analytics" | "marketing"
> {
  return { analytics: false, marketing: false };
}

export function acceptAllPreferences(): CookieConsentPreferences {
  return {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    analytics: true,
    marketing: true,
  };
}

export function rejectOptionalPreferences(): CookieConsentPreferences {
  return {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    ...defaultOptionalPreferences(),
  };
}

export function normalizePreferences(
  input: Pick<CookieConsentPreferences, "analytics" | "marketing">,
): CookieConsentPreferences {
  return {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    analytics: Boolean(input.analytics),
    marketing: Boolean(input.marketing),
  };
}

export function parseStoredConsent(raw: string | null): CookieConsentPreferences | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsentPreferences>;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    if (parsed.necessary !== true) return null;
    if (typeof parsed.analytics !== "boolean") return null;
    if (typeof parsed.marketing !== "boolean") return null;
    return {
      version: COOKIE_CONSENT_VERSION,
      necessary: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
    };
  } catch {
    return null;
  }
}

export function serializeConsent(preferences: CookieConsentPreferences): string {
  return JSON.stringify(preferences);
}

let cachedRaw: string | null | undefined;
let cachedSnapshot: CookieConsentPreferences | null = null;

export function invalidateConsentCache(): void {
  cachedRaw = undefined;
  cachedSnapshot = null;
}

export function loadStoredConsent(): CookieConsentPreferences | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (raw === cachedRaw) return cachedSnapshot;
    cachedRaw = raw;
    cachedSnapshot = parseStoredConsent(raw);
    return cachedSnapshot;
  } catch {
    cachedRaw = null;
    cachedSnapshot = null;
    return null;
  }
}

export function saveStoredConsent(preferences: CookieConsentPreferences): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    const serialized = serializeConsent(preferences);
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, serialized);
    cachedRaw = serialized;
    cachedSnapshot = preferences;
    return true;
  } catch {
    return false;
  }
}

export function consentStatus(
  preferences: CookieConsentPreferences | null,
): CookieConsentStatus {
  return preferences ? "decided" : "unknown";
}

export function hasAnalyticsConsent(
  preferences: CookieConsentPreferences | null,
): boolean {
  return preferences?.analytics === true;
}

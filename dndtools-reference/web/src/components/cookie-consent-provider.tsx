"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  acceptAllPreferences,
  COOKIE_CONSENT_STORAGE_KEY,
  consentStatus,
  hasAnalyticsConsent,
  invalidateConsentCache,
  loadStoredConsent,
  normalizePreferences,
  rejectOptionalPreferences,
  saveStoredConsent,
  type CookieConsentPreferences,
  type CookieConsentStatus,
} from "@/lib/cookie-consent";

type CookieConsentContextValue = {
  status: CookieConsentStatus;
  preferences: CookieConsentPreferences | null;
  analyticsEnabled: boolean;
  showBanner: boolean;
  showPreferences: boolean;
  acceptAll: () => void;
  rejectOptional: () => void;
  savePreferences: (
    input: Pick<CookieConsentPreferences, "analytics" | "marketing">,
  ) => void;
  openPreferences: () => void;
  closePreferences: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(
  null,
);

const listeners = new Set<() => void>();
let storageListenerBound = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!storageListenerBound && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageEvent);
    storageListenerBound = true;
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && storageListenerBound && typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorageEvent);
      storageListenerBound = false;
    }
  };
}

function handleStorageEvent(event: StorageEvent) {
  if (event.key !== COOKIE_CONSENT_STORAGE_KEY) return;
  invalidateConsentCache();
  notifyConsentChange();
}

function notifyConsentChange() {
  for (const listener of listeners) {
    listener();
  }
}

function getConsentSnapshot(): CookieConsentPreferences | null {
  return loadStoredConsent();
}

function getServerConsentSnapshot(): CookieConsentPreferences | null {
  return null;
}

function subscribeClientReady() {
  return () => {};
}

function getClientReadySnapshot(): boolean {
  return true;
}

function getServerClientReadySnapshot(): boolean {
  return false;
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const isClientReady = useSyncExternalStore(
    subscribeClientReady,
    getClientReadySnapshot,
    getServerClientReadySnapshot,
  );
  const preferences = useSyncExternalStore(
    subscribe,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );
  const [showPreferences, setShowPreferences] = useState(false);

  const persist = useCallback((next: CookieConsentPreferences) => {
    saveStoredConsent(next);
    notifyConsentChange();
    setShowPreferences(false);
  }, []);

  const acceptAll = useCallback(() => {
    persist(acceptAllPreferences());
  }, [persist]);

  const rejectOptional = useCallback(() => {
    persist(rejectOptionalPreferences());
  }, [persist]);

  const savePreferences = useCallback(
    (input: Pick<CookieConsentPreferences, "analytics" | "marketing">) => {
      persist(normalizePreferences(input));
    },
    [persist],
  );

  const openPreferences = useCallback(() => {
    setShowPreferences(true);
  }, []);

  const closePreferences = useCallback(() => {
    setShowPreferences(false);
  }, []);

  const status = consentStatus(preferences);
  const showBanner = isClientReady && status === "unknown";

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      status,
      preferences,
      analyticsEnabled: hasAnalyticsConsent(preferences),
      showBanner,
      showPreferences,
      acceptAll,
      rejectOptional,
      savePreferences,
      openPreferences,
      closePreferences,
    }),
    [
      acceptAll,
      closePreferences,
      isClientReady,
      openPreferences,
      preferences,
      rejectOptional,
      savePreferences,
      showBanner,
      showPreferences,
      status,
    ],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return context;
}

"use client";

import { useCookieConsent } from "@/components/cookie-consent-provider";

export function CookieSettingsButton() {
  const { openPreferences } = useCookieConsent();

  return (
    <button type="button" className="btn-ghost" onClick={openPreferences}>
      Open cookie settings
    </button>
  );
}

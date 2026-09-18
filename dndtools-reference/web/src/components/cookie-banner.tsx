"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useCookieConsent } from "@/components/cookie-consent-provider";
import {
  defaultOptionalPreferences,
  type CookieConsentPreferences,
} from "@/lib/cookie-consent";

function CookiePreferencesDialog({
  initial,
  canDismiss,
  onSave,
  onAcceptAll,
  onRejectOptional,
  onClose,
}: {
  initial: Pick<CookieConsentPreferences, "analytics" | "marketing">;
  canDismiss: boolean;
  onSave: (input: Pick<CookieConsentPreferences, "analytics" | "marketing">) => void;
  onAcceptAll: () => void;
  onRejectOptional: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const [analytics, setAnalytics] = useState(initial.analytics);
  const [marketing, setMarketing] = useState(initial.marketing);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && canDismiss) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canDismiss, onClose]);

  return (
    <div className="confirm-dialog-overlay cookie-consent-dialog" role="presentation">
      {canDismiss ? (
        <button
          type="button"
          className="confirm-dialog-backdrop"
          aria-label="Close cookie preferences"
          onClick={onClose}
        />
      ) : (
        <div className="confirm-dialog-backdrop" aria-hidden="true" />
      )}
      <div
        className="confirm-dialog-panel cookie-consent-dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h3 id={titleId}>Cookie preferences</h3>
        <p className="cookie-consent-dialog-intro">
          Choose which optional cookies and similar technologies we may use.
          Necessary cookies stay enabled so the site can work.
        </p>

        <div className="cookie-consent-category">
          <div className="cookie-consent-category-header">
            <strong>Necessary</strong>
            <span className="cookie-consent-badge">Always on</span>
          </div>
          <p>
            Session and sign-in cookies, theme choice, and saved tool settings
            stored in your browser.
          </p>
        </div>

        <label className="cookie-consent-category cookie-consent-toggle">
          <div className="cookie-consent-category-header">
            <strong>Analytics</strong>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(event) => setAnalytics(event.target.checked)}
            />
          </div>
          <p>
            Anonymous pageview analytics via self-hosted Plausible. No ads and
            no cross-site tracking.
          </p>
        </label>

        <label className="cookie-consent-category cookie-consent-toggle">
          <div className="cookie-consent-category-header">
            <strong>Marketing</strong>
            <input
              type="checkbox"
              checked={marketing}
              onChange={(event) => setMarketing(event.target.checked)}
            />
          </div>
          <p>Not used on this site yet. Reserved for future ad or remarketing tags.</p>
        </label>

        <div className="confirm-dialog-actions cookie-consent-dialog-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={onRejectOptional}
          >
            Reject non-essential
          </button>
          <button type="button" className="btn-ghost" onClick={onAcceptAll}>
            Accept all
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onSave({ analytics, marketing })}
          >
            Save choices
          </button>
        </div>
      </div>
    </div>
  );
}

export function CookieBanner() {
  const {
    preferences,
    showBanner,
    showPreferences,
    acceptAll,
    rejectOptional,
    savePreferences,
    openPreferences,
    closePreferences,
    status,
  } = useCookieConsent();

  const initial = preferences ?? defaultOptionalPreferences();

  if (!showBanner && !showPreferences) return null;

  return (
    <>
      {showBanner && !showPreferences ? (
        <aside
          className="cookie-consent-banner"
          role="dialog"
          aria-labelledby="cookie-consent-title"
          aria-describedby="cookie-consent-description"
        >
          <div className="cookie-consent-banner-inner">
            <div className="cookie-consent-banner-copy">
              <h2 id="cookie-consent-title">Cookies on DnD Helper</h2>
              <p id="cookie-consent-description">
                We use necessary cookies for sign-in and site features. With your
                permission, we also load privacy-friendly analytics to understand
                how the site is used.
              </p>
              <p className="cookie-consent-banner-links">
                <Link href="/privacy">Privacy policy</Link>
                <button type="button" className="cookie-consent-link-btn" onClick={openPreferences}>
                  Manage preferences
                </button>
              </p>
            </div>
            <div className="cookie-consent-banner-actions">
              <button type="button" className="btn-ghost" onClick={rejectOptional}>
                Reject non-essential
              </button>
              <button type="button" className="btn-ghost" onClick={openPreferences}>
                Customize
              </button>
              <button type="button" className="btn-primary" onClick={acceptAll}>
                Accept all
              </button>
            </div>
          </div>
        </aside>
      ) : null}

      {showPreferences ? (
        <CookiePreferencesDialog
          key={`${initial.analytics}-${initial.marketing}`}
          initial={initial}
          canDismiss={status === "decided"}
          onSave={savePreferences}
          onAcceptAll={acceptAll}
          onRejectOptional={rejectOptional}
          onClose={closePreferences}
        />
      ) : null}
    </>
  );
}

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acceptAllPreferences,
  COOKIE_CONSENT_VERSION,
  consentStatus,
  defaultOptionalPreferences,
  hasAnalyticsConsent,
  normalizePreferences,
  parseStoredConsent,
  rejectOptionalPreferences,
  serializeConsent,
} from "./cookie-consent";

describe("cookie consent helpers", () => {
  it("returns default optional preferences as false", () => {
    assert.deepEqual(defaultOptionalPreferences(), {
      analytics: false,
      marketing: false,
    });
  });

  it("builds accept-all preferences", () => {
    assert.deepEqual(acceptAllPreferences(), {
      version: COOKIE_CONSENT_VERSION,
      necessary: true,
      analytics: true,
      marketing: true,
    });
  });

  it("builds reject-optional preferences", () => {
    assert.deepEqual(rejectOptionalPreferences(), {
      version: COOKIE_CONSENT_VERSION,
      necessary: true,
      analytics: false,
      marketing: false,
    });
  });

  it("normalizes custom preferences", () => {
    assert.deepEqual(
      normalizePreferences({ analytics: true, marketing: false }),
      {
        version: COOKIE_CONSENT_VERSION,
        necessary: true,
        analytics: true,
        marketing: false,
      },
    );
  });

  it("parses valid stored consent", () => {
    const raw = serializeConsent(rejectOptionalPreferences());
    assert.deepEqual(parseStoredConsent(raw), rejectOptionalPreferences());
  });

  it("rejects missing stored consent", () => {
    assert.equal(parseStoredConsent(null), null);
  });

  it("rejects invalid JSON", () => {
    assert.equal(parseStoredConsent("{not-json"), null);
  });

  it("rejects version mismatch", () => {
    const raw = JSON.stringify({
      version: COOKIE_CONSENT_VERSION + 1,
      necessary: true,
      analytics: true,
      marketing: false,
    });
    assert.equal(parseStoredConsent(raw), null);
  });

  it("rejects invalid shape", () => {
    const raw = JSON.stringify({
      version: COOKIE_CONSENT_VERSION,
      necessary: false,
      analytics: true,
      marketing: false,
    });
    assert.equal(parseStoredConsent(raw), null);
  });

  it("derives consent status and analytics consent", () => {
    const rejected = rejectOptionalPreferences();
    assert.equal(consentStatus(rejected), "decided");
    assert.equal(consentStatus(null), "unknown");
    assert.equal(hasAnalyticsConsent(rejected), false);
    assert.equal(hasAnalyticsConsent(acceptAllPreferences()), true);
  });
});

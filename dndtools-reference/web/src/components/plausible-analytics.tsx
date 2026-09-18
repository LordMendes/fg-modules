"use client";

import Script from "next/script";
import { useCookieConsent } from "@/components/cookie-consent-provider";

export function PlausibleAnalytics() {
  const { analyticsEnabled } = useCookieConsent();

  if (!analyticsEnabled) return null;

  return (
    <>
      <Script id="plausible-init" strategy="afterInteractive">
        {`window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }`}
      </Script>
      <Script
        defer
        data-domain="dnd-helper.com"
        src="https://analytics.lcmendes.com/js/script.file-downloads.hash.outbound-links.pageview-props.tagged-events.js"
        strategy="afterInteractive"
      />
    </>
  );
}

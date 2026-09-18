"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { CookieBanner } from "@/components/cookie-banner";
import { useCookieConsent } from "@/components/cookie-consent-provider";
import { EncounterDockHost } from "@/components/encounter/encounter-dock";
import { SiteHeader } from "@/components/site-header";
import { isCampaignTablePath } from "@/lib/campaign/immersive";
import type { AuthUser } from "@/lib/auth/session";

export function AppShell({
  user,
  children,
}: {
  user: AuthUser | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isCampaignTable = isCampaignTablePath(pathname);
  const { openPreferences } = useCookieConsent();

  useEffect(() => {
    document.body.classList.toggle("campaign-table-body", isCampaignTable);
    return () => {
      document.body.classList.remove("campaign-table-body");
    };
  }, [isCampaignTable]);

  return (
    <>
      {isCampaignTable ? null : <SiteHeader user={user} />}
      <main
        id="main-content"
        className={
          isCampaignTable
            ? "main-content main-content--campaign-table min-w-0 w-full"
            : "main-content min-w-0 w-full"
        }
      >
        {children}
      </main>
      {isCampaignTable ? null : (
        <>
          <EncounterDockHost />
          <footer className="site-footer">
            <p className="site-footer-disclaimer">
              D&D 3.5 Edition reference material. Not affiliated with Wizards of the Coast.
            </p>
            <p className="site-footer-links">
              <Link href="/about">About</Link>
              <span aria-hidden="true">·</span>
              <Link href="/changelog">Changelog</Link>
              <span aria-hidden="true">·</span>
              <Link href="/privacy">Privacy</Link>
              <span aria-hidden="true">·</span>
              <Link href="/llms.txt">llms.txt</Link>
              <span aria-hidden="true">·</span>
              <button type="button" className="site-footer-link-btn" onClick={openPreferences}>
                Cookie settings
              </button>
            </p>
          </footer>
        </>
      )}
      <CookieBanner />
    </>
  );
}

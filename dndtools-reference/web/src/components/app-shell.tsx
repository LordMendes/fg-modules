"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
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
            D&D 3.5 Edition reference material. Not affiliated with Wizards of the Coast.
          </footer>
        </>
      )}
    </>
  );
}

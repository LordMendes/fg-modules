"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { SITE_NAME } from "@/lib/seo";
import { PRIMARY_NAV, isPrimaryNavActive } from "@/lib/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { HeaderBrowseMenu } from "@/components/header-browse-menu";
import { HeaderAccountMenu } from "@/components/header-account-menu";
import { HeaderMobileMenu } from "@/components/header-mobile-menu";
import { HeaderSearch } from "@/components/header-search";
import type { AuthUser } from "@/lib/auth/session";

function HeaderNavLinks() {
  const pathname = usePathname();

  return (
    <>
      <HeaderBrowseMenu />
      {PRIMARY_NAV.map((item) => {
        const active = isPrimaryNavActive(item.href, pathname);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

function HeaderAuth({ user }: { user: AuthUser | null }) {
  if (user) {
    return <HeaderAccountMenu user={user} />;
  }

  return (
    <>
      <Link href="/login" className="btn-ghost">
        Log in
      </Link>
      <Link href="/register" className="btn-primary">
        Sign up
      </Link>
    </>
  );
}

function SiteHeaderInner({ user }: { user: AuthUser | null }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="site-logo">
          <span className="logo-icon">⚔</span>
          <span className="logo-text">{SITE_NAME}</span>
        </Link>

        <nav className="header-nav" aria-label="Primary navigation">
          <Suspense fallback={null}>
            <HeaderNavLinks />
          </Suspense>
        </nav>

        <div className="header-actions">
          <HeaderSearch />
          <div className="header-actions-desktop">
            <HeaderAuth user={user} />
            <ThemeToggle />
          </div>
          <Suspense fallback={null}>
            <HeaderMobileMenu user={user} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

export function SiteHeader({ user }: { user: AuthUser | null }) {
  return (
    <Suspense fallback={null}>
      <SiteHeaderInner user={user} />
    </Suspense>
  );
}

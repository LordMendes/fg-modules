import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { SITE_NAME } from "@/lib/seo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchBar } from "@/components/search-bar";
import { LogoutButton } from "@/components/logout-button";
import type { AuthUser } from "@/lib/auth/session";

export function SiteHeader({ user }: { user: AuthUser | null }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="site-logo">
          <span className="logo-icon">⚔</span>
          <span className="logo-text">{SITE_NAME}</span>
        </Link>
        <nav className="header-nav" aria-label="Primary navigation">
          <Link href="/sources">Sources</Link>
          <Link href="/tools">Tools</Link>
          {CATEGORIES.slice(0, 6).flatMap((c) => {
            const links = [
              <Link key={c.key} href={`/${c.key}`}>
                {c.label}
              </Link>,
            ];
            if (c.key === "feats") {
              links.push(
                <Link key="flaws" href="/feats?type=Flaw">
                  Flaws
                </Link>,
              );
            }
            return links;
          })}
        </nav>
        <div className="header-actions">
          <SearchBar />
          {user ? (
            <>
              <Link href="/profile" className="header-auth-link">
                Profile
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="header-auth-link">
                Log in
              </Link>
              <Link href="/register" className="header-auth-link header-auth-primary">
                Sign up
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

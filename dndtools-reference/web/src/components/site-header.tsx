import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchBar } from "@/components/search-bar";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="site-logo">
          <span className="logo-icon">⚔</span>
          <span className="logo-text">Arcane Archives</span>
        </Link>
        <nav className="header-nav" aria-label="Primary navigation">
          <Link href="/sources">Sources</Link>
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
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Menu, X } from "lucide-react";
import {
  BROWSE_GROUPS,
  PRIMARY_NAV,
  browseItemChildLinks,
  isBrowseItemActive,
  isPrimaryNavActive,
} from "@/lib/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import type { AuthUser } from "@/lib/auth/session";

export function HeaderMobileMenu({ user }: { user: AuthUser | null }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="header-mobile-menu">
      <button
        type="button"
        className="header-mobile-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden />
        ) : (
          <Menu className="h-5 w-5" aria-hidden />
        )}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="header-mobile-backdrop"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <nav
            id={panelId}
            className="header-mobile-panel"
            aria-label="Mobile navigation"
          >
            <div className="header-mobile-section">
              <p className="header-mobile-section-label">Browse</p>
              {BROWSE_GROUPS.map((group) => (
                <div key={group.label} className="header-mobile-group">
                  <p className="header-mobile-group-label">{group.label}</p>
                  <ul className="header-mobile-links">
                    {group.items.map((item) => (
                      <li key={item.key}>
                        <Link
                          href={item.href}
                          className={`header-mobile-link${
                            isBrowseItemActive(
                              item.href,
                              pathname,
                              searchParams,
                            )
                              ? " is-active"
                              : ""
                          }`}
                          aria-current={
                            isBrowseItemActive(
                              item.href,
                              pathname,
                              searchParams,
                            )
                              ? "page"
                              : undefined
                          }
                          onClick={() => setOpen(false)}
                        >
                          {item.label}
                        </Link>
                        {browseItemChildLinks(item).map((child) => (
                          <Link
                            key={child.key}
                            href={child.href}
                            className={`header-mobile-link header-mobile-link--child${
                              isBrowseItemActive(child.href, pathname, searchParams)
                                ? " is-active"
                                : ""
                            }`}
                            aria-current={
                              isBrowseItemActive(child.href, pathname, searchParams)
                                ? "page"
                                : undefined
                            }
                            onClick={() => setOpen(false)}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="header-mobile-section">
              <p className="header-mobile-section-label">Sections</p>
              <ul className="header-mobile-links">
                {PRIMARY_NAV.map((item) => {
                  const active = isPrimaryNavActive(item.href, pathname);
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className={`header-mobile-link${active ? " is-active" : ""}`}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="header-mobile-section header-mobile-actions">
              {user ? (
                <>
                  <Link
                    href="/profile"
                    className="header-mobile-link"
                    onClick={() => setOpen(false)}
                  >
                    Profile
                  </Link>
                  <LogoutButton
                    className="header-mobile-link header-mobile-link--button"
                    onLoggedOut={() => setOpen(false)}
                  />
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="btn-ghost header-mobile-auth-btn"
                    onClick={() => setOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="btn-primary header-mobile-auth-btn"
                    onClick={() => setOpen(false)}
                  >
                    Sign up
                  </Link>
                </>
              )}
              <ThemeToggle />
            </div>
          </nav>
        </>
      ) : null}
    </div>
  );
}

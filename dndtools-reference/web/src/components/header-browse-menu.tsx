"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  BROWSE_GROUPS,
  browseItemChildLinks,
  isBrowseActive,
  isBrowseItemActive,
} from "@/lib/nav";

export function HeaderBrowseMenu() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonId = useId();
  const panelId = useId();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const browseActive = isBrowseActive(pathname, searchParams);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="header-menu" ref={panelRef}>
      <button
        type="button"
        id={buttonId}
        className={`header-menu-trigger${browseActive ? " is-active" : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        Browse
        <ChevronDown className="header-menu-chevron h-4 w-4" aria-hidden />
      </button>

      {open ? (
        <div
          id={panelId}
          className="header-menu-panel header-browse-panel"
          role="menu"
          aria-labelledby={buttonId}
        >
          {BROWSE_GROUPS.map((group) => (
            <div key={group.label} className="header-browse-group">
              <p className="header-browse-group-label">{group.label}</p>
              <ul className="header-browse-list">
                {group.items.map((item) => {
                  const active = isBrowseItemActive(
                    item.href,
                    pathname,
                    searchParams,
                  );
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className={`header-menu-item${active ? " is-active" : ""}`}
                        role="menuitem"
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                      >
                        {item.label}
                      </Link>
                      {browseItemChildLinks(item).map((child) => (
                        <Link
                          key={child.key}
                          href={child.href}
                          className={`header-menu-item header-menu-item--child${
                            isBrowseItemActive(child.href, pathname, searchParams)
                              ? " is-active"
                              : ""
                          }`}
                          role="menuitem"
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
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

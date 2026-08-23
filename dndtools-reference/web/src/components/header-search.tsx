"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { SearchOverlay } from "@/components/search-overlay";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function HeaderSearch() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isHome = pathname === "/";

  const openOverlay = useCallback(() => setOpen(true), []);
  const closeOverlay = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;

      const isModK =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      const isSlash = event.key === "/" && !event.ctrlKey && !event.metaKey;

      if (!isModK && !isSlash) return;

      if (isHome && (isSlash || isModK)) {
        const heroInput = document.getElementById("hero-search-input");
        if (heroInput instanceof HTMLInputElement) {
          event.preventDefault();
          heroInput.focus();
        }
        return;
      }

      if (isModK || isSlash) {
        event.preventDefault();
        openOverlay();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isHome, openOverlay]);

  return (
    <>
      {!isHome ? (
        <button
          type="button"
          className="header-search-trigger"
          onClick={openOverlay}
          aria-label="Search the archives"
          aria-keyshortcuts="Control+K"
        >
          <Search className="h-4 w-4" aria-hidden />
          <span className="header-search-trigger-label">Search</span>
          <kbd className="header-search-kbd" aria-hidden>
            Ctrl+K
          </kbd>
        </button>
      ) : null}
      <SearchOverlay open={open} onClose={closeOverlay} />
    </>
  );
}

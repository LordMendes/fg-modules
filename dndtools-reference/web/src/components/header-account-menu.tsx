"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import type { AuthUser } from "@/lib/auth/session";

export function HeaderAccountMenu({ user }: { user: AuthUser }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonId = useId();
  const panelId = useId();
  const label = user.name?.trim() || user.username;

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
        className="header-menu-trigger header-account-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="header-account-label">{label}</span>
        <ChevronDown className="header-menu-chevron h-4 w-4" aria-hidden />
      </button>

      {open ? (
        <div
          id={panelId}
          className="header-menu-panel header-account-panel"
          role="menu"
          aria-labelledby={buttonId}
        >
          <Link
            href="/profile"
            className="header-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          <LogoutButton
            className="header-menu-item header-menu-item--button"
            onLoggedOut={() => setOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

export function CampaignDrawerShell({
  title,
  subtitle,
  icon,
  onClose,
  closeLabel,
  className,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClose: () => void;
  closeLabel: string;
  className?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        className="campaign-drawer-backdrop"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <aside
        className={["campaign-drawer", className].filter(Boolean).join(" ")}
        aria-label={title}
      >
        <header className="campaign-drawer-header campaign-drawer-header--row">
          <div className="campaign-drawer-heading">
            <h2 className="campaign-drawer-title">
              {icon}
              {title}
            </h2>
            {subtitle ? (
              <p className="campaign-drawer-sub">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="tool-btn tool-btn--ghost campaign-drawer-close"
            onClick={onClose}
            aria-label={closeLabel}
          >
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="campaign-drawer-body">{children}</div>
        {footer ? <footer className="campaign-drawer-footer">{footer}</footer> : null}
      </aside>
    </>
  );
}

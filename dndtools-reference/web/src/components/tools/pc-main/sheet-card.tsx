"use client";

import type { ReactNode } from "react";

export function PcSheetCard({
  title,
  className,
  actions,
  children,
}: {
  title: string;
  className?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={["pc-sheet-card", className].filter(Boolean).join(" ")}>
      {actions ? (
        <div className="pc-sheet-card-header">
          <h3>{title}</h3>
          <div className="pc-sheet-card-header-actions">{actions}</div>
        </div>
      ) : (
        <h3>{title}</h3>
      )}
      {children}
    </section>
  );
}

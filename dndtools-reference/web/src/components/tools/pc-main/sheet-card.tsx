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
      <div className="pc-sheet-card-header">
        <h3>{title}</h3>
        {actions ? (
          <div className="pc-sheet-card-header-actions">{actions}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

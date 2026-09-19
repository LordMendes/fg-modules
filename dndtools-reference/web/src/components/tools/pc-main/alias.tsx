"use client";

import { PcSheetCard } from "@/components/tools/pc-main/sheet-card";

export function PcMainAlias({
  shortcut,
  onShortcutChange,
  onShortcutBlur,
}: {
  shortcut: string;
  onShortcutChange: (value: string) => void;
  onShortcutBlur: () => void;
}) {
  return (
    <PcSheetCard title="Character alias" className="pc-main-alias">
      <label className="pc-main-shortcut-label">
        <span>Shortcut</span>
        <input
          type="text"
          className="pc-sheet-input pc-main-shortcut-input"
          placeholder="e.g. hwizard"
          value={shortcut}
          aria-label="Shortcut alias"
          onChange={(e) => onShortcutChange(e.target.value)}
          onBlur={onShortcutBlur}
        />
      </label>
    </PcSheetCard>
  );
}

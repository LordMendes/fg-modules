"use client";

export type FgSheetTabDef<T extends string> = {
  id: T;
  label: string;
};

type FgSheetTabsProps<T extends string> = {
  tabs: readonly FgSheetTabDef<T>[];
  value: T;
  onChange: (tab: T) => void;
  className?: string;
  ariaLabel?: string;
};

export function FgSheetTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
  ariaLabel,
}: FgSheetTabsProps<T>) {
  return (
    <div
      className={["npc-sheet-tabs fg-sheet-tabs", className].filter(Boolean).join(" ")}
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          className={
            value === id ? "npc-sheet-tab npc-sheet-tab-active" : "npc-sheet-tab"
          }
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

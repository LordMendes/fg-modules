"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { FieldTooltip } from "@/components/field-tooltip";

export type MultiSelectOption = {
  value: string;
  label: string;
};

type PanelPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const PANEL_MIN_WIDTH = 256;
const PANEL_MAX_WIDTH = 320;
const PANEL_GAP = 4;
const PANEL_PREFERRED_HEIGHT = 320;
const PANEL_Z_INDEX = 300;

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  searchable = true,
  placeholder = "Any",
  showLabel = true,
  tooltip,
  displayMode = "summary",
  maxSelections,
}: {
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
  placeholder?: string;
  showLabel?: boolean;
  tooltip?: string;
  displayMode?: "summary" | "badges";
  maxSelections?: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }

    function updatePanelPos() {
      const anchor = triggerRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const width = Math.min(
        Math.max(rect.width, PANEL_MIN_WIDTH),
        Math.min(PANEL_MAX_WIDTH, window.innerWidth * 0.9),
      );
      let left = rect.left;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

      const spaceBelow = window.innerHeight - rect.bottom - PANEL_GAP;
      const spaceAbove = rect.top - PANEL_GAP;
      const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;

      let top: number;
      let maxHeight: number;
      if (openUp) {
        maxHeight = Math.min(PANEL_PREFERRED_HEIGHT, spaceAbove);
        top = rect.top - PANEL_GAP - maxHeight;
      } else {
        maxHeight = Math.min(PANEL_PREFERRED_HEIGHT, spaceBelow);
        top = rect.bottom + PANEL_GAP;
      }

      top = Math.max(8, top);
      maxHeight = Math.min(maxHeight, window.innerHeight - top - 8);

      setPanelPos({ top, left, width, maxHeight });
    }

    updatePanelPos();
    window.addEventListener("resize", updatePanelPos);
    window.addEventListener("scroll", updatePanelPos, true);
    return () => {
      window.removeEventListener("resize", updatePanelPos);
      window.removeEventListener("scroll", updatePanelPos, true);
    };
  }, [open, filtered.length, options.length]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function toggle(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
      return;
    }
    let next = [...value, optionValue];
    if (maxSelections != null && next.length > maxSelections) {
      next = next.slice(-maxSelections);
    }
    onChange(next);
  }

  function removeBadge(optionValue: string, event: SyntheticEvent) {
    event.preventDefault();
    event.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  }

  function selectAllVisible() {
    const next = new Set(value);
    for (const opt of filtered) next.add(opt.value);
    onChange([...next]);
  }

  function clearSelection() {
    onChange([]);
  }

  const summary =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? (options.find((o) => o.value === value[0])?.label ?? value[0])
        : `${value.length} selected`;

  return (
    <div className={`multi-select${open ? " is-open" : ""}`} ref={rootRef}>
      {showLabel ? (
        <span className="multi-select-label-row">
          <span className="multi-select-label">{label}</span>
          {tooltip ? <FieldTooltip text={tooltip} /> : null}
        </span>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        className={`multi-select-trigger${displayMode === "badges" ? " multi-select-trigger--badges" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={showLabel ? undefined : label}
        onClick={() => setOpen((prev) => !prev)}
      >
        {displayMode === "badges" ? (
          value.length === 0 ? (
            <span className="multi-select-placeholder">{placeholder}</span>
          ) : (
            <span className="multi-select-badges">
              {value.map((optionValue) => {
                const optionLabel =
                  options.find((option) => option.value === optionValue)?.label ?? optionValue;
                return (
                  <span key={optionValue} className="multi-select-badge">
                    {optionLabel}
                    <span
                      role="button"
                      tabIndex={0}
                      className="multi-select-badge-remove"
                      aria-label={`Remove ${optionLabel}`}
                      onClick={(event) => removeBadge(optionValue, event)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          removeBadge(optionValue, event);
                        }
                      }}
                    >
                      <X className="h-3 w-3" aria-hidden />
                    </span>
                  </span>
                );
              })}
            </span>
          )
        ) : (
          <span className="multi-select-summary">{summary}</span>
        )}
        {displayMode === "summary" && value.length > 0 ? (
          <span className="multi-select-count">{value.length}</span>
        ) : null}
        <ChevronDown className="multi-select-chevron h-4 w-4" aria-hidden />
      </button>

      {open && panelPos
        ? createPortal(
            <div
              ref={panelRef}
              className="multi-select-panel multi-select-panel--floating"
              role="presentation"
              style={{
                top: panelPos.top,
                left: panelPos.left,
                width: panelPos.width,
                maxHeight: panelPos.maxHeight,
                zIndex: PANEL_Z_INDEX,
              }}
            >
              {searchable && options.length > 8 ? (
                <div className="multi-select-search">
                  <Search className="h-3.5 w-3.5" aria-hidden />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Filter ${label.toLowerCase()}…`}
                    autoFocus
                  />
                  {query ? (
                    <button
                      type="button"
                      className="multi-select-search-clear"
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="multi-select-actions">
                <button type="button" onClick={selectAllVisible}>
                  Select all
                </button>
                <button type="button" onClick={clearSelection} disabled={value.length === 0}>
                  Clear
                </button>
              </div>

              <ul id={listId} className="multi-select-list" role="listbox" aria-multiselectable>
                {filtered.length === 0 ? (
                  <li className="multi-select-empty">No matches</li>
                ) : (
                  filtered.map((opt) => {
                    const selected = value.includes(opt.value);
                    return (
                      <li key={opt.value} role="option" aria-selected={selected}>
                        <button
                          type="button"
                          className={`multi-select-option${selected ? " is-selected" : ""}`}
                          onClick={() => toggle(opt.value)}
                        >
                          <span className="multi-select-check" aria-hidden>
                            {selected ? <Check className="h-3.5 w-3.5" /> : null}
                          </span>
                          <span>{opt.label}</span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

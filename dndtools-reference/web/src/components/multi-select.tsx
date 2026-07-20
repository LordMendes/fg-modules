"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export type MultiSelectOption = {
  value: string;
  label: string;
};

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  searchable = true,
  placeholder = "Any",
}: {
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
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
    } else {
      onChange([...value, optionValue]);
    }
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
      <span className="multi-select-label">{label}</span>
      <button
        type="button"
        className="multi-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="multi-select-summary">{summary}</span>
        {value.length > 0 ? (
          <span className="multi-select-count">{value.length}</span>
        ) : null}
        <ChevronDown className="multi-select-chevron h-4 w-4" aria-hidden />
      </button>

      {open ? (
        <div className="multi-select-panel" role="presentation">
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
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  filterSenseOptions,
  normalizeSenseName,
} from "@/lib/pc-planner/senseCatalog";

export type PcSensePickerProps = {
  senses: string[];
  readOnly?: boolean;
  onChange: (senses: string[]) => void;
};

export function PcSensePicker({
  senses,
  readOnly = false,
  onChange,
}: PcSensePickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = new Set(senses);
  const options = filterSenseOptions(query, selected);
  const trimmed = normalizeSenseName(query);
  const canCreate =
    trimmed.length > 0 &&
    !selected.has(trimmed) &&
    !options.some((option) => option.name.toLowerCase() === trimmed.toLowerCase());

  function addSense(name: string) {
    const next = normalizeSenseName(name);
    if (!next || selected.has(next)) return;
    onChange([...senses, next]);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
  }

  function removeSense(name: string) {
    onChange(senses.filter((line) => line !== name));
  }

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const listItems = [
    ...options.map((option) => ({ kind: "option" as const, ...option })),
    ...(canCreate ? [{ kind: "create" as const, name: trimmed }] : []),
  ];

  function selectIndex(index: number) {
    const item = listItems[index];
    if (!item) return;
    addSense(item.name);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      if (listItems.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((prev) => (prev + 1) % listItems.length);
      return;
    }
    if (event.key === "ArrowUp") {
      if (listItems.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((prev) => (prev <= 0 ? listItems.length - 1 : prev - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && listItems[activeIndex]) {
        selectIndex(activeIndex);
        return;
      }
      if (canCreate) {
        addSense(trimmed);
        return;
      }
      if (options.length === 1) {
        addSense(options[0]!.name);
      }
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="pc-language-picker pc-sense-picker" ref={rootRef}>
      {senses.length > 0 ? (
        <ul className="pc-language-list" aria-label="Senses">
          {senses.map((sense) => (
            <li key={sense}>
              <span className="pc-language-chip">
                {sense}
                {!readOnly ? (
                  <button
                    type="button"
                    className="pc-language-chip-remove"
                    aria-label={`Remove ${sense}`}
                    onClick={() => removeSense(sense)}
                  >
                    ×
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pc-sheet-empty pc-language-empty">No senses yet.</p>
      )}

      {!readOnly ? (
        <div className={`pc-language-add${open ? " is-open" : ""}`}>
          <input
            type="text"
            className="pc-sheet-input pc-language-add-input"
            value={query}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
            }
            placeholder="Add sense…"
            aria-label="Add sense"
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
          />
          {open && listItems.length > 0 ? (
            <ul id={listId} className="pc-language-options" role="listbox">
              {listItems.map((item, index) => (
                <li key={`${item.kind}-${item.name}`} role="presentation">
                  <button
                    type="button"
                    id={`${listId}-option-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={
                      index === activeIndex
                        ? "pc-language-option is-active"
                        : "pc-language-option"
                    }
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectIndex(index)}
                  >
                    {item.kind === "create" ? (
                      <>
                        <span className="pc-language-option-name">Add &quot;{item.name}&quot;</span>
                        <span className="pc-language-option-meta">Custom</span>
                      </>
                    ) : (
                      <>
                        <span className="pc-language-option-name">{item.name}</span>
                        <span className="pc-language-option-meta">{item.groupLabel}</span>
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

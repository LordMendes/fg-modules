"use client";

import { useState, useRef, useEffect } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";

export function CombatEditableNumber({
  value,
  label,
  editable,
  min = 0,
  max,
  onChange,
  className,
}: {
  value: number;
  label?: string;
  editable: boolean;
  min?: number;
  max?: number;
  onChange: (value: number) => Promise<void> | void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [pending, setPending] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useClickOutside(ref, () => {
    if (editing) {
      save();
    }
  }, editing);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) {
      setDraft(String(value));
    }
  }, [value, editing]);

  function save() {
    const trimmed = draft.trim();
    if (!trimmed) {
      setEditing(false);
      setDraft(String(value));
      return;
    }

    const n = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(n)) {
      setEditing(false);
      setDraft(String(value));
      return;
    }

    const clamped = min != null && max != null 
      ? Math.max(min, Math.min(max, n))
      : min != null
      ? Math.max(min, n)
      : max != null
      ? Math.min(max, n)
      : n;

    if (clamped === value) {
      setEditing(false);
      return;
    }

    setPending(true);
    Promise.resolve(onChange(clamped))
      .then(() => {
        setEditing(false);
      })
      .catch(() => {
        setDraft(String(value));
        setEditing(false);
      })
      .finally(() => setPending(false));
  }

  if (!editable) {
    return (
      <span className={className} title={label}>
        {value}
      </span>
    );
  }

  if (editing) {
    return (
      <div ref={ref} className="combat-editable-number-editor">
        <input
          ref={inputRef}
          type="number"
          className="combat-editable-number-input"
          value={draft}
          disabled={pending}
          min={min}
          max={max}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              save();
            } else if (e.key === "Escape") {
              setEditing(false);
              setDraft(String(value));
            }
          }}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`combat-editable-number-btn ${className ?? ""}`}
      title={label ? `${label}: ${value} (click to edit)` : "Click to edit"}
      onClick={() => {
        setEditing(true);
        setDraft(String(value));
      }}
    >
      {value}
    </button>
  );
}

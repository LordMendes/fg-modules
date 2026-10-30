"use client";

import {
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
} from "react";

export type NumberDraftOptions = {
  signed: boolean;
  decimals: boolean;
  min?: number;
  max?: number;
  emptyValue?: number;
};

export function isAllowedNumberDraft(raw: string, options: NumberDraftOptions): boolean {
  if (raw === "") return true;
  const body = options.decimals ? "\\d*\\.?\\d*" : "\\d*";
  const re = options.signed ? new RegExp(`^-?${body}$`) : new RegExp(`^${body}$`);
  return re.test(raw);
}

/** A finished number. Empty, "-" and trailing "." are still being typed. */
export function parseCompleteNumber(raw: string, options: NumberDraftOptions): number | null {
  if (!isAllowedNumberDraft(raw, options)) return null;
  if (raw === "" || raw === "-" || raw === "." || raw === "-.") return null;
  if (raw.endsWith(".")) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  if (!options.decimals && !Number.isInteger(value)) return null;
  if (!options.signed && value < 0) return null;
  return value;
}

export function clampNumber(value: number, min?: number, max?: number): number {
  let next = value;
  if (min != null) next = Math.max(min, next);
  if (max != null) next = Math.min(max, next);
  return next;
}

export function numberInRange(value: number, min?: number, max?: number): boolean {
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

/**
 * Value to store when the field loses focus.
 * An empty box restores `current` unless `emptyValue` says what blank means.
 * A half-typed value is clamped into range.
 */
export function commitNumberOnBlur(
  raw: string,
  current: number,
  options: NumberDraftOptions,
): number {
  const trimmed = raw.endsWith(".") ? raw.slice(0, -1) : raw;
  const parsed = parseCompleteNumber(trimmed === "-" ? "" : trimmed, options);
  if (parsed == null) {
    if (raw === "" && options.emptyValue != null) return options.emptyValue;
    return current;
  }
  return clampNumber(parsed, options.min, options.max);
}

type DraftNumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "min" | "max" | "step" | "inputMode"
> & {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Allow a leading minus. Defaults to true when min is omitted or negative. */
  signed?: boolean;
  /** Allow a decimal point. Defaults to true when step is not a whole number. */
  decimals?: boolean;
  /**
   * Stored when the box is cleared. The text stays empty while typing.
   * When omitted, leaving the box empty restores the previous number.
   */
  emptyValue?: number;
  /** Show a blank box when the stored value is 0 and the field is not focused. */
  blankZero?: boolean;
};

function shownValue(value: number, blankZero: boolean): string {
  if (blankZero && value === 0) return "";
  return String(value);
}

/**
 * Number field that can be cleared while it is focused.
 * The stored number updates only for a complete in-range value, so deleting
 * the current text does not snap the box back to 0 or the minimum.
 */
export function DraftNumberInput({
  value,
  onValueChange,
  min,
  max,
  step,
  signed,
  decimals,
  emptyValue,
  blankZero = false,
  onFocus,
  onBlur,
  ...rest
}: DraftNumberInputProps) {
  const allowDecimals = decimals ?? (step != null && !Number.isInteger(step));
  const allowSigned = signed ?? (min == null || min < 0);
  const useNumberType = !allowSigned && !allowDecimals;
  const options: NumberDraftOptions = {
    signed: allowSigned,
    decimals: allowDecimals,
    min,
    max,
    emptyValue,
  };
  const safeValue = Number.isFinite(value) ? value : (emptyValue ?? 0);
  const [draft, setDraft] = useState(() => shownValue(safeValue, blankZero));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (focusedRef.current) return;
    setDraft(shownValue(safeValue, blankZero));
  }, [safeValue, blankZero]);

  return (
    <input
      {...rest}
      type={useNumberType ? "number" : "text"}
      inputMode={useNumberType ? "numeric" : "decimal"}
      min={useNumberType ? min : undefined}
      max={useNumberType ? max : undefined}
      step={useNumberType ? (step ?? 1) : undefined}
      autoComplete="off"
      spellCheck={false}
      value={draft}
      onFocus={(event) => {
        focusedRef.current = true;
        onFocus?.(event);
      }}
      onChange={(event) => {
        const raw = event.target.value;
        if (!isAllowedNumberDraft(raw, options)) return;
        setDraft(raw);
        if (raw === "") {
          if (emptyValue != null && emptyValue !== safeValue) onValueChange(emptyValue);
          return;
        }
        const parsed = parseCompleteNumber(raw, options);
        if (parsed == null || !numberInRange(parsed, min, max)) return;
        if (parsed !== safeValue) onValueChange(parsed);
      }}
      onBlur={(event) => {
        focusedRef.current = false;
        const next = commitNumberOnBlur(draft, safeValue, options);
        setDraft(shownValue(next, blankZero));
        if (next !== safeValue) onValueChange(next);
        onBlur?.(event);
      }}
    />
  );
}

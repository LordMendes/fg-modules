/**
 * Override contract for PC sheet auto-derived values:
 *
 * - `resolveDerived(auto, override)`: use override when it is not null/undefined.
 * - List fields: `{ customized, lines }` — auto-fill only when `customized` is false.
 * - Effect registries: honor `suppressed` on feat/ability entries.
 * - Misc columns on combat/skills always add on top; never write auto into misc.
 */

export type DerivedListField = {
  /** When true, auto-fill from race/compendium must not overwrite `lines`. */
  customized: boolean;
  lines: string[];
};

export type DerivedStringField = {
  customized: boolean;
  value: string;
};

/** Use player override when set; otherwise use the auto-computed value. */
export function resolveDerived<T>(auto: T, override: T | null | undefined): T {
  return override != null ? override : auto;
}

/** Numeric override: null/undefined means auto; any finite number (including 0) is manual. */
export function resolveDerivedNumber(
  auto: number,
  override: number | null | undefined,
): number {
  if (override == null || !Number.isFinite(override)) return auto;
  return override;
}

export function emptyDerivedList(): DerivedListField {
  return { customized: false, lines: [] };
}

export function emptyDerivedString(): DerivedStringField {
  return { customized: false, value: "" };
}

export function normalizeDerivedList(raw: unknown): DerivedListField {
  if (!raw || typeof raw !== "object") return emptyDerivedList();
  const rec = raw as Record<string, unknown>;
  const customized = Boolean(rec.customized);
  const linesRaw = Array.isArray(rec.lines) ? rec.lines : [];
  const lines = linesRaw
    .filter((line): line is string => typeof line === "string")
    .map((line) => line.trim())
    .filter(Boolean);
  return { customized, lines };
}

export function normalizeDerivedString(raw: unknown): DerivedStringField {
  if (!raw || typeof raw !== "object") return emptyDerivedString();
  const rec = raw as Record<string, unknown>;
  return {
    customized: Boolean(rec.customized),
    value: typeof rec.value === "string" ? rec.value : "",
  };
}

/** Resolved list: override string replaces structured auto when non-empty. */
export function resolveDerivedList(
  autoLines: string[],
  field: DerivedListField,
  overrideText?: string | null,
): string[] {
  if (overrideText != null && overrideText.trim()) {
    return overrideText
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (field.customized) return field.lines;
  return autoLines.length > 0 ? autoLines : field.lines;
}

export function resolveDerivedString(
  auto: string,
  field: DerivedStringField,
  freeOverride?: string | null,
): string {
  if (freeOverride != null && freeOverride.trim()) return freeOverride.trim();
  if (field.customized) return field.value;
  return auto || field.value;
}

export function isEffectSuppressed(entry: { suppressed?: boolean } | null | undefined): boolean {
  return Boolean(entry?.suppressed);
}

export function formatDerivedHint(customized: boolean, hasOverride: boolean): "Auto" | "Override" {
  return customized || hasOverride ? "Override" : "Auto";
}

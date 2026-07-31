/** Parse DB CR strings ("1/3", "10", "—") to numeric CR for XP lookup. */
export function parseCr(cr: string | null | undefined): number | null {
  if (!cr) return null;
  const trimmed = cr.trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") return null;

  const fraction = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fraction) {
    const num = Number(fraction[1]);
    const den = Number(fraction[2]);
    if (den === 0) return null;
    return num / den;
  }

  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/** Display numeric CR back as a readable string when possible. */
export function formatCrDisplay(cr: string | null | undefined): string {
  if (!cr?.trim() || cr.trim() === "—") return "—";
  return cr.trim();
}

/** Compare two CR strings numerically for sort/filter ordering. */
export function compareCrValues(a: string, b: string): number {
  const aNum = parseCr(a);
  const bNum = parseCr(b);
  if (aNum == null && bNum == null) return a.localeCompare(b);
  if (aNum == null) return 1;
  if (bNum == null) return -1;
  return aNum - bNum || a.localeCompare(b);
}

export type CrFilterOption = { value: string; label: string };

/** Sort CR filter dropdown options in ascending numeric order. */
export function sortCrFilterOptions<T extends CrFilterOption>(options: T[]): T[] {
  return [...options].sort((a, b) => compareCrValues(a.value, b.value));
}

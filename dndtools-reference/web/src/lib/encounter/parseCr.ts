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

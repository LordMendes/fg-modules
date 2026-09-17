/** Parse "Fort +5, Ref +2, Will +1" or separate fields. */
export function parseFortRefWill(
  combined: string | null | undefined,
  fort?: string | null,
  ref?: string | null,
  will?: string | null,
): { fort: number; ref: number; will: number } {
  const pick = (label: string, raw?: string | null): number | null => {
    if (raw?.trim()) {
      const m = raw.match(/([+-]?\d+)/);
      if (m) return Number.parseInt(m[1], 10);
    }
    if (!combined) return null;
    const re = new RegExp(`${label}\\s*([+-]?\\d+)`, "i");
    const m = combined.match(re);
    return m ? Number.parseInt(m[1], 10) : null;
  };

  return {
    fort: pick("fort", fort) ?? 0,
    ref: pick("ref", ref) ?? 0,
    will: pick("will", will) ?? 0,
  };
}

export function parseAbilityMod(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;
  const m = raw.match(/([+-]?\d+)/);
  return m ? Number.parseInt(m[1], 10) : null;
}

export function parseInitiative(raw: string | null | undefined): number {
  if (!raw?.trim()) return 0;
  const m = raw.match(/([+-]?\d+)/);
  return m ? Number.parseInt(m[1], 10) : 0;
}

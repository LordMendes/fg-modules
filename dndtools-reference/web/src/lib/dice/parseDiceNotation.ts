import type { DicePoolItem } from "@/lib/dice/types";

/**
 * Parse simple damage notation like `8d6`, `1d8+5`, `3d6+1d8+2 fire`.
 * Returns null when the string is not a dice formula.
 */
export function parseDiceNotation(raw: string): {
  dice: DicePoolItem[];
  modifier: number;
} | null {
  const cleaned = raw
    .replace(/\s+(fire|cold|acid|electricity|sonic|force|negative|positive|slashing|piercing|bludgeoning).*$/i, "")
    .trim();
  if (!cleaned) return null;

  const dice: DicePoolItem[] = [];
  let modifier = 0;
  const tokenRe = /([+-]?)(\d*)d(4|6|8|10|12|20|100)|([+-]\d+)/gi;
  let matched = false;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(cleaned)) !== null) {
    matched = true;
    if (m[4]) {
      modifier += Number(m[4]);
      continue;
    }
    const sign = m[1] === "-" ? -1 : 1;
    const qty = Number(m[2] || "1") * sign;
    const sides = Number(m[3]) as DicePoolItem["sides"];
    if (qty === 0) continue;
    if (qty < 0) {
      // Negative dice pools are rare; treat as absolute qty with negative mod fallback
      return null;
    }
    dice.push({ qty, sides });
  }

  if (!matched || dice.length === 0) return null;
  // Ensure the whole string was only dice/mod tokens (+ spaces)
  const stripped = cleaned.replace(tokenRe, "").replace(/\s+/g, "");
  if (stripped.length > 0 && !/^[\s+]*$/.test(stripped)) {
    // Allow leftover empty; if weird leftover text, still accept if we got dice
  }
  return { dice, modifier };
}

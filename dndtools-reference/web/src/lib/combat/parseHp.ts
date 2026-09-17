/** Parse HP from hit_points or hit dice strings like "3d8+3 (16 hp)". */
export function parseHpFromText(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;
  const text = raw.trim();

  const paren = text.match(/\((\d+)\s*hp\)/i);
  if (paren) return Number.parseInt(paren[1], 10);

  const leading = text.match(/^(\d+)\s*hp\b/i);
  if (leading) return Number.parseInt(leading[1], 10);

  const onlyNum = text.match(/^(\d+)$/);
  if (onlyNum) return Number.parseInt(onlyNum[1], 10);

  return null;
}

export function currentHp(hpMax: number, wounds: number, hpTemp: number): number {
  return Math.max(0, hpMax - wounds) + Math.max(0, hpTemp);
}

/** Apply damage: temp HP first, then wounds. Returns new temp and wounds. */
export function applyDamageToHp(
  hpMax: number,
  wounds: number,
  hpTemp: number,
  damage: number,
): { wounds: number; hpTemp: number } {
  let remaining = Math.max(0, Math.trunc(damage));
  let nextTemp = Math.max(0, hpTemp);
  let nextWounds = Math.max(0, wounds);

  if (nextTemp > 0 && remaining > 0) {
    const absorbed = Math.min(nextTemp, remaining);
    nextTemp -= absorbed;
    remaining -= absorbed;
  }

  if (remaining > 0) {
    const maxWounds = hpMax + nextTemp;
    nextWounds = Math.min(maxWounds, nextWounds + remaining);
  }

  return { wounds: nextWounds, hpTemp: nextTemp };
}

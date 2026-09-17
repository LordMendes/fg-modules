export type ParsedAc = {
  ac: number;
  touch: number | null;
  flat: number | null;
};

/** Extract primary AC from strings like "18 (+1 size, +3 Dex, +5 natural)". */
export function parseAcString(raw: string | null | undefined): ParsedAc {
  const fallback = { ac: 10, touch: null, flat: null };
  if (!raw?.trim()) return fallback;

  const text = raw.trim();
  const main = text.match(/^(\d+)/);
  const ac = main ? Number.parseInt(main[1], 10) : 10;

  const touchMatch = text.match(/touch\s*(\d+)/i);
  const flatMatch = text.match(/flat[- ]?footed\s*(\d+)/i);

  return {
    ac: Number.isFinite(ac) ? ac : 10,
    touch: touchMatch ? Number.parseInt(touchMatch[1], 10) : null,
    flat: flatMatch ? Number.parseInt(flatMatch[1], 10) : null,
  };
}

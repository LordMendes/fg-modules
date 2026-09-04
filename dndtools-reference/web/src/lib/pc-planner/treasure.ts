import type { TreasureBuiltin, TreasureRow } from "./types";

const DEFAULT_COINS: { builtin: TreasureBuiltin; name: string }[] = [
  { builtin: "pp", name: "PP" },
  { builtin: "gp", name: "GP" },
  { builtin: "sp", name: "SP" },
  { builtin: "cp", name: "CP" },
];

export function createDefaultTreasure(): TreasureRow[] {
  return DEFAULT_COINS.map((coin) => ({
    id: `treasure-${coin.builtin}`,
    name: coin.name,
    amount: 0,
    builtin: coin.builtin,
  }));
}

export function createCustomTreasureRow(name = ""): TreasureRow {
  return {
    id: crypto.randomUUID(),
    name,
    amount: 0,
  };
}

export function ensureTreasure(rows: TreasureRow[] | null | undefined): TreasureRow[] {
  const existing = Array.isArray(rows) ? rows : [];
  const byBuiltin = new Map<TreasureBuiltin, TreasureRow>();
  const extras: TreasureRow[] = [];

  for (const row of existing) {
    if (row.builtin) {
      byBuiltin.set(row.builtin, {
        ...row,
        id: row.id || `treasure-${row.builtin}`,
        name:
          row.name?.trim() ||
          DEFAULT_COINS.find((coin) => coin.builtin === row.builtin)?.name ||
          row.builtin.toUpperCase(),
        amount: Number.isFinite(row.amount) ? row.amount : 0,
      });
    } else {
      extras.push({
        ...row,
        id: row.id || crypto.randomUUID(),
        name: row.name ?? "",
        amount: Number.isFinite(row.amount) ? row.amount : 0,
      });
    }
  }

  const defaults = DEFAULT_COINS.map((coin) => byBuiltin.get(coin.builtin) ?? {
    id: `treasure-${coin.builtin}`,
    name: coin.name,
    amount: 0,
    builtin: coin.builtin,
  });

  return [...defaults, ...extras];
}

export function formatTreasureSummary(rows: TreasureRow[] | null | undefined): string {
  return ensureTreasure(rows)
    .filter((row) => Number.isFinite(row.amount) && row.amount !== 0 && row.name.trim())
    .map((row) => `${row.amount} ${row.name.trim()}`)
    .join(", ");
}

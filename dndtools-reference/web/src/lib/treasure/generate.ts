import {
  coinUnitToCp,
  cpToCoinPile,
  cpToGp,
  formatCoinPile,
  mergeCoinPiles,
  rollExpression,
  scaleCoinPileGp,
  type CoinUnit,
} from "@/lib/dice/roll-expression";
import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import { treasureData } from "./data";
import { rollMagicCategory } from "./magic-items";
import {
  buildSalvageCandidates,
  rollMundaneItem,
} from "./mundane";
import {
  isBlankTreasureCell,
  parseQuantityRoll,
  pickExampleName,
  pickRowByRange,
  rollValueExpression,
} from "./parse";
import type {
  CoinMode,
  GoodsMode,
  HoardRow,
  MagicTier,
  TreasureCoinPile,
  TreasureGoodEntry,
  TreasureHoard,
  TreasureInput,
  TreasureItemEntry,
  TreasureResult,
} from "./types";

function coinAttempts(mode: CoinMode): number {
  if (mode === "none" || mode === "tenth" || mode === "half") return mode === "none" ? 0 : 1;
  if (mode === "double") return 2;
  if (mode === "triple") return 3;
  return 1;
}

function goodsAttempts(mode: GoodsMode, rng: SeededRng): number {
  if (mode === "none") return 0;
  if (mode === "half-chance") {
    const roll = rng.pickInt(1, 100);
    return roll >= 51 ? 1 : 0;
  }
  if (mode === "double") return 2;
  if (mode === "triple") return 3;
  return 1;
}

function rollCoinsForLevel(
  level: number,
  mode: CoinMode,
  input: TreasureInput,
  rng: SeededRng,
): TreasureCoinPile {
  if (mode === "none") {
    const pile = { cp: 0, sp: 0, gp: 0, pp: 0 };
    return { ...pile, display: "No coins", gpTotal: 0 };
  }

  const entries = treasureData.treasureLevels[String(level)] ?? [];
  const attempts = coinAttempts(mode);
  let totalCp = 0;

  for (let i = 0; i < attempts; i++) {
    const roll = rng.pickInt(1, 100);
    const entry = entries.find(
      (row) =>
        row.coin_range &&
        roll >= row.coin_range[0] &&
        roll <= row.coin_range[1],
    );
    if (!entry || isBlankTreasureCell(entry.coins)) continue;
    try {
      const rolled = rollExpression(entry.coins, rng);
      let count = rolled.count;
      if (input.moreRandomCoins) {
        count = Math.round(count * (0.5 + rng.next()));
      }
      totalCp += coinUnitToCp(Math.round(count), rolled.unit as CoinUnit);
    } catch {
      continue;
    }
  }

  let pile = cpToCoinPile(totalCp);
  if (mode === "tenth") pile = scaleCoinPileGp(pile, 0.1);
  if (mode === "half") pile = scaleCoinPileGp(pile, 0.5);

  const gpTotal = cpToGp(
    coinUnitToCp(pile.cp, "cp") +
      coinUnitToCp(pile.sp, "sp") +
      coinUnitToCp(pile.gp, "gp") +
      coinUnitToCp(pile.pp, "pp"),
  );

  return {
    ...pile,
    display: gpTotal > 0 ? formatCoinPile(pile) : "No coins",
    gpTotal,
  };
}

function resolveGoodsCell(
  goodsText: string,
  input: TreasureInput,
): "gem" | "art" | "skip" {
  const lower = goodsText.toLowerCase();
  const wantsGems = lower.includes("gem");
  const wantsArt = lower.includes("art");
  if (wantsGems && input.gems) return "gem";
  if (wantsArt && input.art) return "art";
  if (wantsGems && !input.gems && input.art) return "art";
  if (wantsArt && !input.art && input.gems) return "gem";
  return "skip";
}

function rollGemOrArt(
  kind: "gem" | "art",
  rng: SeededRng,
): TreasureGoodEntry {
  const table = kind === "gem" ? treasureData.gems : treasureData.artObjects;
  const roll = rng.pickInt(1, 100);
  const row = pickRowByRange(table, roll);
  if (!row) {
    return {
      kind,
      name: kind === "gem" ? "Gem" : "Art object",
      valueDisplay: "",
      valueGp: 0,
      averageDisplay: "",
    };
  }
  const value = rollValueExpression(row.value, rng);
  return {
    kind,
    name: pickExampleName(row.examples, rng),
    valueDisplay: value.display,
    valueGp: value.gp,
    averageDisplay: row.average,
  };
}

function rollGoodsForLevel(
  level: number,
  mode: GoodsMode,
  input: TreasureInput,
  rng: SeededRng,
): { gems: TreasureGoodEntry[]; art: TreasureGoodEntry[] } {
  const gems: TreasureGoodEntry[] = [];
  const art: TreasureGoodEntry[] = [];
  const attempts = goodsAttempts(mode, rng);
  const entries = treasureData.treasureLevels[String(level)] ?? [];

  for (let i = 0; i < attempts; i++) {
    const roll = rng.pickInt(1, 100);
    const entry = entries.find(
      (row) =>
        row.goods_range &&
        roll >= row.goods_range[0] &&
        roll <= row.goods_range[1],
    );
    if (!entry || isBlankTreasureCell(entry.goods)) continue;

    const { count, remainder } = parseQuantityRoll(entry.goods, rng);
    const kind = resolveGoodsCell(remainder, input);
    if (kind === "skip") continue;

    for (let n = 0; n < count; n++) {
      const good = rollGemOrArt(kind, rng);
      if (kind === "gem") gems.push(good);
      else art.push(good);
    }
  }

  return { gems, art };
}

function rollItemsFromCell(
  cell: string,
  rng: SeededRng,
  input: TreasureInput,
): TreasureItemEntry[] {
  const { count, remainder } = parseQuantityRoll(cell, rng);
  const lower = remainder.toLowerCase();
  let tier: MagicTier | null = null;
  if (lower.includes("minor")) tier = "minor";
  if (lower.includes("medium")) tier = "medium";
  if (lower.includes("major")) tier = "major";

  const results: TreasureItemEntry[] = [];

  if (lower.includes("mundane")) {
    for (let n = 0; n < count; n++) {
      results.push(rollMundaneItem(rng, input));
    }
    return results;
  }

  if (tier) {
    for (let n = 0; n < count; n++) {
      results.push(...rollMagicCategory(tier, rng, input));
    }
  }

  return results;
}

function rollItemsForLevel(
  level: number,
  mode: GoodsMode,
  input: TreasureInput,
  rng: SeededRng,
): TreasureItemEntry[] {
  const items: TreasureItemEntry[] = [];
  const attempts = goodsAttempts(mode, rng);
  const entries = treasureData.treasureLevels[String(level)] ?? [];

  for (let i = 0; i < attempts; i++) {
    const roll = rng.pickInt(1, 100);
    const entry = entries.find(
      (row) =>
        row.items_range &&
        roll >= row.items_range[0] &&
        roll <= row.items_range[1],
    );
    if (!entry || isBlankTreasureCell(entry.items)) continue;

    items.push(...rollItemsFromCell(entry.items, rng, input));
  }

  return items;
}

function applySalvage(
  hoard: TreasureHoard,
  input: TreasureInput,
  rng: SeededRng,
): void {
  if (input.salvagePercent <= 0) return;
  const budget = (hoard.coins.gpTotal * input.salvagePercent) / 100;
  if (budget <= 0) return;

  const candidates = buildSalvageCandidates();
  if (candidates.length === 0) return;
  const cheapest = candidates[candidates.length - 1]!.priceGp;
  let remaining = budget;
  const salvage: TreasureItemEntry[] = [];
  let spent = 0;

  while (remaining >= cheapest && remaining > 0) {
    const affordable = candidates.find((row) => row.priceGp <= remaining);
    if (!affordable) break;
    salvage.push({
      label: affordable.label,
      priceDisplay: affordable.priceDisplay,
      priceGp: affordable.priceGp,
    });
    remaining -= affordable.priceGp;
    spent += affordable.priceGp;
  }

  if (salvage.length === 0) return;

  hoard.salvage = salvage;
  const newCoinGp = Math.max(0, hoard.coins.gpTotal - spent);
  const scaled = scaleCoinPileGp(
    {
      cp: hoard.coins.cp,
      sp: hoard.coins.sp,
      gp: hoard.coins.gp,
      pp: hoard.coins.pp,
    },
    newCoinGp / (hoard.coins.gpTotal || 1),
  );
  hoard.coins = {
    ...scaled,
    display: newCoinGp > 0 ? formatCoinPile(scaled) : "No coins",
    gpTotal: newCoinGp,
  };
}

function totalHoardGp(hoard: TreasureHoard): number {
  const goods =
    [...hoard.gems, ...hoard.art].reduce((sum, row) => sum + row.valueGp, 0) +
    hoard.items.reduce((sum, row) => sum + (row.priceGp ?? 0), 0) +
    hoard.salvage.reduce((sum, row) => sum + (row.priceGp ?? 0), 0);
  return hoard.coins.gpTotal + goods;
}

function rollSingleHoard(
  row: HoardRow,
  title: string,
  input: TreasureInput,
  rng: SeededRng,
): TreasureHoard {
  const hoard: TreasureHoard = {
    title,
    level: row.level,
    coins: rollCoinsForLevel(row.level, row.coins, input, rng),
    gems: [],
    art: [],
    salvage: [],
    items: [],
    totalGp: 0,
  };

  const goods = rollGoodsForLevel(row.level, row.valuables, input, rng);
  hoard.gems = goods.gems;
  hoard.art = goods.art;
  hoard.items = rollItemsForLevel(row.level, row.items, input, rng);
  applySalvage(hoard, input, rng);
  hoard.totalGp = totalHoardGp(hoard);
  return hoard;
}

function combineHoards(hoards: TreasureHoard[]): TreasureHoard {
  const level = hoards[0]?.level ?? 1;
  let coins = { cp: 0, sp: 0, gp: 0, pp: 0 };
  for (const hoard of hoards) {
    coins = mergeCoinPiles(coins, hoard.coins);
  }
  const gpTotal = cpToGp(
    coinUnitToCp(coins.cp, "cp") +
      coinUnitToCp(coins.sp, "sp") +
      coinUnitToCp(coins.gp, "gp") +
      coinUnitToCp(coins.pp, "pp"),
  );
  const combined: TreasureHoard = {
    title: "Combined hoard",
    level,
    coins: {
      ...coins,
      display: gpTotal > 0 ? formatCoinPile(coins) : "No coins",
      gpTotal,
    },
    gems: hoards.flatMap((h) => h.gems),
    art: hoards.flatMap((h) => h.art),
    salvage: hoards.flatMap((h) => h.salvage),
    items: hoards.flatMap((h) => h.items),
    totalGp: 0,
  };
  combined.totalGp = totalHoardGp(combined);
  return combined;
}

export function generateTreasure(
  input: TreasureInput,
  rng: SeededRng,
): TreasureResult {
  const hoards: TreasureHoard[] = [];
  let hoardIndex = 1;

  for (const row of input.rows) {
    const count = Math.min(20, Math.max(1, row.count));
    const level = Math.min(20, Math.max(1, row.level));
    const normalizedRow = { ...row, count, level };

    for (let i = 0; i < count; i++) {
      if (input.combine) {
        hoards.push(
          rollSingleHoard(
            normalizedRow,
            "Combined hoard",
            input,
            rng,
          ),
        );
      } else {
        hoards.push(
          rollSingleHoard(
            normalizedRow,
            `Hoard ${hoardIndex}`,
            input,
            rng,
          ),
        );
        hoardIndex += 1;
      }
    }
  }

  if (input.combine && hoards.length > 1) {
    return { hoards: [combineHoards(hoards)] };
  }

  return { hoards };
}

import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import {
  DEFAULT_TREASURE_INPUT,
  generateTreasure,
} from "@/lib/treasure";
import type { PickpocketResult } from "./types";

export type PickpocketFallbackResult = {
  sp: number;
  gp: number;
  totalGp: number;
};

/** Fallback when treasure tables are unavailable (also used in tests). */
export function rollPickpocketFallback(rng: SeededRng): PickpocketFallbackResult {
  let sp = 0;
  for (let i = 0; i < 2; i++) {
    sp += rng.pickInt(1, 6);
  }
  let gp = 0;
  if (rng.next() < 0.25) {
    gp = rng.pickInt(1, 4);
  }
  const totalGp = sp / 10 + gp;
  return { sp, gp, totalGp };
}

function summarizePickpocketFromTreasure(
  rng: SeededRng,
  linkContext?: {
    itemSlugByLowerName?: Record<string, string>;
    spellSlugByLowerName?: Record<string, string>;
  },
): string {
  const level = rng.pickInt(1, 3);
  const result = generateTreasure(
    {
      ...DEFAULT_TREASURE_INPUT,
      linkContext,
      rows: [
        {
          count: 1,
          level,
          coins: "standard",
          valuables: "half-chance",
          items: "none",
        },
      ],
    },
    rng,
  );
  const hoard = result.hoards[0];
  if (!hoard) {
    return formatFallbackSummary(rollPickpocketFallback(rng));
  }
  const parts: string[] = [];
  if (hoard.coins.display) {
    parts.push(hoard.coins.display);
  }
  const gem = hoard.gems[0];
  if (gem) {
    parts.push(`${gem.name} (${gem.valueDisplay})`);
  }
  if (parts.length === 0) {
    return "A few bent coppers and lint";
  }
  return parts.join("; ");
}

function formatFallbackSummary(fallback: PickpocketFallbackResult): string {
  const bits: string[] = [];
  if (fallback.sp > 0) bits.push(`${fallback.sp} sp`);
  if (fallback.gp > 0) bits.push(`${fallback.gp} gp`);
  return bits.join(" and ") || "A few bent coppers";
}

export function rollPickpocket(
  rng: SeededRng,
  options?: {
    useTreasure?: boolean;
    linkContext?: {
      itemSlugByLowerName?: Record<string, string>;
      spellSlugByLowerName?: Record<string, string>;
    };
  },
): PickpocketResult {
  const useTreasure = options?.useTreasure !== false;
  let summary: string;
  if (useTreasure) {
    try {
      summary = summarizePickpocketFromTreasure(rng, options?.linkContext);
    } catch {
      summary = formatFallbackSummary(rollPickpocketFallback(rng));
    }
  } else {
    summary = formatFallbackSummary(rollPickpocketFallback(rng));
  }
  return { kind: "pickpocket", summary };
}

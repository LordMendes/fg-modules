import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import { rollTableMagicItem } from "./magic-items";
import { rollNpc } from "./npcs";
import { rollPickpocket } from "./pickpocket";
import { rollSpellbook } from "./spellbooks";
import { rollTrap } from "./traps";
import type {
  RandomTablesContext,
  RandomTablesInput,
  RandomTablesResult,
  SpellRef,
} from "./types";

function clampCount(count: number): number {
  if (!Number.isFinite(count)) return 5;
  return Math.min(20, Math.max(1, Math.round(count)));
}

function pickSpellForTrap(
  cr: number,
  rng: ReturnType<typeof createSeededRng>,
  spellsByLevel?: Record<number, SpellRef[]>,
): SpellRef | undefined {
  const level = Math.min(9, Math.ceil(cr / 2));
  const pool = spellsByLevel?.[level] ?? [];
  if (pool.length === 0) return undefined;
  return rng.pick(pool);
}

export function generateRandomTables(
  input: RandomTablesInput,
  context: RandomTablesContext = {},
): RandomTablesResult {
  const count = clampCount(input.count);
  const rng = createSeededRng(input.seed);
  const entries: RandomTablesResult["entries"] = [];
  let magicItemsUnavailable = false;

  const linkContext = {
    itemSlugByLowerName: context.itemSlugByLowerName,
    spellSlugByLowerName: context.spellSlugByLowerName,
  };

  for (let i = 0; i < count; i += 1) {
    switch (input.kind) {
      case "traps": {
        const cr = Math.min(20, Math.max(1, input.trapCr ?? rng.pickInt(1, 20)));
        const spell = pickSpellForTrap(cr, rng, context.spellsByLevel);
        entries.push(rollTrap(cr, rng, { spell }));
        break;
      }
      case "npcs":
        entries.push(
          rollNpc(rng, {
            gender: input.npcGender ?? "any",
            race: input.npcRace ?? "any",
            classOrder: input.npcClassOrder ?? "any",
            classSlugByLowerName: context.classSlugByLowerName,
          }),
        );
        break;
      case "pickpocket":
        entries.push(
          rollPickpocket(rng, {
            useTreasure: true,
            linkContext,
          }),
        );
        break;
      case "magic-items": {
        const row = rollTableMagicItem(
          input.magicRank ?? "minor",
          input.magicType ?? "any",
          rng,
          linkContext,
        );
        if (row.error === "Magic item rolls need the treasure tables.") {
          magicItemsUnavailable = true;
        }
        entries.push(row);
        break;
      }
      case "spellbooks":
        entries.push(
          rollSpellbook(
            input.spellbookRank ?? "mundane",
            rng,
            context.wizardSpellsByLevel ?? {},
          ),
        );
        break;
      default:
        break;
    }
  }

  return {
    entries,
    magicItemsUnavailable: magicItemsUnavailable || undefined,
  };
}

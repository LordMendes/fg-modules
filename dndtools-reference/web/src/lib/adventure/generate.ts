import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import { ADVENTURE_SECTION_DEFS } from "./tables";
import type {
  AdventureInput,
  AdventureResult,
  AdventureSectionResult,
} from "./types";

export function adventureSectionSeed(
  seed: number,
  sectionIndex: number,
  bump = 0,
): number {
  return (seed + sectionIndex + 1 + bump * 1_000_003) >>> 0;
}

export function sectionRng(
  seed: number,
  sectionIndex: number,
  bump = 0,
): SeededRng {
  return createSeededRng(adventureSectionSeed(seed, sectionIndex, bump));
}

function rollSectionText(
  sectionIndex: number,
  seed: number,
  bump: number,
): string {
  const def = ADVENTURE_SECTION_DEFS[sectionIndex];
  if (!def) return "";
  const rng = sectionRng(seed, sectionIndex, bump);
  const entries = [...def.entries];
  return rng.pick(entries) ?? entries[0] ?? "";
}

function buildSections(seed: number, bumps: readonly number[]): AdventureSectionResult[] {
  return ADVENTURE_SECTION_DEFS.map((def, index) => ({
    id: def.id,
    title: def.title,
    text: rollSectionText(index, seed, bumps[index] ?? 0),
  }));
}

export function generateAdventure(
  input: AdventureInput,
  _rng: SeededRng,
): AdventureResult {
  const bumps = ADVENTURE_SECTION_DEFS.map(() => 0);
  return {
    seed: input.seed,
    sections: buildSections(input.seed, bumps),
  };
}

export function rerollAdventureSection(
  input: AdventureInput,
  current: AdventureResult,
  sectionIndex: number,
  sectionBumps: readonly number[],
): { result: AdventureResult; bumps: number[] } {
  const bumps = [...sectionBumps];
  while (bumps.length < ADVENTURE_SECTION_DEFS.length) {
    bumps.push(0);
  }
  bumps[sectionIndex] = (bumps[sectionIndex] ?? 0) + 1;
  const sections = current.sections.map((section, index) =>
    index === sectionIndex
      ? {
          ...section,
          text: rollSectionText(index, input.seed, bumps[index] ?? 0),
        }
      : section,
  );
  return {
    result: { seed: input.seed, sections },
    bumps,
  };
}

export function formatAdventurePlainText(result: AdventureResult): string {
  return result.sections
    .map((section) => `${section.title}\n${section.text}`)
    .join("\n\n");
}

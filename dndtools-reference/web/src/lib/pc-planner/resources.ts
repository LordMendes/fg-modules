import type { ClassAbilityEntry } from "./parseClassFeatures";
import type { PcResourceEntry } from "./types";

function resourceId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

const RESOURCE_SEEDS: { match: RegExp; name: string; maxFromLevel?: (level: number) => number }[] = [
  { match: /turn undead/i, name: "Turn undead", maxFromLevel: () => 1 },
  { match: /smite evil/i, name: "Smite evil", maxFromLevel: (l) => Math.max(1, Math.floor((l + 4) / 5)) },
  { match: /rage/i, name: "Rage / day", maxFromLevel: (l) => Math.max(1, Math.floor((l + 3) / 4)) },
  { match: /lay on hands/i, name: "Lay on hands", maxFromLevel: (l) => l * 2 },
  { match: /bardic music/i, name: "Bardic music", maxFromLevel: (l) => Math.max(1, l) },
];

export function seedResourcesFromAbilities(
  abilities: ClassAbilityEntry[],
  existing: PcResourceEntry[] = [],
): PcResourceEntry[] {
  const kept = existing.filter((r) => !r.auto);
  const autoById = new Map(existing.filter((r) => r.auto).map((r) => [r.id, r]));

  for (const ability of abilities) {
    for (const seed of RESOURCE_SEEDS) {
      if (!seed.match.test(ability.name)) continue;
      const id = resourceId(seed.name);
      const prior = autoById.get(id);
      const max = seed.maxFromLevel?.(ability.level) ?? 1;
      kept.push({
        id,
        name: seed.name,
        current: prior?.current ?? max,
        max: prior?.max ?? max,
        auto: true,
      });
      autoById.delete(id);
    }
  }

  return kept;
}

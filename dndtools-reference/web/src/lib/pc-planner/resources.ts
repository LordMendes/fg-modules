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

/** One pool per seed; when multiple classes match, keep the higher max. */
export function seedResourcesFromAbilities(
  abilities: ClassAbilityEntry[],
  existing: PcResourceEntry[] = [],
): PcResourceEntry[] {
  const kept = existing.filter((r) => !r.auto);
  const priorAuto = new Map(existing.filter((r) => r.auto).map((r) => [r.id, r]));
  const nextAuto = new Map<string, PcResourceEntry>();

  for (const ability of abilities) {
    for (const seed of RESOURCE_SEEDS) {
      if (!seed.match.test(ability.name)) continue;
      const id = resourceId(seed.name);
      const max = seed.maxFromLevel?.(ability.level) ?? 1;
      const existingAuto = nextAuto.get(id) ?? priorAuto.get(id);
      const nextMax = Math.max(existingAuto?.max ?? 0, max);
      const priorCurrent = existingAuto?.current;
      nextAuto.set(id, {
        id,
        name: seed.name,
        current:
          priorCurrent != null && Number.isFinite(priorCurrent)
            ? Math.min(Math.max(0, Math.trunc(priorCurrent)), nextMax)
            : nextMax,
        max: nextMax,
        auto: true,
      });
    }
  }

  return [...kept, ...nextAuto.values()];
}

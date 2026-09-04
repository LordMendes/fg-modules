import { abilityModifier } from "./combatStats";
import { effectiveFirstClassSlug, totalCharacterLevel } from "./skillPoints";
import type { ClassLevelEntry, HitDieRoll, HitPointsState, PcPlanState } from "./types";

/** Parse "d10", "10", or "d8" into die sides. */
export function parseHitDieSides(raw: string | null | undefined): number {
  if (raw == null) return 0;
  const match = String(raw)
    .trim()
    .toLowerCase()
    .replace(/[−–—]/g, "-")
    .match(/d?\s*(\d+)/);
  if (!match) return 0;
  const sides = Number.parseInt(match[1], 10);
  return Number.isFinite(sides) && sides > 0 ? sides : 0;
}

/** PHB average for a hit die: floor(sides/2) + 1. */
export function averageHitDieRoll(sides: number): number {
  if (sides <= 0) return 0;
  return Math.floor(sides / 2) + 1;
}

const FALLBACK_HIT_DIE: Record<string, string> = {
  barbarian: "d12",
  fighter: "d10",
  paladin: "d10",
  ranger: "d8",
  bard: "d6",
  cleric: "d8",
  druid: "d8",
  monk: "d8",
  rogue: "d6",
  sorcerer: "d4",
  wizard: "d4",
};

/** Resolve hit die string for a class slug from the bundle or PHB fallback. */
export function resolveHitDie(
  classSlug: string,
  classHitDice: Record<string, string> | null | undefined,
): string {
  const fromBundle = classHitDice?.[classSlug];
  if (fromBundle && parseHitDieSides(fromBundle) > 0) return fromBundle;

  const slugLower = classSlug.toLowerCase();
  for (const [key, die] of Object.entries(FALLBACK_HIT_DIE)) {
    if (slugLower === key || slugLower.startsWith(`${key}-`)) return die;
  }
  return "d8";
}

function rollKey(classSlug: string, classLevel: number): string {
  return `${classSlug}::${classLevel}`;
}

function desiredHitDice(classLevels: ClassLevelEntry[]): { classSlug: string; classLevel: number }[] {
  const desired: { classSlug: string; classLevel: number }[] = [];
  for (const cl of classLevels) {
    const level = Math.max(0, Math.trunc(cl.level));
    for (let i = 1; i <= level; i++) {
      desired.push({ classSlug: cl.classSlug, classLevel: i });
    }
  }
  return desired;
}

export function normalizeHitPointsState(raw: unknown): HitPointsState {
  if (!raw || typeof raw !== "object") {
    return { rolls: [] };
  }
  const hp = raw as Record<string, unknown>;
  const rollsRaw = Array.isArray(hp.rolls) ? hp.rolls : [];
  const rolls: HitDieRoll[] = [];
  for (const entry of rollsRaw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const classSlug = typeof row.classSlug === "string" ? row.classSlug : "";
    const classLevel =
      typeof row.classLevel === "number" && Number.isFinite(row.classLevel)
        ? Math.trunc(row.classLevel)
        : 0;
    const rolled =
      typeof row.rolled === "number" && Number.isFinite(row.rolled) ? Math.trunc(row.rolled) : 0;
    if (!classSlug || classLevel < 1) continue;
    rolls.push({ classSlug, classLevel, rolled });
  }
  const current =
    typeof hp.current === "number" && Number.isFinite(hp.current)
      ? Math.trunc(hp.current)
      : undefined;
  return current === undefined ? { rolls } : { rolls, current };
}

/**
 * Append/truncate hit-die rolls to match class levels.
 * Never rewrites an existing roll value.
 */
export function syncHitDice(
  state: PcPlanState,
  classHitDice: Record<string, string> | null = null,
): void {
  const existing = normalizeHitPointsState(state.hitPoints);
  const byKey = new Map(existing.rolls.map((r) => [rollKey(r.classSlug, r.classLevel), r]));
  const firstSlug = effectiveFirstClassSlug(
    state.identity.classLevels,
    state.identity.firstClassSlug,
  );

  const nextRolls: HitDieRoll[] = [];
  for (const slot of desiredHitDice(state.identity.classLevels)) {
    const key = rollKey(slot.classSlug, slot.classLevel);
    const prior = byKey.get(key);
    if (prior) {
      nextRolls.push(prior);
      continue;
    }
    const sides = parseHitDieSides(resolveHitDie(slot.classSlug, classHitDice));
    const isFirstHd = firstSlug === slot.classSlug && slot.classLevel === 1;
    const rolled = isFirstHd ? sides : averageHitDieRoll(sides);
    nextRolls.push({ classSlug: slot.classSlug, classLevel: slot.classLevel, rolled });
  }

  state.hitPoints = {
    rolls: nextRolls,
    ...(existing.current !== undefined ? { current: existing.current } : {}),
  };
}

export function computeMaxHitPoints(
  state: PcPlanState,
  classHitDice: Record<string, string> | null = null,
): number {
  const rolls = normalizeHitPointsState(state.hitPoints).rolls;
  if (rolls.length === 0) return 0;

  const conMod = abilityModifier(state.abilities.con);
  let total = 0;
  for (const roll of rolls) {
    const sides = parseHitDieSides(resolveHitDie(roll.classSlug, classHitDice));
    const capped = sides > 0 ? Math.min(Math.max(1, roll.rolled), sides) : Math.max(0, roll.rolled);
    // Minimum 1 HP per HD after Con.
    total += Math.max(1, capped + conMod);
  }
  return total;
}

/** Group rolls into a dice string like "3d10+2d4". */
export function formatHitDiceString(
  rolls: HitDieRoll[],
  classHitDice: Record<string, string> | null = null,
): string {
  if (rolls.length === 0) return "—";
  const counts = new Map<number, number>();
  for (const roll of rolls) {
    const sides = parseHitDieSides(resolveHitDie(roll.classSlug, classHitDice));
    if (sides <= 0) continue;
    counts.set(sides, (counts.get(sides) ?? 0) + 1);
  }
  const parts = [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([sides, count]) => `${count}d${sides}`);
  return parts.length > 0 ? parts.join("+") : "—";
}

export function hitDieCount(classLevels: ClassLevelEntry[]): number {
  return totalCharacterLevel(classLevels);
}

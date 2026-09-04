import type { DicePoolItem, DieSides, RollRequest, RollResult } from "./types";

/** Collapse pool items with the same sides into qty groups. */
export function consolidatePool(dice: DicePoolItem[]): DicePoolItem[] {
  const bySides = new Map<DieSides, number>();
  for (const item of dice) {
    if (item.qty <= 0) continue;
    bySides.set(item.sides, (bySides.get(item.sides) ?? 0) + item.qty);
  }
  return [...bySides.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([sides, qty]) => ({ sides, qty }));
}

/** Display notation, e.g. `2d6+1d20+3`. */
export function buildNotation(dice: DicePoolItem[], modifier = 0): string {
  const parts = consolidatePool(dice).map((d) => `${d.qty}d${d.sides}`);
  if (parts.length === 0) {
    if (modifier === 0) return "";
    return modifier > 0 ? `+${modifier}` : `${modifier}`;
  }
  let notation = parts.join("+");
  if (modifier > 0) notation += `+${modifier}`;
  else if (modifier < 0) notation += `${modifier}`;
  return notation;
}

/**
 * Notation dice-box actually understands.
 * A joined string like `1d8+1d20` is parsed as `1d8` with modifier +1, so mixed
 * pools must be an array of `{qty, sides}` groups. Modifier stays on RollRequest.
 */
export function toEngineNotation(
  dice: DicePoolItem[],
): { qty: number; sides: DieSides }[] {
  return consolidatePool(dice);
}

export function formatRollSummary(result: RollResult): string {
  const facePart =
    result.faces.length === 1
      ? String(result.faces[0])
      : `${result.faces.join("+")} (${result.faceSum})`;
  const modPart =
    result.modifier === 0
      ? ""
      : result.modifier > 0
        ? ` + ${result.modifier}`
        : ` - ${Math.abs(result.modifier)}`;
  let line = `${result.label}: ${facePart}${modPart} = ${result.total}`;
  if (result.natural20) line += " (nat 20)";
  else if (result.natural1) line += " (nat 1)";
  return line;
}

type EngineDie = { value?: number; sides?: number };
type EngineGroup = {
  value?: number;
  modifier?: number;
  sides?: number;
  rolls?: EngineDie[];
};

/**
 * Parse dice-box onRollComplete groups into a RollResult.
 * Prefer individual face values; fall back to group.value − modifier.
 */
export function resultFromEngineGroups(
  request: RollRequest,
  groups: EngineGroup[],
): RollResult {
  const faces: number[] = [];
  for (const group of groups) {
    if (Array.isArray(group.rolls) && group.rolls.length > 0) {
      for (const die of group.rolls) {
        if (typeof die.value === "number") faces.push(die.value);
      }
    } else if (typeof group.value === "number") {
      const mod = typeof group.modifier === "number" ? group.modifier : 0;
      faces.push(group.value - mod);
    }
  }

  const faceSum = faces.reduce((sum, n) => sum + n, 0);
  const total = faceSum + request.modifier;
  const isSingleD20 =
    request.dice.length === 1 &&
    request.dice[0].sides === 20 &&
    request.dice[0].qty === 1 &&
    faces.length === 1;

  return {
    id: request.id,
    label: request.label,
    faces,
    faceSum,
    modifier: request.modifier,
    total,
    natural20: isSingleD20 && faces[0] === 20,
    natural1: isSingleD20 && faces[0] === 1,
    at: Date.now(),
  };
}

export function createRollId(): string {
  return `roll-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function d20Check(label: string, modifier: number): RollRequest {
  return {
    id: createRollId(),
    label,
    dice: [{ qty: 1, sides: 20 }],
    modifier,
  };
}

export function addDieToPool(pool: DicePoolItem[], sides: DieSides): DicePoolItem[] {
  return consolidatePool([...pool, { qty: 1, sides }]);
}

export function removeOneDieFromPool(
  pool: DicePoolItem[],
  sides: DieSides,
): DicePoolItem[] {
  const next = consolidatePool(pool).map((item) =>
    item.sides === sides ? { ...item, qty: item.qty - 1 } : item,
  );
  return next.filter((item) => item.qty > 0);
}

export function poolDieCount(pool: DicePoolItem[]): number {
  return pool.reduce((sum, d) => sum + d.qty, 0);
}

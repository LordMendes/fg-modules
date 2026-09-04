import type { DicePoolItem, DieSides, RollRequest, RollResult } from "./types";

/** Collapse pool items with the same sides and tint into qty groups. */
export function consolidatePool(dice: DicePoolItem[]): DicePoolItem[] {
  const byKey = new Map<string, DicePoolItem>();
  for (const item of dice) {
    if (item.qty <= 0) continue;
    const colorKey = item.themeColor?.toLowerCase() ?? "";
    const key = `${item.sides}:${colorKey}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.qty += item.qty;
    } else {
      byKey.set(key, {
        sides: item.sides,
        qty: item.qty,
        ...(item.themeColor ? { themeColor: item.themeColor } : {}),
      });
    }
  }
  return [...byKey.values()].sort((a, b) => {
    if (a.sides !== b.sides) return a.sides - b.sides;
    return (a.themeColor ?? "").localeCompare(b.themeColor ?? "");
  });
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
 * themeColor is passed through so energy damage can tint separately.
 */
export function toEngineNotation(
  dice: DicePoolItem[],
): { qty: number; sides: DieSides; themeColor?: string }[] {
  return consolidatePool(dice).map((item) =>
    item.themeColor
      ? { qty: item.qty, sides: item.sides, themeColor: item.themeColor }
      : { qty: item.qty, sides: item.sides },
  );
}

function formatFaceWithMod(face: number, modifier: number, total: number): string {
  const modPart =
    modifier === 0
      ? ""
      : modifier > 0
        ? `+${modifier}`
        : `${modifier}`;
  return `${face}${modPart}=${total}`;
}

export function formatRollSummary(result: RollResult): string {
  if (result.attackTotals && result.attackTotals.length > 1 && result.faces.length > 1) {
    const bits = result.faces.map((face, i) => {
      const total = result.attackTotals![i] ?? face;
      const mod = total - face;
      let bit = formatFaceWithMod(face, mod, total);
      if (face === 20) bit += "!";
      else if (face === 1) bit += "…";
      return bit;
    });
    return `${result.label}: ${bits.join(", ")}`;
  }

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
  const iterative = request.iterativeModifiers;
  if (iterative && iterative.length > 0 && faces.length > 0) {
    const attackTotals = faces.map(
      (face, i) => face + (iterative[i] ?? iterative[iterative.length - 1] ?? 0),
    );
    return {
      id: request.id,
      label: request.label,
      faces,
      faceSum,
      modifier: iterative[0] ?? 0,
      total: attackTotals[0] ?? faceSum,
      natural20: faces.includes(20),
      natural1: faces.includes(1),
      at: Date.now(),
      attackTotals,
    };
  }

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

/** One d20 per iterative BAB attack, each with its own bonus. */
export function iterativeD20Checks(
  label: string,
  bonuses: number[],
): RollRequest {
  const mods = bonuses.length > 0 ? bonuses : [0];
  return {
    id: createRollId(),
    label,
    dice: [{ qty: mods.length, sides: 20 }],
    modifier: mods[0] ?? 0,
    iterativeModifiers: mods,
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

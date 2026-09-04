import type {
  DicePoolItem,
  DieSides,
  RollKind,
  RollRequest,
  RollResult,
} from "./types";
import { ROLL_KIND_LABELS } from "./types";

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

export function actorDisplayName(
  actor: RollResult["actor"] | undefined,
): string | null {
  if (!actor) return null;
  const char = actor.characterName?.trim();
  if (char) return char;
  return actor.username || null;
}

/** Numeric / label portion of a roll line (no actor/kind prefix). */
export function formatRollFormula(result: RollResult): string {
  if (result.silhouetteOnly || (result.hidden && result.faces.length === 0)) {
    return `${result.label}: (hidden)`;
  }

  if (result.attackTotals && result.attackTotals.length > 1 && result.faces.length > 1) {
    const bits = result.faces.map((face, i) => {
      const total = result.attackTotals![i] ?? face;
      const mod = total - face;
      let bit = formatFaceWithMod(face, mod, total);
      if (face === 20) bit += "!";
      else if (face === 1) bit += "…";
      return bit;
    });
    let line = `${result.label}: ${bits.join(", ")}`;
    if (result.hidden) line += " [hidden]";
    return line;
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
  if (result.hidden) line += " [hidden]";
  return line;
}

export function formatRollSummary(result: RollResult): string {
  const who = actorDisplayName(result.actor);
  const kind = result.kind ? ROLL_KIND_LABELS[result.kind] : null;
  const prefixParts = [who, kind].filter(Boolean);
  const prefix = prefixParts.length > 0 ? `${prefixParts.join(" · ")} · ` : "";
  return `${prefix}${formatRollFormula(result)}`;
}

type EngineDie = { value?: number; sides?: number };
type EngineGroup = {
  value?: number;
  modifier?: number;
  sides?: number;
  rolls?: EngineDie[];
};

function withRequestMeta(
  request: RollRequest,
  base: Omit<RollResult, "kind" | "hidden" | "actor" | "silhouetteOnly">,
): RollResult {
  return {
    ...base,
    ...(request.kind ? { kind: request.kind } : {}),
    ...(request.hidden != null ? { hidden: request.hidden } : {}),
    ...(request.actor ? { actor: request.actor } : {}),
    ...(request.silhouetteOnly ? { silhouetteOnly: true } : {}),
  };
}

/**
 * Parse dice-box onRollComplete groups into a RollResult.
 * Always uses the faces the 3D engine actually produced so the log matches
 * what landed on screen.
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
    return withRequestMeta(request, {
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
    });
  }

  const total = faceSum + request.modifier;
  const isSingleD20 =
    request.dice.length === 1 &&
    request.dice[0].sides === 20 &&
    request.dice[0].qty === 1 &&
    faces.length === 1;

  return withRequestMeta(request, {
    id: request.id,
    label: request.label,
    faces,
    faceSum,
    modifier: request.modifier,
    total,
    natural20: isSingleD20 && faces[0] === 20,
    natural1: isSingleD20 && faces[0] === 1,
    at: Date.now(),
  });
}

export function createRollId(): string {
  return `roll-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function d20Check(
  label: string,
  modifier: number,
  kind: RollKind = "other",
): RollRequest {
  return {
    id: createRollId(),
    label,
    dice: [{ qty: 1, sides: 20 }],
    modifier,
    kind,
  };
}

/** One d20 per iterative BAB attack, each with its own bonus. */
export function iterativeD20Checks(
  label: string,
  bonuses: number[],
  kind: RollKind = "attack",
): RollRequest {
  const mods = bonuses.length > 0 ? bonuses : [0];
  return {
    id: createRollId(),
    label,
    dice: [{ qty: mods.length, sides: 20 }],
    modifier: mods[0] ?? 0,
    iterativeModifiers: mods,
    kind,
  };
}

/**
 * One engine group per die (legacy Babylon shape). Prefer
 * {@link toThreejsNotation} for the active Three.js engine.
 */
export function toEngineDieList(
  dice: DicePoolItem[],
  faces?: number[],
): { qty: number; sides: DieSides; themeColor?: string; value?: number }[] {
  const groups = toEngineNotation(dice);
  const out: { qty: number; sides: DieSides; themeColor?: string; value?: number }[] = [];
  let offset = 0;
  for (const group of groups) {
    for (let i = 0; i < group.qty; i++) {
      const face = faces?.[offset];
      offset += 1;
      out.push({
        qty: 1,
        sides: group.sides,
        ...(group.themeColor ? { themeColor: group.themeColor } : {}),
        ...(typeof face === "number" ? { value: face } : {}),
      });
    }
  }
  return out;
}

/**
 * Notation for @3d-dice/dice-box-threejs, including optional forced faces.
 * Preserves dice-array order (no side sorting) so faces align with server RNG.
 * Modifier is omitted: the engine shows faces only; the log applies modifiers.
 * Example: `1d20+2d6@14,3,5`
 */
export function toThreejsNotation(
  dice: DicePoolItem[],
  _modifier = 0,
  faces?: number[],
): string {
  const parts: string[] = [];
  for (const item of dice) {
    if (item.qty <= 0) continue;
    parts.push(`${item.qty}d${item.sides}`);
  }
  if (parts.length === 0) return "";
  const base = parts.join("+");
  if (!faces || faces.length === 0) return base;
  const qty = dice.reduce((sum, d) => sum + Math.max(0, d.qty), 0);
  if (faces.length !== qty) return base;
  if (!faces.every((n) => Number.isInteger(n) && n >= 1)) return base;
  return `${base}@${faces.join(",")}`;
}

export type DiceColorSegment = {
  dice: DicePoolItem[];
  faces?: number[];
  /** Per-die tint; undefined means use the tray/skin color. */
  themeColor?: string;
};

/**
 * Split a pool into consecutive same-color segments so each can be thrown
 * with its own threejs colorset (engine is global-color only).
 */
export function splitDiceColorSegments(
  dice: DicePoolItem[],
  faces?: number[],
): DiceColorSegment[] {
  type Expanded = { sides: DieSides; themeColor?: string; face?: number };
  const expanded: Expanded[] = [];
  let faceOffset = 0;
  for (const item of dice) {
    for (let i = 0; i < item.qty; i++) {
      const face = faces?.[faceOffset];
      faceOffset += 1;
      expanded.push({
        sides: item.sides,
        ...(item.themeColor ? { themeColor: item.themeColor } : {}),
        ...(typeof face === "number" ? { face } : {}),
      });
    }
  }
  if (expanded.length === 0) return [];

  const segments: DiceColorSegment[] = [];
  let bucket: Expanded[] = [];
  let bucketKey: string | null = null;

  const flush = () => {
    if (bucket.length === 0) return;
    const themeColor = bucket[0]?.themeColor;
    const segDice: DicePoolItem[] = [];
    const segFaces: number[] = [];
    let last: DicePoolItem | null = null;
    for (const die of bucket) {
      if (last && last.sides === die.sides) {
        last.qty += 1;
      } else {
        last = {
          qty: 1,
          sides: die.sides,
          ...(themeColor ? { themeColor } : {}),
        };
        segDice.push(last);
      }
      if (typeof die.face === "number") segFaces.push(die.face);
    }
    segments.push({
      dice: segDice,
      ...(segFaces.length > 0 ? { faces: segFaces } : {}),
      ...(themeColor ? { themeColor } : {}),
    });
    bucket = [];
  };

  for (const die of expanded) {
    const key = (die.themeColor ?? "").toLowerCase();
    if (bucketKey !== null && key !== bucketKey) flush();
    bucketKey = key;
    bucket.push(die);
  }
  flush();
  return segments;
}

/**
 * One color per physical die, in dice-array order (matches threejs spawn order).
 */
export function expandDieColors(
  dice: DicePoolItem[],
  fallbackColor: string,
): string[] {
  const out: string[] = [];
  for (const item of dice) {
    for (let i = 0; i < item.qty; i++) {
      out.push(item.themeColor ?? fallbackColor);
    }
  }
  return out;
}

type ThreejsDieRoll = { value?: number; sides?: number };
type ThreejsSet = { rolls?: ThreejsDieRoll[] };
type ThreejsResult = {
  sets?: ThreejsSet[];
};

/**
 * Parse dice-box-threejs roll results into our RollResult shape.
 * Forced `@` outcomes are reported as the engine faces.
 */
export function resultFromThreejsRoll(
  request: RollRequest,
  payload: ThreejsResult | null | undefined,
): RollResult {
  const faces: number[] = [];
  for (const set of payload?.sets ?? []) {
    for (const die of set.rolls ?? []) {
      if (typeof die.value === "number") faces.push(die.value);
    }
  }
  if (faces.length === 0 && request.faces?.length) {
    return resultFromEngineGroups(request, [
      { rolls: request.faces.map((value) => ({ value })) },
    ]);
  }
  return resultFromEngineGroups(request, [
    { rolls: faces.map((value) => ({ value })) },
  ]);
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

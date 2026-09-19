import type { ActiveEffect } from "../effects/applyEffects";
import { parseEffect } from "../effects/parseEffect";
import type {
  Ability,
  CombatantKind,
  ConditionKey,
  Defenses,
  EffectComponent,
} from "../types";

export type SizeKey =
  | "fine"
  | "diminutive"
  | "tiny"
  | "small"
  | "medium"
  | "large"
  | "huge"
  | "gargantuan"
  | "colossal";

export type ParsedEffect = ActiveEffect;

export type EngineContext = {
  id: string;
  name: string;
  kind: CombatantKind;
  ac: { normal: number; touch: number; flat: number };
  saves: { fort: number; ref: number; will: number };
  attackMods: { melee: number; ranged: number; grapple: number };
  hp: { max: number; wounds: number; temp: number; nonlethal: number };
  defenses: Defenses;
  conditions: Set<ConditionKey>;
  effects: ParsedEffect[];
  size: SizeKey;
  reachFeet: number;
  casterLevel?: number;
  abilityMods?: Partial<Record<Ability, number>>;
};

/** Plain combatant fields used to build an EngineContext (no Prisma). */
export type CombatantFields = {
  id: string;
  name: string;
  kind: CombatantKind;
  ac: number;
  acTouch: number | null;
  acFlat: number | null;
  fort?: number;
  ref?: number;
  will?: number;
  initMod: number;
  hpMax: number;
  hpTemp: number;
  wounds: number;
  nonlethal: number;
  defenses: Defenses;
  reachFeet?: number;
  size?: SizeKey;
  stats?: Partial<Record<Ability | "cl", number>>;
  effects: ActiveEffect[];
};

const LOSE_DEX_CONDITIONS = new Set<ConditionKey>([
  "blinded",
  "cowering",
  "flatFooted",
  "grappled",
  "helpless",
  "paralyzed",
  "petrified",
  "pinned",
  "stunned",
  "unconscious",
]);

const HELPLESS_LIKE = new Set<ConditionKey>([
  "helpless",
  "paralyzed",
  "petrified",
  "pinned",
  "unconscious",
]);

function finiteOr(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function collectConditionKeys(effects: ActiveEffect[]): Set<ConditionKey> {
  const conditions = new Set<ConditionKey>();

  for (const effect of effects) {
    if (effect.active === false) continue;
    for (const component of effect.components) {
      if (component.tag === "COND") {
        conditions.add(component.condition);
        expandLinkedConditions(component.condition, conditions);
      }
    }
  }

  return conditions;
}

/** Paralyzed and pinned expand to helpless for engine purposes. */
function expandLinkedConditions(condition: ConditionKey, out: Set<ConditionKey>): void {
  if (condition === "paralyzed" || condition === "pinned" || condition === "petrified") {
    out.add("helpless");
  }
}

function resolveAcValues(fields: CombatantFields, conditions: Set<ConditionKey>): EngineContext["ac"] {
  const normal = finiteOr(fields.ac, 10);
  const touch = finiteOr(fields.acTouch ?? normal, normal);
  const flatFromRow = fields.acFlat;

  const dexMod = finiteOr(fields.stats?.dex, 0);
  const losesDex = [...conditions].some((c) => LOSE_DEX_CONDITIONS.has(c));

  let flat = flatFromRow ?? normal;
  if (losesDex && flatFromRow == null && dexMod > 0) {
    flat = normal - dexMod;
  }
  if (flatFromRow != null) {
    flat = finiteOr(flatFromRow, flat);
  }

  return {
    normal,
    touch,
    flat,
  };
}

function buildEffects(fields: CombatantFields): ParsedEffect[] {
  return fields.effects.filter((e) => e.active !== false);
}

/**
 * Build a flat EngineContext from combatant row fields and active effects.
 * Expands COND components from presets into the conditions set.
 */
export function buildEngineContext(fields: CombatantFields): EngineContext {
  const effects = buildEffects(fields);
  const conditions = collectConditionKeys(fields.effects);

  const fort = finiteOr(fields.fort ?? fields.stats?.con, 0);
  const ref = finiteOr(fields.ref ?? fields.stats?.dex, 0);
  const will = finiteOr(fields.will ?? fields.stats?.wis, 0);

  const strMod = finiteOr(fields.stats?.str, 0);
  const dexMod = finiteOr(fields.stats?.dex, 0);

  return {
    id: fields.id,
    name: fields.name,
    kind: fields.kind,
    ac: resolveAcValues(fields, conditions),
    saves: { fort, ref, will },
    attackMods: {
      melee: strMod,
      ranged: dexMod,
      grapple: strMod,
    },
    hp: {
      max: finiteOr(fields.hpMax, 1),
      wounds: finiteOr(fields.wounds, 0),
      temp: finiteOr(fields.hpTemp, 0),
      nonlethal: finiteOr(fields.nonlethal, 0),
    },
    defenses: fields.defenses ?? {},
    conditions,
    effects,
    size: fields.size ?? "medium",
    reachFeet: finiteOr(fields.reachFeet, 5),
    casterLevel: fields.stats?.cl,
    abilityMods: {
      str: strMod,
      dex: dexMod,
      con: finiteOr(fields.stats?.con, 0),
      int: finiteOr(fields.stats?.int, 0),
      wis: finiteOr(fields.stats?.wis, 0),
      cha: finiteOr(fields.stats?.cha, 0),
    },
  };
}

/** Whether the target loses Dex bonus to AC (uses flat AC). */
export function targetLosesDex(ctx: EngineContext): boolean {
  return [...ctx.conditions].some((c) => LOSE_DEX_CONDITIONS.has(c));
}

/** Whether the target is helpless (melee attackers get +4). */
export function targetIsHelpless(ctx: EngineContext): boolean {
  return [...ctx.conditions].some((c) => HELPLESS_LIKE.has(c));
}

/** Whether the attacker is blinded (50% miss on attacks). */
export function attackerIsBlinded(ctx: EngineContext): boolean {
  return ctx.conditions.has("blinded");
}

/** Whether the attacker has see invisibility (by effect label). */
export function attackerHasSeeInvisibility(ctx: EngineContext): boolean {
  for (const effect of ctx.effects) {
    if (effect.active === false) continue;
    if (/see invisibility/i.test(effect.label)) {
      return true;
    }
  }
  return false;
}

/** Build EngineContext from an effect string (for tests). */
export function contextFromEffectString(
  fields: Omit<CombatantFields, "effects">,
  ...effectStrings: string[]
): EngineContext {
  const effects: ActiveEffect[] = effectStrings.map((input, i) => {
    const { components } = parseEffect(input);
    return { id: `fx-${i}`, label: input.split(";")[0]?.trim() ?? input, components, active: true };
  });
  return buildEngineContext({ ...fields, effects });
}

/** Collect raw effect components (including inactive) for immunity checks. */
export function allEffectComponents(effects: ActiveEffect[]): EffectComponent[] {
  const out: EffectComponent[] = [];
  for (const effect of effects) {
    if (effect.active === false) continue;
    out.push(...effect.components);
  }
  return out;
}

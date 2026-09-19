import { parseDiceNotation } from "@/lib/dice/parseDiceNotation";
import type { ActiveEffect } from "../effects/applyEffects";
import {
  shouldTick,
  tick,
  type DurationBoundary,
  type TimedEffect,
} from "../effects/duration";
import type {
  CombatEventKind,
  DamageEventPayload,
  StatePatch,
} from "../events/types";
import { deriveHealthStatus } from "../healthStatus";
import { currentHp } from "../parseHp";
import type { ConditionKey, DamagePacket, Defenses } from "../types";
import { applyDefenses } from "./damage";
import { resolveDeathState } from "./death";
import { heal } from "./healing";
import { nextActorId, type InitiativeCombatant } from "./initiative";

export type TurnEffect = ActiveEffect &
  TimedEffect & {
    id: string;
  };

export type TurnActor = {
  id: string;
  name?: string;
  init: number;
  hpMax: number;
  wounds: number;
  hpTemp: number;
  nonlethal: number;
  deathState?: "dying" | "stable" | "disabled" | "dead" | null;
  defenses: Defenses;
  effects: TurnEffect[];
  pendingTargetIds?: string[];
  pendingCrit?: StatePatch["pendingCrit"];
  stats?: { lethalWounds?: number };
  conditions?: ConditionKey[];
};

export type EffectPatch = {
  effectId: string;
  duration?: number | null;
  remove?: boolean;
};

export type TurnEvent = {
  kind: CombatEventKind;
  payload: unknown;
};

export type TurnBoundaryOutcome = {
  payload: Record<string, never>;
  events: TurnEvent[];
  patches: StatePatch[];
  effectPatches: EffectPatch[];
};

export type RegenEventPayload = {
  source: string;
  amount: number;
  kind: "regen" | "fastHeal";
  woundsBefore: number;
  woundsAfter: number;
};

export type DyingLossPayload = {
  text: string;
  woundsBefore: number;
  woundsAfter: number;
};

export type EffectExpirePayload = {
  effectId: string;
  label: string;
};

function finite(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function mergePatch(
  map: Map<string, StatePatch>,
  patch: StatePatch,
): void {
  const existing = map.get(patch.combatantId);
  map.set(patch.combatantId, { ...existing, ...patch, combatantId: patch.combatantId });
}

function resolveDiceAmount(
  dice: string,
  faces: number[],
  faceCursor: { index: number },
): number {
  const parsed = parseDiceNotation(dice);
  if (!parsed) return 0;

  let sum = parsed.modifier;
  for (const item of parsed.dice) {
    for (let i = 0; i < item.qty; i += 1) {
      sum += faces[faceCursor.index] ?? 1;
      faceCursor.index += 1;
    }
  }
  return sum;
}

function collectRegenBypass(effects: TurnEffect[]): DamagePacket["types"] {
  const bypass = new Set<DamagePacket["types"][number]>();
  for (const effect of effects) {
    if (effect.active === false) continue;
    for (const component of effect.components) {
      if (component.tag === "REGEN") {
        for (const type of component.bypass ?? []) {
          bypass.add(type);
        }
      }
    }
  }
  return [...bypass];
}

function damageMatchesBypass(
  types: DamagePacket["types"],
  bypass: DamagePacket["types"],
): boolean {
  if (bypass.length === 0) return false;
  const bypassSet = new Set(bypass);
  return types.some((type) => bypassSet.has(type));
}

function tickEffects(
  actor: TurnActor,
  boundary: DurationBoundary,
): {
  effectPatches: EffectPatch[];
  events: TurnEvent[];
} {
  const effectPatches: EffectPatch[] = [];
  const events: TurnEvent[] = [];

  for (const effect of actor.effects) {
    if (effect.active === false) continue;
    if (!shouldTick(effect, actor.init, boundary)) continue;

    const result = tick(effect);
    if (result.expired) {
      effectPatches.push({ effectId: effect.id, remove: true });
      events.push({
        kind: "effectExpire",
        payload: {
          effectId: effect.id,
          label: effect.label,
        } satisfies EffectExpirePayload,
      });
    } else {
      effectPatches.push({
        effectId: effect.id,
        duration: result.effect.duration,
      });
    }
  }

  return { effectPatches, events };
}

function applyDmgo(
  actor: TurnActor,
  faces: number[],
  faceCursor: { index: number },
): {
  events: TurnEvent[];
  wounds: number;
  hpTemp: number;
  nonlethal: number;
  lethalWounds: number;
} {
  const events: TurnEvent[] = [];
  let wounds = finite(actor.wounds);
  let hpTemp = finite(actor.hpTemp);
  let nonlethal = finite(actor.nonlethal);
  let lethalWounds = finite(actor.stats?.lethalWounds ?? 0);
  const regenBypass = collectRegenBypass(actor.effects);

  for (const effect of actor.effects) {
    if (effect.active === false) continue;

    for (const component of effect.components) {
      if (component.tag !== "DMGO") continue;

      const amount = resolveDiceAmount(component.dice, faces, faceCursor);
      if (amount <= 0) continue;

      const hpBefore = currentHp(actor.hpMax, wounds, hpTemp);
      const result = applyDefenses(
        [
          {
            amount,
            types: component.types,
            source: effect.label,
          },
        ],
        {
          hpMax: actor.hpMax,
          wounds,
          hpTemp,
          nonlethal,
          defenses: actor.defenses,
          conditions: actor.conditions ?? [],
        },
      );

      wounds = result.wounds;
      hpTemp = result.hpTemp;
      nonlethal = result.nonlethal;

      if (result.applied > 0 && damageMatchesBypass(component.types, regenBypass)) {
        lethalWounds += result.applied;
      }

      const hpAfter = currentHp(actor.hpMax, wounds, hpTemp);
      events.push({
        kind: "damage",
        payload: {
          source: effect.label,
          packets: [{ amount, types: component.types, source: effect.label }],
          crit: false,
          multiplier: 1,
          adjustments: result.adjustments,
          applied: result.applied,
          toTemp: result.toTemp,
          toNonlethal: result.toNonlethal,
          hpBefore,
          hpAfter,
          statusAfter: deriveHealthStatus(
            actor.hpMax,
            wounds,
            hpTemp,
            nonlethal,
            actor.deathState ?? null,
          ),
        } satisfies DamageEventPayload,
      });
    }
  }

  return { events, wounds, hpTemp, nonlethal, lethalWounds };
}

function applyRegenAndFastHeal(actor: TurnActor, wounds: number): {
  events: TurnEvent[];
  wounds: number;
  nonlethal: number;
} {
  const events: TurnEvent[] = [];
  let nextWounds = wounds;
  let nextNonlethal = finite(actor.nonlethal);
  const lethalWounds = finite(actor.stats?.lethalWounds ?? 0);
  const regeneratable = Math.max(0, nextWounds - lethalWounds);

  for (const effect of actor.effects) {
    if (effect.active === false) continue;

    for (const component of effect.components) {
      if (component.tag !== "REGEN" && component.tag !== "FHEAL") continue;

      const requested = finite(component.amount);
      if (requested <= 0) continue;

      const woundsBefore = nextWounds;
      let healAmount = requested;

      if (component.tag === "REGEN") {
        healAmount = Math.min(requested, regeneratable);
      }

      const result = heal(healAmount, {
        hpMax: actor.hpMax,
        wounds: nextWounds,
        hpTemp: actor.hpTemp,
        nonlethal: nextNonlethal,
        deathState: actor.deathState,
      });

      if (result.healed <= 0) continue;

      nextWounds = result.wounds;
      nextNonlethal = result.nonlethal;

      events.push({
        kind: "regen",
        payload: {
          source: effect.label,
          amount: result.healed,
          kind: component.tag === "REGEN" ? "regen" : "fastHeal",
          woundsBefore,
          woundsAfter: nextWounds,
        } satisfies RegenEventPayload,
      });
    }
  }

  return { events, wounds: nextWounds, nonlethal: nextNonlethal };
}

function applyDyingLoss(actor: TurnActor, wounds: number): {
  events: TurnEvent[];
  wounds: number;
  deathState?: TurnActor["deathState"];
  turnState?: StatePatch["turnState"];
} {
  if (actor.deathState !== "dying") {
    return { events: [], wounds };
  }

  const woundsBefore = wounds;
  const nextWounds = wounds + 1;
  const death = resolveDeathState({
    hpMax: actor.hpMax,
    wounds: nextWounds,
    nonlethal: actor.nonlethal,
    deathState: actor.deathState,
  });

  return {
    events: [
      {
        kind: "note",
        payload: {
          text: "[DYING] -1",
          woundsBefore,
          woundsAfter: nextWounds,
        } satisfies DyingLossPayload,
      },
    ],
    wounds: nextWounds,
    deathState: death.deathState,
    turnState: death.turnState,
  };
}

/** Run start-of-turn automation for one actor. */
export function turnStart(
  actor: TurnActor,
  options: { dmgoFaces?: number[] } = {},
): TurnBoundaryOutcome {
  const events: TurnEvent[] = [{ kind: "turnStart", payload: {} }];
  const patchMap = new Map<string, StatePatch>();
  const faces = options.dmgoFaces ?? [];
  const faceCursor = { index: 0 };

  const startTicks = tickEffects(actor, "startOfTurn");
  events.push(...startTicks.events);

  const dmgo = applyDmgo(actor, faces, faceCursor);
  events.push(...dmgo.events);

  const regen = applyRegenAndFastHeal(
    { ...actor, wounds: dmgo.wounds, nonlethal: dmgo.nonlethal },
    dmgo.wounds,
  );
  events.push(...regen.events);

  const dying = applyDyingLoss(
    { ...actor, wounds: regen.wounds },
    regen.wounds,
  );
  events.push(...dying.events);

  const finalWounds = dying.wounds;
  const death = resolveDeathState({
    hpMax: actor.hpMax,
    wounds: finalWounds,
    nonlethal: regen.nonlethal,
    deathState: dying.deathState ?? actor.deathState,
  });

  mergePatch(patchMap, {
    combatantId: actor.id,
    wounds: finalWounds,
    hpTemp: dmgo.hpTemp,
    nonlethal: regen.nonlethal,
    deathState: death.deathState,
    turnState: death.turnState,
  });

  return {
    payload: {},
    events,
    patches: [...patchMap.values()],
    effectPatches: startTicks.effectPatches,
  };
}

/** Run end-of-turn automation for one actor. */
export function turnEnd(actor: TurnActor): TurnBoundaryOutcome {
  const endTicks = tickEffects(actor, "endOfTurn");

  const patches: StatePatch[] = [
    {
      combatantId: actor.id,
      pendingTargetIds: [],
      pendingCrit: null,
    },
  ];

  return {
    payload: {},
    events: [{ kind: "turnEnd", payload: {} }, ...endTicks.events],
    patches,
    effectPatches: endTicks.effectPatches,
  };
}

/** Advance to the next actor, skipping dead and removed combatants. */
export function nextActor(
  combatants: InitiativeCombatant[],
  currentId: string | null,
): { nextId: string | null; roundIncrement: boolean } {
  return nextActorId(combatants, currentId);
}

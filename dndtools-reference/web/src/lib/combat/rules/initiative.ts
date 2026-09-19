import type { InitEventPayload, RuleOutcome, StatePatch } from "../events/types";
import { sumTag } from "../effects/applyEffects";
import type { EngineContext } from "./engineContext";

export type InitiativeCombatant = {
  id: string;
  init: number;
  initMod: number;
  turnState: "normal" | "delayed" | "readied" | "dead" | "removed";
};

/** Stored init with FG tiebreak: init + initMod / 100. */
export function computeStoredInit(
  face: number,
  initMod: number,
  effectBonus: number,
): number {
  const mod = Number.isFinite(initMod) ? initMod : 0;
  const bonus = Number.isFinite(effectBonus) ? effectBonus : 0;
  const roll = Number.isFinite(face) ? face : 0;
  return roll + mod + bonus + mod / 100;
}

/** Roll initiative for one combatant. */
export function rollInitiative(
  ctx: EngineContext,
  face: number,
  initMod: number,
): RuleOutcome<InitEventPayload> {
  const effectBonus = sumTag({ effects: ctx.effects }, "INIT");
  const storedInit = computeStoredInit(face, initMod, effectBonus);

  const payload: InitEventPayload = {
    face: Math.trunc(face),
    initMod,
    effectBonus,
    storedInit,
  };

  const patches: StatePatch[] = [
    { combatantId: ctx.id, init: storedInit, turnState: "normal" },
  ];

  return { payload, patches };
}

/** Sort combatants by init descending. Skips dead/removed when skipInactive is set. */
export function sortByInitiative(
  combatants: InitiativeCombatant[],
  options: { skipInactive?: boolean } = {},
): InitiativeCombatant[] {
  const list = options.skipInactive
    ? combatants.filter((c) => c.turnState !== "dead" && c.turnState !== "removed")
    : [...combatants];

  return list.sort((a, b) => {
    if (b.init !== a.init) return b.init - a.init;
    return b.initMod - a.initMod;
  });
}

/** Mark a combatant as delayed (moves out of order). */
export function delayCombatant(combatantId: string): StatePatch[] {
  return [{ combatantId, turnState: "delayed" }];
}

/** Mark a combatant as readied (acts on a trigger). */
export function readyCombatant(combatantId: string): StatePatch[] {
  return [{ combatantId, turnState: "readied" }];
}

/** Act now: insert just before the current actor's init. */
export function actNow(
  combatantId: string,
  currentActorInit: number,
): RuleOutcome<{ init: number; turnState: "normal" }> {
  const init = currentActorInit - 0.01;
  return {
    payload: { init, turnState: "normal" },
    patches: [{ combatantId, init, turnState: "normal" }],
  };
}

/** Find the next actor id after current, skipping dead and removed. */
export function nextActorId(
  combatants: InitiativeCombatant[],
  currentId: string | null,
): { nextId: string | null; roundIncrement: boolean } {
  const active = sortByInitiative(combatants, { skipInactive: true });
  if (active.length === 0) return { nextId: null, roundIncrement: false };

  if (!currentId) {
    return { nextId: active[0]!.id, roundIncrement: false };
  }

  const idx = active.findIndex((c) => c.id === currentId);
  if (idx === -1) {
    return { nextId: active[0]!.id, roundIncrement: false };
  }

  const nextIdx = idx + 1;
  if (nextIdx >= active.length) {
    return { nextId: active[0]!.id, roundIncrement: true };
  }

  return { nextId: active[nextIdx]!.id, roundIncrement: false };
}

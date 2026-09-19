"use client";

import type { useCombatContext } from "@/components/combat/combat-context";
import type { CombatEffectInput } from "@/components/combat/combat-context";
import { parseDiceNotation } from "@/lib/dice/parseDiceNotation";
import type { DicePoolItem } from "@/lib/dice/types";
import type { CombatAttackType } from "@/lib/combat/types";

export const COMBAT_DRAG_MIME = "application/x-combat-roll";

export type CombatDragPayload =
  | {
      kind: "attack";
      attackerId: string;
      attackIndex: number;
      label: string;
      bonuses: number[];
      attackType?: CombatAttackType;
    }
  | {
      kind: "damage";
      attackerId: string;
      attackIndex: number;
      label: string;
      dice: DicePoolItem[];
      modifier: number;
      attackType?: CombatAttackType;
      crit?: boolean;
      multiplier?: number;
    }
  | {
      kind: "heal";
      label: string;
      dice?: DicePoolItem[];
      modifier?: number;
      amount?: number;
      source?: string;
    }
  | {
      kind: "effect";
      effectText: string;
      input: CombatEffectInput;
    };

export function setCombatDragData(
  e: React.DragEvent,
  payload: CombatDragPayload,
): void {
  const json = JSON.stringify(payload);
  e.dataTransfer.setData(COMBAT_DRAG_MIME, json);
  e.dataTransfer.setData("text/plain", `combat-roll:${payload.kind}`);
  e.dataTransfer.effectAllowed = "copy";
}

export function readCombatDragPayload(
  e: React.DragEvent,
): CombatDragPayload | null {
  const raw =
    e.dataTransfer.getData(COMBAT_DRAG_MIME) ||
    (() => {
      const plain = e.dataTransfer.getData("text/plain").trim();
      if (!plain.startsWith("combat-roll:")) return "";
      return e.dataTransfer.getData(COMBAT_DRAG_MIME);
    })();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CombatDragPayload;
  } catch {
    return null;
  }
}

export function isCombatDragEvent(e: React.DragEvent): boolean {
  const types = Array.from(e.dataTransfer.types);
  return (
    types.includes(COMBAT_DRAG_MIME) ||
    types.some((t) => t === "text/plain")
  );
}

type CombatCtx = NonNullable<ReturnType<typeof useCombatContext>>;

export function resolveCombatDrop(
  ctx: CombatCtx,
  payload: CombatDragPayload,
  targetCombatantId: string,
): void {
  switch (payload.kind) {
    case "attack":
      ctx.rollAttack({
        attackerId: payload.attackerId,
        attackIndex: payload.attackIndex,
        targetIds: [targetCombatantId],
        attackType: payload.attackType,
        label: payload.label,
        bonuses: payload.bonuses,
      });
      break;
    case "damage":
      ctx.rollDamage({
        attackerId: payload.attackerId,
        attackIndex: payload.attackIndex,
        targetIds: [targetCombatantId],
        attackType: payload.attackType,
        label: payload.label,
        dice: payload.dice,
        modifier: payload.modifier,
        ...(payload.crit ? { crit: payload.crit } : {}),
        ...(payload.multiplier ? { multiplier: payload.multiplier } : {}),
      });
      break;
    case "heal":
      ctx.rollHeal({
        targetIds: [targetCombatantId],
        label: payload.label,
        ...(payload.dice ? { dice: payload.dice } : {}),
        ...(payload.modifier != null ? { modifier: payload.modifier } : {}),
        ...(payload.amount != null ? { amount: payload.amount } : {}),
        ...(payload.source ? { source: payload.source } : {}),
      });
      break;
    case "effect":
      void ctx.applyEffect([targetCombatantId], payload.input);
      break;
  }
}

export function makeDamageDragPayload(
  attackerId: string,
  attackIndex: number,
  label: string,
  damage: string,
  attackType?: CombatAttackType,
  crit?: { multiplier: number },
): CombatDragPayload | null {
  const parsed = parseDiceNotation(damage);
  if (!parsed) return null;
  return {
    kind: "damage",
    attackerId,
    attackIndex,
    label,
    dice: parsed.dice,
    modifier: parsed.modifier,
    ...(attackType ? { attackType } : {}),
    ...(crit ? { crit: true, multiplier: crit.multiplier } : {}),
  };
}

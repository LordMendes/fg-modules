"use client";

import {
  combatAddEffect,
  combatNextTurn,
  combatRemoveEffect,
  combatToggleTarget,
} from "@/actions/combat";
import { useDice } from "@/components/dice/dice-provider";
import type { CombatRollIntent } from "@/lib/combat/combatRollTypes";
import type {
  CampaignCombatView,
  CombatantView,
  CombatAttackType,
  DamageType,
} from "@/lib/combat/types";
import { createRollId, iterativeD20Checks } from "@/lib/dice/notation";
import type { DicePoolItem } from "@/lib/dice/types";
import { useCampaignLiveOptional } from "@/components/tools/campaign-live-provider";
import type { CombatEventView } from "@/lib/combat/events/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type RowFlashKind =
  | "hit"
  | "miss"
  | "crit"
  | "damaged"
  | "healed"
  | "drop"
  | "focus";

export type CombatAdhocModifier = {
  value: number;
  label: string;
};

export type CombatEffectInput = {
  effectText: string;
  duration?: number | null;
  durationUnit?: "round" | "minute" | "hour" | "day";
  expiry?: "startOfTurn" | "endOfTurn";
  visibility?: "visible" | "hidden" | "gm";
};

type RollAttackParams = {
  attackerId: string;
  attackIndex: number;
  targetIds?: string[];
  attackType?: CombatAttackType;
  label: string;
  bonuses: number[];
};

type RollConfirmParams = {
  attackerId: string;
  attackIndex: number;
  targetId: string;
  attackType?: CombatAttackType;
  label: string;
  bonus: number;
};

type RollDamageParams = {
  attackerId: string;
  attackIndex: number;
  targetIds?: string[];
  attackType?: CombatAttackType;
  label: string;
  dice: DicePoolItem[];
  modifier: number;
  crit?: boolean;
  multiplier?: number;
};

type RollHealParams = {
  targetIds: string[];
  label: string;
  dice?: DicePoolItem[];
  modifier?: number;
  amount?: number;
  source?: string;
};

type CombatContextValue = {
  campaignId: string;
  combat: CampaignCombatView | null;
  isDm: boolean;
  viewerPcPlanId: string | null;
  currentActor: CombatantView | null;
  combatantByTokenId: (tokenId: string) => CombatantView | undefined;
  combatantByPcPlanId: (pcPlanId: string) => CombatantView | undefined;
  toggleTarget: (targetCombatantId: string) => Promise<void>;
  rollAttack: (params: RollAttackParams) => void;
  rollConfirm: (params: RollConfirmParams) => void;
  rollDamage: (params: RollDamageParams) => void;
  rollHeal: (params: RollHealParams) => void;
  rollInitiative: (combatantIds: string[], label: string, modifier: number) => void;
  applyEffect: (
    combatantIds: string[],
    input: CombatEffectInput,
  ) => Promise<void>;
  removeEffect: (effectId: string) => Promise<void>;
  nextActor: () => Promise<{ success: boolean; error?: string }>;
  modifierStack: CombatAdhocModifier[];
  pushModifier: (value: number, label?: string, sticky?: boolean) => void;
  clearModifiers: () => void;
  pendingTargetsFor: (attackerId: string) => CombatantView[];
  pendingCritFor: (
    attackerId: string,
  ) => CombatantView["pendingCrit"];
  /** Pending targets for the viewer's PC combatant (sheet compatibility). */
  pendingDamageTargets: CombatantView[];
  stickyModifier: boolean;
  rowFlashes: Record<string, RowFlashKind>;
  focusedRowIds: string[];
  setFocusedRowIds: (ids: string[]) => void;
  rollStabilize: (targetId: string, label: string) => void;
};

function flashKindForEvent(event: CombatEventView): {
  targetFlash?: RowFlashKind;
  actorFlash?: RowFlashKind;
} {
  for (const line of event.lines) {
    switch (line.tone) {
      case "hit":
        return { actorFlash: "hit", targetFlash: "hit" };
      case "crit":
        return { actorFlash: "crit", targetFlash: "crit" };
      case "miss":
        return { actorFlash: "miss" };
      case "damage":
        return { targetFlash: "damaged" };
      case "heal":
        return { targetFlash: "healed" };
      default:
        break;
    }
  }
  return {};
}

const CombatContext = createContext<CombatContextValue | null>(null);

function resolveTargets(
  combat: CampaignCombatView | null,
  attackerId: string,
  targetIds?: string[],
): string[] {
  if (targetIds?.length) return targetIds;
  const attacker = combat?.combatants.find((c) => c.id === attackerId);
  return attacker?.targetIds ?? [];
}

export function CombatProvider({
  campaignId,
  combat,
  isDm,
  viewerPcPlanId,
  children,
}: {
  campaignId: string;
  combat: CampaignCombatView | null;
  isDm: boolean;
  viewerPcPlanId: string | null;
  children: ReactNode;
}) {
  const { roll } = useDice();
  const live = useCampaignLiveOptional();
  const combatEvents = useSyncExternalStore(
    (onStoreChange) => {
      if (!live?.store) return () => {};
      return live.store.subscribe(onStoreChange);
    },
    () => live?.store.getState().combatEvents ?? [],
    () => [],
  );
  const [modifierStack, setModifierStack] = useState<CombatAdhocModifier[]>([]);
  const [stickyModifier, setStickyModifier] = useState(false);
  const [rowFlashes, setRowFlashes] = useState<Record<string, RowFlashKind>>({});
  const [focusedRowIds, setFocusedRowIds] = useState<string[]>([]);
  const lastEventSeqRef = useRef(0);

  const currentActor = useMemo(() => {
    if (!combat?.currentCombatantId) return null;
    return combat.combatants.find((c) => c.id === combat.currentCombatantId) ?? null;
  }, [combat]);

  const combatantByTokenId = useCallback(
    (tokenId: string) =>
      combat?.combatants.find((c) => c.tokenId === tokenId),
    [combat],
  );

  const combatantByPcPlanId = useCallback(
    (pcPlanId: string) =>
      combat?.combatants.find((c) => c.pcPlanId === pcPlanId),
    [combat],
  );

  const pendingTargetsFor = useCallback(
    (attackerId: string): CombatantView[] => {
      const attacker = combat?.combatants.find((c) => c.id === attackerId);
      if (!attacker) return [];
      return attacker.pendingTargetIds
        .map((id) => combat?.combatants.find((c) => c.id === id))
        .filter((c): c is CombatantView => Boolean(c));
    },
    [combat],
  );

  const pendingCritFor = useCallback(
    (attackerId: string) =>
      combat?.combatants.find((c) => c.id === attackerId)?.pendingCrit ?? null,
    [combat],
  );

  const pendingDamageTargets = useMemo(() => {
    if (!viewerPcPlanId) return [];
    const attacker = combat?.combatants.find(
      (c) => c.pcPlanId === viewerPcPlanId,
    );
    if (!attacker) return [];
    return pendingTargetsFor(attacker.id);
  }, [combat, viewerPcPlanId, pendingTargetsFor]);

  const consumeAdhoc = useCallback((): number => {
    const value = modifierStack.reduce((sum, mod) => sum + mod.value, 0);
    if (!stickyModifier) {
      setModifierStack([]);
    }
    return value;
  }, [modifierStack, stickyModifier]);

  const pushModifier = useCallback(
    (value: number, label = "", sticky = false) => {
      if (value === 0) return;
      setModifierStack((prev) => [...prev, { value, label }]);
      setStickyModifier(sticky);
    },
    [],
  );

  const clearModifiers = useCallback(() => {
    setModifierStack([]);
    setStickyModifier(false);
  }, []);

  const flashRow = useCallback((id: string, kind: RowFlashKind) => {
    setRowFlashes((prev) => ({ ...prev, [id]: kind }));
    window.setTimeout(() => {
      setRowFlashes((prev) => {
        if (prev[id] !== kind) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 900);
  }, []);

  useEffect(() => {
    if (combatEvents.length === 0) return;
    const latest = combatEvents[combatEvents.length - 1];
    if (!latest || latest.seq <= lastEventSeqRef.current) return;
    lastEventSeqRef.current = latest.seq;
    const { targetFlash, actorFlash } = flashKindForEvent(latest);
    if (latest.targetCombatantId && targetFlash) {
      flashRow(latest.targetCombatantId, targetFlash);
    }
    if (latest.actorCombatantId && actorFlash) {
      flashRow(latest.actorCombatantId, actorFlash);
    }
  }, [combatEvents, flashRow]);

  const buildCombatRoll = useCallback(
    (
      intent: CombatRollIntent,
      request: {
        label: string;
        dice: DicePoolItem[];
        modifier: number;
        iterativeModifiers?: number[];
        kind?: "attack" | "damage" | "initiative" | "other";
      },
    ) => {
      const adhoc = consumeAdhoc();
      const enrichedIntent =
        adhoc !== 0 && intent.kind !== "initiative" && intent.kind !== "heal"
          ? { ...intent, adhoc }
          : intent;

      roll({
        id: createRollId(),
        label: request.label,
        dice: request.dice,
        modifier: request.modifier,
        ...(request.iterativeModifiers
          ? { iterativeModifiers: request.iterativeModifiers }
          : {}),
        kind: request.kind ?? "other",
        combat: enrichedIntent,
      });
    },
    [consumeAdhoc, roll],
  );

  const toggleTarget = useCallback(
    async (targetCombatantId: string) => {
      await combatToggleTarget(campaignId, targetCombatantId);
    },
    [campaignId],
  );

  const rollAttack = useCallback(
    (params: RollAttackParams) => {
      const targetIds = resolveTargets(combat, params.attackerId, params.targetIds);
      buildCombatRoll(
        {
          kind: "attack",
          attackerId: params.attackerId,
          attackIndex: params.attackIndex,
          targetIds,
          ...(params.attackType ? { attackType: params.attackType } : {}),
        },
        {
          ...iterativeD20Checks(params.label, params.bonuses, "attack"),
          kind: "attack",
        },
      );
    },
    [buildCombatRoll, combat],
  );

  const rollConfirm = useCallback(
    (params: RollConfirmParams) => {
      buildCombatRoll(
        {
          kind: "confirm",
          attackerId: params.attackerId,
          attackIndex: params.attackIndex,
          targetId: params.targetId,
          ...(params.attackType ? { attackType: params.attackType } : {}),
        },
        {
          label: params.label,
          dice: [{ qty: 1, sides: 20 }],
          modifier: params.bonus,
          kind: "attack",
        },
      );
    },
    [buildCombatRoll],
  );

  const rollDamage = useCallback(
    (params: RollDamageParams) => {
      const targetIds = resolveTargets(combat, params.attackerId, params.targetIds);
      buildCombatRoll(
        {
          kind: "damage",
          attackerId: params.attackerId,
          attackIndex: params.attackIndex,
          targetIds,
          ...(params.attackType ? { attackType: params.attackType } : {}),
          ...(params.crit ? { crit: params.crit } : {}),
          ...(params.multiplier ? { multiplier: params.multiplier } : {}),
        },
        {
          label: params.label,
          dice: params.dice,
          modifier: params.modifier,
          kind: "damage",
        },
      );
    },
    [buildCombatRoll, combat],
  );

  const rollHeal = useCallback(
    (params: RollHealParams) => {
      buildCombatRoll(
        {
          kind: "heal",
          targetIds: params.targetIds,
          ...(params.dice ? { dice: params.dice } : {}),
          ...(params.modifier != null ? { modifier: params.modifier } : {}),
          ...(params.amount != null ? { amount: params.amount } : {}),
          ...(params.source ? { source: params.source } : {}),
        },
        {
          label: params.label,
          dice: params.dice ?? [{ qty: 1, sides: 6 }],
          modifier: params.modifier ?? params.amount ?? 0,
          kind: "other",
        },
      );
    },
    [buildCombatRoll],
  );

  const rollInitiative = useCallback(
    (combatantIds: string[], label: string, modifier: number) => {
      buildCombatRoll(
        { kind: "initiative", combatantIds },
        {
          label,
          dice: [{ qty: combatantIds.length, sides: 20 }],
          modifier,
          kind: "initiative",
        },
      );
    },
    [buildCombatRoll],
  );

  const rollStabilize = useCallback(
    (targetId: string, label: string) => {
      buildCombatRoll(
        { kind: "stabilize", targetId },
        {
          label,
          dice: [{ qty: 1, sides: 20 }],
          modifier: 0,
          kind: "other",
        },
      );
    },
    [buildCombatRoll],
  );

  const applyEffect = useCallback(
    async (combatantIds: string[], input: CombatEffectInput) => {
      await combatAddEffect(campaignId, combatantIds, input);
    },
    [campaignId],
  );

  const removeEffect = useCallback(
    async (effectId: string) => {
      await combatRemoveEffect(campaignId, effectId);
    },
    [campaignId],
  );

  const nextActor = useCallback(async () => {
    const result = await combatNextTurn(campaignId);
    return {
      success: result.success,
      ...(result.error ? { error: result.error } : {}),
    };
  }, [campaignId]);

  const value = useMemo(
    (): CombatContextValue => ({
      campaignId,
      combat,
      isDm,
      viewerPcPlanId,
      currentActor,
      combatantByTokenId,
      combatantByPcPlanId,
      toggleTarget,
      rollAttack,
      rollConfirm,
      rollDamage,
      rollHeal,
      rollInitiative,
      applyEffect,
      removeEffect,
      nextActor,
      modifierStack,
      pushModifier,
      clearModifiers,
      pendingTargetsFor,
      pendingCritFor,
      pendingDamageTargets,
      stickyModifier,
      rowFlashes,
      focusedRowIds,
      setFocusedRowIds,
      rollStabilize,
    }),
    [
      campaignId,
      combat,
      isDm,
      viewerPcPlanId,
      currentActor,
      combatantByTokenId,
      combatantByPcPlanId,
      toggleTarget,
      rollAttack,
      rollConfirm,
      rollDamage,
      rollHeal,
      rollInitiative,
      applyEffect,
      removeEffect,
      nextActor,
      modifierStack,
      pushModifier,
      clearModifiers,
      pendingTargetsFor,
      pendingCritFor,
      pendingDamageTargets,
      stickyModifier,
      rowFlashes,
      focusedRowIds,
      rollStabilize,
    ],
  );

  return (
    <CombatContext.Provider value={value}>{children}</CombatContext.Provider>
  );
}

export function useCombatContext(): CombatContextValue | null {
  return useContext(CombatContext);
}

/** Map a weapon damage type label to combat DamageType when possible. */
export function weaponDamageTypeToCombat(
  raw: string | null | undefined,
): DamageType | undefined {
  if (!raw) return undefined;
  const normalized = raw.trim().toLowerCase();
  const allowed: DamageType[] = [
    "slashing",
    "piercing",
    "bludgeoning",
    "fire",
    "cold",
    "acid",
    "electricity",
    "sonic",
    "force",
    "positive",
    "negative",
  ];
  return allowed.find((type) => type === normalized);
}

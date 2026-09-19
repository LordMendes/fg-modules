import type { DicePoolItem, RollKind } from "@/lib/dice/types";
import type { CombatEventRecord } from "@/lib/combat/events/types";
import type { CampaignRollView } from "@/lib/campaign/types";
import type { CombatAttackType, DamagePacket } from "@/lib/combat/types";

export type CombatAdhocModifier = {
  value: number;
  label?: string;
};

export type CombatRollIntent =
  | {
      kind: "initiative";
      combatantIds: string[];
    }
  | {
      kind: "attack";
      attackerId: string;
      attackIndex: number;
      targetIds: string[];
      attackType?: CombatAttackType;
      adhoc?: number;
    }
  | {
      kind: "confirm";
      attackerId: string;
      attackIndex: number;
      targetId: string;
      attackType?: CombatAttackType;
      adhoc?: number;
    }
  | {
      kind: "damage";
      attackerId: string;
      attackIndex: number;
      targetIds?: string[];
      attackType?: CombatAttackType;
      adhoc?: number;
      packets?: DamagePacket[];
      crit?: boolean;
      multiplier?: number;
    }
  | {
      kind: "save";
      targetIds: string[];
      saveType: "fort" | "ref" | "will";
      dc: number;
      source?: string;
      adhoc?: number;
      requestId?: string;
      consequence?: "half" | "negate" | "effect";
    }
  | {
      kind: "heal";
      targetIds: string[];
      dice?: DicePoolItem[];
      modifier?: number;
      amount?: number;
      source?: string;
    }
  | {
      kind: "stabilize";
      targetId: string;
    }
  | {
      kind: "sr";
      targetId: string;
      spellName: string;
      casterLevel?: number;
    }
  | {
      kind: "cast";
      casterId: string;
      spellKey: string;
      targetIds: string[];
      casterLevel?: number;
      spellLevel?: number;
      castingStatMod?: number;
      attackBonus?: number;
      dmOverrideSlots?: boolean;
    };

export type StartCombatRollInput = {
  campaignId: string;
  label: string;
  kind: RollKind;
  hidden?: boolean;
  characterName?: string | null;
  dice: DicePoolItem[];
  modifier: number;
  iterativeModifiers?: number[];
  combat: CombatRollIntent;
};

export type CombatRollOutcome = {
  intent: CombatRollIntent["kind"];
  events: CombatEventRecord[];
};

export type CombatRollResult = {
  success: boolean;
  error?: string;
  roll?: CampaignRollView;
  outcome?: CombatRollOutcome;
};

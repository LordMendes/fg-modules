import { useCallback } from "react";
import type { CombatSpellEntry } from "@/lib/combat/types";
import type { DicePoolItem } from "@/lib/dice/types";

export type AreaSpellCastPending = {
  casterId: string;
  casterTokenId: string | null;
  spell: CombatSpellEntry;
  label: string;
  dice: DicePoolItem[];
  casterLevel?: number;
  spellLevel?: number;
  castingStatMod?: number;
};

export function useAreaSpellCast(onStartPlacement: (pending: AreaSpellCastPending) => void) {
  const checkAndStartAreaCast = useCallback(
    (params: {
      spell: CombatSpellEntry;
      casterId: string;
      casterTokenId: string | null;
      label: string;
      dice: DicePoolItem[];
      casterLevel?: number;
      spellLevel?: number;
      castingStatMod?: number;
    }): boolean => {
      const { spell } = params;
      
      // Check if spell has area shape requiring placement
      if (
        spell.areaShape &&
        (spell.areaShape === "circle" ||
          spell.areaShape === "square" ||
          spell.areaShape === "cone" ||
          spell.areaShape === "ray")
      ) {
        onStartPlacement({
          casterId: params.casterId,
          casterTokenId: params.casterTokenId,
          spell,
          label: params.label,
          dice: params.dice,
          casterLevel: params.casterLevel,
          spellLevel: params.spellLevel,
          castingStatMod: params.castingStatMod,
        });
        return true;
      }
      
      return false;
    },
    [onStartPlacement],
  );

  return { checkAndStartAreaCast };
}

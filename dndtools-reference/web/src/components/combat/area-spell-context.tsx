"use client";

import type { CombatSpellEntry } from "@/lib/combat/types";
import type { DicePoolItem } from "@/lib/dice/types";
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type AreaSpellPendingCast = {
  casterId: string;
  casterTokenId: string | null;
  spell: CombatSpellEntry;
  label: string;
  dice: DicePoolItem[];
  casterLevel?: number;
  spellLevel?: number;
  castingStatMod?: number;
  attackBonus?: number;
};

type AreaSpellContextValue = {
  pendingCast: AreaSpellPendingCast | null;
  startAreaSpellPlacement: (cast: AreaSpellPendingCast) => void;
  cancelAreaSpellPlacement: () => void;
  confirmAreaSpellCast: (targetIds: string[]) => void;
};

const AreaSpellContext = createContext<AreaSpellContextValue | null>(null);

export function AreaSpellProvider({
  children,
  onConfirmCast,
}: {
  children: ReactNode;
  onConfirmCast: (
    cast: AreaSpellPendingCast,
    targetIds: string[],
  ) => void;
}) {
  const [pendingCast, setPendingCast] = useState<AreaSpellPendingCast | null>(null);

  const startAreaSpellPlacement = useCallback((cast: AreaSpellPendingCast) => {
    setPendingCast(cast);
  }, []);

  const cancelAreaSpellPlacement = useCallback(() => {
    setPendingCast(null);
  }, []);

  const confirmAreaSpellCast = useCallback(
    (targetIds: string[]) => {
      if (!pendingCast) return;
      onConfirmCast(pendingCast, targetIds);
      setPendingCast(null);
    },
    [pendingCast, onConfirmCast],
  );

  return (
    <AreaSpellContext.Provider
      value={{
        pendingCast,
        startAreaSpellPlacement,
        cancelAreaSpellPlacement,
        confirmAreaSpellCast,
      }}
    >
      {children}
    </AreaSpellContext.Provider>
  );
}

export function useAreaSpellContext() {
  const ctx = useContext(AreaSpellContext);
  if (!ctx) {
    throw new Error("useAreaSpellContext must be used within AreaSpellProvider");
  }
  return ctx;
}

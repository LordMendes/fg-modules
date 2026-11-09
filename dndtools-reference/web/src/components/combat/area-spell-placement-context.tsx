"use client";

import { createContext, useContext, useCallback, type ReactNode } from "react";
import type { AreaSpellPlacement } from "@/components/map/map-area-spell-layer";

type StartPlacementParams = Omit<AreaSpellPlacement, "x" | "y" | "rotation" | "highlightedTokenIds">;

type AreaSpellPlacementContextValue = {
  startPlacement: (params: StartPlacementParams) => void;
};

const AreaSpellPlacementContext = createContext<AreaSpellPlacementContextValue | null>(null);

export function AreaSpellPlacementProvider({
  children,
  onStartPlacement,
}: {
  children: ReactNode;
  onStartPlacement: (params: StartPlacementParams) => void;
}) {
  const startPlacement = useCallback(
    (params: StartPlacementParams) => {
      onStartPlacement(params);
    },
    [onStartPlacement],
  );

  return (
    <AreaSpellPlacementContext.Provider value={{ startPlacement }}>
      {children}
    </AreaSpellPlacementContext.Provider>
  );
}

export function useAreaSpellPlacement() {
  const ctx = useContext(AreaSpellPlacementContext);
  if (!ctx) {
    // Return no-op if context not provided (e.g. in non-map views)
    return { startPlacement: () => {} };
  }
  return ctx;
}

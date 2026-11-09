"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { AreaSpellPlacement } from "@/components/map/map-area-spell-layer";

type StartPlacementParams = Omit<AreaSpellPlacement, "x" | "y" | "rotation" | "highlightedTokenIds">;

type AreaSpellBridgeValue = {
  startPlacement: (params: StartPlacementParams) => void;
  currentPlacement: AreaSpellPlacement | null;
};

const AreaSpellBridgeContext = createContext<AreaSpellBridgeValue | null>(null);

export function AreaSpellBridgeProvider({ children }: { children: ReactNode }) {
  const [currentPlacement, setCurrentPlacement] = useState<AreaSpellPlacement | null>(null);

  const startPlacement = useCallback((params: StartPlacementParams) => {
    // This will be intercepted by the map board to add x, y, rotation
    setCurrentPlacement(params as AreaSpellPlacement);
  }, []);

  return (
    <AreaSpellBridgeContext.Provider value={{ startPlacement, currentPlacement }}>
      {children}
    </AreaSpellBridgeContext.Provider>
  );
}

export function useAreaSpellBridge() {
  const ctx = useContext(AreaSpellBridgeContext);
  if (!ctx) {
    // Return no-op if not in area spell enabled environment
    return { startPlacement: () => {}, currentPlacement: null };
  }
  return ctx;
}

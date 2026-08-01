"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  calculateEncounterSummary,
  defaultEncounterName,
} from "@/lib/encounter/calculateEl";
import {
  DEFAULT_PARTY_CONFIG,
  normalizePartyConfig,
  type PartyConfig,
} from "@/lib/encounter/partyConfig";
import {
  clearDraft,
  deleteSavedEncounter,
  getSavedEncounter,
  loadDraft,
  loadPartyConfig,
  loadSavedEncounters,
  renameSavedEncounter,
  saveDraft,
  saveEncounter,
  savePartyConfig,
} from "@/lib/encounter/storage";
import type {
  EncounterEntry,
  EncounterSummary,
  MonsterRef,
  SavedEncounter,
} from "@/lib/encounter/types";

type EncounterContextValue = {
  entries: EncounterEntry[];
  summary: EncounterSummary;
  partyConfig: PartyConfig;
  savedEncounters: SavedEncounter[];
  addMonster: (monster: MonsterRef) => void;
  setCount: (slug: string, count: number) => void;
  removeEntry: (slug: string) => void;
  clearEncounter: () => void;
  setPartyConfig: (config: PartyConfig) => void;
  saveCurrentEncounter: (name: string) => { ok: boolean; error?: string };
  loadEncounter: (id: string) => boolean;
  renameEncounter: (id: string, name: string) => void;
  deleteEncounter: (id: string) => void;
  refreshSavedEncounters: () => void;
  defaultSaveName: string;
};

const EncounterContext = createContext<EncounterContextValue | null>(null);

export function EncounterProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<EncounterEntry[]>([]);
  const [partyConfig, setPartyConfigState] = useState<PartyConfig>(
    DEFAULT_PARTY_CONFIG,
  );
  const [savedEncounters, setSavedEncounters] = useState<SavedEncounter[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEntries(loadDraft());
    setPartyConfigState(loadPartyConfig());
    setSavedEncounters(loadSavedEncounters());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (entries.length === 0) {
      clearDraft();
    } else {
      saveDraft(entries);
    }
  }, [entries, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    savePartyConfig(partyConfig);
  }, [partyConfig, hydrated]);

  const summary = useMemo(
    () => calculateEncounterSummary(entries, partyConfig),
    [entries, partyConfig],
  );

  const defaultSaveName = useMemo(
    () => defaultEncounterName(summary),
    [summary],
  );

  const refreshSavedEncounters = useCallback(() => {
    setSavedEncounters(loadSavedEncounters());
  }, []);

  const addMonster = useCallback((monster: MonsterRef) => {
    setEntries((prev) => {
      const existing = prev.find((e) => e.slug === monster.slug);
      if (existing) {
        return prev.map((e) =>
          e.slug === monster.slug ? { ...e, count: e.count + 1 } : e,
        );
      }
      return [
        ...prev,
        {
          slug: monster.slug,
          name: monster.name,
          cr: monster.cr || "—",
          count: 1,
        },
      ];
    });
  }, []);

  const setCount = useCallback((slug: string, count: number) => {
    setEntries((prev) => {
      if (count <= 0) {
        return prev.filter((e) => e.slug !== slug);
      }
      return prev.map((e) => (e.slug === slug ? { ...e, count } : e));
    });
  }, []);

  const removeEntry = useCallback((slug: string) => {
    setEntries((prev) => prev.filter((e) => e.slug !== slug));
  }, []);

  const clearEncounter = useCallback(() => {
    setEntries([]);
  }, []);

  const setPartyConfig = useCallback((config: PartyConfig) => {
    setPartyConfigState(normalizePartyConfig(config));
  }, []);

  const saveCurrentEncounter = useCallback(
    (name: string) => {
      if (entries.length === 0) {
        return { ok: false, error: "Add at least one creature before saving." };
      }
      const result = saveEncounter(name, entries);
      if (result.ok) {
        setSavedEncounters(result.entries);
      }
      return { ok: result.ok, error: result.error };
    },
    [entries],
  );

  const loadEncounter = useCallback((id: string) => {
    const saved = getSavedEncounter(id);
    if (!saved) return false;
    setEntries(structuredClone(saved.entries));
    return true;
  }, []);

  const renameEncounter = useCallback((id: string, name: string) => {
    setSavedEncounters(renameSavedEncounter(id, name));
  }, []);

  const deleteEncounter = useCallback((id: string) => {
    setSavedEncounters(deleteSavedEncounter(id));
  }, []);

  const value = useMemo(
    (): EncounterContextValue => ({
      entries,
      summary,
      partyConfig,
      savedEncounters,
      addMonster,
      setCount,
      removeEntry,
      clearEncounter,
      setPartyConfig,
      saveCurrentEncounter,
      loadEncounter,
      renameEncounter,
      deleteEncounter,
      refreshSavedEncounters,
      defaultSaveName,
    }),
    [
      entries,
      summary,
      partyConfig,
      savedEncounters,
      addMonster,
      setCount,
      removeEntry,
      clearEncounter,
      setPartyConfig,
      saveCurrentEncounter,
      loadEncounter,
      renameEncounter,
      deleteEncounter,
      refreshSavedEncounters,
      defaultSaveName,
    ],
  );

  return (
    <EncounterContext.Provider value={value}>{children}</EncounterContext.Provider>
  );
}

export function useEncounter(): EncounterContextValue {
  const ctx = useContext(EncounterContext);
  if (!ctx) {
    throw new Error("useEncounter must be used within EncounterProvider");
  }
  return ctx;
}

export function useEncounterOptional(): EncounterContextValue | null {
  return useContext(EncounterContext);
}

import type { EncounterEntry, SavedEncounter } from "./types";

export const DRAFT_STORAGE_KEY = "arcane-archives-encounter-draft";
export const SAVES_STORAGE_KEY = "arcane-archives-encounter-saves";
export const MAX_SAVED_ENCOUNTERS = 50;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function persistSaves(entries: SavedEncounter[]): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    localStorage.setItem(SAVES_STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

export function loadDraft(): EncounterEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    const list = safeParse<EncounterEntry[]>(raw, []);
    return Array.isArray(list) ? list.filter(isValidEntry) : [];
  } catch {
    return [];
  }
}

export function saveDraft(entries: EncounterEntry[]): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function loadSavedEncounters(): SavedEncounter[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVES_STORAGE_KEY);
    const list = safeParse<SavedEncounter[]>(raw, []);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveEncounter(
  name: string,
  entries: EncounterEntry[],
): { ok: boolean; entries: SavedEncounter[]; error?: string } {
  const now = Date.now();
  const trimmed = name.trim() || "Untitled encounter";
  const prev = loadSavedEncounters();

  let finalName = trimmed;
  if (prev.some((e) => e.name === trimmed)) {
    finalName = `${trimmed} (${new Date(now).toLocaleDateString()})`;
  }

  const entry: SavedEncounter = {
    id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
    name: finalName,
    createdAt: now,
    updatedAt: now,
    entries: structuredClone(entries),
  };

  const next = [entry, ...prev].slice(0, MAX_SAVED_ENCOUNTERS);
  const ok = persistSaves(next);
  return ok
    ? { ok: true, entries: next }
    : { ok: false, entries: prev, error: "Could not save (storage full or unavailable)." };
}

export function renameSavedEncounter(
  id: string,
  name: string,
): SavedEncounter[] {
  const next = loadSavedEncounters().map((e) =>
    e.id === id
      ? { ...e, name: name.trim() || e.name, updatedAt: Date.now() }
      : e,
  );
  persistSaves(next);
  return next;
}

export function deleteSavedEncounter(id: string): SavedEncounter[] {
  const next = loadSavedEncounters().filter((e) => e.id !== id);
  persistSaves(next);
  return next;
}

export function getSavedEncounter(id: string): SavedEncounter | null {
  return loadSavedEncounters().find((e) => e.id === id) ?? null;
}

function isValidEntry(entry: EncounterEntry): entry is EncounterEntry {
  return (
    typeof entry.slug === "string" &&
    typeof entry.name === "string" &&
    typeof entry.cr === "string" &&
    typeof entry.count === "number" &&
    entry.count > 0
  );
}

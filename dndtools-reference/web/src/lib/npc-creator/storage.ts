import type { NpcFgExportState } from "./types";

export const TEMPLATES_STORAGE_KEY = "arcane-archives-npc-templates";
export const DRAFT_STORAGE_KEY = "arcane-archives-npc-draft";
export const MAX_USER_TEMPLATES = 50;

export interface UserNpcTemplate {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  kind: "archetype" | "snapshot";
  state: NpcFgExportState;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadUserTemplates(): UserNpcTemplate[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    const list = safeParse<UserNpcTemplate[]>(raw, []);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function persistTemplates(entries: UserNpcTemplate[]): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

export function saveUserTemplate(
  name: string,
  state: NpcFgExportState,
  kind: UserNpcTemplate["kind"] = "snapshot",
): { ok: boolean; entries: UserNpcTemplate[]; error?: string } {
  const now = Date.now();
  const entry: UserNpcTemplate = {
    id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || "Untitled template",
    createdAt: now,
    updatedAt: now,
    kind,
    state: structuredClone(state),
  };
  const prev = loadUserTemplates();
  const next = [entry, ...prev].slice(0, MAX_USER_TEMPLATES);
  const ok = persistTemplates(next);
  return ok
    ? { ok: true, entries: next }
    : {
        ok: false,
        entries: prev,
        error: "Could not save (storage full or unavailable). Try removing images.",
      };
}

export function renameUserTemplate(
  id: string,
  name: string,
): UserNpcTemplate[] {
  const next = loadUserTemplates().map((t) =>
    t.id === id
      ? { ...t, name: name.trim() || t.name, updatedAt: Date.now() }
      : t,
  );
  persistTemplates(next);
  return next;
}

export function deleteUserTemplate(id: string): UserNpcTemplate[] {
  const next = loadUserTemplates().filter((t) => t.id !== id);
  persistTemplates(next);
  return next;
}

export function loadDraft(): NpcFgExportState | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NpcFgExportState;
  } catch {
    return null;
  }
}

export function saveDraft(state: NpcFgExportState): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(state));
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

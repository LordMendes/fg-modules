import { spellToActionSet } from "@/lib/spell-to-action-set";
import { tryLookupSrdSpell, normalizeSpellKey } from "@/lib/npc-creator/srdSpellLookup";
import type { NpcFgExportState } from "@/lib/npc-creator/types";
import type { CombatSpellEntry, CombatSpellUses } from "@/lib/combat/types";

const SPELL_BLOCK_RE =
  /(?:Spells Known|Spells Prepared|Typical .* Spells Prepared|Spell-Like Abilities)[^(]*\(\s*CL\s+(\d+)[^)]*\)[^:]*:\s*([^.;]+(?:\([^)]*\)[^.;]*)*)/gi;

const SLA_BLOCK_RE =
  /Spell-Like Abilities[^:]*:\s*([^.;]+(?:\([^)]*\)[^.;]*)*)/gi;

function slugKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanSpellName(raw: string): string {
  return raw
    .replace(/^\d+(?:st|nd|rd|th)\s*[-–—]?\s*/i, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\*+/g, "")
    .trim();
}

function parseSpellList(text: string): string[] {
  return text
    .split(/[,;]/)
    .map(cleanSpellName)
    .filter((name) => name.length > 1 && !/^\d+$/.test(name));
}

function entryFromName(
  name: string,
  level: number | null,
  kind: "spell" | "sla",
  casterLevel: number | null,
  usesPerDay: number | null,
): CombatSpellEntry {
  const hit = tryLookupSrdSpell(name);
  const converted = spellToActionSet(name);
  return {
    key: kind === "sla" ? `sla:${slugKey(name)}` : slugKey(name),
    name: hit?.name ?? name,
    level,
    kind,
    actions: converted.actions,
    usesPerDay,
    casterLevel,
    source: hit ? "compendium" : "manual",
    confidence: hit ? converted.confidence : "low",
    rangeFeet: converted.rangeFeet ?? null,
    areaShape: converted.areaShape ?? null,
  };
}

function parseBlocksFromText(text: string): CombatSpellEntry[] {
  const entries: CombatSpellEntry[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(SPELL_BLOCK_RE)) {
    const cl = Number(match[1]);
    const list = parseSpellList(match[2] ?? "");
    for (const name of list) {
      const key = normalizeSpellKey(name);
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push(entryFromName(name, null, "spell", cl, null));
    }
  }

  for (const match of text.matchAll(SLA_BLOCK_RE)) {
    const list = parseSpellList(match[1] ?? "");
    for (const name of list) {
      const key = `sla:${normalizeSpellKey(name)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push(entryFromName(name, null, "sla", null, null));
    }
  }

  return entries;
}

export function npcCreatorToCombatSpells(state: NpcFgExportState): {
  spells: CombatSpellEntry[];
  spellUses: CombatSpellUses;
} {
  const spells: CombatSpellEntry[] = [];
  const spellUses: CombatSpellUses = {};
  if (!state.spellcasting.enabled) return { spells, spellUses };

  const cl = state.spellcasting.casterLevel;
  for (const row of state.spellcasting.spells) {
    const converted = spellToActionSet(row.name);
    const hit = tryLookupSrdSpell(row.name);
    spells.push({
      key: slugKey(row.name),
      name: row.name,
      level: row.level,
      kind: "spell",
      actions: row.action2 || row.actions?.length
        ? {
            cast: {
              othertags: row.othertags,
              schoolShort: row.schoolShort,
              savetype: (row.savetype as "" | "fort" | "reflex" | "will") ?? "",
              atktype: row.atktype ?? "",
              onmissdamage: row.onmissdamage ?? "",
              srnotallowed: row.srNotAllowed,
            },
            followUps: [
              ...(row.action2 ? [row.action2] : []),
              ...(row.actions ?? []),
            ],
            action2: row.action2,
          }
        : converted.actions,
      usesPerDay: null,
      casterLevel: cl,
      source: hit ? "compendium" : "npc",
      confidence: hit ? "high" : "low",
      rangeFeet: converted.rangeFeet ?? null,
      areaShape: converted.areaShape ?? null,
    });
    if (row.prepared > 0 && row.level != null) {
      spellUses[`slot:${row.level}`] = row.prepared;
    }
  }

  return { spells, spellUses };
}

export function monsterIndexToCombatSpells(indexData: unknown): {
  spells: CombatSpellEntry[];
  spellUses: CombatSpellUses;
} {
  const index = (indexData ?? {}) as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof index.combat_text === "string") parts.push(index.combat_text);
  if (typeof index.combatHtml === "string") {
    parts.push(index.combatHtml.replace(/<[^>]+>/g, " "));
  }
  const special = index.specialAbilities;
  if (Array.isArray(special)) {
    for (const entry of special) {
      if (entry && typeof entry === "object") {
        const name = (entry as { name?: string }).name;
        const desc = (entry as { description?: string }).description;
        if (name) parts.push(name);
        if (desc) parts.push(desc);
      }
    }
  }

  const spells = parseBlocksFromText(parts.join("\n"));
  const spellUses: CombatSpellUses = {};
  for (const entry of spells) {
    if (entry.kind === "sla") {
      spellUses[entry.key] = entry.usesPerDay ?? 1;
    }
  }
  return { spells, spellUses };
}

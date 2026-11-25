import {
  characterLevelFromPlan,
  formatGestaltClassSummary,
  isGestaltActive,
} from "./gestalt";
import type { FeatEntry, InventoryRow, PcPlanState, SpellClassState } from "./types";

/**
 * Sheet to freeze when character level increases.
 * Returns the sheet being left, so a jump from 4 to 7 stores level 4 only.
 */
export function levelSnapshotCandidate(
  previous: PcPlanState,
  next: PcPlanState,
): PcPlanState | null {
  const from = characterLevelFromPlan(previous);
  const to = characterLevelFromPlan(next);
  if (to > from && from >= 1) return previous;
  return null;
}

/** Class line for a timeline card, such as "Fighter 4 / Wizard 1". */
export function classSummaryForPlan(state: PcPlanState): string {
  if (isGestaltActive(state)) {
    const summary = formatGestaltClassSummary(state.identity.classLevels);
    return summary || `Level ${characterLevelFromPlan(state)}`;
  }
  const summary = state.identity.classLevels
    .map((cl) => `${cl.className} ${cl.level}`)
    .join(" / ");
  return summary || "No class";
}

const ABILITY_LABELS = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
} as const;

function featLabel(feat: FeatEntry): string {
  const choice = feat.choice || feat.skillChoice;
  return choice ? `${feat.name} (${choice})` : feat.name;
}

function featKey(feat: FeatEntry): string {
  return `${feat.slug}|${feat.choice ?? ""}|${feat.skillChoice ?? ""}`;
}

function spellLabel(spellClass: SpellClassState, slug: string, name: string): string {
  return `${name} (${spellClass.label})`;
}

function inventoryTotals(rows: InventoryRow[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const name = row.name.trim() || "Unnamed item";
    totals.set(name, (totals.get(name) ?? 0) + (Number.isFinite(row.quantity) ? row.quantity : 0));
  }
  return totals;
}

function pushSetChanges(
  lines: string[],
  noun: string,
  currentKeys: Map<string, string>,
  previousKeys: Map<string, string>,
) {
  for (const [key, label] of currentKeys) {
    if (!previousKeys.has(key)) lines.push(`${noun} will be removed: ${label}.`);
  }
  for (const [key, label] of previousKeys) {
    if (!currentKeys.has(key)) lines.push(`${noun} will be restored: ${label}.`);
  }
}

/** Human-readable list of what returning to `previous` undoes on `current`. */
export function describeLevelRestore(current: PcPlanState, previous: PcPlanState): string[] {
  const lines: string[] = [];
  const fromLevel = characterLevelFromPlan(current);
  const toLevel = characterLevelFromPlan(previous);
  lines.push(
    `Character level ${fromLevel} (${classSummaryForPlan(current)}) returns to level ${toLevel} (${classSummaryForPlan(previous)}).`,
  );

  const text = (label: string, from: string, to: string) => {
    const before = from.trim();
    const after = to.trim();
    if (before === after) return;
    if (!after) lines.push(`${label} "${before}" will be cleared.`);
    else if (!before) lines.push(`${label} returns to "${after}".`);
    else lines.push(`${label} "${before}" returns to "${after}".`);
  };

  text("Name", current.identity.name, previous.identity.name);
  text("Race", current.identity.race, previous.identity.race);
  text("Alignment", current.identity.alignment, previous.identity.alignment);
  text("Deity", current.identity.deity ?? "", previous.identity.deity ?? "");

  if (Boolean(current.identity.gestalt) !== Boolean(previous.identity.gestalt)) {
    lines.push(
      previous.identity.gestalt
        ? "Gestalt planning will be turned back on."
        : "Gestalt planning will be turned off.",
    );
  }

  if ((current.identity.xp ?? 0) !== (previous.identity.xp ?? 0)) {
    lines.push(`XP ${current.identity.xp ?? 0} returns to ${previous.identity.xp ?? 0}.`);
  }

  for (const key of Object.keys(ABILITY_LABELS) as (keyof typeof ABILITY_LABELS)[]) {
    const from = current.abilities[key];
    const to = previous.abilities[key];
    if (from !== to) {
      lines.push(`${ABILITY_LABELS[key]} ${from} returns to ${to}.`);
    }
  }

  const fromHp = current.hitPoints.current ?? 0;
  const toHp = previous.hitPoints.current ?? 0;
  if (fromHp !== toHp) {
    lines.push(`Hit points ${fromHp} return to ${toHp}.`);
  }

  const currentFeats = new Map(current.feats.map((feat) => [featKey(feat), featLabel(feat)]));
  const previousFeats = new Map(previous.feats.map((feat) => [featKey(feat), featLabel(feat)]));
  pushSetChanges(lines, "Feat", currentFeats, previousFeats);

  const currentSkills = new Map(current.skills.map((skill) => [skill.name, skill]));
  const previousSkills = new Map(previous.skills.map((skill) => [skill.name, skill]));
  const skillNames = new Set([...currentSkills.keys(), ...previousSkills.keys()]);
  for (const name of skillNames) {
    const from = currentSkills.get(name);
    const to = previousSkills.get(name);
    const fromRanks = from?.ranks ?? 0;
    const toRanks = to?.ranks ?? 0;
    if (fromRanks === toRanks) continue;
    lines.push(`${name} ranks ${fromRanks} return to ${toRanks}.`);
  }

  const currentSpells = new Map<string, string>();
  const previousSpells = new Map<string, string>();
  const collectSpells = (classes: SpellClassState[], into: Map<string, string>) => {
    for (const spellClass of classes) {
      for (const spell of spellClass.spells) {
        const key = `${spellClass.classSlug}|${spell.slug}|${spell.level}|${spell.domain ? "domain" : "base"}`;
        into.set(key, spellLabel(spellClass, spell.slug, spell.name));
      }
    }
  };
  collectSpells(current.spellClasses, currentSpells);
  collectSpells(previous.spellClasses, previousSpells);
  pushSetChanges(lines, "Spell", currentSpells, previousSpells);

  const currentItems = inventoryTotals(current.inventory);
  const previousItems = inventoryTotals(previous.inventory);
  const itemNames = new Set([...currentItems.keys(), ...previousItems.keys()]);
  for (const name of itemNames) {
    const from = currentItems.get(name) ?? 0;
    const to = previousItems.get(name) ?? 0;
    if (from === to) continue;
    if (to === 0) lines.push(`${name} will be removed from inventory.`);
    else if (from === 0) lines.push(`${name} will be restored to inventory (quantity ${to}).`);
    else lines.push(`${name} quantity ${from} returns to ${to}.`);
  }

  if ((current.notes ?? "") !== (previous.notes ?? "")) {
    lines.push("Notes return to the earlier text.");
  }

  const picture = (label: string, from: string | null | undefined, to: string | null | undefined) => {
    const fromKey = from ?? null;
    const toKey = to ?? null;
    if (fromKey === toKey) return;
    const had = Boolean(fromKey);
    const will = Boolean(toKey);
    if (had && will) {
      lines.push(`${label} returns to the earlier image.`);
      return;
    }
    lines.push(will ? `${label} will be restored.` : `${label} will be removed.`);
  };
  picture("Profile picture", current.identity.profileImageKey, previous.identity.profileImageKey);
  picture("Token picture", current.identity.tokenImageKey, previous.identity.tokenImageKey);

  return lines;
}

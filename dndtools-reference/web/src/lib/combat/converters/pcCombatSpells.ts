import { spellToActionSet } from "@/lib/spell-to-action-set";
import { abilityModifier } from "@/lib/pc-planner/combatStats";
import { computeSpellClass } from "@/lib/pc-planner/spellSlots";
import type { PcPlanState, SpellClassState } from "@/lib/pc-planner/types";
import type { CombatSpellEntry, CombatSpellUses } from "@/lib/combat/types";

function slugKey(name: string, slug?: string): string {
  if (slug?.trim()) return slug.trim();
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mirrorSlotUses(
  spellClass: SpellClassState,
  computed: ReturnType<typeof computeSpellClass>,
  spellUses: CombatSpellUses,
): void {
  for (let level = 0; level <= 9; level += 1) {
    const total = computed.slots[level] ?? 0;
    if (total <= 0) continue;
    const used = spellClass.slotsUsed?.[level] ?? 0;
    spellUses[`slot:${level}`] = Math.max(0, total - used);
  }
}

export function pcPlanToCombatSpells(state: PcPlanState): {
  spells: CombatSpellEntry[];
  spellUses: CombatSpellUses;
} {
  const spells: CombatSpellEntry[] = [];
  const spellUses: CombatSpellUses = {};

  for (const spellClass of state.spellClasses ?? []) {
    const computed = computeSpellClass(
      spellClass.classSlug,
      spellClass.label,
      spellClass.casterLevel,
      state.abilities,
    );
    mirrorSlotUses(spellClass, computed, spellUses);

    const cl = spellClass.casterLevelOverride ?? spellClass.casterLevel;
    const dcMod = computed.dcModifier;

    for (const spell of spellClass.spells) {
      const converted = spellToActionSet(spell.name);
      spells.push({
        key: slugKey(spell.name, spell.slug),
        name: spell.name,
        level: spell.level,
        kind: "spell",
        actions: converted.actions,
        usesPerDay: null,
        casterLevel: cl,
        source: converted.confidence === "high" ? "compendium" : "manual",
        confidence: converted.confidence,
        rangeFeet: converted.rangeFeet ?? null,
        areaShape: converted.areaShape ?? null,
      });
      void dcMod;
    }
  }

  return { spells, spellUses };
}

export function pcCastingStatMod(
  state: PcPlanState,
  spellClass: SpellClassState,
): number {
  return abilityModifier(state.abilities[spellClass.dcAbility]);
}

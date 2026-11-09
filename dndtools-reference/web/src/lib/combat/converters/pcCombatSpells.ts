import { spellToActionSet } from "@/lib/spell-to-action-set";
import { abilityModifier } from "@/lib/pc-planner/combatStats";
import { computeSpellClass } from "@/lib/pc-planner/spellSlots";
import { deriveFeatEffects } from "@/lib/pc-planner/parseFeatEffects";
import type { PcPlanState, SpellClassState } from "@/lib/pc-planner/types";
import type { CombatSpellClass, CombatSpellEntry, CombatSpellUses } from "@/lib/combat/types";

function slugKey(name: string, slug?: string): string {
  if (slug?.trim()) return slug.trim();
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function classKeyForSpellClass(spellClass: SpellClassState, index: number): string {
  const slug = spellClass.classSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return index === 0 ? slug : `${slug}-${index + 1}`;
}

function mirrorSlotUses(
  spellClassKey: string,
  spellClass: SpellClassState,
  computed: ReturnType<typeof computeSpellClass>,
  spellUses: CombatSpellUses,
): void {
  for (let level = 0; level <= 9; level += 1) {
    const total = computed.slots[level] ?? 0;
    if (total <= 0) continue;
    const used = spellClass.slotsUsed?.[level] ?? 0;
    const remaining = Math.max(0, total - used);
    spellUses[`slot:${spellClassKey}:${level}`] = remaining;
  }
}

export function pcPlanToCombatSpells(state: PcPlanState): {
  spells: CombatSpellEntry[];
  spellUses: CombatSpellUses;
  spellClasses: CombatSpellClass[];
} {
  const spells: CombatSpellEntry[] = [];
  const spellUses: CombatSpellUses = {};
  const spellClasses: CombatSpellClass[] = [];

  const featEffects = deriveFeatEffects(state.feats ?? []);

  for (const [index, spellClass] of (state.spellClasses ?? []).entries()) {
    const computed = computeSpellClass(
      spellClass.classSlug,
      spellClass.label,
      spellClass.casterLevel,
      state.abilities,
    );
    const spellClassKey = classKeyForSpellClass(spellClass, index);
    
    mirrorSlotUses(spellClassKey, spellClass, computed, spellUses);

    const cl = spellClass.casterLevelOverride ?? spellClass.casterLevel;
    const dcMod = computed.dcModifier;

    spellClasses.push({
      key: spellClassKey,
      label: spellClass.label,
      classSlug: spellClass.classSlug,
      casterLevel: cl,
      dcAbility: computed.dcAbility,
      dcModifier: dcMod,
      dcMisc: 0,
      dcMiscManual: 0,
      mode: computed.mode,
      baseSlots: [...computed.baseSlots],
      bonusSlots: [...computed.bonusSlots],
      totalSlots: [...computed.slots],
      known: [...computed.known],
      maxSpellLevel: computed.maxSpellLevel,
      spellPenetrationBonus: featEffects.spellPenetrationBonus,
    });

    for (const spell of spellClass.spells) {
      const converted = spellToActionSet(spell.name);
      const schoolShort = converted.schoolShort?.toLowerCase();
      const dcMiscFromFeats = schoolShort
        ? featEffects.spellDcBonusBySchool[schoolShort] ?? 0
        : 0;
      
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
        spellClassKey,
        dcMiscFromFeats,
        schoolShort,
      });
    }
  }

  return { spells, spellUses, spellClasses };
}

export function pcCastingStatMod(
  state: PcPlanState,
  spellClass: SpellClassState,
): number {
  return abilityModifier(state.abilities[spellClass.dcAbility]);
}

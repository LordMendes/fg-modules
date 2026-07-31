import type { MonsterTemplateDelta } from "../types";

/** Curated SRD-style monster template deltas (simplified application). */
export const MONSTER_TEMPLATES: MonsterTemplateDelta[] = [
  {
    id: "celestial",
    name: "Celestial Creature",
    kind: "inherited",
    appliesTo: "Any corporeal aberration, animal, dragon, fey, giant, humanoid, magical beast, monstrous humanoid, plant, or vermin of non-evil alignment",
    crMod: 1,
    specialQualitiesAppend:
      "Darkvision 60 ft.; Resistance to acid, cold, and electricity 5 (HD 1–3) / 10 (HD 4–7) / 15 (HD 8+); Spell resistance equal to CR + 5; Smite evil 1/day",
    specialAttacksAppend: "Smite evil 1/day",
    notesHtml:
      "Review SR by CR, energy resistance by HD, and add the celestial subtype. Smite evil deals extra damage equal to HD vs evil.",
  },
  {
    id: "fiendish",
    name: "Fiendish Creature",
    kind: "inherited",
    appliesTo: "Any corporeal aberration, animal, dragon, fey, giant, humanoid, magical beast, monstrous humanoid, plant, or vermin of non-good alignment",
    crMod: 1,
    specialQualitiesAppend:
      "Darkvision 60 ft.; Resistance to cold and fire 5 (HD 1–3) / 10 (HD 4–7) / 15 (HD 8+); Spell resistance equal to CR + 5; Smite good 1/day",
    specialAttacksAppend: "Smite good 1/day",
    notesHtml:
      "Review SR by CR and energy resistance by HD. Add the fiendish subtype.",
  },
  {
    id: "half-dragon",
    name: "Half-Dragon",
    kind: "inherited",
    appliesTo: "Any living, corporeal creature",
    abilityMods: { str: 8, con: 2, int: 2, cha: 2 },
    naturalArmorBonus: 4,
    typeOverride: "Dragon (augmented)",
    crMod: 2,
    levelAdjustment: "+3",
    specialQualitiesAppend:
      "Darkvision 60 ft., low-light vision; Immunity to sleep and paralysis; Immunity to energy of breath weapon type",
    specialAttacksAppend: "Breath weapon 1/day (6d8, Reflex half)",
    notesHtml:
      "Type becomes dragon. Add claws/bite if needed. Choose dragon variety for breath weapon energy and immunities. Recalculate attacks for +8 Str.",
  },
  {
    id: "skeleton",
    name: "Skeleton",
    kind: "acquired",
    appliesTo: "Any corporeal creature with a skeletal system (not undead)",
    abilityMods: { dex: 2, cha: -4 },
    typeOverride: "Undead",
    crMod: 0,
    specialQualitiesAppend:
      "DR 5/bludgeoning; Immunity to cold; Undead traits; Darkvision 60 ft.",
    specialAttacksAppend: "—",
    notesHtml:
      "Lose Con (use Cha for bonus HP if needed). Drop class HD; racial HD become d12. Recalculate BAB/saves as undead. Natural armor may change by size.",
  },
  {
    id: "zombie",
    name: "Zombie",
    kind: "acquired",
    appliesTo: "Any corporeal creature (other than undead)",
    abilityMods: { str: 2, dex: -2 },
    typeOverride: "Undead",
    crMod: 0,
    specialQualitiesAppend:
      "Single actions only; DR 5/slashing; Undead traits; Darkvision 60 ft.",
    notesHtml:
      "HD become d12. Lose Con. Single actions only. Recalculate attacks and saves.",
  },
  {
    id: "vampire",
    name: "Vampire",
    kind: "acquired",
    appliesTo: "Any humanoid or monstrous humanoid",
    abilityMods: { str: 6, dex: 4, int: 2, wis: 2, cha: 4 },
    naturalArmorBonus: 6,
    typeOverride: "Undead (augmented)",
    crMod: 2,
    levelAdjustment: "+8",
    specialQualitiesAppend:
      "DR 10/silver and magic; Cold and electricity resistance 10; Fast healing 5; Gaseous form; Spider climb; Turn resistance +4; Undead traits; Alternate form; Children of the night; Create spawn; Blood drain; Dominate; Energy drain",
    specialAttacksAppend:
      "Blood drain, children of the night, create spawn, dominate, energy drain",
    notesHtml:
      "Full vampire template is complex — verify slam, gaseous form, and weaknesses (garlic, mirrors, running water, sunlight, wooden stake).",
  },
  {
    id: "werewolf",
    name: "Lycanthrope (Werewolf)",
    kind: "acquired",
    appliesTo: "Any humanoid or giant (sample: human werewolf)",
    abilityMods: { str: 2, con: 2, wis: 2 },
    naturalArmorBonus: 2,
    typeOverride: "Humanoid (human, shapechanger)",
    crMod: 1,
    levelAdjustment: "+3",
    specialQualitiesAppend:
      "Alternate form (human, hybrid, wolf); DR 10/silver (in animal or hybrid); Low-light vision; Scent; Lycanthropic empathy; Curse of lycanthropy",
    specialAttacksAppend: "Curse of lycanthropy; wolf bite in animal/hybrid",
    notesHtml:
      "Sample werewolf adjustments. Hybrid/animal forms need separate attack lines. Afflicted vs natural lycanthrope differs for control and LA.",
  },
  {
    id: "ghost",
    name: "Ghost",
    kind: "acquired",
    appliesTo: "Any aberration, animal, dragon, giant, humanoid, magical beast, monstrous humanoid, or plant",
    abilityMods: { cha: 4 },
    typeOverride: "Undead (augmented, incorporeal)",
    crMod: 2,
    levelAdjustment: "+5",
    specialQualitiesAppend:
      "Incorporeal; Manifestation; Rejuvenation; Turn resistance +4; Undead traits",
    specialAttacksAppend:
      "Corrupting gaze, corrupting touch, draining touch, frightful moan, malevolence, or telekinesis (pick special attacks)",
    notesHtml:
      "Choose ghost special attacks from the template list. Fly speed equals former land speed (perfect). Equipment and manifestation rules apply.",
  },
];

export function getMonsterTemplateById(
  id: string,
): MonsterTemplateDelta | undefined {
  return MONSTER_TEMPLATES.find((t) => t.id === id);
}

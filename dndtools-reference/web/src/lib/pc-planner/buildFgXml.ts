import { escXml } from "@/lib/npc-creator/buildXml";
import type { ClassSkillRef } from "@/lib/entities";
import { formatDefensesLine } from "./parseRaceFeatures";
import { resolveDerivedList } from "./derivedField";
import {
  getClassCastingInfo,
  halfCasterEffectiveLevel,
  isHalfCaster,
} from "./classCasting";
import {
  abilityModifier,
  computeCombatStats,
  type ClassAdvancementMap,
} from "./combatStats";
import { computeEquippedGear } from "./equippedGear";
import { deriveFeatEffects } from "./parseFeatEffects";
import { computeMaxHitPoints } from "./hitPoints";
import { classSkillKeySet } from "./syncSkills";
import {
  computeSkillTotal,
  isClassSkillRow,
  skillAbilityKey,
} from "./skillPoints";
import { computeSpellClass } from "./spellSlots";
import {
  computeWeaponAttackRows,
  parseWeaponCritical,
  type WeaponAttackRow,
} from "./weaponAttacks";
import { computeNaturalAttackRows } from "./specialAttacks";
import { inventoryMagicDamageBonus } from "./inventoryItem";
import { computeWeaponFeatBonuses } from "./weaponFeatBonuses";
import {
  isArmorKind,
  isShieldKind,
  isWeaponKind,
} from "./equippedGear";
import {
  resolveAttackAbility,
  resolveDamageAbility,
} from "./weaponAbilityComposition";
import type { ClassDerivedFeatures } from "./parseClassAbilityEffects";
import type { RaceDerivedFeatures } from "./parseRaceFeatures";
import type {
  AbilityKey,
  FeatEntry,
  InventoryRow,
  PcPlanState,
  SpellClassState,
  TreasureRow,
} from "./types";

export type PcFgExportOptions = {
  raceFeatures?: RaceDerivedFeatures | null;
  classFeatures?: ClassDerivedFeatures | null;
  classAdvancement?: ClassAdvancementMap | null;
  classHitDice?: Record<string, string> | null;
  classSkills?: ClassSkillRef[];
  classSpellTables?: Record<
    string,
    { advancementHtml?: string | null; descriptionHtml?: string | null }
  >;
  proficiencies?: string[];
};

const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

const FG_ROOT_VERSION = "5.1";
const FG_ROOT_RELEASE = "18|CoreRPG:7";

function abilityFgName(key: string): string {
  switch (key) {
    case "int":
      return "intelligence";
    case "wis":
      return "wisdom";
    case "cha":
      return "charisma";
    case "str":
      return "strength";
    case "dex":
      return "dexterity";
    case "con":
      return "constitution";
    default:
      return key;
  }
}

function listId(index: number): string {
  return `id-${String(index).padStart(5, "0")}`;
}

function sizeLabelFromMod(sizeMod: number): string {
  switch (sizeMod) {
    case 8:
      return "Fine";
    case 4:
      return "Diminutive";
    case 2:
      return "Tiny";
    case 1:
      return "Small";
    case -1:
      return "Large";
    case -2:
      return "Huge";
    case -4:
      return "Gargantuan";
    case -8:
      return "Colossal";
    default:
      return "Medium";
  }
}

function featExportName(feat: FeatEntry): string {
  if (feat.skillChoice?.trim()) {
    const choice = feat.skillChoice.trim();
    return feat.name.includes("(") ? feat.name : `${feat.name} (${choice})`;
  }
  if (feat.choice?.trim()) {
    const choice = feat.choice.trim();
    return feat.name.includes("(") ? feat.name : `${feat.name} (${choice})`;
  }
  return feat.name;
}

function inventoryCarried(row: InventoryRow): number {
  if (row.weaponHand || row.equipped) return 2;
  return 1;
}

function formatDicePool(dice: { qty: number; sides: number }[]): string {
  if (dice.length === 0) return "";
  const first = dice[0];
  return `${first.qty}d${first.sides}`;
}

function buildPcSpellsetXml(
  spellClass: SpellClassState,
  state: PcPlanState,
  options: PcFgExportOptions,
  classIndex: number,
): string {
  const info = getClassCastingInfo(spellClass.classSlug, spellClass.label);
  const computed = computeSpellClass(
    spellClass.classSlug,
    spellClass.label,
    spellClass.casterLevel,
    state.abilities,
    options.classSpellTables?.[spellClass.classSlug],
    {
      hasDomains: (state.identity.domains?.length ?? 0) > 0,
      specialistSchool: state.identity.specialistSchool,
    },
  );
  const cl = isHalfCaster(info)
    ? halfCasterEffectiveLevel(spellClass.casterLevel)
    : spellClass.casterLevel;
  const am = computed.dcModifier;
  const dcTotal = 10 + am;
  const mode = computed.mode === "spontaneous" ? "spontaneous" : "prepared";

  const p0 = "\t\t";
  const p1 = "\t\t\t";
  const p2 = "\t\t\t\t";
  const p3 = "\t\t\t\t\t";
  const p4 = "\t\t\t\t\t\t";
  const classId = listId(classIndex);

  const lines: string[] = [];
  lines.push(`${p0}<spellmode type="string">${mode}</spellmode>`);
  lines.push(`${p0}<spellset>`);
  lines.push(`${p1}<${classId}>`);

  for (let i = 0; i < 10; i++) {
    lines.push(
      `${p2}<availablelevel${i} type="number">${computed.slots[i] ?? 0}</availablelevel${i}>`,
    );
  }

  if (mode === "spontaneous") {
    lines.push(`${p2}<castertype type="string">spontaneous</castertype>`);
  }

  lines.push(`${p2}<cc>`);
  lines.push(`${p3}<misc type="number">0</misc>`);
  lines.push(`${p2}</cc>`);
  lines.push(`${p2}<cl type="number">${cl}</cl>`);
  lines.push(`${p2}<dc>`);
  lines.push(`${p3}<ability type="string">${abilityFgName(computed.dcAbility)}</ability>`);
  lines.push(`${p3}<abilitymod type="number">${am}</abilitymod>`);
  lines.push(`${p3}<misc type="number">0</misc>`);
  lines.push(`${p3}<total type="number">${dcTotal}</total>`);
  lines.push(`${p2}</dc>`);
  lines.push(`${p2}<label type="string">${escXml(spellClass.label)}</label>`);
  lines.push(`${p2}<levels>`);

  for (let sl = 0; sl < 10; sl++) {
    const atLevel = spellClass.spells.filter((sp) => sp.level === sl);
    lines.push(`${p3}<level${sl}>`);
    lines.push(`${p4}<level type="number">${sl}</level>`);
    lines.push(`${p4}<maxprepared type="number">0</maxprepared>`);
    if (atLevel.length === 0) {
      lines.push(`${p4}<spells />`);
    } else {
      lines.push(`${p4}<spells>`);
      atLevel.forEach((sp, idx) => {
        const eid = listId(idx + 1);
        const prepared =
          computed.mode === "preparation" ? Math.max(0, sp.prepared ?? 1) : 0;
        lines.push(`${p4}\t<${eid}>`);
        lines.push(`${p4}\t\t<cast type="number">0</cast>`);
        lines.push(`${p4}\t\t<cost type="number">${sl}</cost>`);
        lines.push(`${p4}\t\t<name type="string">${escXml(sp.name)}</name>`);
        lines.push(`${p4}\t\t<prepared type="number">${prepared}</prepared>`);
        lines.push(`${p4}\t</${eid}>`);
      });
      lines.push(`${p4}</spells>`);
    }
    const totalPrepared = atLevel.reduce(
      (sum, sp) =>
        sum + (computed.mode === "preparation" ? Math.max(0, sp.prepared ?? 1) : 0),
      0,
    );
    lines.push(`${p4}<totalcast type="number">0</totalcast>`);
    lines.push(`${p4}<totalprepared type="number">${totalPrepared}</totalprepared>`);
    lines.push(`${p3}</level${sl}>`);
  }

  lines.push(`${p2}</levels>`);
  lines.push(`${p2}<parse type="number">1</parse>`);
  lines.push(`${p2}<points type="number">0</points>`);
  lines.push(`${p2}<pointsused type="number">0</pointsused>`);
  lines.push(`${p2}<sp type="number">0</sp>`);
  lines.push(`${p1}</${classId}>`);
  lines.push(`${p0}</spellset>`);
  return lines.join("\n");
}

function buildAbilitiesXml(state: PcPlanState, indent: string): string[] {
  const lines: string[] = [];
  lines.push(`${indent}<abilities>`);
  for (const key of ABILITY_KEYS) {
    const fgName = abilityFgName(key);
    const score = state.abilities[key];
    const bonus = abilityModifier(score);
    lines.push(`${indent}\t<${fgName}>`);
    lines.push(`${indent}\t\t<score type="number">${score}</score>`);
    lines.push(`${indent}\t\t<damage type="number">0</damage>`);
    lines.push(`${indent}\t\t<bonus type="number">${bonus}</bonus>`);
    lines.push(`${indent}\t\t<bonusmodifier type="number">0</bonusmodifier>`);
    lines.push(`${indent}\t</${fgName}>`);
  }
  lines.push(`${indent}</abilities>`);
  return lines;
}

function buildClassesXml(state: PcPlanState, indent: string): string[] {
  const lines: string[] = [];
  lines.push(`${indent}<classes>`);
  state.identity.classLevels.forEach((cl, idx) => {
    lines.push(`${indent}\t<${listId(idx + 1)}>`);
    lines.push(`${indent}\t\t<level type="number">${cl.level}</level>`);
    lines.push(`${indent}\t\t<name type="string">${escXml(cl.className)}</name>`);
    lines.push(`${indent}\t</${listId(idx + 1)}>`);
  });
  lines.push(`${indent}</classes>`);
  return lines;
}

function buildSkillsXml(
  state: PcPlanState,
  classSkills: ClassSkillRef[],
  acp: number,
  indent: string,
): string[] {
  const keys = classSkillKeySet(classSkills);
  const rows = state.skills.filter((row) => {
    const misc = (row.misc ?? 0) + (row.racialMisc ?? 0) + (row.synergyMisc ?? 0);
    return row.ranks > 0 || misc !== 0;
  });
  if (rows.length === 0) return [];

  const lines: string[] = [];
  lines.push(`${indent}<skilllist>`);
  rows.forEach((row, idx) => {
    const abilityKey = skillAbilityKey(row.ability) ?? "int";
    const statMod = abilityModifier(state.abilities[abilityKey]);
    const misc =
      (row.misc ?? 0) + (row.racialMisc ?? 0) + (row.synergyMisc ?? 0);
    const total = computeSkillTotal(row, state.abilities, acp) ?? statMod + row.ranks + misc;
    lines.push(`${indent}\t<${listId(idx + 1)}>`);
    lines.push(`${indent}\t\t<label type="string">${escXml(row.name)}</label>`);
    lines.push(`${indent}\t\t<ranks type="number">${row.ranks}</ranks>`);
    lines.push(`${indent}\t\t<misc type="number">${misc}</misc>`);
    lines.push(`${indent}\t\t<stat type="number">${statMod}</stat>`);
    lines.push(
      `${indent}\t\t<statname type="string">${abilityFgName(abilityKey)}</statname>`,
    );
    lines.push(
      `${indent}\t\t<state type="number">${isClassSkillRow(row, keys) ? 1 : 0}</state>`,
    );
    lines.push(
      `${indent}\t\t<armorcheckmultiplier type="number">${row.armorCheckPenalty ? 1 : 0}</armorcheckmultiplier>`,
    );
    lines.push(`${indent}\t\t<showonminisheet type="number">1</showonminisheet>`);
    lines.push(`${indent}\t\t<total type="number">${total}</total>`);
    lines.push(`${indent}\t</${listId(idx + 1)}>`);
  });
  lines.push(`${indent}</skilllist>`);
  return lines;
}

function buildFeatlistXml(state: PcPlanState, indent: string): string[] {
  if (state.feats.length === 0) return [];
  const lines: string[] = [];
  lines.push(`${indent}<featlist>`);
  state.feats.forEach((feat, idx) => {
    lines.push(`${indent}\t<${listId(idx + 1)}>`);
    lines.push(`${indent}\t\t<name type="string">${escXml(featExportName(feat))}</name>`);
    lines.push(`${indent}\t</${listId(idx + 1)}>`);
  });
  lines.push(`${indent}</featlist>`);
  return lines;
}

function buildLanguagelistXml(state: PcPlanState, indent: string): string[] {
  const languages = resolveDerivedList(
    [],
    state.identity.languages ?? { customized: false, lines: [] },
  );
  if (languages.length === 0) return [];
  const lines: string[] = [];
  lines.push(`${indent}<languagelist>`);
  languages.forEach((lang, idx) => {
    lines.push(`${indent}\t<${listId(idx + 1)}>`);
    lines.push(`${indent}\t\t<name type="string">${escXml(lang)}</name>`);
    lines.push(`${indent}\t</${listId(idx + 1)}>`);
  });
  lines.push(`${indent}</languagelist>`);
  return lines;
}

function buildProficiencylistXml(proficiencies: string[], indent: string): string[] {
  if (proficiencies.length === 0) return [];
  const lines: string[] = [];
  lines.push(`${indent}<proficiencylist>`);
  proficiencies.forEach((name, idx) => {
    lines.push(`${indent}\t<${listId(idx + 1)}>`);
    lines.push(`${indent}\t\t<name type="string">${escXml(name)}</name>`);
    lines.push(`${indent}\t</${listId(idx + 1)}>`);
  });
  lines.push(`${indent}</proficiencylist>`);
  return lines;
}

function buildCoinsXml(treasure: TreasureRow[], indent: string): string[] {
  const rows = treasure.filter(
    (row) => row.name.trim() && Number.isFinite(row.amount) && row.amount !== 0,
  );
  if (rows.length === 0) return [];

  const lines: string[] = [];
  lines.push(`${indent}<coins>`);
  rows.forEach((row, idx) => {
    lines.push(`${indent}\t<${listId(idx + 1)}>`);
    lines.push(`${indent}\t\t<amount type="number">${row.amount}</amount>`);
    lines.push(`${indent}\t\t<name type="string">${escXml(row.name.trim())}</name>`);
    lines.push(`${indent}\t</${listId(idx + 1)}>`);
  });
  lines.push(`${indent}</coins>`);
  return lines;
}

function armorSubtype(row: InventoryRow): string {
  const category = (row.category ?? "").trim();
  if (category) {
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  }
  return "Light";
}

function buildInventoryXml(state: PcPlanState, indent: string): string[] {
  const rows = state.inventory.filter((row) => row.name.trim());
  if (rows.length === 0) return [];

  const lines: string[] = [];
  lines.push(`${indent}<inventorylist>`);
  rows.forEach((row, idx) => {
    const id = listId(idx + 1);
    lines.push(`${indent}\t<${id}>`);
    lines.push(`${indent}\t\t<name type="string">${escXml(row.name.trim())}</name>`);
    lines.push(`${indent}\t\t<count type="number">${row.quantity ?? 1}</count>`);
    lines.push(`${indent}\t\t<weight type="number">${row.weight ?? 0}</weight>`);
    lines.push(`${indent}\t\t<carried type="number">${inventoryCarried(row)}</carried>`);

    if (isWeaponKind(row.kind)) {
      lines.push(`${indent}\t\t<type type="string">Weapon</type>`);
      if (row.enhancementBonus) {
        lines.push(`${indent}\t\t<bonus type="number">${row.enhancementBonus}</bonus>`);
      }
      if (row.damageM) {
        lines.push(`${indent}\t\t<damage type="string">${escXml(row.damageM)}</damage>`);
      }
      if (row.damageType) {
        lines.push(
          `${indent}\t\t<damagetype type="string">${escXml(row.damageType)}</damagetype>`,
        );
      }
      if (row.critical) {
        lines.push(`${indent}\t\t<critical type="string">${escXml(row.critical)}</critical>`);
      }
      if (row.handed) {
        const handedLabel =
          row.handed === "two"
            ? "Two-Handed Melee"
            : row.handed === "ranged"
              ? "Ranged"
              : row.handed === "light"
                ? "Light Melee"
                : "One-Handed Melee";
        lines.push(`${indent}\t\t<subtype type="string">${handedLabel}</subtype>`);
      }
    } else if (isArmorKind(row.kind) || isShieldKind(row.kind)) {
      lines.push(`${indent}\t\t<type type="string">Armor</type>`);
      lines.push(
        `${indent}\t\t<subtype type="string">${isShieldKind(row.kind) ? "Shield" : armorSubtype(row)}</subtype>`,
      );
      if (row.armorBonus != null) {
        lines.push(`${indent}\t\t<ac type="number">${row.armorBonus}</ac>`);
      }
      if (row.enhancementBonus) {
        lines.push(`${indent}\t\t<bonus type="number">${row.enhancementBonus}</bonus>`);
      }
      if (row.maxDex != null) {
        lines.push(`${indent}\t\t<maxstatbonus type="number">${row.maxDex}</maxstatbonus>`);
      }
      if (row.acp != null) {
        lines.push(`${indent}\t\t<checkpenalty type="number">${row.acp}</checkpenalty>`);
      }
      if (row.arcaneSpellFailure != null) {
        lines.push(
          `${indent}\t\t<spellfailure type="number">${row.arcaneSpellFailure}</spellfailure>`,
        );
      }
      if (row.speed30 != null) {
        lines.push(`${indent}\t\t<speed30 type="number">${row.speed30}</speed30>`);
      }
      if (row.speed20 != null) {
        lines.push(`${indent}\t\t<speed20 type="number">${row.speed20}</speed20>`);
      }
    } else if (row.itemType) {
      lines.push(`${indent}\t\t<type type="string">${escXml(row.itemType)}</type>`);
    }

    lines.push(`${indent}\t</${id}>`);
  });
  lines.push(`${indent}</inventorylist>`);
  return lines;
}

function weaponBonusForRow(
  row: WeaponAttackRow,
  state: PcPlanState,
  stats: ReturnType<typeof computeCombatStats>,
): number {
  const sharedMisc =
    row.mode === "ranged"
      ? stats.ranged.parts.misc
      : stats.melee.parts.misc;
  const abilityMod =
    row.inventoryIndex >= 0
      ? resolveAttackAbility(state.inventory[row.inventoryIndex], state).mod
      : abilityModifier(state.abilities.str);
  const sizeMod = state.combat.sizeMod;
  return row.attackBonus - stats.bab - abilityMod - sizeMod - sharedMisc;
}

function buildWeaponlistXml(
  weaponRows: WeaponAttackRow[],
  state: PcPlanState,
  stats: ReturnType<typeof computeCombatStats>,
  indent: string,
): string[] {
  if (weaponRows.length === 0) return [];

  const lines: string[] = [];
  lines.push(`${indent}<weaponlist>`);
  weaponRows.forEach((row, idx) => {
    const id = listId(idx + 1);
    const attacks = Math.max(1, row.fullAttackBonuses.length);
    const bonus = weaponBonusForRow(row, state, stats);
    const critInfo = parseWeaponCritical(row.critical);
    const typeNum = row.mode === "ranged" ? 1 : 0;

    lines.push(`${indent}\t<${id}>`);
    lines.push(`${indent}\t\t<name type="string">${escXml(row.name)}</name>`);
    lines.push(`${indent}\t\t<type type="number">${typeNum}</type>`);
    lines.push(`${indent}\t\t<attacks type="number">${attacks}</attacks>`);
    lines.push(`${indent}\t\t<bonus type="number">${bonus}</bonus>`);
    lines.push(`${indent}\t\t<critatkrange type="number">${row.threatMin}</critatkrange>`);
    lines.push(`${indent}\t\t<carried type="number">${row.inventoryIndex >= 0 ? 2 : 1}</carried>`);
    lines.push(`${indent}\t\t<isidentified type="number">1</isidentified>`);

    row.fullAttackBonuses.forEach((value, attackIdx) => {
      lines.push(
        `${indent}\t\t<attackview${attackIdx + 1} type="number">${value}</attackview${attackIdx + 1}>`,
      );
    });

    if (row.inventoryIndex >= 0) {
      const invId = listId(row.inventoryIndex + 1);
      lines.push(`${indent}\t\t<shortcut type="windowreference">`);
      lines.push(`${indent}\t\t\t<class>item</class>`);
      lines.push(`${indent}\t\t\t<recordname>....inventorylist.${invId}</recordname>`);
      lines.push(`${indent}\t\t</shortcut>`);
    } else {
      lines.push(`${indent}\t\t<shortcut type="windowreference">`);
      lines.push(`${indent}\t\t\t<class />`);
      lines.push(`${indent}\t\t\t<recordname />`);
      lines.push(`${indent}\t\t</shortcut>`);
    }

    const dice = formatDicePool(row.damageDice);
    let dmgStat = "strength";
    let dmgStatMult = 1;
    let staticBonus = row.damageModifier;

    if (row.inventoryIndex >= 0) {
      const item = state.inventory[row.inventoryIndex];
      const dmgAbility = resolveDamageAbility(item, state);
      if (dmgAbility.key !== "none") {
        dmgStat = abilityFgName(dmgAbility.key);
      } else {
        dmgStat = "";
      }
      dmgStatMult = dmgAbility.mult;
      const featBonuses = computeWeaponFeatBonuses(state.feats, item);
      staticBonus =
        inventoryMagicDamageBonus(item) +
        featBonuses.damage +
        (item.damageMisc ?? 0);
    } else {
      staticBonus = row.damageModifier - abilityModifier(state.abilities.str);
      if (staticBonus < 0 && row.damageModifier <= 0) {
        staticBonus = row.damageModifier;
      }
    }

    lines.push(`${indent}\t\t<damagelist>`);
    lines.push(`${indent}\t\t\t<${listId(1)}>`);
    if (dice) {
      lines.push(`${indent}\t\t\t\t<dice type="dice">${escXml(dice)}</dice>`);
    }
    lines.push(`${indent}\t\t\t\t<bonus type="number">${staticBonus}</bonus>`);
    lines.push(`${indent}\t\t\t\t<critmult type="number">${critInfo.multiplier}</critmult>`);
    if (dmgStat) {
      lines.push(`${indent}\t\t\t\t<stat type="string">${dmgStat}</stat>`);
    } else {
      lines.push(`${indent}\t\t\t\t<stat type="string" />`);
    }
    lines.push(`${indent}\t\t\t\t<statmax type="number">0</statmax>`);
    lines.push(`${indent}\t\t\t\t<statmult type="number">${dmgStatMult}</statmult>`);
    if (row.damageType) {
      lines.push(
        `${indent}\t\t\t\t<type type="string">${escXml(row.damageType.toLowerCase())}</type>`,
      );
    }
    lines.push(`${indent}\t\t\t</${listId(1)}>`);
    lines.push(`${indent}\t\t</damagelist>`);
    lines.push(`${indent}\t</${id}>`);
  });
  lines.push(`${indent}</weaponlist>`);
  return lines;
}

/** Build Fantasy Grounds 3.5E character sheet XML from PC Planner state. */
export function buildPcFgXml(
  state: PcPlanState,
  options: PcFgExportOptions = {},
): string {
  const featEffects = deriveFeatEffects(state.feats);
  const stats = computeCombatStats(
    state,
    options.raceFeatures ?? null,
    options.classFeatures ?? null,
    options.classAdvancement ?? null,
    featEffects,
  );
  const gear = computeEquippedGear(state.inventory ?? [], state.combat.speedBase);
  const hpMax = computeMaxHitPoints(state, options.classHitDice ?? {});
  const hpCurrent = state.hitPoints?.current ?? hpMax;
  const hpTemp = state.hitPoints?.temporary ?? 0;
  const hpWounds = Math.max(0, hpMax - hpCurrent);
  const totalLevel = state.identity.classLevels.reduce((sum, cl) => sum + cl.level, 0);
  const defenseLine = state.identity.defenses
    ? formatDefensesLine(state.identity.defenses)
    : "";
  const senses = resolveDerivedList(
    [],
    state.identity.senses ?? { customized: false, lines: [] },
  );
  const notesParts: string[] = [];
  if (state.notes.trim()) notesParts.push(state.notes.trim());
  if (senses.length > 0) notesParts.push(`Senses: ${senses.join(", ")}`);
  const domains = (state.identity.domains ?? []).map((d) => d.name).join(", ");
  if (domains) notesParts.push(`Domains: ${domains}`);

  const acParts = stats.ac.parts;
  const ffParts = stats.flatFooted.parts;
  const touchParts = stats.touch.parts;
  const fortMisc =
    stats.fortitude.parts.racial +
    stats.fortitude.parts.ability +
    stats.fortitude.parts.misc;
  const refMisc =
    stats.reflex.parts.racial +
    stats.reflex.parts.ability +
    stats.reflex.parts.misc;
  const willMisc =
    stats.will.parts.racial +
    stats.will.parts.ability +
    stats.will.parts.misc;
  const speedParts = stats.speed.parts;
  const speedMiscCombined = speedParts.feat + speedParts.misc;

  const weaponRows = [
    ...computeWeaponAttackRows(state, stats),
    ...computeNaturalAttackRows(state, stats),
  ];

  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="utf-8"?>');
  parts.push(`<root version="${FG_ROOT_VERSION}" release="${FG_ROOT_RELEASE}">`);
  parts.push("\t<character>");

  parts.push(`\t\t<name type="string">${escXml(state.identity.name || "Unnamed")}</name>`);
  parts.push(`\t\t<race type="string">${escXml(state.identity.race)}</race>`);
  parts.push(`\t\t<alignment type="string">${escXml(state.identity.alignment)}</alignment>`);
  parts.push(`\t\t<size type="string">${escXml(sizeLabelFromMod(state.combat.sizeMod))}</size>`);
  if (state.identity.deity?.trim()) {
    parts.push(`\t\t<deity type="string">${escXml(state.identity.deity.trim())}</deity>`);
  }
  if (state.identity.gender?.trim()) {
    parts.push(`\t\t<gender type="string">${escXml(state.identity.gender.trim())}</gender>`);
  }
  if (state.identity.age?.trim()) {
    parts.push(`\t\t<age type="string">${escXml(state.identity.age.trim())}</age>`);
  }
  if (state.identity.height?.trim()) {
    parts.push(`\t\t<height type="string">${escXml(state.identity.height.trim())}</height>`);
  }
  if (state.identity.weight?.trim()) {
    parts.push(`\t\t<weight type="string">${escXml(state.identity.weight.trim())}</weight>`);
  }
  parts.push(`\t\t<level type="number">${totalLevel}</level>`);
  parts.push(`\t\t<exp type="number">${state.identity.xp ?? 0}</exp>`);
  parts.push(`\t\t<expneeded type="number">${state.identity.xpNecessary ?? 0}</expneeded>`);

  parts.push(...buildAbilitiesXml(state, "\t\t"));
  parts.push(...buildClassesXml(state, "\t\t"));

  parts.push("\t\t<hp>");
  parts.push(`\t\t\t<total type="number">${hpMax}</total>`);
  parts.push(`\t\t\t<wounds type="number">${hpWounds}</wounds>`);
  parts.push(`\t\t\t<temporary type="number">${hpTemp}</temporary>`);
  parts.push("\t\t\t<nonlethal type=\"number\">0</nonlethal>");
  parts.push("\t\t</hp>");

  parts.push("\t\t<ac>");
  parts.push("\t\t\t<sources>");
  parts.push(`\t\t\t\t<armor type="number">${acParts.armor}</armor>`);
  parts.push(`\t\t\t\t<shield type="number">${acParts.shield}</shield>`);
  parts.push(`\t\t\t\t<size type="number">${acParts.size}</size>`);
  parts.push(`\t\t\t\t<naturalarmor type="number">${acParts.natural}</naturalarmor>`);
  parts.push(`\t\t\t\t<deflection type="number">${acParts.deflection}</deflection>`);
  parts.push(`\t\t\t\t<dodge type="number">${acParts.dodge}</dodge>`);
  parts.push(`\t\t\t\t<misc type="number">${acParts.misc}</misc>`);
  parts.push(`\t\t\t\t<ffmisc type="number">${ffParts.misc}</ffmisc>`);
  parts.push(`\t\t\t\t<touchmisc type="number">${touchParts.misc}</touchmisc>`);
  parts.push("\t\t\t</sources>");
  parts.push("\t\t\t<totals>");
  parts.push(`\t\t\t\t<general type="number">${stats.ac.total}</general>`);
  parts.push(`\t\t\t\t<flatfooted type="number">${stats.flatFooted.total}</flatfooted>`);
  parts.push(`\t\t\t\t<touch type="number">${stats.touch.total}</touch>`);
  parts.push("\t\t\t</totals>");
  parts.push("\t\t</ac>");

  parts.push("\t\t<attackbonus>");
  parts.push(`\t\t\t<base type="number">${stats.bab}</base>`);
  for (const kind of ["melee", "ranged", "grapple"] as const) {
    const row = stats[kind];
    parts.push(`\t\t\t<${kind}>`);
    parts.push(`\t\t\t\t<size type="number">${row.parts.size}</size>`);
    parts.push(`\t\t\t\t<misc type="number">${row.parts.misc}</misc>`);
    parts.push(`\t\t\t\t<total type="number">${row.total}</total>`);
    parts.push(`\t\t\t</${kind}>`);
  }
  parts.push("\t\t</attackbonus>");

  parts.push("\t\t<saves>");
  for (const kind of ["fortitude", "reflex", "will"] as const) {
    const row = stats[kind];
    const misc =
      kind === "fortitude" ? fortMisc : kind === "reflex" ? refMisc : willMisc;
    parts.push(`\t\t\t<${kind}>`);
    parts.push(`\t\t\t\t<base type="number">${row.parts.class}</base>`);
    parts.push(`\t\t\t\t<misc type="number">${misc}</misc>`);
    parts.push(`\t\t\t\t<total type="number">${row.total}</total>`);
    parts.push(`\t\t\t</${kind}>`);
  }
  parts.push("\t\t</saves>");

  parts.push("\t\t<initiative>");
  parts.push(`\t\t\t<misc type="number">${stats.initiative.parts.misc}</misc>`);
  parts.push(`\t\t\t<total type="number">${stats.initiative.total}</total>`);
  parts.push("\t\t</initiative>");

  parts.push("\t\t<speed>");
  parts.push(`\t\t\t<base type="number">${speedParts.base}</base>`);
  parts.push(`\t\t\t<armor type="number">${speedParts.armor}</armor>`);
  parts.push(`\t\t\t<fastmovement type="number">${speedParts.class}</fastmovement>`);
  parts.push(`\t\t\t<misc type="number">${speedMiscCombined}</misc>`);
  parts.push(`\t\t\t<final type="number">${stats.speed.total}</final>`);
  parts.push("\t\t</speed>");

  parts.push("\t\t<defenses>");
  parts.push("\t\t\t<sr>");
  parts.push(`\t\t\t\t<base type="number">${stats.spellResistance.parts.base}</base>`);
  parts.push(`\t\t\t\t<misc type="number">${stats.spellResistance.parts.misc}</misc>`);
  parts.push(`\t\t\t\t<total type="number">${stats.spellResistance.total}</total>`);
  parts.push("\t\t\t</sr>");
  if (defenseLine) {
    parts.push(
      `\t\t\t<damagereduction type="string">${escXml(defenseLine)}</damagereduction>`,
    );
  }
  parts.push("\t\t</defenses>");

  parts.push("\t\t<encumbrance>");
  parts.push(`\t\t\t<armorcheckpenalty type="number">${gear.acp}</armorcheckpenalty>`);
  if (gear.maxDex != null) {
    parts.push(`\t\t\t<armormaxstatbonus type="number">${gear.maxDex}</armormaxstatbonus>`);
    parts.push("\t\t\t<armormaxstatbonusactive type=\"number\">1</armormaxstatbonusactive>");
  }
  parts.push(`\t\t\t<spellfailure type="number">${stats.arcaneSpellFailure}</spellfailure>`);
  parts.push("\t\t</encumbrance>");

  parts.push(...buildSkillsXml(state, options.classSkills ?? [], gear.acp, "\t\t"));
  parts.push(...buildFeatlistXml(state, "\t\t"));
  parts.push(...buildLanguagelistXml(state, "\t\t"));
  parts.push(...buildProficiencylistXml(options.proficiencies ?? [], "\t\t"));
  parts.push(...buildInventoryXml(state, "\t\t"));
  parts.push(...buildWeaponlistXml(weaponRows, state, stats, "\t\t"));
  parts.push(...buildCoinsXml(state.treasure ?? [], "\t\t"));

  state.spellClasses.forEach((sc, idx) => {
    const inBuild = state.identity.classLevels.some(
      (cl) => cl.classSlug === sc.classSlug,
    );
    if (!inBuild) return;
    const castingInfo = getClassCastingInfo(sc.classSlug, sc.label);
    if (sc.spells.length > 0 || (castingInfo && sc.casterLevel > 0)) {
      parts.push(buildPcSpellsetXml(sc, state, options, idx + 1));
    }
  });

  if (notesParts.length > 0) {
    parts.push('\t\t<notes type="string">');
    parts.push(`\t\t\t${escXml(notesParts.join("\n\n"))}`);
    parts.push("\t\t</notes>");
  }

  parts.push("\t</character>");
  parts.push("</root>");
  parts.push("");
  return parts.join("\n");
}

export function downloadTextFile(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function pcPlanExportBasename(state: PcPlanState): string {
  const raw = (state.identity.name || "character").trim().toLowerCase();
  const slug = raw.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "character";
  return slug.slice(0, 40);
}

export function pcFgExportOptionsFromCompendium(
  compendium: {
    raceFeatures?: RaceDerivedFeatures | null;
    classFeatures?: ClassDerivedFeatures;
    classAdvancement?: ClassAdvancementMap;
    classHitDice?: Record<string, string>;
    skills?: ClassSkillRef[];
    classSpellTables?: Record<
      string,
      { advancementHtml?: string | null; descriptionHtml?: string | null }
    >;
    proficiencies?: string[];
  } | null | undefined,
): PcFgExportOptions {
  if (!compendium) return {};
  return {
    raceFeatures: compendium.raceFeatures ?? null,
    classFeatures: compendium.classFeatures ?? null,
    classAdvancement: compendium.classAdvancement ?? null,
    classHitDice: compendium.classHitDice ?? {},
    classSkills: compendium.skills ?? [],
    classSpellTables: compendium.classSpellTables ?? {},
    proficiencies: compendium.proficiencies ?? [],
  };
}

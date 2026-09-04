import { escXml } from "@/lib/npc-creator/buildXml";
import {
  getClassCastingInfo,
  halfCasterEffectiveLevel,
  isHalfCaster,
} from "./classCasting";
import {
  computeCombatStats,
  formatIterativeAttacks,
  formatModifier,
} from "./combatStats";
import { deriveFeatEffects } from "./parseFeatEffects";
import {
  computeMaxHitPoints,
  formatHitDiceString,
} from "./hitPoints";
import { classSkillKeySet } from "./syncSkills";
import {
  computeSkillTotal,
  formatSkillModifier,
  isClassSkillRow,
} from "./skillPoints";
import { computeSpellClass } from "./spellSlots";
import type { ClassDerivedFeatures } from "./parseClassAbilityEffects";
import type { RaceDerivedFeatures } from "./parseRaceFeatures";
import type { ClassAdvancementMap } from "./combatStats";
import type { ClassSkillRef } from "@/lib/entities";
import type { PcPlanState, SpellClassState } from "./types";

export type PcFgExportOptions = {
  raceFeatures?: RaceDerivedFeatures | null;
  classFeatures?: ClassDerivedFeatures | null;
  classAdvancement?: ClassAdvancementMap | null;
  classHitDice?: Record<string, string> | null;
  classSkills?: ClassSkillRef[];
  classSpellTables?: Record<string, { advancementHtml?: string | null; descriptionHtml?: string | null }>;
};

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

function buildPcSpellsetXml(
  spellClass: SpellClassState,
  state: PcPlanState,
  options: PcFgExportOptions,
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

  const lines: string[] = [];
  lines.push(`${p0}<spellmode type="string">${mode}</spellmode>`);
  lines.push(`${p0}<spellset>`);
  lines.push(`${p1}<id-00001>`);

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
        const eid = `id-${String(idx + 1).padStart(5, "0")}`;
        const prepared = computed.mode === "preparation" ? Math.max(0, sp.prepared ?? 1) : 0;
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
      (sum, sp) => sum + (computed.mode === "preparation" ? Math.max(0, sp.prepared ?? 1) : 0),
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
  lines.push(`${p1}</id-00001>`);
  lines.push(`${p0}</spellset>`);
  return lines.join("\n");
}

function formatSkillsString(
  state: PcPlanState,
  classSkills: ClassSkillRef[],
): string {
  const keys = classSkillKeySet(classSkills);
  const parts: string[] = [];
  for (const row of state.skills) {
    if (!(row.ranks > 0) && !(row.misc || row.racialMisc)) continue;
    const total = computeSkillTotal(row, state.abilities, 0);
    if (total == null) continue;
    const mark = isClassSkillRow(row, keys) ? "" : "*";
    parts.push(`${row.name}${mark} ${formatSkillModifier(total)}`);
  }
  return parts.join(", ");
}

function formatClassString(state: PcPlanState): string {
  return state.identity.classLevels
    .map((cl) => `${cl.className} ${cl.level}`)
    .join(" / ");
}

function formatInventoryString(state: PcPlanState): string {
  const gear = state.inventory
    .filter((row) => row.name.trim())
    .map((row) => {
      const qty = row.quantity !== 1 ? `×${row.quantity}` : "";
      const eq = row.equipped ? " (equipped)" : "";
      return `${row.name}${qty}${eq}`;
    })
    .join("; ");
  const coins = (state.treasure ?? [])
    .filter((row) => row.name.trim() && Number.isFinite(row.amount) && row.amount !== 0)
    .map((row) => `${row.amount} ${row.name.trim()}`)
    .join(", ");
  if (gear && coins) return `${gear}; ${coins}`;
  return gear || coins;
}

/** Build CoreRPG character XML from PC Planner state. */
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
  const hitDice = options.classHitDice ?? {};
  const hd = formatHitDiceString(state.hitPoints?.rolls ?? [], hitDice);
  const hp = computeMaxHitPoints(state, hitDice);
  const feats = state.feats.map((f) => f.name).join(", ");
  const skills = formatSkillsString(state, options.classSkills ?? []);
  const classLine = formatClassString(state);
  const domains = (state.identity.domains ?? []).map((d) => d.name).join(", ");
  const inventory = formatInventoryString(state);

  const acString = `${stats.ac.total}, touch ${stats.touch.total}, flat-footed ${stats.flatFooted.total}`;
  const babString = formatIterativeAttacks(stats.bab);
  const melee = formatIterativeAttacks(stats.melee.total);
  const ranged = formatIterativeAttacks(stats.ranged.total);

  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="utf-8"?>');
  parts.push('<root version="5.1" release="9|CoreRPG:7">');
  parts.push("\t<character>");
  parts.push(`\t\t<name type="string">${escXml(state.identity.name || "Unnamed")}</name>`);
  parts.push(`\t\t<alignment type="string">${escXml(state.identity.alignment)}</alignment>`);
  parts.push(`\t\t<race type="string">${escXml(state.identity.race)}</race>`);
  parts.push(`\t\t<classlevel type="string">${escXml(classLine)}</classlevel>`);
  if (state.identity.deity) {
    parts.push(`\t\t<deity type="string">${escXml(state.identity.deity)}</deity>`);
  }
  if (domains) {
    parts.push(`\t\t<domains type="string">${escXml(domains)}</domains>`);
  }
  parts.push(`\t\t<strength type="number">${state.abilities.str}</strength>`);
  parts.push(`\t\t<dexterity type="number">${state.abilities.dex}</dexterity>`);
  parts.push(`\t\t<constitution type="number">${state.abilities.con}</constitution>`);
  parts.push(`\t\t<intelligence type="number">${state.abilities.int}</intelligence>`);
  parts.push(`\t\t<wisdom type="number">${state.abilities.wis}</wisdom>`);
  parts.push(`\t\t<charisma type="number">${state.abilities.cha}</charisma>`);
  parts.push(`\t\t<hd type="string">${escXml(hd)}</hd>`);
  parts.push(`\t\t<hp type="number">${hp}</hp>`);
  if (state.hitPoints?.current != null) {
    parts.push(`\t\t<hptemp type="number">${state.hitPoints.current}</hptemp>`);
  }
  parts.push(`\t\t<ac type="string">${escXml(acString)}</ac>`);
  parts.push(`\t\t<init type="number">${stats.initiative.total}</init>`);
  parts.push(`\t\t<speed type="string">${stats.speed.total} ft.</speed>`);
  parts.push(`\t\t<babgrp type="string">${escXml(`${babString}; Grp ${formatModifier(stats.grapple.total)}`)}</babgrp>`);
  parts.push(`\t\t<atk type="string">${escXml(`Melee ${melee} or Ranged ${ranged}`)}</atk>`);
  parts.push(`\t\t<fortitudesave type="number">${stats.fortitude.total}</fortitudesave>`);
  parts.push(`\t\t<reflexsave type="number">${stats.reflex.total}</reflexsave>`);
  parts.push(`\t\t<willsave type="number">${stats.will.total}</willsave>`);
  parts.push(`\t\t<feats type="string">${escXml(feats)}</feats>`);
  parts.push(`\t\t<skills type="string">${escXml(skills)}</skills>`);
  if (inventory) {
    parts.push(`\t\t<gear type="string">${escXml(inventory)}</gear>`);
  }
  if (state.combat.attacks.trim()) {
    parts.push(
      `\t\t<specialattacks type="string">${escXml(state.combat.attacks.trim())}</specialattacks>`,
    );
  }

  for (const sc of state.spellClasses) {
    parts.push(buildPcSpellsetXml(sc, state, options));
  }

  if (state.notes.trim()) {
    parts.push('\t\t<text type="formattedtext">');
    parts.push(`\t\t\t<p>${escXml(state.notes.trim())}</p>`);
    parts.push("\t\t</text>");
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

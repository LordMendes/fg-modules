import { buildSpellActionsXml } from "@/lib/fg-spell-actions/buildActionXml";
import type { DcAbility, NpcFgExportState, NpcFgSpellRow } from "./types";

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dcAbilityToKey(a: DcAbility): keyof NpcFgExportState["abilities"] {
  if (a === "intelligence") return "int";
  if (a === "charisma") return "cha";
  return "wis";
}

export function buildMergedSpecialQualities(s: NpcFgExportState): string {
  if (s.useLegacySpecialqualitiesOnly) return s.specialqualitiesManual.trim();
  const parts: string[] = [];
  const dr = s.dr.trim();
  if (dr) parts.push(/^dr\s/i.test(dr) ? dr : `DR ${dr}`);
  const sr = s.spellResistance.trim();
  if (sr) parts.push(/^sr\s/i.test(sr) ? sr : `SR ${sr}`);
  const im = s.immunities.trim();
  if (im) parts.push(/^immune/i.test(im) ? im : `Immune ${im}`);
  const res = s.resistances.trim();
  if (res) parts.push(/^resist/i.test(res) ? res : `Resist ${res}`);
  const vul = s.vulnerabilities.trim();
  if (vul) parts.push(/^vulner/i.test(vul) ? vul : `Vulnerable ${vul}`);
  const extra = s.specialqualitiesExtra.trim();
  if (extra) parts.push(extra);
  const manual = s.specialqualitiesManual.trim();
  if (manual) parts.push(manual);
  return parts.join("; ") || "-";
}

function spellEntryXml(
  spell: NpcFgSpellRow,
  spellSlotLevel: number,
  abilityMod: number,
  idx: number,
): string {
  const eid = `id-${String(idx).padStart(5, "0")}`;
  const p = "\t\t\t\t\t";
  const lines: string[] = [];
  lines.push(`${p}<${eid}>`);
  lines.push(
    buildSpellActionsXml(
      {
        cast: {
          othertags: spell.othertags,
          schoolShort: spell.schoolShort,
          savetype: spell.savetype || undefined,
          atktype: spell.atktype || undefined,
          onmissdamage: spell.onmissdamage || undefined,
          srnotallowed: spell.srNotAllowed,
        },
        action2: spell.action2,
        followUps: spell.actions,
      },
      abilityMod,
      `${p}\t`,
    ),
  );
  lines.push(`${p}\t<cast type="number">0</cast>`);
  lines.push(
    `${p}\t<castingtime type="string">${escXml(spell.castingTime)}</castingtime>`,
  );
  lines.push(
    `${p}\t<components type="string">${escXml(spell.components)}</components>`,
  );
  lines.push(`${p}\t<cost type="number">${spellSlotLevel}</cost>`);
  lines.push(
    `${p}\t<description type="string">${escXml(spell.description)}</description>`,
  );
  lines.push(
    `${p}\t<duration type="string">${escXml(spell.duration)}</duration>`,
  );
  lines.push(`${p}\t<effect type="string">${escXml(spell.area)}</effect>`);
  lines.push(`${p}\t<level type="string">${escXml(spell.levelStr)}</level>`);
  lines.push(`${p}\t<name type="string">${escXml(spell.name)}</name>`);
  lines.push(`${p}\t<prepared type="number">${spell.prepared}</prepared>`);
  lines.push(`${p}\t<range type="string">${escXml(spell.range)}</range>`);
  lines.push(`${p}\t<save type="string">${escXml(spell.save)}</save>`);
  lines.push(`${p}\t<school type="string">${escXml(spell.schoolFull)}</school>`);
  lines.push(
    `${p}\t<shortdescription type="string">${escXml(spell.short)}</shortdescription>`,
  );
  lines.push(`${p}\t<source type="string">SRD 3.5E</source>`);
  lines.push(`${p}\t<sr type="string">${escXml(spell.sr)}</sr>`);
  lines.push(`${p}</${eid}>`);
  return lines.join("\n");
}

function spellsBlockForLevel(
  level: number,
  spells: NpcFgSpellRow[],
  abilityMod: number,
): { xml: string; totalPrepared: number } {
  const here = spells.filter((sp) => sp.level === level);
  if (!here.length) {
    return { xml: "\t\t\t\t\t<spells />", totalPrepared: 0 };
  }
  const lines = ["\t\t\t\t\t<spells>"];
  let prepared = 0;
  here.forEach((sp, i) => {
    prepared += sp.prepared;
    lines.push(spellEntryXml(sp, level, abilityMod, i + 1));
  });
  lines.push("\t\t\t\t\t</spells>");
  return { xml: lines.join("\n"), totalPrepared: prepared };
}

function buildSpellsetFromState(s: NpcFgExportState): string {
  const sc = s.spellcasting;
  const abKey = dcAbilityToKey(sc.dcAbility);
  const am = abilityModifier(s.abilities[abKey]);
  const dcTotal = 10 + am + sc.dcMisc;

  const p0 = "\t\t";
  const p1 = "\t\t\t";
  const p2 = "\t\t\t\t";
  const p3 = "\t\t\t\t\t";
  const p4 = "\t\t\t\t\t\t";

  const lines: string[] = [];
  lines.push(`${p0}<spellmode type="string">${sc.mode}</spellmode>`);
  lines.push(`${p0}<spellset>`);
  lines.push(`${p1}<id-00001>`);

  for (let i = 0; i < 10; i++) {
    const n = sc.slots[i] ?? 0;
    lines.push(
      `${p2}<availablelevel${i} type="number">${n}</availablelevel${i}>`,
    );
  }

  if (sc.mode === "spontaneous") {
    lines.push(`${p2}<castertype type="string">spontaneous</castertype>`);
  }

  lines.push(`${p2}<cc>`);
  lines.push(`${p3}<misc type="number">0</misc>`);
  lines.push(`${p2}</cc>`);
  lines.push(`${p2}<cl type="number">${sc.casterLevel}</cl>`);
  lines.push(`${p2}<dc>`);
  lines.push(`${p3}<ability type="string">${sc.dcAbility}</ability>`);
  lines.push(`${p3}<abilitymod type="number">${am}</abilitymod>`);
  lines.push(`${p3}<misc type="number">${sc.dcMisc}</misc>`);
  lines.push(`${p3}<total type="number">${dcTotal}</total>`);
  lines.push(`${p2}</dc>`);
  lines.push(`${p2}<label type="string">${escXml(sc.label)}</label>`);
  lines.push(`${p2}<levels>`);

  for (let sl = 0; sl < 10; sl++) {
    lines.push(`${p3}<level${sl}>`);
    lines.push(`${p4}<level type="number">${sl}</level>`);
    lines.push(`${p4}<maxprepared type="number">0</maxprepared>`);
    const { xml, totalPrepared } = spellsBlockForLevel(sl, sc.spells, am);
    lines.push(xml);
    lines.push(`${p4}<totalcast type="number">0</totalcast>`);
    lines.push(
      `${p4}<totalprepared type="number">${totalPrepared}</totalprepared>`,
    );
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

export function buildNpcFgXml(s: NpcFgExportState): string {
  const sq = buildMergedSpecialQualities(s);
  const specAtk = s.specialattacksOverride.trim() || s.offense.specialattacks;

  const spellBlock =
    s.spellcasting.enabled && s.spellcasting.spellsetXmlOverride.trim()
      ? s.spellcasting.spellsetXmlOverride.trim()
      : s.spellcasting.enabled
        ? buildSpellsetFromState(s)
        : "";

  const dv = s.meta.rootDataversion.trim()
    ? ` dataversion="${escXml(s.meta.rootDataversion)}"`
    : "";

  const picture = s.media.picturePath.trim();
  const token = s.media.tokenPath.trim();
  const token3d = s.media.token3DPath.trim() || picture;

  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="utf-8"?>');
  parts.push(
    `<root version="${escXml(s.meta.rootVersion)}"${dv} release="${escXml(s.meta.rootRelease)}">`,
  );
  parts.push("\t<npc>");
  parts.push(`\t\t<ac type="string">${escXml(s.defense.ac)}</ac>`);
  parts.push(
    `\t\t<advancement type="string">${escXml(s.identity.advancement)}</advancement>`,
  );
  parts.push(
    `\t\t<alignment type="string">${escXml(s.identity.alignment)}</alignment>`,
  );

  if (s.aura.trim()) {
    parts.push(`\t\t<aura type="string">${escXml(s.aura.trim())}</aura>`);
  }

  parts.push(`\t\t<atk type="string">${escXml(s.offense.atk)}</atk>`);
  parts.push(`\t\t<babgrp type="string">${escXml(s.offense.babgrp)}</babgrp>`);
  parts.push(`\t\t<charisma type="number">${s.abilities.cha}</charisma>`);
  parts.push(
    `\t\t<constitution type="number">${s.abilities.con}</constitution>`,
  );
  parts.push(`\t\t<cr type="number">${s.identity.cr}</cr>`);
  parts.push(`\t\t<dexterity type="number">${s.abilities.dex}</dexterity>`);
  parts.push(
    `\t\t<environment type="string">${escXml(s.identity.environment)}</environment>`,
  );
  parts.push(`\t\t<feats type="string">${escXml(s.feats)}</feats>`);
  parts.push(
    `\t\t<fortitudesave type="number">${s.defense.fort}</fortitudesave>`,
  );
  parts.push(
    `\t\t<fullatk type="string">${escXml(s.offense.fullatk)}</fullatk>`,
  );
  parts.push(`\t\t<hd type="string">${escXml(s.defense.hd)}</hd>`);
  parts.push(`\t\t<hp type="number">${s.defense.hp}</hp>`);
  parts.push(`\t\t<init type="number">${s.defense.init}</init>`);
  parts.push(
    `\t\t<intelligence type="number">${s.abilities.int}</intelligence>`,
  );

  if (s.languages.trim()) {
    parts.push(
      `\t\t<languages type="string">${escXml(s.languages.trim())}</languages>`,
    );
  }

  parts.push(
    `\t\t<leveladjustment type="string">${escXml(s.identity.levelAdjustment)}</leveladjustment>`,
  );
  parts.push("\t\t<librarylink type=\"windowreference\">");
  parts.push("\t\t\t<class>npc</class>");
  parts.push("\t\t\t<recordname>..</recordname>");
  parts.push("\t\t</librarylink>");
  parts.push(`\t\t<locked type="number">${s.identity.locked ? 1 : 0}</locked>`);
  parts.push(`\t\t<name type="string">${escXml(s.identity.name)}</name>`);
  parts.push(
    `\t\t<organization type="string">${escXml(s.identity.organization)}</organization>`,
  );
  parts.push(
    `\t\t<picture type="token">${escXml(picture)}</picture>`,
  );
  parts.push(`\t\t<reflexsave type="number">${s.defense.ref}</reflexsave>`);

  if (s.senses.trim()) {
    parts.push(`\t\t<senses type="string">${escXml(s.senses.trim())}</senses>`);
  }

  parts.push(`\t\t<skills type="string">${escXml(s.skills)}</skills>`);
  parts.push(
    `\t\t<spacereach type="string">${escXml(s.offense.spaceReach)}</spacereach>`,
  );
  parts.push(
    `\t\t<specialattacks type="string">${escXml(specAtk)}</specialattacks>`,
  );
  parts.push(
    `\t\t<specialqualities type="string">${escXml(sq)}</specialqualities>`,
  );
  parts.push(`\t\t<speed type="string">${escXml(s.offense.speed)}</speed>`);

  if (spellBlock) {
    parts.push(spellBlock);
  }

  parts.push(
    `\t\t<spelldisplaymode type="string">${escXml(s.spellDisplayMode)}</spelldisplaymode>`,
  );
  parts.push(`\t\t<strength type="number">${s.abilities.str}</strength>`);
  parts.push("\t\t<text type=\"formattedtext\">");
  const magic = s.magicalEffectsNotes.trim();
  const noteBody =
    magic !== ""
      ? `${s.notesFormattedHtml.trim()}\n\t\t\t<p><b>Magical effects:</b> ${escXml(magic)}</p>`
      : s.notesFormattedHtml.trim();
  parts.push(`\t\t\t${noteBody}`);
  parts.push("\t\t</text>");
  parts.push(`\t\t<token type="token">${escXml(token)}</token>`);
  parts.push(
    `\t\t<token3Dflat type="token">${escXml(token3d)}</token3Dflat>`,
  );
  parts.push(
    `\t\t<treasure type="string">${escXml(s.identity.treasure)}</treasure>`,
  );
  parts.push(
    `\t\t<type type="string">${escXml(s.identity.creatureTypeTag)}</type>`,
  );
  parts.push(`\t\t<willsave type="number">${s.defense.will}</willsave>`);
  parts.push(`\t\t<wisdom type="number">${s.abilities.wis}</wisdom>`);
  parts.push("\t</npc>");
  parts.push("</root>");
  parts.push("");

  return parts.join("\n");
}

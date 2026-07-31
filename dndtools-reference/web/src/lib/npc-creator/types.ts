/** Serializable state for FG NPC export (D&D 3.5 / CoreRPG). */

import type {
  SpellAtkType,
  SpellFollowUpAction,
} from "@/lib/fg-spell-actions/types";

export type SpellMode = "preparation" | "spontaneous";

export type DcAbility = "wisdom" | "intelligence" | "charisma";

/** One spell per slot entry (level 0–9). */
export interface NpcFgSpellRow {
  level: number;
  name: string;
  prepared: number;
  schoolShort: string;
  schoolFull: string;
  levelStr: string;
  castingTime: string;
  components: string;
  range: string;
  area: string;
  duration: string;
  save: string;
  sr: string;
  short: string;
  description: string;
  othertags: string;
  srNotAllowed: boolean;
  savetype: "" | "fort" | "reflex" | "will";
  atktype?: SpellAtkType | "";
  onmissdamage?: "half" | "";
  action2?: SpellFollowUpAction;
  actions?: SpellFollowUpAction[];
}

export interface NpcMediaState {
  /** Preview-only data URL (not written to FG XML). */
  portraitDataUrl: string;
  tokenDataUrl: string;
  /** FG path: images/foo.webp@Module */
  picturePath: string;
  /** FG path: tokens/foo.webp@Module */
  tokenPath: string;
  token3DPath: string;
}

export interface NpcFgExportState {
  meta: {
    rootVersion: string;
    rootDataversion: string;
    rootRelease: string;
  };

  identity: {
    name: string;
    alignment: string;
    creatureTypeTag: string;
    advancement: string;
    organization: string;
    environment: string;
    treasure: string;
    cr: number;
    levelAdjustment: string;
    locked: boolean;
  };

  defense: {
    ac: string;
    hp: number;
    hd: string;
    fort: number;
    ref: number;
    will: number;
    init: number;
  };

  abilities: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };

  offense: {
    atk: string;
    fullatk: string;
    babgrp: string;
    speed: string;
    spaceReach: string;
    specialattacks: string;
  };

  senses: string;
  aura: string;
  languages: string;

  feats: string;
  skills: string;

  dr: string;
  spellResistance: string;
  immunities: string;
  resistances: string;
  vulnerabilities: string;
  specialqualitiesExtra: string;

  specialqualitiesManual: string;
  useLegacySpecialqualitiesOnly: boolean;

  specialattacksOverride: string;

  notesFormattedHtml: string;
  magicalEffectsNotes: string;

  spellcasting: {
    enabled: boolean;
    mode: SpellMode;
    label: string;
    casterLevel: number;
    dcAbility: DcAbility;
    dcMisc: number;
    slots: number[];
    spells: NpcFgSpellRow[];
    spellsetXmlOverride: string;
  };

  spellDisplayMode: string;

  media: NpcMediaState;
}

export type AbilityKey = keyof NpcFgExportState["abilities"];

export interface MonsterTemplateDelta {
  id: string;
  name: string;
  kind: "inherited" | "acquired";
  appliesTo: string;
  abilityMods?: Partial<Record<AbilityKey, number>>;
  naturalArmorBonus?: number;
  typeOverride?: string;
  crMod?: number | string;
  levelAdjustment?: string;
  specialQualitiesAppend?: string;
  specialAttacksAppend?: string;
  notesHtml?: string;
}

export interface ArchetypePreset {
  id: string;
  name: string;
  description: string;
  /** Partial or full state merged over defaults. */
  patch: unknown;
}

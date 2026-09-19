/** Combat faction aligned with Fantasy Grounds CT. */
export type CombatFaction = "friend" | "foe" | "neutral";

export type CombatantKind = "pc" | "npc";

export type CombatAttackMode = "melee" | "ranged";

/** Parsed offense line from FG-style attack text. */
export type CombatAttackLine = {
  name: string;
  bonus: number;
  mode: CombatAttackMode;
  damage: string;
  threatMin?: number;
};

/** Stored on CampaignNpc / combatant snapshot for display and rolls. */
export type CombatSnapshot = {
  speed?: string;
  fort?: number;
  ref?: number;
  will?: number;
  initMod?: number;
  abilities?: Partial<Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>>;
  special?: string;
  atkRaw?: string;
  fullAtkRaw?: string;
  acRaw?: string;
  hd?: string;
  sr?: string;
};

export type DamageType =
  | "slashing"
  | "piercing"
  | "bludgeoning"
  | "fire"
  | "cold"
  | "acid"
  | "electricity"
  | "sonic"
  | "force"
  | "positive"
  | "negative"
  | "magic"
  | "epic"
  | "adamantine"
  | "silver"
  | "coldiron"
  | "good"
  | "evil"
  | "lawful"
  | "chaotic"
  | "nonlethal"
  | "precision"
  | "spell"
  | "untyped";

export type BonusType =
  | "alchemical"
  | "armor"
  | "circumstance"
  | "competence"
  | "deflection"
  | "dodge"
  | "enhancement"
  | "insight"
  | "luck"
  | "morale"
  | "natural"
  | "profane"
  | "racial"
  | "resistance"
  | "sacred"
  | "shield"
  | "size";

export type Ability = "str" | "dex" | "con" | "int" | "wis" | "cha";

/** Known condition keys from the effects DSL (05-effects-dsl.md). */
export type ConditionKey =
  | "blinded"
  | "cowering"
  | "dazed"
  | "dazzled"
  | "deafened"
  | "disabled"
  | "dying"
  | "dead"
  | "entangled"
  | "exhausted"
  | "fascinated"
  | "fatigued"
  | "flatFooted"
  | "frightened"
  | "grappled"
  | "helpless"
  | "incorporeal"
  | "invisible"
  | "nauseated"
  | "panicked"
  | "paralyzed"
  | "petrified"
  | "pinned"
  | "prone"
  | "shaken"
  | "sickened"
  | "stable"
  | "staggered"
  | "stunned"
  | "turned"
  | "unconscious";

export type Defenses = {
  dr?: { amount: number; bypass: DamageType[] }[];
  resist?: Partial<Record<DamageType, number>>;
  immune?: DamageType[];
  vuln?: DamageType[];
  sr?: number | null;
  regen?: { amount: number; bypass: DamageType[] } | null;
  fastHeal?: number | null;
};

export type DamagePacket = {
  amount: number;
  types: DamageType[];
  source: string;
  nonlethal?: boolean;
  precision?: boolean;
  fromCrit?: boolean;
};

export type EffectComponent =
  | { tag: "COND"; condition: ConditionKey }
  | {
      tag: "ATK" | "AC" | "SAVE" | "FORT" | "REF" | "WILL" | "INIT" | "CL" | "SKILL" | "SPEED";
      value: number;
      bonusType?: BonusType;
      descriptors: string[];
    }
  | { tag: "ABIL"; ability: Ability; value: number; bonusType?: BonusType }
  | { tag: "DMG"; dice: string; value: number; types: DamageType[]; descriptors: string[] }
  | { tag: "DMGO"; dice: string; types: DamageType[] }
  | { tag: "DR"; amount: number; bypass: DamageType[] }
  | { tag: "RESIST" | "VULN"; amount: number; types: DamageType[] }
  | { tag: "IMMUNE"; types: DamageType[] }
  | { tag: "REGEN" | "FHEAL"; amount: number; bypass?: DamageType[] }
  | { tag: "CONC" | "TCONC" | "COVER" | "SCOVER" }
  | { tag: "LABEL"; text: string };

export type CombatEffectView = {
  id: string;
  label: string;
  components: EffectComponent[];
  sourceCombatantId: string | null;
  sourceName: string | null;
  duration: number | null;
  durationUnit: "round" | "minute" | "hour" | "day";
  expiry: "startOfTurn" | "endOfTurn";
  applyMode: "all" | "once" | "roll" | "single";
  visibility: "visible" | "hidden" | "gm";
  active: boolean;
  system: boolean;
};

export type CombatantView = {
  id: string;
  kind: CombatantKind;
  tokenId: string | null;
  pcPlanId: string | null;
  campaignNpcId: string | null;
  name: string;
  faction: CombatFaction;
  init: number;
  initMod: number;
  hpMax: number;
  hpTemp: number;
  wounds: number;
  ac: number;
  acTouch: number | null;
  acFlat: number | null;
  spaceSquares: number;
  reachFeet: number;
  attacks: CombatAttackLine[];
  targetIds: string[];
  visibleToPlayers: boolean;
  identified: boolean;
  snapshot: CombatSnapshot;
  /** Current HP after wounds/temp (derived). */
  hpCurrent: number;
  /** Player-facing health band when exact HP is hidden. */
  status: CombatHealthStatus;
  isCurrentTurn: boolean;
  tokenImageUrl: string | null;
  nonlethal: number;
  turnState: "normal" | "delayed" | "readied" | "dead" | "removed";
  deathState: "dying" | "stable" | "disabled" | "dead" | null;
  /** DM and owner only; players get {} */
  defenses: Defenses;
  /** Filtered per viewer */
  effects: CombatEffectView[];
  /** Actor and DM only */
  pendingTargetIds: string[];
  pendingCrit: { multiplier: number; threatFace: number; attackName: string } | null;
  stats: {
    str?: number;
    dex?: number;
    con?: number;
    int?: number;
    wis?: number;
    cha?: number;
    cl?: number;
  };
};

export type CombatHealthStatus =
  | "healthy"
  | "light"
  | "moderate"
  | "heavy"
  | "critical"
  | "dying"
  | "dead"
  | "wounded"
  | "bloodied";

export type CampaignNpcView = {
  id: string;
  name: string;
  faction: CombatFaction;
  source: "template" | "monster" | "adhoc";
  monsterSlug: string | null;
  snapshot: CombatSnapshot;
  imageUrl: string | null;
  /** Derived combat stats for preview / spawn. */
  hpMax: number;
  ac: number;
  spaceSquares: number;
  reachFeet: number;
  attacks: CombatAttackLine[];
  initMod: number;
};

export type CampaignCombatView = {
  id: string;
  round: number;
  currentCombatantId: string | null;
  active: boolean;
  state: "idle" | "active" | "ended";
  eventSeq: number;
  combatants: CombatantView[];
};

export type CampaignEncounterEntryView = {
  id: string;
  campaignNpcId: string;
  npcName: string;
  faction: CombatFaction;
  quantity: number;
  seq: number;
  imageUrl: string | null;
  hpMax: number;
  ac: number;
};

export type CampaignEncounterView = {
  id: string;
  name: string;
  updatedAt: string;
  creatureCount: number;
  entries: CampaignEncounterEntryView[];
};

export type CombatNpcSource = "template" | "monster" | "adhoc";

/** NPC combatants waiting to be placed on the map. */
export function unplacedNpcCombatants(
  combat: CampaignCombatView | null,
): CombatantView[] {
  if (!combat) return [];
  return combat.combatants.filter((c) => c.kind === "npc" && !c.tokenId);
}

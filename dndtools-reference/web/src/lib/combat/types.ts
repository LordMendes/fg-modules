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
};

export type CombatHealthStatus =
  | "healthy"
  | "wounded"
  | "bloodied"
  | "dying"
  | "dead";

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

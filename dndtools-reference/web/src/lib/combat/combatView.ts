import { deriveHealthStatus } from "./healthStatus";
import { currentHp } from "./parseHp";
import type {
  CampaignCombatView,
  CampaignEncounterEntryView,
  CampaignEncounterView,
  CampaignNpcView,
  CombatantView,
  CombatAttackLine,
  CombatFaction,
  CombatSnapshot,
} from "./types";

type CombatantRow = {
  id: string;
  kind: string;
  tokenId: string | null;
  pcPlanId: string | null;
  campaignNpcId: string | null;
  name: string;
  faction: string;
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
  attacks: unknown;
  targetIds: unknown;
  visibleToPlayers: boolean;
  identified: boolean;
  snapshot: unknown;
};

type CombatRow = {
  id: string;
  round: number;
  currentCombatantId: string | null;
  active: boolean;
  combatants: CombatantRow[];
};

type NpcRow = {
  id: string;
  name: string;
  faction: string;
  source: string;
  monsterSlug: string | null;
  snapshot: unknown;
  imageKey: string | null;
};

type EncounterEntryRow = {
  id: string;
  campaignNpcId: string;
  quantity: number;
  seq: number;
  campaignNpc: {
    name: string;
    faction: string;
    snapshot: unknown;
    imageKey: string | null;
  };
};

type EncounterRow = {
  id: string;
  name: string;
  updatedAt: Date;
  entries: EncounterEntryRow[];
};

function asFaction(raw: string): CombatFaction {
  if (raw === "friend" || raw === "neutral") return raw;
  return "foe";
}

function asAttacks(raw: unknown): CombatAttackLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (a): a is CombatAttackLine =>
      a &&
      typeof a === "object" &&
      typeof (a as CombatAttackLine).name === "string" &&
      typeof (a as CombatAttackLine).bonus === "number",
  );
}

function asTargetIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string");
}

function asSnapshot(raw: unknown): CombatSnapshot {
  if (!raw || typeof raw !== "object") return {};
  return raw as CombatSnapshot;
}

export function snapshotCombatStats(snapshot: unknown): {
  hpMax: number;
  ac: number;
  acTouch: number | null;
  acFlat: number | null;
  spaceSquares: number;
  reachFeet: number;
  attacks: CombatAttackLine[];
  initMod: number;
  snapshot: CombatSnapshot;
} {
  const s = (snapshot ?? {}) as Record<string, unknown>;
  const attacks = asAttacks(s.attacks);
  return {
    hpMax: typeof s.hpMax === "number" ? s.hpMax : 10,
    ac: typeof s.ac === "number" ? s.ac : 10,
    acTouch: typeof s.acTouch === "number" ? s.acTouch : null,
    acFlat: typeof s.acFlat === "number" ? s.acFlat : null,
    spaceSquares: typeof s.spaceSquares === "number" ? s.spaceSquares : 1,
    reachFeet: typeof s.reachFeet === "number" ? s.reachFeet : 5,
    attacks,
    initMod: typeof s.initMod === "number" ? s.initMod : 0,
    snapshot: asSnapshot(snapshot),
  };
}

export function combatantViewFromRow(
  row: CombatantRow,
  opts: {
    currentCombatantId: string | null;
    tokenImageUrl?: string | null;
    isDm: boolean;
    viewerPcPlanId?: string | null;
  },
): CombatantView {
  const wounds = Math.max(0, row.wounds);
  const hpTemp = Math.max(0, row.hpTemp);
  const hpCurrent = currentHp(row.hpMax, wounds, hpTemp);
  const status = deriveHealthStatus(row.hpMax, wounds, hpTemp);
  const showExactHp =
    opts.isDm ||
    (row.kind === "pc" && row.pcPlanId === opts.viewerPcPlanId);

  return {
    id: row.id,
    kind: row.kind === "pc" ? "pc" : "npc",
    tokenId: row.tokenId,
    pcPlanId: row.pcPlanId,
    campaignNpcId: row.campaignNpcId,
    name: row.name,
    faction: asFaction(row.faction),
    init: row.init,
    initMod: row.initMod,
    hpMax: row.hpMax,
    hpTemp,
    wounds,
    ac: row.ac,
    acTouch: row.acTouch,
    acFlat: row.acFlat,
    spaceSquares: row.spaceSquares,
    reachFeet: row.reachFeet,
    attacks: asAttacks(row.attacks),
    targetIds: asTargetIds(row.targetIds),
    visibleToPlayers: row.visibleToPlayers,
    identified: row.identified,
    snapshot: asSnapshot(row.snapshot),
    hpCurrent: showExactHp ? hpCurrent : 0,
    status,
    isCurrentTurn: row.id === opts.currentCombatantId,
    tokenImageUrl: opts.tokenImageUrl ?? null,
  };
}

export function combatViewFromRow(
  combat: CombatRow | null,
  opts: {
    isDm: boolean;
    viewerPcPlanId?: string | null;
    tokenImages?: Map<string, string | null>;
  },
): CampaignCombatView | null {
  if (!combat) return null;

  const combatants = combat.combatants
    .map((c) =>
      combatantViewFromRow(c, {
        currentCombatantId: combat.currentCombatantId,
        tokenImageUrl: c.tokenId
          ? opts.tokenImages?.get(c.tokenId) ?? null
          : null,
        isDm: opts.isDm,
        viewerPcPlanId: opts.viewerPcPlanId,
      }),
    )
    .sort((a, b) => b.init - a.init);

  return {
    id: combat.id,
    round: combat.round,
    currentCombatantId: combat.currentCombatantId,
    active: combat.active,
    combatants,
  };
}

export function npcViewFromRow(
  row: NpcRow,
  stats: {
    hpMax: number;
    ac: number;
    spaceSquares: number;
    reachFeet: number;
    attacks: CombatAttackLine[];
    initMod: number;
  },
  imageUrl: string | null,
): CampaignNpcView {
  return {
    id: row.id,
    name: row.name,
    faction: asFaction(row.faction),
    source:
      row.source === "template" || row.source === "monster"
        ? row.source
        : "adhoc",
    monsterSlug: row.monsterSlug,
    snapshot: asSnapshot(row.snapshot),
    imageUrl,
    hpMax: stats.hpMax,
    ac: stats.ac,
    spaceSquares: stats.spaceSquares,
    reachFeet: stats.reachFeet,
    attacks: stats.attacks,
    initMod: stats.initMod,
  };
}

export function encounterViewFromRow(row: EncounterRow): CampaignEncounterView {
  const entries: CampaignEncounterEntryView[] = [...row.entries]
    .sort((a, b) => a.seq - b.seq)
    .map((entry) => {
      const stats = snapshotCombatStats(entry.campaignNpc.snapshot);
      return {
        id: entry.id,
        campaignNpcId: entry.campaignNpcId,
        npcName: entry.campaignNpc.name,
        faction: asFaction(entry.campaignNpc.faction),
        quantity: Math.max(1, entry.quantity),
        seq: entry.seq,
        imageUrl: null,
        hpMax: stats.hpMax,
        ac: stats.ac,
      };
    });

  return {
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt.toISOString(),
    creatureCount: entries.reduce((sum, e) => sum + e.quantity, 0),
    entries,
  };
}

/** Expand encounter entries into named combatant slots (Goblin, Goblin 2, …). */
export function expandEncounterNames(
  entries: { name: string; quantity: number }[],
  existingNames: string[] = [],
): string[] {
  const used = [...existingNames];
  const result: string[] = [];
  for (const entry of entries) {
    const qty = Math.max(1, Math.floor(entry.quantity));
    for (let i = 0; i < qty; i += 1) {
      let name = entry.name;
      if (used.includes(name)) {
        let n = 2;
        while (used.includes(`${entry.name} ${n}`)) n += 1;
        name = `${entry.name} ${n}`;
      }
      used.push(name);
      result.push(name);
    }
  }
  return result;
}

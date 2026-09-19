import { deriveHealthStatus } from "./healthStatus";
import { currentHp } from "./parseHp";
import type {
  CampaignCombatView,
  CampaignEncounterEntryView,
  CampaignEncounterView,
  CampaignNpcView,
  CombatantView,
  CombatAttackLine,
  CombatEffectView,
  CombatFaction,
  CombatSnapshot,
  Defenses,
  EffectComponent,
} from "./types";

type EffectRow = {
  id: string;
  label: string;
  components: unknown;
  sourceCombatantId: string | null;
  duration: number | null;
  durationUnit: string;
  expiry: string;
  applyMode: string;
  visibility: string;
  active: boolean;
  system: boolean;
};

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
  seq?: number;
  nonlethal?: number;
  turnState?: string;
  deathState?: string | null;
  defenses?: unknown;
  pendingTargetIds?: unknown;
  pendingCrit?: unknown;
  stats?: unknown;
  effects?: EffectRow[];
};

type CombatRow = {
  id: string;
  round: number;
  currentCombatantId: string | null;
  active: boolean;
  state?: string;
  eventSeq?: number;
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

export type CombatViewOpts = {
  isDm: boolean;
  viewerPcPlanId?: string | null;
  tokenImages?: Map<string, string | null>;
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

function asDefenses(raw: unknown): Defenses {
  if (!raw || typeof raw !== "object") return {};
  return raw as Defenses;
}

function asPendingCrit(
  raw: unknown,
): { multiplier: number; threatFace: number; attackName: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.multiplier !== "number" ||
    typeof o.threatFace !== "number" ||
    typeof o.attackName !== "string"
  ) {
    return null;
  }
  return {
    multiplier: o.multiplier,
    threatFace: o.threatFace,
    attackName: o.attackName,
  };
}

function asCombatStats(raw: unknown): CombatantView["stats"] {
  if (!raw || typeof raw !== "object") return {};
  return raw as CombatantView["stats"];
}

function asTurnState(raw: string | undefined): CombatantView["turnState"] {
  if (
    raw === "delayed" ||
    raw === "readied" ||
    raw === "dead" ||
    raw === "removed"
  ) {
    return raw;
  }
  return "normal";
}

function asDeathState(raw: string | null | undefined): CombatantView["deathState"] {
  if (raw === "dying" || raw === "stable" || raw === "disabled" || raw === "dead") {
    return raw;
  }
  return null;
}

function asCombatState(raw: string | undefined): CampaignCombatView["state"] {
  if (raw === "active" || raw === "ended") return raw;
  return "idle";
}

function asEffectComponents(raw: unknown): EffectComponent[] {
  if (!Array.isArray(raw)) return [];
  return raw as EffectComponent[];
}

function effectViewFromRow(
  row: EffectRow,
  sourceNames: Map<string, string>,
): CombatEffectView {
  return {
    id: row.id,
    label: row.label,
    components: asEffectComponents(row.components),
    sourceCombatantId: row.sourceCombatantId,
    sourceName: row.sourceCombatantId
      ? sourceNames.get(row.sourceCombatantId) ?? null
      : null,
    duration: row.duration,
    durationUnit:
      row.durationUnit === "minute" ||
      row.durationUnit === "hour" ||
      row.durationUnit === "day"
        ? row.durationUnit
        : "round",
    expiry: row.expiry === "endOfTurn" ? "endOfTurn" : "startOfTurn",
    applyMode:
      row.applyMode === "once" ||
      row.applyMode === "roll" ||
      row.applyMode === "single"
        ? row.applyMode
        : "all",
    visibility:
      row.visibility === "hidden" || row.visibility === "gm"
        ? row.visibility
        : "visible",
    active: row.active,
    system: row.system,
  };
}

function filterEffectForViewer(
  effect: CombatEffectView,
  opts: { isDm: boolean; isOwner: boolean },
): CombatEffectView | null {
  if (effect.visibility === "gm" && !opts.isDm) return null;
  if (effect.visibility === "hidden" && !opts.isDm && !opts.isOwner) {
    return null;
  }

  const showComponents = opts.isDm || opts.isOwner;
  return {
    ...effect,
    components: showComponents ? effect.components : [],
  };
}

function buildGenericLabels(
  combatants: CombatantRow[],
): Map<string, string> {
  const labels = new Map<string, string>();
  let n = 1;
  for (const row of [...combatants].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))) {
    if (row.kind === "npc") {
      labels.set(row.id, `Creature ${n}`);
      n += 1;
    }
  }
  return labels;
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
    genericLabel?: string | null;
    sourceNames: Map<string, string>;
  },
): CombatantView {
  const wounds = Math.max(0, row.wounds);
  const hpTemp = Math.max(0, row.hpTemp);
  const nonlethal = Math.max(0, row.nonlethal ?? 0);
  const deathState = asDeathState(row.deathState);
  const hpCurrent = currentHp(row.hpMax, wounds, hpTemp);
  const status = deriveHealthStatus(
    row.hpMax,
    wounds,
    hpTemp,
    nonlethal,
    deathState,
  );
  const isOwner =
    row.kind === "pc" && row.pcPlanId != null && row.pcPlanId === opts.viewerPcPlanId;
  const showExactHp = opts.isDm || isOwner;
  const showDefenses = opts.isDm || isOwner;
  const showPending = opts.isDm || isOwner;
  const showIdentifiedDetails = opts.isDm || row.identified;

  const rawEffects = (row.effects ?? []).map((effect) =>
    effectViewFromRow(effect, opts.sourceNames),
  );
  const effects = rawEffects
    .map((effect) =>
      filterEffectForViewer(effect, { isDm: opts.isDm, isOwner }),
    )
    .filter((effect): effect is CombatEffectView => effect != null);

  const displayName =
    !opts.isDm && !row.identified && row.kind === "npc"
      ? opts.genericLabel ?? "Creature"
      : row.name;

  return {
    id: row.id,
    kind: row.kind === "pc" ? "pc" : "npc",
    tokenId: row.tokenId,
    pcPlanId: row.pcPlanId,
    campaignNpcId: row.campaignNpcId,
    name: displayName,
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
    attacks: showIdentifiedDetails ? asAttacks(row.attacks) : [],
    targetIds: asTargetIds(row.targetIds),
    visibleToPlayers: row.visibleToPlayers,
    identified: row.identified,
    snapshot: showIdentifiedDetails ? asSnapshot(row.snapshot) : {},
    hpCurrent: showExactHp ? hpCurrent : 0,
    status,
    isCurrentTurn: row.id === opts.currentCombatantId,
    tokenImageUrl: opts.tokenImageUrl ?? null,
    nonlethal: showExactHp ? nonlethal : 0,
    turnState: asTurnState(row.turnState),
    deathState,
    defenses: showDefenses ? asDefenses(row.defenses) : {},
    effects,
    pendingTargetIds: showPending ? asTargetIds(row.pendingTargetIds) : [],
    pendingCrit: showPending ? asPendingCrit(row.pendingCrit) : null,
    stats: showDefenses ? asCombatStats(row.stats) : {},
  };
}

export function combatViewFromRow(
  combat: CombatRow | null,
  opts: CombatViewOpts,
): CampaignCombatView | null {
  if (!combat) return null;

  const visibleRows = opts.isDm
    ? combat.combatants
    : combat.combatants.filter((c) => c.visibleToPlayers);

  const sourceNames = new Map<string, string>();
  for (const c of combat.combatants) {
    sourceNames.set(c.id, c.name);
  }
  const genericLabels = buildGenericLabels(combat.combatants);

  const combatants = visibleRows
    .map((c) =>
      combatantViewFromRow(c, {
        currentCombatantId: combat.currentCombatantId,
        tokenImageUrl: c.tokenId
          ? opts.tokenImages?.get(c.tokenId) ?? null
          : null,
        isDm: opts.isDm,
        viewerPcPlanId: opts.viewerPcPlanId,
        genericLabel: genericLabels.get(c.id) ?? null,
        sourceNames,
      }),
    )
    .sort((a, b) => b.init - a.init);

  return {
    id: combat.id,
    round: combat.round,
    currentCombatantId: combat.currentCombatantId,
    active: combat.active,
    state: asCombatState(combat.state),
    eventSeq: combat.eventSeq ?? 0,
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

# 03. Data model

One migration per phase. Phase 0 adds the effect and event tables and extends combatants. Phase 1 adds spell columns. Later phases are additive JSON.

## Prisma (Phase 0)

```prisma
model CampaignCombat {
  // existing fields ...
  /// idle | active | ended
  state              String   @default("idle")
  startedAt          DateTime?
  endedAt            DateTime?
  eventSeq           Int      @default(0)
  events             CampaignCombatEvent[]
}

model CampaignCombatant {
  // existing fields ...
  nonlethal        Int     @default(0)
  /// normal | delayed | readied | dead | removed
  turnState        String  @default("normal")
  /// dying | stable | disabled | dead | null (derived on write from hp, see rules/death.ts)
  deathState       String?
  /// Structured defenses parsed from stat block or edited by DM.
  defenses         Json    @default("{}")
  /// Server-side "who did I just hit"; cleared when the actor's turn ends.
  pendingTargetIds Json    @default("[]")
  /// Pending critical threat awaiting damage: { multiplier, threatFace, attackName } | null
  pendingCrit      Json?
  /// Ability modifiers and caster level for spells/effects: { str, dex, con, int, wis, cha, cl }
  stats            Json    @default("{}")
  effects          CampaignCombatEffect[]
}

model CampaignCombatEffect {
  id                 String   @id @default(cuid())
  combatantId        String
  combatant          CampaignCombatant @relation(fields: [combatantId], references: [id], onDelete: Cascade)
  /// Raw string as typed: "Bless; ATK: 1 morale; SAVE: 1 morale vs fear"
  label              String
  /// Parsed components cached for the engine (EffectComponent[])
  components         Json     @default("[]")
  sourceCombatantId  String?
  /// Remaining duration in units; null = until removed
  duration           Int?
  /// round | minute | hour | day
  durationUnit       String   @default("round")
  /// Init value whose turn start decrements duration (source init by default)
  tickInit           Float?
  /// startOfTurn | endOfTurn (whose: the tickInit actor)
  expiry             String   @default("startOfTurn")
  /// all | once | roll | single (FG apply modes; Phase 0 supports all, once)
  applyMode          String   @default("all")
  /// visible | hidden | gm
  visibility         String   @default("visible")
  active             Boolean  @default(true)
  /// true when created by rules (Dying, Dead, Stable, Disabled) so the engine can replace it
  system             Boolean  @default(false)
  seq                Int      @default(0)
  createdAt          DateTime @default(now())

  @@index([combatantId])
}

model CampaignCombatEvent {
  id                 String   @id @default(cuid())
  combatId           String
  combat             CampaignCombat @relation(fields: [combatId], references: [id], onDelete: Cascade)
  campaignId         String
  seq                Int
  round              Int
  /// see CombatEventKind
  kind               String
  actorCombatantId   String?
  targetCombatantId  String?
  actorUserId        String?
  /// Typed payload per kind (events/types.ts)
  payload            Json
  /// all | dm
  visibility         String   @default("all")
  /// Linked dice roll, if any
  rollId             String?
  /// Set when Phase 3 undo reverts this event
  revertedAt         DateTime?
  createdAt          DateTime @default(now())

  @@index([combatId, seq])
  @@index([campaignId, createdAt])
}
```

`CampaignCombatEvent.seq` comes from `CampaignCombat.eventSeq` incremented in the same transaction.

Keep `CampaignRoll` unchanged. Events reference rolls by `rollId`.

## Prisma (Phase 1)

```prisma
model CampaignCombatant {
  /// CombatSpellEntry[] : spells and spell-like abilities usable from the row
  spells           Json    @default("[]")
  /// Remaining uses per spell key or slot level: { "slot:3": 2, "sla:fireball": 1 }
  spellUses        Json    @default("{}")
}
```

PC spell slots stay in `PcPlan.state`; the combat row mirrors them the same way HP is mirrored today.

## JSON shapes (`src/lib/combat/types.ts`)

```ts
export type DamageType =
  | "slashing" | "piercing" | "bludgeoning"
  | "fire" | "cold" | "acid" | "electricity" | "sonic" | "force"
  | "positive" | "negative" | "magic" | "epic"
  | "adamantine" | "silver" | "coldiron" | "good" | "evil" | "lawful" | "chaotic"
  | "nonlethal" | "precision" | "spell" | "untyped";

export type Defenses = {
  dr?: { amount: number; bypass: DamageType[] }[];      // DR 10/magic -> bypass ["magic"]
  resist?: Partial<Record<DamageType, number>>;
  immune?: DamageType[];
  vuln?: DamageType[];                                   // x1.5
  sr?: number | null;
  regen?: { amount: number; bypass: DamageType[] } | null;
  fastHeal?: number | null;
};

export type DamagePacket = {
  amount: number;
  types: DamageType[];        // ["slashing","magic"] for a +1 longsword
  source: string;             // "Longsword", "Fireball"
  nonlethal?: boolean;
  precision?: boolean;
  fromCrit?: boolean;
};

export type EffectComponent =
  | { tag: "COND"; condition: ConditionKey }
  | { tag: "ATK" | "AC" | "SAVE" | "FORT" | "REF" | "WILL" | "INIT" | "CL" | "SKILL" | "SPEED";
      value: number; bonusType?: BonusType; descriptors: string[] }
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
  id: string; label: string; components: EffectComponent[];
  sourceCombatantId: string | null; sourceName: string | null;
  duration: number | null; durationUnit: "round" | "minute" | "hour" | "day";
  expiry: "startOfTurn" | "endOfTurn"; applyMode: "all" | "once" | "roll" | "single";
  visibility: "visible" | "hidden" | "gm"; active: boolean; system: boolean;
};

export type CombatantView = {
  // existing ...
  nonlethal: number;
  turnState: "normal" | "delayed" | "readied" | "dead" | "removed";
  deathState: "dying" | "stable" | "disabled" | "dead" | null;
  defenses: Defenses;            // DM and owner only; players get {}
  effects: CombatEffectView[];   // filtered per viewer
  pendingTargetIds: string[];    // actor and DM only
  pendingCrit: { multiplier: number; threatFace: number; attackName: string } | null;
  stats: { str?: number; dex?: number; con?: number; int?: number; wis?: number; cha?: number; cl?: number };
  status: CombatHealthStatus;    // extend: healthy | light | moderate | heavy | critical | dying | dead
};

export type CampaignCombatView = {
  // existing ...
  state: "idle" | "active" | "ended";
  eventSeq: number;
};
```

## Combat events (`src/lib/combat/events/types.ts`)

```ts
export type CombatEventKind =
  | "combatStart" | "combatEnd" | "roundStart" | "turnStart" | "turnEnd"
  | "init" | "delay" | "ready"
  | "target" | "untarget"
  | "attack" | "critConfirm" | "damage" | "heal" | "tempHp" | "nonlethal"
  | "save" | "sr" | "cast"
  | "effectApply" | "effectRemove" | "effectExpire" | "effectTick"
  | "death" | "stabilize" | "regen"
  | "hpEdit" | "note" | "undo";

export type AttackEventPayload = {
  attackName: string; attackType: "melee" | "ranged" | "mtouch" | "rtouch" | "grapple";
  face: number; bonus: number; adhoc: number; total: number;
  acType: "normal" | "touch" | "flat"; acValue: number;
  hit: boolean; autoMiss: boolean; autoHit: boolean; threat: boolean;
  concealmentRoll?: { face: number; missChance: number; missed: boolean };
  modifiers: { label: string; value: number }[];   // itemized for the log tooltip
};

export type DamageEventPayload = {
  source: string; packets: DamagePacket[]; crit: boolean; multiplier: number;
  adjustments: { kind: "dr" | "resist" | "immune" | "vuln" | "half" | "precisionImmune"; amount: number; note: string }[];
  applied: number; toTemp: number; toNonlethal: number;
  hpBefore: number; hpAfter: number; statusAfter: CombatHealthStatus;
};

export type SaveEventPayload = {
  saveType: "fort" | "ref" | "will"; dc: number; face: number; bonus: number; total: number;
  success: boolean; autoFail: boolean; source: string; consequence?: "half" | "negate" | "effect";
};
```

Add payloads for the remaining kinds in the same style. Every payload must carry enough to render the log line without a second lookup (names are copied in).

## Combat event view (per viewer)

```ts
export type CombatEventView = {
  id: string; seq: number; round: number; kind: CombatEventKind; at: string;
  actorName: string | null; targetName: string | null;
  /// Pre-rendered lines, already filtered: DM gets numbers, players get bands
  lines: { text: string; tone: "neutral" | "hit" | "miss" | "crit" | "damage" | "heal" | "effect" | "death" }[];
  payload: unknown;   // full payload for DM, redacted for players
  rollId: string | null;
  reverted: boolean;
};
```

## Live events (`src/lib/campaign/types.ts`)

Add to `CampaignLiveEvent`:

```ts
| { type: "combatEvent"; event: CombatEventView }            // filtered per viewer
| { type: "combatEffectUpsert"; combatantId: string; effect: CombatEffectView }
| { type: "combatEffectRemove"; combatantId: string; effectId: string }
| { type: "combatRollRequest"; requestId: string; targetCombatantId: string; saveType: "fort" | "ref" | "will"; dc: number | null; label: string }  // Phase 3
| { type: "combatRollRequestResolved"; requestId: string }    // Phase 3
```

`combatSnapshot` keeps its shape and gains the new fields on `CampaignCombatView`.

## Table payload

`getCampaignTable` returns `combat` (exists) plus `combatEvents: CombatEventView[]` (last 100, filtered). Players who join mid-fight see the log.

## Parsing into `defenses` and `stats`

Extend `monsterToCombatStats` and `npcCreatorToCombatStats` to fill `defenses` from the stat block text:

- `DR 10/magic`, `DR 5/-`, `DR 15/adamantine or silver`
- `Resist fire 10`, `resistance to fire 10, cold 5`
- `Immune to fire`, `immunity to fire and poison`
- `SR 18`
- `Regeneration 5 (fire, acid)`, `fast healing 3`
- Abilities line to `stats`, caster level from `Spells (CL 7th)` when present

Keep the raw text in `snapshot.special` for the DM to read.

`pcPlanToCombatStats` fills `attacks` from `weaponAttacks.ts` rows (name, bonuses per iterative attack, damage dice with modifier, damage types from the weapon, `threatMin`, `critMultiplier`) and `stats` from ability modifiers and caster level.

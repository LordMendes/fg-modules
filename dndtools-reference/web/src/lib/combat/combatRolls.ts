import { persistCampaignRoll, publishRoll } from "@/lib/campaign/rolls";
import { computeRollTotals, rollFaces } from "@/lib/campaign/rollFaces";
import { toCampaignRollView } from "@/lib/campaign/rollVisibility";
import type { DicePoolItem } from "@/lib/dice/types";
import { parseDiceNotation } from "@/lib/dice/parseDiceNotation";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { ActiveEffect } from "@/lib/combat/effects/applyEffects";
import type { CombatEventRecord, StatePatch } from "@/lib/combat/events/types";
import { parseEffect } from "@/lib/combat/effects/parseEffect";
import {
  applyCombatDamageInTx,
  combatantsForEventFilter,
  lockCombatRow,
  publishCombatEvent,
  publishCombatSnapshot,
  writeCombatEvent,
  type CombatActor,
  type LockedCombatRow,
} from "@/lib/combat/combatMutations";
import {
  resolveSpellCast,
  type SpellCastTarget,
} from "@/lib/combat/spells/spellAction";
import type {
  CombatRollIntent,
  CombatRollOutcome,
  CombatRollResult,
  StartCombatRollInput,
} from "@/lib/combat/combatRollTypes";
import {
  buildEngineContext,
  type CombatantFields,
} from "@/lib/combat/rules/engineContext";
import { rollInitiative, sortByInitiative } from "@/lib/combat/rules/initiative";
import {
  resolveAttack,
  resolveIterativeAttacks,
  type AttackLineInput,
} from "@/lib/combat/rules/attack";
import { resolveCriticalConfirm, scaleCriticalDamage } from "@/lib/combat/rules/critical";
import { heal } from "@/lib/combat/rules/healing";
import { resolveSave } from "@/lib/combat/rules/saves";
import { resolveSpellResistance } from "@/lib/combat/rules/spellResistance";
import { withEventTokenIds } from "@/lib/combat/eventTokenIds";
import { deriveHealthStatus } from "@/lib/combat/healthStatus";
import type {
  CombatAttackLine,
  CombatAttackType,
  CombatSpellEntry,
  CombatSpellUses,
  DamagePacket,
  Defenses,
} from "@/lib/combat/types";

type RollActor = CombatActor & {
  username: string;
  isDm: boolean;
  pcPlanId: string | null;
};

type LoadedCombatant = LockedCombatRow["combatants"][number];

function clampAdhoc(value: unknown): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-99, Math.min(99, Math.round(Number(value))));
}

function asTargetIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string");
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

function asSpells(raw: unknown): CombatSpellEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (entry): entry is CombatSpellEntry =>
      entry &&
      typeof entry === "object" &&
      typeof (entry as CombatSpellEntry).key === "string",
  );
}

function asSpellUses(raw: unknown): CombatSpellUses {
  if (!raw || typeof raw !== "object") return {};
  return raw as CombatSpellUses;
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

function mapDbEffects(
  rows: LoadedCombatant["effects"],
): ActiveEffect[] {
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    components: Array.isArray(row.components)
      ? (row.components as ActiveEffect["components"])
      : [],
    active: row.active,
    applyMode: row.applyMode as ActiveEffect["applyMode"],
  }));
}

function combatantFields(c: LoadedCombatant): CombatantFields {
  const snapshot = (c.snapshot ?? {}) as Record<string, unknown>;
  return {
    id: c.id,
    name: c.name,
    kind: c.kind === "pc" ? "pc" : "npc",
    ac: c.ac,
    acTouch: c.acTouch,
    acFlat: c.acFlat,
    fort: typeof snapshot.fort === "number" ? snapshot.fort : undefined,
    ref: typeof snapshot.ref === "number" ? snapshot.ref : undefined,
    will: typeof snapshot.will === "number" ? snapshot.will : undefined,
    initMod: c.initMod,
    hpMax: c.hpMax,
    hpTemp: c.hpTemp,
    wounds: c.wounds,
    nonlethal: c.nonlethal,
    defenses: (c.defenses ?? {}) as Defenses,
    reachFeet: undefined,
    stats: (c.stats ?? {}) as CombatantFields["stats"],
    effects: mapDbEffects(c.effects),
  };
}

function attackLineInput(line: CombatAttackLine): AttackLineInput {
  return {
    name: line.name,
    bonus: line.bonus,
    mode: line.mode,
    threatMin: line.threatMin,
    critMultiplier: line.critMultiplier,
    attackType: line.attackType,
    iterativeModifiers: line.iterativeBonuses,
  };
}

function mergePatches(patches: StatePatch[]): Map<string, StatePatch> {
  const merged = new Map<string, StatePatch>();
  for (const patch of patches) {
    const prev = merged.get(patch.combatantId) ?? { combatantId: patch.combatantId };
    merged.set(patch.combatantId, { ...prev, ...patch });
  }
  return merged;
}

async function applyStatePatches(
  tx: Prisma.TransactionClient,
  patches: StatePatch[],
): Promise<void> {
  for (const patch of mergePatches(patches).values()) {
    const data: Prisma.CampaignCombatantUpdateInput = {};
    if (patch.init != null) data.init = patch.init;
    if (patch.turnState != null) data.turnState = patch.turnState;
    if (patch.pendingTargetIds != null) {
      data.pendingTargetIds = patch.pendingTargetIds;
    }
    if (patch.pendingCrit !== undefined) {
      data.pendingCrit = patch.pendingCrit as Prisma.InputJsonValue;
    }
    if (patch.wounds != null) data.wounds = patch.wounds;
    if (patch.hpTemp != null) data.hpTemp = patch.hpTemp;
    if (patch.nonlethal != null) data.nonlethal = patch.nonlethal;
    if (patch.deathState !== undefined) data.deathState = patch.deathState;
    if (Object.keys(data).length === 0) continue;
    await tx.campaignCombatant.update({
      where: { id: patch.combatantId },
      data,
    });
  }
}

async function ownsCombatant(
  actor: RollActor,
  combatant: LoadedCombatant,
): Promise<boolean> {
  if (actor.isDm) return true;
  if (combatant.kind !== "pc" || !combatant.pcPlanId) return false;
  const link = await prisma.campaignPc.findFirst({
    where: {
      campaignId: actor.campaignId,
      pcPlanId: combatant.pcPlanId,
      userId: actor.userId,
    },
  });
  return Boolean(link);
}

function buildDamagePacketsFromRoll(
  line: CombatAttackLine,
  faces: number[],
  modifier: number,
  crit: boolean,
  multiplier: number,
): DamagePacket[] {
  const parsed = parseDiceNotation(line.damage);
  if (!parsed) {
    return [
      {
        amount: Math.max(0, faces.reduce((s, n) => s + n, 0) + modifier),
        types: line.damageTypes?.length ? line.damageTypes : ["untyped"],
        source: line.name,
        fromCrit: crit,
      },
    ];
  }

  let dice = parsed.dice;
  let mod = parsed.modifier + modifier;

  if (crit) {
    const scaled = scaleCriticalDamage({
      baseDice: `${parsed.dice[0]?.qty ?? 1}d${parsed.dice[0]?.sides ?? 8}`,
      baseModifier: mod,
      multiplier,
    });
    const scaledParsed = parseDiceNotation(scaled.scaledDice);
    dice = scaledParsed?.dice ?? parsed.dice;
    mod = scaled.scaledModifier;
  }

  const amount = Math.max(0, faces.reduce((s, n) => s + n, 0) + mod);
  return [
    {
      amount,
      types: line.damageTypes?.length ? line.damageTypes : ["untyped"],
      source: line.name,
      fromCrit: crit,
    },
  ];
}

async function resolveInitiativeIntent(
  tx: Prisma.TransactionClient,
  actor: RollActor,
  combat: LockedCombatRow,
  intent: Extract<CombatRollIntent, { kind: "initiative" }>,
  rollId: string,
  faces: number[],
): Promise<CombatEventRecord[]> {
  const events: CombatEventRecord[] = [];
  const patches: StatePatch[] = [];
  let faceIndex = 0;

  for (const combatantId of intent.combatantIds) {
    const row = combat.combatants.find((c) => c.id === combatantId) as LoadedCombatant | undefined;
    if (!row) continue;
    if (!(await ownsCombatant(actor, row)) && !actor.isDm) continue;

    const face = faces[faceIndex] ?? 1;
    faceIndex += 1;
    const ctx = buildEngineContext(combatantFields(row));
    const outcome = rollInitiative(ctx, face, row.initMod);
    patches.push(...outcome.patches);

    const event = await writeCombatEvent(tx, combat, "init", outcome.payload, {
      actorCombatantId: row.id,
      targetCombatantId: row.id,
      actorUserId: actor.userId,
      rollId,
    });
    events.push(event.record);
    row.init = outcome.payload.storedInit;
  }

  await applyStatePatches(tx, patches);

  if (!combat.currentCombatantId) {
    const sorted = sortByInitiative(
      combat.combatants.map((c) => ({
        id: c.id,
        init: c.init,
        initMod: c.initMod,
        turnState: c.turnState as "normal" | "delayed" | "readied" | "dead" | "removed",
      })),
      { skipInactive: true },
    );
    if (sorted[0]) {
      await tx.campaignCombat.update({
        where: { id: combat.id },
        data: { currentCombatantId: sorted[0].id, state: "active" },
      });
      combat.currentCombatantId = sorted[0].id;
    }
  }

  return events;
}

async function resolveAttackIntent(
  tx: Prisma.TransactionClient,
  actor: RollActor,
  combat: LockedCombatRow,
  intent: Extract<CombatRollIntent, { kind: "attack" }>,
  rollId: string,
  faces: number[],
  adhoc: number,
): Promise<CombatEventRecord[]> {
  const attacker = combat.combatants.find((c) => c.id === intent.attackerId) as
    | LoadedCombatant
    | undefined;
  if (!attacker) throw new Error("Attacker not found");
  if (!(await ownsCombatant(actor, attacker))) {
    throw new Error("Not allowed to roll for this combatant");
  }

  const attacks = asAttacks(attacker.attacks);
  const line = attacks[intent.attackIndex];
  if (!line) throw new Error("Attack line not found");

  const attackerCtx = buildEngineContext(combatantFields(attacker));
  const events: CombatEventRecord[] = [];
  const patches: StatePatch[] = [];
  const attackInput = attackLineInput(line);
  const attackType = intent.attackType ?? line.attackType ?? line.mode;

  for (const targetId of intent.targetIds) {
    const target = combat.combatants.find((c) => c.id === targetId) as LoadedCombatant | undefined;
    if (!target) continue;
    const targetCtx = buildEngineContext(combatantFields(target));

    const bonuses = line.iterativeBonuses ?? [line.bonus];
    const targetFaces = faces.slice(0, bonuses.length);
    const results =
      bonuses.length > 1
        ? resolveIterativeAttacks(attackerCtx, targetCtx, attackInput, targetFaces, adhoc)
        : [
            resolveAttack({
              attacker: attackerCtx,
              target: targetCtx,
              line: attackInput,
              face: targetFaces[0] ?? 1,
              adhoc,
              attackType,
            }),
          ];

    for (const result of results) {
      patches.push(...result.patches);
      const event = await writeCombatEvent(
        tx,
        combat,
        "attack",
        withEventTokenIds(
          result.payload,
          combat.combatants,
          attacker.id,
          target.id,
        ),
        {
          actorCombatantId: attacker.id,
          targetCombatantId: target.id,
          actorUserId: actor.userId,
          rollId,
        },
      );
      events.push(event.record);
    }
  }

  await applyStatePatches(tx, patches);
  return events;
}

async function resolveConfirmIntent(
  tx: Prisma.TransactionClient,
  actor: RollActor,
  combat: LockedCombatRow,
  intent: Extract<CombatRollIntent, { kind: "confirm" }>,
  rollId: string,
  face: number,
  adhoc: number,
): Promise<CombatEventRecord[]> {
  const attacker = combat.combatants.find((c) => c.id === intent.attackerId) as
    | LoadedCombatant
    | undefined;
  const target = combat.combatants.find((c) => c.id === intent.targetId) as
    | LoadedCombatant
    | undefined;
  if (!attacker || !target) throw new Error("Combatant not found");
  if (!(await ownsCombatant(actor, attacker))) {
    throw new Error("Not allowed to roll for this combatant");
  }

  const attacks = asAttacks(attacker.attacks);
  const line = attacks[intent.attackIndex];
  if (!line) throw new Error("Attack line not found");

  const pendingCrit = asPendingCrit(attacker.pendingCrit);
  const outcome = resolveCriticalConfirm({
    attacker: buildEngineContext(combatantFields(attacker)),
    target: buildEngineContext(combatantFields(target)),
    line: attackLineInput(line),
    face,
    adhoc,
    attackType: intent.attackType ?? line.attackType ?? line.mode,
    pendingCrit: pendingCrit ?? undefined,
  });

  await applyStatePatches(tx, outcome.patches);
  const event = await writeCombatEvent(
    tx,
    combat,
    "critConfirm",
    withEventTokenIds(
      outcome.payload,
      combat.combatants,
      attacker.id,
      target.id,
    ),
    {
      actorCombatantId: attacker.id,
      targetCombatantId: target.id,
      actorUserId: actor.userId,
      rollId,
    },
  );
  return [event.record];
}

async function resolveDamageIntent(
  tx: Prisma.TransactionClient,
  actor: RollActor,
  combat: LockedCombatRow,
  intent: Extract<CombatRollIntent, { kind: "damage" }>,
  rollId: string,
  faces: number[],
  adhoc: number,
): Promise<CombatEventRecord[]> {
  const attacker = combat.combatants.find((c) => c.id === intent.attackerId) as
    | LoadedCombatant
    | undefined;
  if (!attacker) throw new Error("Attacker not found");
  if (!(await ownsCombatant(actor, attacker))) {
    throw new Error("Not allowed to roll for this combatant");
  }

  const attacks = asAttacks(attacker.attacks);
  const line = attacks[intent.attackIndex];
  if (!line && !intent.packets?.length) throw new Error("Attack line not found");

  const pendingCrit = asPendingCrit(attacker.pendingCrit);
  const crit = intent.crit ?? Boolean(pendingCrit);
  const multiplier = intent.multiplier ?? pendingCrit?.multiplier ?? line?.critMultiplier ?? 2;
  const targetIds =
    intent.targetIds?.length ? intent.targetIds : asTargetIds(attacker.pendingTargetIds);
  if (targetIds.length === 0) throw new Error("No damage targets");

  const packets =
    intent.packets ??
    buildDamagePacketsFromRoll(line!, faces, adhoc, crit, multiplier);

  const events: CombatEventRecord[] = [];
  for (const targetId of targetIds) {
    const applied = await applyCombatDamageInTx(tx, actor, combat, targetId, {
      packets,
      source: line?.name ?? packets[0]?.source ?? "Damage",
      attackType: (intent.attackType ?? line?.attackType ?? line?.mode) as
        | CombatAttackType
        | undefined,
      crit,
      multiplier,
      rollId,
      actorCombatantId: attacker.id,
    });
    if (!applied.success) throw new Error(applied.error);
    events.push(...applied.events);
  }

  await applyStatePatches(tx, [
    { combatantId: attacker.id, pendingTargetIds: [], pendingCrit: null },
  ]);

  return events;
}

async function resolveSaveIntent(
  tx: Prisma.TransactionClient,
  actor: RollActor,
  combat: LockedCombatRow,
  intent: Extract<CombatRollIntent, { kind: "save" }>,
  rollId: string,
  faces: number[],
  adhoc: number,
): Promise<CombatEventRecord[]> {
  const events: CombatEventRecord[] = [];
  let faceIndex = 0;

  for (const targetId of intent.targetIds) {
    const target = combat.combatants.find((c) => c.id === targetId) as LoadedCombatant | undefined;
    if (!target) continue;
    if (!(await ownsCombatant(actor, target)) && !actor.isDm) continue;

    const face = faces[faceIndex] ?? 1;
    faceIndex += 1;
    const outcome = resolveSave(
      {
        saves: {
          fort: buildEngineContext(combatantFields(target)).saves.fort,
          ref: buildEngineContext(combatantFields(target)).saves.ref,
          will: buildEngineContext(combatantFields(target)).saves.will,
        },
        conditions: [...buildEngineContext(combatantFields(target)).conditions],
        effects: mapDbEffects(target.effects),
      },
      intent.saveType,
      intent.dc,
      face,
      { label: intent.source },
      adhoc,
    );

    const event = await writeCombatEvent(
      tx,
      combat,
      "save",
      withEventTokenIds(
        {
          saveType: outcome.saveType,
          dc: outcome.dc,
          face: outcome.face,
          bonus: outcome.bonus,
          total: outcome.total,
          success: outcome.success,
          autoFail: false,
          source: outcome.source,
          consequence: intent.consequence,
        },
        combat.combatants,
        null,
        target.id,
      ),
      {
        targetCombatantId: target.id,
        actorUserId: actor.userId,
        rollId,
      },
    );
    events.push(event.record);

    if (intent.requestId) {
      const { resolveRollRequestStatus } =
        await import("@/lib/combat/phase3Mutations");
      const { publishRollRequestResolved } =
        await import("@/lib/combat/rollRequests");
      await resolveRollRequestStatus(
        intent.requestId,
        actor.isDm ? "dmRolled" : "rolled",
      );
      publishRollRequestResolved(actor.campaignId, intent.requestId);
    }
  }

  return events;
}

async function resolveHealIntent(
  tx: Prisma.TransactionClient,
  actor: RollActor,
  combat: LockedCombatRow,
  intent: Extract<CombatRollIntent, { kind: "heal" }>,
  rollId: string,
  faces: number[],
  modifier: number,
): Promise<CombatEventRecord[]> {
  const amount =
    intent.amount ??
    Math.max(0, faces.reduce((s, n) => s + n, 0) + (intent.modifier ?? modifier));
  const events: CombatEventRecord[] = [];

  for (const targetId of intent.targetIds) {
    const target = combat.combatants.find((c) => c.id === targetId) as LoadedCombatant | undefined;
    if (!target) continue;
    if (!(await ownsCombatant(actor, target)) && !actor.isDm) continue;

    const hpBefore = Math.max(0, target.hpMax - target.wounds);
    const result = heal(amount, {
      hpMax: target.hpMax,
      wounds: target.wounds,
      hpTemp: target.hpTemp,
      nonlethal: target.nonlethal,
      deathState: target.deathState as "dying" | "stable" | "disabled" | "dead" | null,
    });

    await tx.campaignCombatant.update({
      where: { id: target.id },
      data: { wounds: result.wounds, nonlethal: result.nonlethal },
    });
    target.wounds = result.wounds;
    target.nonlethal = result.nonlethal;

    const hpAfter = Math.max(0, target.hpMax - result.wounds);
    const event = await writeCombatEvent(
      tx,
      combat,
      "heal",
      withEventTokenIds(
        {
          source: intent.source ?? "Heal",
          amount: result.healed,
          hpBefore,
          hpAfter,
          hpMax: target.hpMax,
          statusAfter: deriveHealthStatus(
            target.hpMax,
            result.wounds,
            target.hpTemp,
            target.nonlethal,
            target.deathState as import("@/lib/combat/types").CombatantView["deathState"],
          ),
        },
        combat.combatants,
        null,
        target.id,
      ),
      {
        targetCombatantId: target.id,
        actorUserId: actor.userId,
        rollId,
      },
    );
    events.push(event.record);
  }

  return events;
}

async function resolveStabilizeIntent(
  tx: Prisma.TransactionClient,
  actor: RollActor,
  combat: LockedCombatRow,
  intent: Extract<CombatRollIntent, { kind: "stabilize" }>,
  rollId: string,
  face: number,
): Promise<CombatEventRecord[]> {
  const target = combat.combatants.find((c) => c.id === intent.targetId) as
    | LoadedCombatant
    | undefined;
  if (!target) throw new Error("Combatant not found");
  if (!actor.isDm && !(await ownsCombatant(actor, target))) {
    throw new Error("Not allowed to stabilize this combatant");
  }

  const success = face >= 10;
  if (success) {
    await tx.campaignCombatant.update({
      where: { id: target.id },
      data: { deathState: "stable" },
    });
  }

  const event = await writeCombatEvent(tx, combat, "stabilize", {
    targetName: target.name,
    success,
    face,
  }, {
    targetCombatantId: target.id,
    actorUserId: actor.userId,
    rollId,
  });
  return [event.record];
}

async function resolveCastIntent(
  tx: Prisma.TransactionClient,
  actor: RollActor,
  combat: LockedCombatRow,
  intent: Extract<CombatRollIntent, { kind: "cast" }>,
  rollId: string,
  faces: number[],
): Promise<CombatEventRecord[]> {
  const caster = combat.combatants.find((c) => c.id === intent.casterId) as
    | LoadedCombatant
    | undefined;
  if (!caster) throw new Error("Caster not found");
  if (!(await ownsCombatant(actor, caster))) {
    throw new Error("Not allowed to cast for this combatant");
  }

  const spells = asSpells(caster.spells);
  const entry = spells.find((s) => s.key === intent.spellKey);
  if (!entry) throw new Error("Spell not found on combatant");

  const spellUses = { ...asSpellUses(caster.spellUses) };
  const casterEngine = buildEngineContext(combatantFields(caster));
  const targets: SpellCastTarget[] = [];
  for (const targetId of intent.targetIds) {
    const row = combat.combatants.find((c) => c.id === targetId) as
      | LoadedCombatant
      | undefined;
    if (!row) continue;
    targets.push({
      id: row.id,
      name: row.name,
      engine: buildEngineContext(combatantFields(row)),
      defenses: (row.defenses ?? {}) as Defenses,
    });
  }

  const resolution = resolveSpellCast(
    {
      id: caster.id,
      name: caster.name,
      init: caster.init,
      effects: mapDbEffects(caster.effects),
      spellUses,
      engine: casterEngine,
      attackBonus: intent.attackBonus,
    },
    targets,
    entry,
    faces,
    {
      casterLevel: intent.casterLevel ?? entry.casterLevel ?? casterEngine.casterLevel ?? 1,
      spellLevel: intent.spellLevel ?? entry.level ?? 0,
      castingStatMod: intent.castingStatMod ?? 0,
      attackBonus: intent.attackBonus,
      dmOverrideSlots: intent.dmOverrideSlots,
    },
  );

  if (resolution.blocked) throw new Error(resolution.blocked);

  const events: CombatEventRecord[] = [];
  for (const draft of resolution.events) {
    const written = await writeCombatEvent(tx, combat, draft.kind, draft.payload as never, {
      actorCombatantId: draft.actorCombatantId ?? caster.id,
      targetCombatantId: draft.targetCombatantId ?? null,
      actorUserId: actor.userId,
      rollId,
    });
    events.push(written.record);
  }

  for (const plan of resolution.damagePlans) {
    if (plan.skip || plan.packets.length === 0) continue;
    const applied = await applyCombatDamageInTx(tx, actor, combat, plan.targetId, {
      packets: plan.packets,
      source: entry.name,
      flags: plan.half ? { half: true } : undefined,
      rollId,
      actorCombatantId: caster.id,
    });
    if (!applied.success) throw new Error(applied.error);
    events.push(...applied.events);
  }

  for (const plan of resolution.healPlans) {
    const target = combat.combatants.find((c) => c.id === plan.targetId) as
      | LoadedCombatant
      | undefined;
    if (!target) continue;
    const hpBefore = Math.max(0, target.hpMax - target.wounds);
    const result = heal(plan.amount, {
      hpMax: target.hpMax,
      wounds: target.wounds,
      hpTemp: target.hpTemp,
      nonlethal: target.nonlethal,
      deathState: target.deathState as import("@/lib/combat/types").CombatantView["deathState"],
    });
    await tx.campaignCombatant.update({
      where: { id: target.id },
      data: { wounds: result.wounds, nonlethal: result.nonlethal },
    });
    target.wounds = result.wounds;
    target.nonlethal = result.nonlethal;
    const event = await writeCombatEvent(tx, combat, "heal", {
      source: entry.name,
      amount: result.healed,
      hpBefore,
      hpAfter: Math.max(0, target.hpMax - result.wounds),
      hpMax: target.hpMax,
      statusAfter: deriveHealthStatus(
        target.hpMax,
        result.wounds,
        target.hpTemp,
        target.nonlethal,
        target.deathState as import("@/lib/combat/types").CombatantView["deathState"],
      ),
    }, {
      targetCombatantId: target.id,
      actorUserId: actor.userId,
      rollId,
    });
    events.push(event.record);
  }

  for (const plan of resolution.effectPlans) {
    const { components } = parseEffect(plan.label);
    const effect = await tx.campaignCombatEffect.create({
      data: {
        id: crypto.randomUUID(),
        combatantId: plan.targetId,
        label: plan.label.split(";")[0]?.trim() || plan.label,
        components: components as Prisma.InputJsonValue,
        sourceCombatantId: caster.id,
        duration: plan.duration,
        durationUnit: plan.durationUnit,
        tickInit: caster.init,
        expiry: "startOfTurn",
        applyMode: "all",
        visibility: "visible",
        active: true,
        system: false,
        seq: 0,
      },
    });
    const target = combat.combatants.find((c) => c.id === plan.targetId);
    const event = await writeCombatEvent(tx, combat, "effectApply", {
      label: effect.label,
      effectText: plan.label,
      duration: plan.duration,
      durationUnit: plan.durationUnit,
      targetName: target?.name ?? "Target",
      sourceName: caster.name,
    }, {
      actorCombatantId: caster.id,
      targetCombatantId: plan.targetId,
      actorUserId: actor.userId,
      rollId,
    });
    events.push(event.record);
  }

  if (resolution.consumeUseKey) {
    const key = resolution.consumeUseKey;
    const current = spellUses[key];
    if (current != null) {
      spellUses[key] = Math.max(0, current - 1);
      await tx.campaignCombatant.update({
        where: { id: caster.id },
        data: { spellUses: spellUses as Prisma.InputJsonValue },
      });
      caster.spellUses = spellUses;
    }
  }

  return events;
}

async function resolveSrIntent(
  tx: Prisma.TransactionClient,
  actor: RollActor,
  combat: LockedCombatRow,
  intent: Extract<CombatRollIntent, { kind: "sr" }>,
  rollId: string,
  face: number,
): Promise<CombatEventRecord[]> {
  const target = combat.combatants.find((c) => c.id === intent.targetId) as
    | LoadedCombatant
    | undefined;
  if (!target) throw new Error("Combatant not found");

  const defenses = (target.defenses ?? {}) as Defenses;
  const sr = defenses.sr ?? 0;
  const casterLevel = intent.casterLevel ?? 0;
  const outcome = resolveSpellResistance({
    casterLevel,
    face,
    sr,
    effects: mapDbEffects(target.effects),
  });

  const event = await writeCombatEvent(
    tx,
    combat,
    "sr",
    withEventTokenIds(
      {
        spellName: intent.spellName,
        face: outcome.face,
        casterLevel: outcome.casterLevel,
        clBonus: outcome.clBonus,
        total: outcome.total,
        sr: outcome.sr,
        success: outcome.success,
      },
      combat.combatants,
      null,
      target.id,
    ),
    {
      targetCombatantId: target.id,
      actorUserId: actor.userId,
      rollId,
    },
  );
  return [event.record];
}

function validateDicePool(dice: DicePoolItem[]): boolean {
  if (!Array.isArray(dice) || dice.length === 0) return false;
  let totalQty = 0;
  for (const item of dice) {
    if (!item || typeof item.qty !== "number" || typeof item.sides !== "number") return false;
    if (item.qty < 1 || item.qty > 40) return false;
    if (![4, 6, 8, 10, 12, 20, 100].includes(item.sides)) return false;
    totalQty += item.qty;
  }
  return totalQty >= 1 && totalQty <= 40;
}

export async function startCombatRoll(
  actor: RollActor,
  input: StartCombatRollInput,
): Promise<CombatRollResult> {
  if (!validateDicePool(input.dice)) {
    return { success: false, error: "Invalid dice pool" };
  }

  const faces = rollFaces(input.dice);
  const modifier = Number.isFinite(input.modifier)
    ? Math.max(-999, Math.min(999, Math.round(input.modifier)))
    : 0;
  const iterative =
    Array.isArray(input.iterativeModifiers) && input.iterativeModifiers.length > 0
      ? input.iterativeModifiers
          .slice(0, 20)
          .map((n) => Math.max(-999, Math.min(999, Math.round(Number(n) || 0))))
      : undefined;
  const totals = computeRollTotals({
    faces,
    modifier,
    iterativeModifiers: iterative,
    dice: input.dice,
  });
  const adhoc = clampAdhoc(
    "adhoc" in input.combat ? (input.combat as { adhoc?: number }).adhoc : 0,
  );

  let events: CombatEventRecord[] = [];
  let rollRow: Awaited<ReturnType<typeof persistCampaignRoll>> | null = null;
  let lockedCombatants: LockedCombatRow["combatants"] = [];

  try {
    await prisma.$transaction(async (tx) => {
      const combat = await lockCombatRow(tx, actor.campaignId);
      if (!combat) throw new Error("No combat");
      lockedCombatants = combat.combatants;

      rollRow = await persistCampaignRoll(
        {
          campaignId: input.campaignId,
          userId: actor.userId,
          username: actor.username,
          kind: input.kind,
          label: input.label,
          hidden: Boolean(input.hidden),
          characterName: input.characterName,
          dice: input.dice,
          modifier,
          iterativeModifiers: iterative,
          faces,
          totals,
        },
        tx,
      );

      switch (input.combat.kind) {
        case "initiative":
          events = await resolveInitiativeIntent(
            tx,
            actor,
            combat,
            input.combat,
            rollRow.id,
            faces,
          );
          break;
        case "attack":
          events = await resolveAttackIntent(
            tx,
            actor,
            combat,
            input.combat,
            rollRow.id,
            faces,
            adhoc,
          );
          break;
        case "confirm":
          events = await resolveConfirmIntent(
            tx,
            actor,
            combat,
            input.combat,
            rollRow.id,
            faces[0] ?? 1,
            adhoc,
          );
          break;
        case "damage":
          events = await resolveDamageIntent(
            tx,
            actor,
            combat,
            input.combat,
            rollRow.id,
            faces,
            adhoc,
          );
          break;
        case "save":
          events = await resolveSaveIntent(
            tx,
            actor,
            combat,
            input.combat,
            rollRow.id,
            faces,
            adhoc,
          );
          break;
        case "heal":
          events = await resolveHealIntent(
            tx,
            actor,
            combat,
            input.combat,
            rollRow.id,
            faces,
            modifier,
          );
          break;
        case "stabilize":
          events = await resolveStabilizeIntent(
            tx,
            actor,
            combat,
            input.combat,
            rollRow.id,
            faces[0] ?? 1,
          );
          break;
        case "sr":
          events = await resolveSrIntent(
            tx,
            actor,
            combat,
            input.combat,
            rollRow.id,
            faces[0] ?? 1,
          );
          break;
        case "cast":
          events = await resolveCastIntent(
            tx,
            actor,
            combat,
            input.combat,
            rollRow.id,
            faces,
          );
          break;
        default:
          throw new Error("Unsupported combat roll intent");
      }
    });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Combat roll failed",
    };
  }

  if (!rollRow) {
    return { success: false, error: "Combat roll failed" };
  }

  publishRoll(input.campaignId, rollRow, actor.userId);

  const filterCombatants = combatantsForEventFilter(lockedCombatants);
  for (const event of events) {
    publishCombatEvent(input.campaignId, event, filterCombatants);
  }

  await publishCombatSnapshot(input.campaignId, actor.dmUserId);

  return {
    success: true,
    roll: toCampaignRollView(rollRow, {
      userId: actor.userId,
      isDm: actor.isDm,
    }),
    outcome: {
      intent: input.combat.kind,
      events,
    } satisfies CombatRollOutcome,
  };
}

import { healthStatusLabel } from "../healthStatus";
import type {
  AttackEventPayload,
  CastEventPayload,
  CombatEventKind,
  CombatEventLine,
  CombatEventPayload,
  CombatEventPayloadMap,
  CombatEventViewer,
  CritConfirmEventPayload,
  DamageEventPayload,
  DeathEventPayload,
  DelayEventPayload,
  EffectApplyEventPayload,
  EffectExpireEventPayload,
  EffectRemoveEventPayload,
  EffectTickEventPayload,
  HealEventPayload,
  HpEditEventPayload,
  InitEventPayload,
  NonlethalEventPayload,
  NoteEventPayload,
  ReadyEventPayload,
  RegenEventPayload,
  RoundStartEventPayload,
  SaveEventPayload,
  SrEventPayload,
  StabilizeEventPayload,
  TargetEventPayload,
  TempHpEventPayload,
  TurnEndEventPayload,
  TurnStartEventPayload,
  UndoEventPayload,
  UntargetEventPayload,
} from "./types";

export type FormatEventInput = {
  kind: CombatEventKind;
  payload: CombatEventPayload;
  actorName: string | null;
  targetName: string | null;
  targetPcPlanId?: string | null;
};

function attackModeLetter(
  attackType: "melee" | "ranged" | "mtouch" | "rtouch" | "grapple" | undefined,
): string {
  switch (attackType) {
    case "ranged":
      return "R";
    case "mtouch":
      return "T";
    case "rtouch":
      return "RT";
    case "grapple":
      return "G";
    default:
      return "M";
  }
}

function saveTypeLabel(saveType: "fort" | "ref" | "will"): string {
  switch (saveType) {
    case "fort":
      return "Fortitude";
    case "ref":
      return "Reflex";
    case "will":
      return "Will";
  }
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

function viewerSeesExactHp(
  viewer: CombatEventViewer,
  targetPcPlanId?: string | null,
): boolean {
  return (
    viewer.isDm ||
    (viewer.viewerPcPlanId != null &&
      targetPcPlanId != null &&
      viewer.viewerPcPlanId === targetPcPlanId)
  );
}

function formatDamagePackets(packets: DamageEventPayload["packets"]): string {
  if (packets.length === 0) return "";
  return packets
    .map((packet) => {
      const types = packet.types.length > 0 ? packet.types.join(", ") : "untyped";
      return `[TYPE: ${types} (${packet.amount})]`;
    })
    .join(" ");
}

function formatDamageAdjustments(
  payload: DamageEventPayload,
  showDetails: boolean,
): string {
  if (payload.adjustments.length === 0) return "";

  if (!showDetails) {
    return " [Damage reduced]";
  }

  const parts: string[] = [];
  const dr = payload.adjustments.find((a) => a.kind === "dr");
  if (dr) {
    parts.push(`[DR ${dr.amount} -> ${payload.applied}]`);
  } else {
    for (const adj of payload.adjustments) {
      if (adj.kind === "immune") {
        parts.push("[IMMUNE]");
      } else if (adj.kind === "resist") {
        parts.push(`[RESIST ${adj.amount}]`);
      } else if (adj.kind === "half") {
        parts.push("[HALF]");
      } else if (adj.kind === "vuln") {
        parts.push("[VULN]");
      } else if (adj.kind === "precisionImmune") {
        parts.push("[PRECISION IMMUNE]");
      }
    }
  }
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

function formatDuration(
  duration: number | null,
  unit: EffectApplyEventPayload["durationUnit"],
): string {
  if (duration == null) return "";
  const label = duration === 1 ? unit.replace(/s$/, "") : unit;
  return ` (${duration} ${label})`;
}

function formatAttack(
  payload: AttackEventPayload,
  targetName: string | null,
  showNumbers: boolean,
): CombatEventLine[] {
  if (payload.grappleLog) {
    return [{ text: payload.grappleLog, tone: "neutral" }];
  }

  const mode = attackModeLetter(payload.attackType);
  const bonusText = showNumbers ? formatSigned(payload.bonus) : "";
  const targetText = targetName ?? "No target";
  const acLabel =
    payload.acType === "touch"
      ? "Touch AC"
      : payload.acType === "flat"
        ? "Flat-footed AC"
        : "AC";

  let text: string;
  if (targetName && showNumbers) {
    text = `[ATTACK (${mode})] ${payload.attackName} ${bonusText} vs ${targetName} ${acLabel} ${payload.acValue} -> ${payload.total}`;
  } else if (targetName) {
    text = `[ATTACK (${mode})] ${payload.attackName} vs ${targetName} -> ${payload.total}`;
  } else {
    text = `[ATTACK (${mode})] ${payload.attackName} -> ${payload.total}`;
  }

  let tone: CombatEventLine["tone"] = "neutral";
  if (payload.autoMiss) {
    text += " [AUTOMATIC MISS]";
    tone = "miss";
  } else if (payload.autoHit) {
    text += " [AUTOMATIC HIT]";
    tone = "hit";
  } else if (payload.threat) {
    text += " [CRITICAL THREAT]";
    tone = "crit";
  } else if (payload.hit) {
    text += " [HIT]";
    tone = "hit";
  } else {
    text += " [MISS]";
    tone = "miss";
  }

  if (payload.concealmentRoll?.missed) {
    text += " [CONCEALMENT MISS]";
    tone = "miss";
  }

  return [{ text, tone }];
}

function formatCritConfirm(
  payload: CritConfirmEventPayload,
  showNumbers: boolean,
): CombatEventLine[] {
  const bonusText = showNumbers ? formatSigned(payload.bonus) : "";
  let text = `[CONFIRM] ${payload.attackName}${bonusText ? ` ${bonusText}` : ""} -> ${payload.total}`;
  let tone: CombatEventLine["tone"] = "neutral";

  if (payload.immuneToCrit) {
    text += " [IMMUNE TO CRITICAL]";
    tone = "miss";
  } else if (payload.autoMiss) {
    text += " [AUTOMATIC MISS]";
    tone = "miss";
  } else if (payload.confirmed) {
    text += " [CRITICAL HIT]";
    tone = "crit";
  } else {
    text += " [MISS]";
    tone = "miss";
  }

  return [{ text, tone }];
}

function formatDamage(
  payload: DamageEventPayload,
  targetName: string | null,
  viewer: CombatEventViewer,
  targetPcPlanId?: string | null,
): CombatEventLine[] {
  const name = targetName ?? "Target";
  const band = healthStatusLabel(payload.statusAfter);
  const showNumbers = viewer.isDm;
  const showExactHp = viewerSeesExactHp(viewer, targetPcPlanId);

  if (!showNumbers) {
    const reduced =
      payload.adjustments.length > 0 ? " (damage reduced)" : "";
    return [
      {
        text: `${name} takes damage${reduced} and is ${band}`,
        tone: "damage",
      },
    ];
  }

  const mode = attackModeLetter(payload.attackType);
  const typePart = formatDamagePackets(payload.packets);
  const adjPart = formatDamageAdjustments(payload, true);
  const statusPart = showExactHp && payload.hpMax != null
    ? `${name}: ${band} (${payload.hpAfter}/${payload.hpMax})`
    : `${name}: ${band}`;

  const text = `[DAMAGE (${mode})] ${payload.source}${typePart ? ` ${typePart}` : ""} -> ${name}${adjPart} ${statusPart}`;
  return [{ text, tone: "damage" }];
}

function formatHeal(
  payload: HealEventPayload,
  targetName: string | null,
  viewer: CombatEventViewer,
  targetPcPlanId?: string | null,
): CombatEventLine[] {
  const name = targetName ?? "Target";
  const showNumbers = viewerSeesExactHp(viewer, targetPcPlanId);
  const dicePart = payload.dice
    ? ` (${payload.dice}=${payload.amount})`
    : showNumbers
      ? ` (${payload.amount})`
      : "";

  if (!showNumbers) {
    return [
      {
        text: `[HEAL] ${payload.source}${dicePart} -> ${name}`,
        tone: "heal",
      },
    ];
  }

  return [
    {
      text: `[HEAL] ${payload.source}${dicePart} -> ${name} ${payload.hpAfter}/${payload.hpMax}`,
      tone: "heal",
    },
  ];
}

function formatSave(
  payload: SaveEventPayload,
  showNumbers: boolean,
): CombatEventLine[] {
  const type = saveTypeLabel(payload.saveType);
  const lines: CombatEventLine[] = [];

  if (showNumbers) {
    let text = `[SAVE] ${type} DC ${payload.dc} -> ${payload.total}`;
    text += payload.success ? " [SUCCESS]" : " [FAILURE]";
    lines.push({ text, tone: payload.success ? "neutral" : "miss" });
  } else {
    lines.push({
      text: `[SAVE] ${type}${payload.success ? " [SUCCESS]" : " [FAILURE]"}`,
      tone: payload.success ? "neutral" : "miss",
    });
  }

  if (payload.consequence === "half") {
    lines.push({ text: "[HALF]", tone: "neutral" });
  } else if (payload.consequence === "negate") {
    lines.push({ text: "[NEGATED]", tone: "neutral" });
  }

  return lines;
}

function formatByKind<K extends CombatEventKind>(
  kind: K,
  payload: CombatEventPayloadMap[K],
  ctx: {
    actorName: string | null;
    targetName: string | null;
    viewer: CombatEventViewer;
    targetPcPlanId?: string | null;
  },
): CombatEventLine[] {
  const { actorName, targetName, viewer, targetPcPlanId } = ctx;
  const showNumbers = viewer.isDm;

  switch (kind) {
    case "combatStart":
      return [{ text: "[COMBAT START]", tone: "neutral" }];
    case "combatEnd":
      return [{ text: "[COMBAT END]", tone: "neutral" }];
    case "roundStart": {
      const p = payload as RoundStartEventPayload;
      return [{ text: `Round ${p.round}`, tone: "neutral" }];
    }
    case "turnStart": {
      const p = payload as TurnStartEventPayload;
      return [{ text: `Turn: ${p.combatantName}`, tone: "neutral" }];
    }
    case "turnEnd": {
      const p = payload as TurnEndEventPayload;
      return [{ text: `End turn: ${p.combatantName}`, tone: "neutral" }];
    }
    case "init": {
      const p = payload as InitEventPayload;
      const name = actorName ?? "Combatant";
      if (showNumbers) {
        return [
          {
            text: `[INIT] ${name} -> ${p.face}${formatSigned(p.initMod + p.effectBonus)} (${p.storedInit.toFixed(2)})`,
            tone: "neutral",
          },
        ];
      }
      return [{ text: `[INIT] ${name}`, tone: "neutral" }];
    }
    case "delay": {
      const p = payload as DelayEventPayload;
      return [{ text: `[DELAY] ${p.combatantName}`, tone: "neutral" }];
    }
    case "ready": {
      const p = payload as ReadyEventPayload;
      const trigger = p.trigger ? ` (${p.trigger})` : "";
      return [{ text: `[READY] ${p.combatantName}${trigger}`, tone: "neutral" }];
    }
    case "target": {
      const p = payload as TargetEventPayload;
      return [
        {
          text: `[TARGET] ${actorName ?? "Unknown"} -> ${p.targetNames.join(", ")}`,
          tone: "neutral",
        },
      ];
    }
    case "untarget": {
      const p = payload as UntargetEventPayload;
      return [
        {
          text: `[UNTARGET] ${actorName ?? "Unknown"} -> ${p.targetNames.join(", ")}`,
          tone: "neutral",
        },
      ];
    }
    case "attack":
      return formatAttack(payload as AttackEventPayload, targetName, showNumbers);
    case "critConfirm":
      return formatCritConfirm(payload as CritConfirmEventPayload, showNumbers);
    case "damage":
      return formatDamage(
        payload as DamageEventPayload,
        targetName,
        viewer,
        targetPcPlanId,
      );
    case "heal":
      return formatHeal(
        payload as HealEventPayload,
        targetName,
        viewer,
        targetPcPlanId,
      );
    case "tempHp": {
      const p = payload as TempHpEventPayload;
      const name = targetName ?? "Target";
      if (showNumbers) {
        return [
          {
            text: `[TEMP HP] ${p.source} (${p.amount}) -> ${name} ${p.tempAfter}`,
            tone: "heal",
          },
        ];
      }
      return [{ text: `[TEMP HP] ${p.source} -> ${name}`, tone: "heal" }];
    }
    case "nonlethal": {
      const p = payload as NonlethalEventPayload;
      const name = targetName ?? "Target";
      if (showNumbers) {
        return [
          {
            text: `[NONLETHAL] ${p.source} (${p.amount}) -> ${name} ${p.nonlethalAfter}`,
            tone: "damage",
          },
        ];
      }
      return [{ text: `[NONLETHAL] ${p.source} -> ${name}`, tone: "damage" }];
    }
    case "save":
      return formatSave(payload as SaveEventPayload, showNumbers);
    case "sr": {
      const p = payload as SrEventPayload;
      if (showNumbers) {
        const result = p.success ? "[PASSES]" : "[RESISTED]";
        return [
          {
            text: `[SR] ${p.spellName} ${p.total} vs ${p.sr} ${result}`,
            tone: p.success ? "neutral" : "miss",
          },
        ];
      }
      return [
        {
          text: `[SR] ${p.spellName}${p.success ? " [PASSES]" : " [RESISTED]"}`,
          tone: p.success ? "neutral" : "miss",
        },
      ];
    }
    case "cast": {
      const p = payload as CastEventPayload;
      const targets =
        p.targetNames.length > 0 ? ` -> ${p.targetNames.join(", ")}` : "";
      return [
        {
          text: `[CAST] ${p.spellName}${targets}`,
          tone: "effect",
        },
      ];
    }
    case "effectApply": {
      const p = payload as EffectApplyEventPayload;
      return [
        {
          text: `[EFFECT] ${p.effectText} -> ${p.targetName}${formatDuration(p.duration, p.durationUnit)}`,
          tone: "effect",
        },
      ];
    }
    case "effectRemove": {
      const p = payload as EffectRemoveEventPayload;
      return [
        {
          text: `[EFFECT REMOVED] ${p.label} -> ${p.targetName}`,
          tone: "effect",
        },
      ];
    }
    case "effectExpire": {
      const p = payload as EffectExpireEventPayload;
      return [
        {
          text: `[EFFECT EXPIRED] ${p.label} -> ${p.targetName}`,
          tone: "effect",
        },
      ];
    }
    case "effectTick": {
      const p = payload as EffectTickEventPayload;
      return [
        {
          text: `[EFFECT TICK] ${p.label} -> ${p.targetName}: ${p.description}`,
          tone: "effect",
        },
      ];
    }
    case "death": {
      const p = payload as DeathEventPayload;
      return [
        {
          text: `[DEATH] ${p.targetName} [${p.deathState.toUpperCase()}]`,
          tone: "death",
        },
      ];
    }
    case "stabilize": {
      const p = payload as StabilizeEventPayload;
      const result = p.success ? "[STABILIZED]" : "[FAILED]";
      return [
        {
          text: `[STABILIZE] ${p.targetName} ${result}`,
          tone: p.success ? "heal" : "miss",
        },
      ];
    }
    case "regen": {
      const p = payload as RegenEventPayload;
      const name = targetName ?? "Target";
      if (showNumbers) {
        return [
          {
            text: `[REGEN] ${p.source} (${p.amount}) -> ${name} ${p.hpAfter}/${p.hpMax}`,
            tone: "heal",
          },
        ];
      }
      return [
        {
          text: `[REGEN] ${name} is ${healthStatusLabel(p.statusAfter)}`,
          tone: "heal",
        },
      ];
    }
    case "hpEdit": {
      const p = payload as HpEditEventPayload;
      const name = targetName ?? "Target";
      if (showNumbers) {
        const note = p.note ? ` (${p.note})` : "";
        return [
          {
            text: `[HP EDIT] ${name} ${p.hpBefore} -> ${p.hpAfter}/${p.hpMax}${note}`,
            tone: "neutral",
          },
        ];
      }
      return [
        {
          text: `[HP EDIT] ${name} is ${healthStatusLabel(
            p.hpAfter <= 0 ? "dead" : "healthy",
          )}`,
          tone: "neutral",
        },
      ];
    }
    case "note": {
      const p = payload as NoteEventPayload;
      return [{ text: p.text, tone: "neutral" }];
    }
    case "undo": {
      const p = payload as UndoEventPayload;
      return [
        {
          text: `[UNDO] #${p.revertedSeq} ${p.revertedKind}: ${p.summary}`,
          tone: "neutral",
        },
      ];
    }
    default:
      return [{ text: `[${kind}]`, tone: "neutral" }];
  }
}

/** Render FG-style log lines for one combat event and viewer. */
export function formatEventForViewer(
  event: FormatEventInput,
  viewer: CombatEventViewer,
): CombatEventLine[] {
  return formatByKind(event.kind, event.payload, {
    actorName: event.actorName,
    targetName: event.targetName,
    viewer,
    targetPcPlanId: event.targetPcPlanId,
  });
}

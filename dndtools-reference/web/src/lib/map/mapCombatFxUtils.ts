import { healthStatusLabel } from "@/lib/combat/healthStatus";
import type {
  AttackEventPayload,
  CastEventPayload,
  CombatEventView,
  CritConfirmEventPayload,
  DamageEventPayload,
  EffectApplyEventPayload,
  EffectExpireEventPayload,
  EffectRemoveEventPayload,
  HealEventPayload,
  SaveEventPayload,
  TempHpEventPayload,
} from "@/lib/combat/events/types";
import type { CombatHealthStatus, CombatantView, DamageType } from "@/lib/combat/types";

export type FxPoint = { x: number; y: number };

export type FloaterSpec = {
  id: string;
  x: number;
  y: number;
  text: string;
  tone: "neutral" | "hit" | "miss" | "crit" | "damage" | "heal" | "effect";
  large?: boolean;
};

export type SvgFxSpec =
  | {
      id: string;
      kind: "arc";
      x: number;
      y: number;
      radius: number;
      durationMs: number;
    }
  | {
      id: string;
      kind: "projectile";
      from: FxPoint;
      to: FxPoint;
      durationMs: number;
    }
  | {
      id: string;
      kind: "ring";
      x: number;
      y: number;
      radius: number;
      tone: "crit" | "sr" | "heal";
      durationMs: number;
    }
  | {
      id: string;
      kind: "burst";
      x: number;
      y: number;
      shape: "circle" | "square" | "cone";
      radius: number;
      angle: number;
      damageType?: DamageType;
      durationMs: number;
    }
  | {
      id: string;
      kind: "shake";
      tokenId: string;
      durationMs: number;
    }
  | {
      id: string;
      kind: "pulse";
      tokenId: string;
      tone: "heal";
      durationMs: number;
    }
  | {
      id: string;
      kind: "effectPop";
      tokenId: string;
      label: string;
      durationMs: number;
    }
  | {
      id: string;
      kind: "effectFade";
      tokenId: string;
      label: string;
      durationMs: number;
    }
  | {
      id: string;
      kind: "deathFx";
      tokenId: string;
      durationMs: number;
    };

export type ParsedFxBatch = {
  floaters: FloaterSpec[];
  svgFx: SvgFxSpec[];
};

export function resolveEventTokenId(
  event: CombatEventView,
  combatants: CombatantView[],
  role: "source" | "target",
): string | null {
  const payload = event.payload as {
    sourceTokenId?: string;
    targetTokenId?: string;
  };
  const fromPayload =
    role === "source" ? payload.sourceTokenId : payload.targetTokenId;
  if (fromPayload) return fromPayload;
  const combatantId =
    role === "source" ? event.actorCombatantId : event.targetCombatantId;
  if (!combatantId) return null;
  return combatants.find((c) => c.id === combatantId)?.tokenId ?? null;
}

function isOnMap(
  point: FxPoint,
  imageWidth: number,
  imageHeight: number,
): boolean {
  return (
    point.x >= 0 &&
    point.y >= 0 &&
    point.x <= imageWidth &&
    point.y <= imageHeight
  );
}

function projectileDurationMs(from: FxPoint, to: FxPoint): number {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  return Math.max(250, Math.min(450, 250 + dist * 0.35));
}

function primaryDamageType(payload: DamageEventPayload): DamageType {
  const packet = payload.packets[0];
  if (!packet || packet.types.length === 0) return "untyped";
  return packet.types[0]!;
}

function damageFloaterText(
  payload: DamageEventPayload,
  showExact: boolean,
): string {
  if (showExact) {
    const sign = payload.applied > 0 ? "-" : "";
    return `${sign}${payload.applied}`;
  }
  return healthStatusLabel(payload.statusAfter as CombatHealthStatus);
}

function attackFloaterText(payload: AttackEventPayload): {
  text: string;
  tone: FloaterSpec["tone"];
  large?: boolean;
} {
  if (payload.autoMiss) return { text: "Miss", tone: "miss" };
  if (payload.threat) return { text: "Threat!", tone: "crit", large: true };
  if (payload.hit) return { text: `Hit ${payload.total}`, tone: "hit" };
  return { text: "Miss", tone: "miss" };
}

function isRangedAttack(attackType: AttackEventPayload["attackType"]): boolean {
  return attackType === "ranged" || attackType === "rtouch";
}

export function buildFxForEvent(
  event: CombatEventView,
  ctx: {
    combatants: CombatantView[];
    tokenCenter: (tokenId: string) => FxPoint | null;
    imageWidth: number;
    imageHeight: number;
    isDm: boolean;
    viewerPcPlanId: string | null;
    reducedMotion: boolean;
    skipShake: boolean;
    gridSizePx: number;
    gridPointToPx: (x: number, y: number) => FxPoint;
  },
): ParsedFxBatch | null {
  const targetTokenId = resolveEventTokenId(event, ctx.combatants, "target");
  const sourceTokenId = resolveEventTokenId(event, ctx.combatants, "source");
  const targetCenter = targetTokenId ? ctx.tokenCenter(targetTokenId) : null;
  const sourceCenter = sourceTokenId ? ctx.tokenCenter(sourceTokenId) : null;

  const floaters: FloaterSpec[] = [];
  const svgFx: SvgFxSpec[] = [];
  const baseId = `${event.seq}-${event.kind}`;

  const targetCombatant = event.targetCombatantId
    ? ctx.combatants.find((c) => c.id === event.targetCombatantId)
    : null;
  const showExactDamage =
    ctx.isDm ||
    (targetCombatant?.kind === "pc" &&
      targetCombatant.pcPlanId === ctx.viewerPcPlanId);

  switch (event.kind) {
    case "attack": {
      const payload = event.payload as AttackEventPayload;
      if (!targetCenter || !isOnMap(targetCenter, ctx.imageWidth, ctx.imageHeight)) {
        return null;
      }
      const floater = attackFloaterText(payload);
      floaters.push({
        id: `${baseId}-floater`,
        x: targetCenter.x,
        y: targetCenter.y,
        text: floater.text,
        tone: floater.tone,
        large: floater.large,
      });
      if (payload.attackType === "melee" && !ctx.reducedMotion) {
        svgFx.push({
          id: `${baseId}-arc`,
          kind: "arc",
          x: targetCenter.x,
          y: targetCenter.y,
          radius: 18,
          durationMs: 300,
        });
      } else if (
        isRangedAttack(payload.attackType) &&
        sourceCenter &&
        isOnMap(sourceCenter, ctx.imageWidth, ctx.imageHeight) &&
        !ctx.reducedMotion
      ) {
        svgFx.push({
          id: `${baseId}-proj`,
          kind: "projectile",
          from: sourceCenter,
          to: targetCenter,
          durationMs: projectileDurationMs(sourceCenter, targetCenter),
        });
      }
      return { floaters, svgFx };
    }
    case "critConfirm": {
      const payload = event.payload as CritConfirmEventPayload;
      if (!targetCenter || !isOnMap(targetCenter, ctx.imageWidth, ctx.imageHeight)) {
        return null;
      }
      floaters.push({
        id: `${baseId}-floater`,
        x: targetCenter.x,
        y: targetCenter.y,
        text: payload.confirmed ? "Critical!" : "Not confirmed",
        tone: payload.confirmed ? "crit" : "miss",
        large: payload.confirmed,
      });
      if (payload.confirmed) {
        svgFx.push({
          id: `${baseId}-ring`,
          kind: "ring",
          x: targetCenter.x,
          y: targetCenter.y,
          radius: 22,
          tone: "crit",
          durationMs: 400,
        });
      }
      return { floaters, svgFx };
    }
    case "damage": {
      const payload = event.payload as DamageEventPayload;
      if (!targetCenter || !isOnMap(targetCenter, ctx.imageWidth, ctx.imageHeight)) {
        return null;
      }
      floaters.push({
        id: `${baseId}-floater`,
        x: targetCenter.x,
        y: targetCenter.y,
        text: damageFloaterText(payload, showExactDamage),
        tone: "damage",
      });
      if (!ctx.skipShake && !ctx.reducedMotion && targetTokenId) {
        svgFx.push({
          id: `${baseId}-shake`,
          kind: "shake",
          tokenId: targetTokenId,
          durationMs: 200,
        });
      }
      return { floaters, svgFx };
    }
    case "heal":
    case "tempHp": {
      const payload = event.payload as HealEventPayload | TempHpEventPayload;
      if (!targetCenter || !isOnMap(targetCenter, ctx.imageWidth, ctx.imageHeight)) {
        return null;
      }
      const amount =
        event.kind === "heal"
          ? (payload as HealEventPayload).amount
          : (payload as TempHpEventPayload).amount;
      floaters.push({
        id: `${baseId}-floater`,
        x: targetCenter.x,
        y: targetCenter.y,
        text: `+${amount}`,
        tone: "heal",
      });
      if (targetTokenId) {
        svgFx.push({
          id: `${baseId}-pulse`,
          kind: "pulse",
          tokenId: targetTokenId,
          tone: "heal",
          durationMs: 500,
        });
      }
      return { floaters, svgFx };
    }
    case "save": {
      const payload = event.payload as SaveEventPayload;
      if (!targetCenter || !isOnMap(targetCenter, ctx.imageWidth, ctx.imageHeight)) {
        return null;
      }
      floaters.push({
        id: `${baseId}-floater`,
        x: targetCenter.x,
        y: targetCenter.y,
        text: payload.success ? "Save" : "Fail",
        tone: payload.success ? "neutral" : "miss",
      });
      return { floaters, svgFx };
    }
    case "sr": {
      if (!targetCenter || !isOnMap(targetCenter, ctx.imageWidth, ctx.imageHeight)) {
        return null;
      }
      floaters.push({
        id: `${baseId}-floater`,
        x: targetCenter.x,
        y: targetCenter.y,
        text: "SR",
        tone: "effect",
      });
      svgFx.push({
        id: `${baseId}-ring`,
        kind: "ring",
        x: targetCenter.x,
        y: targetCenter.y,
        radius: 20,
        tone: "sr",
        durationMs: 450,
      });
      return { floaters, svgFx };
    }
    case "cast": {
      const payload = event.payload as CastEventPayload;
      if (payload.area) {
        const center = ctx.gridPointToPx(
          payload.area.centerX,
          payload.area.centerY,
        );
        if (!isOnMap(center, ctx.imageWidth, ctx.imageHeight)) return null;
        const radiusPx = payload.area.radiusSquares * ctx.gridSizePx;
        svgFx.push({
          id: `${baseId}-burst`,
          kind: "burst",
          x: center.x,
          y: center.y,
          shape: payload.area.shape,
          radius: radiusPx,
          angle: payload.area.angle,
          damageType: payload.damageType,
          durationMs: ctx.reducedMotion ? 400 : 500,
        });
      } else if (
        sourceCenter &&
        targetCenter &&
        isOnMap(sourceCenter, ctx.imageWidth, ctx.imageHeight) &&
        isOnMap(targetCenter, ctx.imageWidth, ctx.imageHeight) &&
        !ctx.reducedMotion
      ) {
        svgFx.push({
          id: `${baseId}-proj`,
          kind: "projectile",
          from: sourceCenter,
          to: targetCenter,
          durationMs: projectileDurationMs(sourceCenter, targetCenter),
        });
      }
      return floaters.length || svgFx.length ? { floaters, svgFx } : null;
    }
    case "effectApply": {
      const payload = event.payload as EffectApplyEventPayload;
      if (!targetTokenId) return null;
      svgFx.push({
        id: `${baseId}-pop`,
        kind: "effectPop",
        tokenId: targetTokenId,
        label: payload.label,
        durationMs: 350,
      });
      return { floaters, svgFx };
    }
    case "effectExpire":
    case "effectRemove": {
      const payload = event.payload as
        | EffectExpireEventPayload
        | EffectRemoveEventPayload;
      if (!targetTokenId) return null;
      svgFx.push({
        id: `${baseId}-fade`,
        kind: "effectFade",
        tokenId: targetTokenId,
        label: payload.label,
        durationMs: 400,
      });
      return { floaters, svgFx };
    }
    case "death": {
      if (!targetTokenId) return null;
      svgFx.push({
        id: `${baseId}-death`,
        kind: "deathFx",
        tokenId: targetTokenId,
        durationMs: 600,
      });
      return { floaters, svgFx };
    }
    case "turnStart": {
      if (!sourceTokenId) return null;
      svgFx.push({
        id: `${baseId}-active`,
        kind: "pulse",
        tokenId: sourceTokenId,
        tone: "heal",
        durationMs: 200,
      });
      return { floaters, svgFx };
    }
    default:
      return null;
  }
}

export function coalesceFloaters(floaters: FloaterSpec[]): FloaterSpec[] {
  const byKey = new Map<string, FloaterSpec>();
  for (const floater of floaters) {
    const key = `${Math.round(floater.x)}:${Math.round(floater.y)}:${floater.tone}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, floater);
      continue;
    }
    if (floater.tone === "damage" && prev.tone === "damage") {
      const prevNum = Number.parseInt(prev.text.replace(/^-/, ""), 10);
      const nextNum = Number.parseInt(floater.text.replace(/^-/, ""), 10);
      if (Number.isFinite(prevNum) && Number.isFinite(nextNum)) {
        byKey.set(key, {
          ...prev,
          text: `-${prevNum + nextNum}`,
        });
      }
    }
  }
  return [...byKey.values()];
}

export function shouldCoalesceBurst(recentTimestamps: number[], now: number): boolean {
  const windowStart = now - 1000;
  return recentTimestamps.filter((t) => t >= windowStart).length > 12;
}

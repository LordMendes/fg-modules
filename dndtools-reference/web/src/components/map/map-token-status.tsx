"use client";

import { isOwnPc } from "@/components/combat/combat-utils";
import { CONDITION_PRESETS } from "@/lib/combat/effects/presets";
import type {
  CombatEffectView,
  CombatHealthStatus,
  CombatantView,
  ConditionKey,
} from "@/lib/combat/types";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  Ban,
  BatteryLow,
  Bed,
  CircleDashed,
  CircleSlash,
  EarOff,
  EyeOff,
  Footprints,
  Frown,
  Gem,
  Ghost,
  Hand,
  Heart,
  HeartCrack,
  Link,
  Lock,
  Moon,
  Pause,
  Pin,
  RotateCcw,
  ShieldOff,
  Skull,
  Star,
  Sun,
  Thermometer,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";

const CONDITION_ICONS: Record<string, LucideIcon> = {
  EyeOff,
  ShieldOff,
  CircleDashed,
  Sun,
  EarOff,
  Activity,
  HeartCrack,
  Skull,
  Link,
  BatteryLow,
  Star,
  Moon,
  Footprints,
  AlertTriangle,
  Hand,
  Ban,
  Ghost,
  Frown,
  Zap,
  Lock,
  Gem,
  Pin,
  ArrowDown,
  Wind,
  Thermometer,
  Heart,
  Pause,
  CircleSlash,
  RotateCcw,
  Bed,
};

function quantizedHpRatio(status: CombatHealthStatus): number {
  switch (status) {
    case "healthy":
      return 1;
    case "light":
    case "wounded":
      return 0.75;
    case "moderate":
    case "bloodied":
      return 0.5;
    case "heavy":
      return 0.25;
    case "critical":
      return 0.12;
    case "dying":
      return 0.06;
    case "dead":
      return 0;
    default:
      return 0.5;
  }
}

function extractConditionKeys(effects: CombatEffectView[]): ConditionKey[] {
  const keys = new Set<ConditionKey>();
  for (const effect of effects) {
    if (!effect.active) continue;
    for (const component of effect.components) {
      if (component.tag === "COND") {
        keys.add(component.condition);
      }
    }
  }
  return [...keys];
}

function ConditionIcon({ name }: { name: string }) {
  const Icon = CONDITION_ICONS[name];
  if (!Icon) return null;
  return <Icon size={10} strokeWidth={2.25} aria-hidden />;
}

type MapTokenStatusProps = {
  combatant: CombatantView;
  isDm: boolean;
  viewerPcPlanId: string | null;
  isActive: boolean;
  tokenWidthPx: number;
};

export function MapTokenStatus({
  combatant,
  isDm,
  viewerPcPlanId,
  isActive,
  tokenWidthPx,
}: MapTokenStatusProps) {
  const showExact =
    isDm || isOwnPc(combatant, viewerPcPlanId);
  const hpRatio = showExact
    ? Math.max(0, Math.min(1, combatant.hpCurrent / Math.max(1, combatant.hpMax)))
    : quantizedHpRatio(combatant.status);

  const conditionKeys = useMemo(
    () => extractConditionKeys(combatant.effects),
    [combatant.effects],
  );

  const isDead =
    combatant.status === "dead" ||
    combatant.deathState === "dead" ||
    combatant.turnState === "dead";
  const isDying =
    !isDead &&
    (combatant.status === "dying" || combatant.deathState === "dying");
  const isProne =
    conditionKeys.includes("prone") ||
    combatant.deathState === "disabled";

  const visibleConditions = conditionKeys.filter(
    (key) => key !== "dead" && key !== "dying" && key !== "prone",
  );
  const strip = visibleConditions.slice(0, 4);
  const overflow = visibleConditions.length - strip.length;

  const barWidth = Math.max(tokenWidthPx, 28);

  return (
    <div
      className={`map-token-status${isActive ? " map-token-status--active" : ""}${isDead ? " map-token-status--dead" : ""}${isDying ? " map-token-status--dying" : ""}${isProne ? " map-token-status--prone" : ""}`}
      style={{ width: barWidth }}
      aria-hidden
    >
      {isActive ? <span className="map-token-active-ring" /> : null}
      <div
        className={`map-token-hp map-token-hp--${combatant.status}`}
        role="presentation"
      >
        <span
          className="map-token-hp-fill"
          style={{ width: `${Math.round(hpRatio * 100)}%` }}
        />
      </div>
      {strip.length > 0 || overflow > 0 ? (
        <div className="map-token-conditions">
          {strip.map((key) => {
            const preset = CONDITION_PRESETS[key];
            return (
              <span
                key={key}
                className="map-token-condition-icon"
                title={preset?.label ?? key}
              >
                <ConditionIcon name={preset?.icon ?? "CircleDashed"} />
              </span>
            );
          })}
          {overflow > 0 ? (
            <span className="map-token-condition-overflow">+{overflow}</span>
          ) : null}
        </div>
      ) : null}
      {isProne && !isDead ? (
        <span className="map-token-prone-marker" title="Prone" />
      ) : null}
    </div>
  );
}

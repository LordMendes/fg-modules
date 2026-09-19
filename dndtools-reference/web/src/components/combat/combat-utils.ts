import { CONDITION_PRESETS } from "@/lib/combat/effects/presets";
import type {
  CombatAttackLine,
  CombatAttackType,
  CombatEffectView,
  CombatantView,
  Defenses,
} from "@/lib/combat/types";
import { formatModifier } from "@/lib/pc-planner/combatStats";

export function isOwnPc(
  c: CombatantView,
  viewerPcPlanId: string | null,
): boolean {
  return c.kind === "pc" && c.pcPlanId === viewerPcPlanId;
}

export function canExpandRow(
  c: CombatantView,
  isDm: boolean,
  viewerPcPlanId: string | null,
): boolean {
  return isDm || isOwnPc(c, viewerPcPlanId);
}

export function canEditHp(
  c: CombatantView,
  isDm: boolean,
  viewerPcPlanId: string | null,
): boolean {
  return isDm || isOwnPc(c, viewerPcPlanId);
}

export function canAddEffect(
  c: CombatantView,
  isDm: boolean,
  viewerPcPlanId: string | null,
): boolean {
  return isDm || isOwnPc(c, viewerPcPlanId);
}

export function isDeadRow(c: CombatantView): boolean {
  return (
    c.turnState === "dead" ||
    c.deathState === "dead" ||
    c.status === "dead"
  );
}

export function attackTypeBadge(type: CombatAttackType | undefined): string {
  switch (type) {
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

export function formatIterativeBonuses(bonuses: number[]): string {
  return bonuses.map((b) => formatModifier(b)).join("/");
}

export function formatThreatRange(atk: CombatAttackLine): string | null {
  const threat = atk.threatMin ?? 20;
  const mult = atk.critMultiplier ?? 2;
  if (threat === 20 && mult === 2) return null;
  return `${threat === 20 ? "20" : `${threat}-20`}/x${mult}`;
}

export function formatEffectChipLabel(effect: CombatEffectView): string {
  const base = effect.label.split(";")[0]?.trim() ?? effect.label;
  if (effect.duration == null) return base;
  const unit =
    effect.durationUnit === "round"
      ? "r"
      : effect.durationUnit === "minute"
        ? "m"
        : effect.durationUnit === "hour"
          ? "h"
          : "d";
  return `${base} ${effect.duration}${unit}`;
}

export function formatDefensesSummary(defenses: Defenses): string[] {
  const parts: string[] = [];
  if (defenses.dr?.length) {
    for (const dr of defenses.dr) {
      const bypass =
        dr.bypass.length > 0 ? `/${dr.bypass.join(", ")}` : "";
      parts.push(`DR ${dr.amount}${bypass}`);
    }
  }
  if (defenses.resist) {
    for (const [type, amount] of Object.entries(defenses.resist)) {
      if (amount != null) parts.push(`Resist ${type} ${amount}`);
    }
  }
  if (defenses.immune?.length) {
    parts.push(`Immune ${defenses.immune.join(", ")}`);
  }
  if (defenses.sr != null && defenses.sr > 0) {
    parts.push(`SR ${defenses.sr}`);
  }
  return parts;
}

export function nextFaction(
  faction: CombatantView["faction"],
): CombatantView["faction"] {
  if (faction === "friend") return "foe";
  if (faction === "foe") return "neutral";
  return "friend";
}

export const EFFECT_BUFF_PRESETS = [
  "Bless; ATK: 1 morale; SAVE: 1 morale vs fear",
  "Mage Armor; AC: 4 armor",
  "Haste; ATK: 1; AC: 1 dodge; REF: 1 dodge; SPEED: 30",
  "Bull's Strength; STR: 4 enhancement",
  "Resist Energy; RESIST: 10 fire",
  "Protection from Energy; IMMUNE: fire",
];

export function effectPresetOptions(): string[] {
  const conditions = Object.values(CONDITION_PRESETS).map((p) => p.preset);
  return [...new Set([...conditions, ...EFFECT_BUFF_PRESETS])].sort((a, b) =>
    a.localeCompare(b),
  );
}

const RECENT_EFFECTS_KEY = "combat-effect-recent";

export function loadRecentEffects(campaignId: string): string[] {
  try {
    const raw = localStorage.getItem(`${RECENT_EFFECTS_KEY}-${campaignId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string")
      : [];
  } catch {
    return [];
  }
}

export function pushRecentEffect(campaignId: string, text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  const prev = loadRecentEffects(campaignId).filter((s) => s !== trimmed);
  const next = [trimmed, ...prev].slice(0, 12);
  try {
    localStorage.setItem(
      `${RECENT_EFFECTS_KEY}-${campaignId}`,
      JSON.stringify(next),
    );
  } catch {
    // ignore
  }
}

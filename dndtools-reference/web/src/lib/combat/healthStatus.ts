import type { CombatantView, CombatHealthStatus } from "./types";

export function deriveHealthStatus(
  hpMax: number,
  wounds: number,
  hpTemp: number,
  nonlethal = 0,
  deathState: CombatantView["deathState"] = null,
): CombatHealthStatus {
  const max = Math.max(1, hpMax);
  const nl = Math.max(0, nonlethal);
  const w = Math.max(0, wounds);

  if (deathState === "dead") return "dead";
  if (deathState === "dying") return "dying";

  const remaining = max - w - nl;
  if (remaining <= 0) {
    return deathState === "disabled" ? "dying" : "dying";
  }

  const ratio = remaining / max;
  if (ratio >= 1) return "healthy";
  if (ratio >= 0.75) return "light";
  if (ratio >= 0.5) return "moderate";
  if (ratio >= 0.25) return "heavy";
  return "critical";
}

export function healthStatusLabel(status: CombatHealthStatus): string {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "light":
      return "Light";
    case "moderate":
      return "Moderate";
    case "heavy":
      return "Heavy";
    case "critical":
      return "Critical";
    case "wounded":
      return "Wounded";
    case "bloodied":
      return "Bloodied";
    case "dying":
      return "Dying";
    case "dead":
      return "Dead";
  }
}

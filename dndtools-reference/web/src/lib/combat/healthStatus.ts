import { currentHp } from "./parseHp";
import type { CombatHealthStatus } from "./types";

export function deriveHealthStatus(
  hpMax: number,
  wounds: number,
  hpTemp: number,
): CombatHealthStatus {
  const cur = currentHp(hpMax, wounds, hpTemp);
  if (cur <= 0) return "dead";
  if (wounds >= hpMax && cur > 0) return "dying";
  const ratio = cur / Math.max(1, hpMax);
  if (ratio <= 0.25) return "bloodied";
  if (ratio <= 0.5) return "wounded";
  return "healthy";
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

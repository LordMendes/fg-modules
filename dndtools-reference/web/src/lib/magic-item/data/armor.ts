import { CORE_ARMOR } from "./core/armor";
import type { GearType } from "../types";

export const GEAR_TYPES: GearType[] = [...CORE_ARMOR];

export const GEAR_BY_ID = new Map(GEAR_TYPES.map((g) => [g.id, g]));

export function gearForKind(kind: "armor" | "shield"): GearType[] {
  return GEAR_TYPES.filter((g) => g.kind === kind);
}

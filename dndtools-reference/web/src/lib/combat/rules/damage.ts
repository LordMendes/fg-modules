import { applyDamageToHp } from "../parseHp";
import type { ConditionKey, DamagePacket, DamageType, Defenses } from "../types";

export type DamageTargetContext = {
  hpMax: number;
  wounds: number;
  hpTemp: number;
  nonlethal: number;
  defenses: Defenses;
  conditions?: ConditionKey[];
};

export type DamageFlags = {
  half?: boolean;
  nonlethal?: boolean;
};

export type DamageAdjustmentKind =
  | "dr"
  | "resist"
  | "immune"
  | "vuln"
  | "half"
  | "precisionImmune";

export type DamageAdjustment = {
  kind: DamageAdjustmentKind;
  amount: number;
  note: string;
};

export type ApplyDefensesResult = {
  applied: number;
  toTemp: number;
  toNonlethal: number;
  adjustments: DamageAdjustment[];
  wounds: number;
  hpTemp: number;
  nonlethal: number;
};

const PHYSICAL_TYPES = new Set<DamageType>([
  "slashing",
  "piercing",
  "bludgeoning",
]);

const ENERGY_TYPES = new Set<DamageType>([
  "fire",
  "cold",
  "acid",
  "electricity",
  "sonic",
  "force",
  "positive",
  "negative",
]);

const ALIGNMENT_TYPES = new Set<DamageType>([
  "good",
  "evil",
  "lawful",
  "chaotic",
]);

function finite(n: number): number {
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function packetPhysicalTypes(types: DamageType[]): DamageType[] {
  return types.filter((t) => PHYSICAL_TYPES.has(t));
}

function packetEnergyOrAlignmentTypes(types: DamageType[]): DamageType[] {
  return types.filter((t) => ENERGY_TYPES.has(t) || ALIGNMENT_TYPES.has(t));
}

function isPhysicalPacket(packet: DamagePacket): boolean {
  if (packetPhysicalTypes(packet.types).length > 0) return true;
  return packetEnergyOrAlignmentTypes(packet.types).length === 0;
}

function isImmuneToPacket(
  packet: DamagePacket,
  immune: DamageType[] | undefined,
): boolean {
  if (!immune?.length) return false;

  const immuneSet = new Set(immune);
  const energyOrAlign = packetEnergyOrAlignmentTypes(packet.types);
  if (energyOrAlign.some((t) => immuneSet.has(t))) {
    return true;
  }

  const physical = packetPhysicalTypes(packet.types);
  if (physical.length > 0 && physical.every((t) => immuneSet.has(t))) {
    return true;
  }

  if (immuneSet.has("magic") && packet.types.includes("magic")) {
    return true;
  }

  return false;
}

function isPrecisionImmune(
  packet: DamagePacket,
  immune: DamageType[] | undefined,
  conditions: ConditionKey[],
): boolean {
  if (!packet.precision) return false;
  if (immune?.includes("precision")) return true;
  return conditions.includes("incorporeal");
}

function applyHalf(amount: number, adjustments: DamageAdjustment[]): number {
  const before = amount;
  let next = Math.floor(before / 2);
  if (next === 0 && before > 0) next = 1;
  if (next !== before) {
    adjustments.push({
      kind: "half",
      amount: before - next,
      note: "half damage",
    });
  }
  return next;
}

function applyVulnerability(
  amount: number,
  types: DamageType[],
  vuln: DamageType[] | undefined,
  adjustments: DamageAdjustment[],
): number {
  if (!vuln?.length || amount <= 0) return amount;
  const vulnSet = new Set(vuln);
  if (!types.some((t) => vulnSet.has(t))) return amount;
  const before = amount;
  const next = Math.floor(before * 1.5);
  adjustments.push({
    kind: "vuln",
    amount: next - before,
    note: "vulnerability x1.5",
  });
  return next;
}

function applyResistance(
  amount: number,
  types: DamageType[],
  resist: Partial<Record<DamageType, number>> | undefined,
  adjustments: DamageAdjustment[],
): number {
  if (!resist || amount <= 0) return amount;

  let best = 0;
  let bestType: DamageType | null = null;
  for (const type of types) {
    const value = resist[type];
    if (value != null && value > best) {
      best = value;
      bestType = type;
    }
  }

  if (best <= 0) return amount;

  const next = Math.max(0, amount - best);
  adjustments.push({
    kind: "resist",
    amount: amount - next,
    note: bestType ? `RESIST ${best} ${bestType}` : `RESIST ${best}`,
  });
  return next;
}

function selectDrAmount(
  physicalTotal: number,
  packets: { amount: number; types: DamageType[] }[],
  drEntries: { amount: number; bypass: DamageType[] }[],
): { amount: number; applied: number } {
  if (physicalTotal <= 0 || drEntries.length === 0) {
    return { amount: 0, applied: physicalTotal };
  }

  const allTypes = new Set<DamageType>();
  for (const packet of packets) {
    for (const type of packet.types) {
      allTypes.add(type);
    }
  }

  let bestDr = 0;
  for (const entry of drEntries) {
    const neverBypassed = entry.bypass.length === 0;
    const bypassed =
      !neverBypassed &&
      [...entry.bypass].some((bypassType) => allTypes.has(bypassType));
    if (!bypassed && entry.amount > bestDr) {
      bestDr = entry.amount;
    }
  }

  if (bestDr <= 0) {
    return { amount: 0, applied: physicalTotal };
  }

  return {
    amount: bestDr,
    applied: Math.max(0, physicalTotal - bestDr),
  };
}

type ProcessedPacket = {
  amount: number;
  types: DamageType[];
  physical: boolean;
};

/**
 * Apply FG 3.5E defense order to damage packets and apply HP changes.
 * Physical-type immunity requires every physical type in the packet to be immune.
 * Qualifiers (magic, materials, alignments) are not physical types for that check.
 */
export function applyDefenses(
  packets: DamagePacket[],
  target: DamageTargetContext,
  flags: DamageFlags = {},
): ApplyDefensesResult {
  const adjustments: DamageAdjustment[] = [];
  const conditions = target.conditions ?? [];
  const immune = target.defenses.immune;
  const vuln = target.defenses.vuln;
  const resist = target.defenses.resist;
  const drEntries = target.defenses.dr ?? [];

  const processed: ProcessedPacket[] = [];

  for (const packet of packets) {
    let amount = Math.max(0, finite(packet.amount));
    const types = packet.types;
    const isNonlethal =
      flags.nonlethal === true || packet.nonlethal === true || types.includes("nonlethal");

    if (amount === 0) continue;

    if (flags.half) {
      amount = applyHalf(amount, adjustments);
    }

    if (isImmuneToPacket(packet, immune)) {
      adjustments.push({
        kind: "immune",
        amount,
        note: "immune",
      });
      continue;
    }

    if (isPrecisionImmune(packet, immune, conditions)) {
      adjustments.push({
        kind: "precisionImmune",
        amount,
        note: "immune to precision",
      });
      continue;
    }

    amount = applyVulnerability(amount, types, vuln, adjustments);
    amount = applyResistance(amount, types, resist, adjustments);

    if (amount <= 0) continue;

    processed.push({
      amount,
      types,
      physical: isPhysicalPacket(packet) && !isNonlethal,
    });
  }

  let physicalTotal = 0;
  let nonPhysicalTotal = 0;
  const physicalPackets: { amount: number; types: DamageType[] }[] = [];

  for (const packet of processed) {
    if (packet.physical) {
      physicalTotal += packet.amount;
      physicalPackets.push({ amount: packet.amount, types: packet.types });
    } else {
      nonPhysicalTotal += packet.amount;
    }
  }

  const drResult = selectDrAmount(physicalTotal, physicalPackets, drEntries);
  if (drResult.amount > 0) {
    adjustments.push({
      kind: "dr",
      amount: drResult.amount,
      note: `DR ${drResult.amount}`,
    });
  }

  const applied = Math.max(0, drResult.applied + nonPhysicalTotal);

  const hpBefore = {
    wounds: Math.max(0, target.wounds),
    hpTemp: Math.max(0, target.hpTemp),
    nonlethal: Math.max(0, target.nonlethal),
  };

  const isNonlethalDamage =
    flags.nonlethal === true ||
    packets.some(
      (p) => p.nonlethal === true || p.types.includes("nonlethal"),
    );

  let nextWounds = hpBefore.wounds;
  let nextTemp = hpBefore.hpTemp;
  let nextNonlethal = hpBefore.nonlethal;
  let toTemp = 0;
  let toNonlethal = 0;

  if (applied > 0) {
    if (isNonlethalDamage) {
      nextNonlethal += applied;
      toNonlethal = applied;
    } else {
      const beforeTemp = nextTemp;
      const hpResult = applyDamageToHp(
        target.hpMax,
        nextWounds,
        nextTemp,
        applied,
      );
      nextWounds = hpResult.wounds;
      nextTemp = hpResult.hpTemp;
      toTemp = beforeTemp - nextTemp;
    }
  }

  return {
    applied,
    toTemp,
    toNonlethal,
    adjustments,
    wounds: nextWounds,
    hpTemp: nextTemp,
    nonlethal: nextNonlethal,
  };
}

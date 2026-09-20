import { weaponDamageColor } from "@/lib/dice/damageTypeColors";
import { formatDamageType } from "@/lib/equipment-display";
import {
  abilityModifier,
  formatModifier,
  type CombatComputed,
} from "./combatStats";
import {
  formatAttackBonuses,
  formatCritSuffix,
  formatDamageWithModifier,
  parseDamageDice,
  parseWeaponCritical,
  type WeaponAttackRow,
  type WeaponDamagePart,
} from "./weaponAttacks";
import type {
  FeatEntry,
  PcPlanState,
  PcSpecialAttackEntry,
  PcSpecialAttackKind,
  PcSpecialAttackSaveType,
} from "./types";

let specialAttackIdSeq = 0;

export function createSpecialAttackId(): string {
  specialAttackIdSeq += 1;
  return `sa-${Date.now().toString(36)}-${specialAttackIdSeq}`;
}

function hasMultiattack(feats: FeatEntry[] | undefined): boolean {
  return (feats ?? []).some((feat) => {
    const name = feat.name.trim().toLowerCase();
    const slug = feat.slug.toLowerCase();
    return (
      name === "multiattack" ||
      slug === "multiattack" ||
      slug.startsWith("multiattack-")
    );
  });
}

export function specialAttackDisplayName(entry: PcSpecialAttackEntry): string {
  const count = Math.max(1, entry.count || 1);
  const base = entry.name.trim() || "Attack";
  if (count <= 1) return base;
  const lower = base.toLowerCase();
  if (lower.endsWith("s") || lower.endsWith("ss") || lower.endsWith("x")) {
    return `${count} ${base}`;
  }
  if (lower.endsWith("y") && !/[aeiou]y$/i.test(base)) {
    return `${count} ${base.slice(0, -1)}ies`;
  }
  return `${count} ${base}s`;
}

export function specialAttackDamageDice(
  entry: PcSpecialAttackEntry,
  sizeMod: number,
): string {
  if (sizeMod > 0) return entry.damageS || entry.damageM || "";
  return entry.damageM || entry.damageS || "";
}

export function formatSpecialAttackChip(entry: PcSpecialAttackEntry): string {
  const name = specialAttackDisplayName(entry);
  const dice = entry.damageM || entry.damageS;
  if (dice) return `${name} ${dice}`;
  if (entry.saveDc != null && entry.saveType) {
    return `${name} DC ${entry.saveDc}`;
  }
  return name;
}

/** FG / summary line for one entry (no attack bonus). */
export function formatSpecialAttackSummaryLine(entry: PcSpecialAttackEntry): string {
  const name = specialAttackDisplayName(entry);
  const parts: string[] = [name];
  const dice = entry.damageM || entry.damageS;
  if (dice) {
    const type = formatDamageType(entry.damageType);
    const crit = formatCritSuffix(entry.critical);
    parts.push(`(${dice}${type ? ` ${type.toLowerCase()}` : ""}${crit})`);
  }
  if (entry.saveDc != null && entry.saveType) {
    parts.push(`DC ${entry.saveDc} ${entry.saveType}`);
  }
  if (entry.notes?.trim()) parts.push(entry.notes.trim());
  return parts.join(" ");
}

export function formatSpecialAttacksString(entries: PcSpecialAttackEntry[]): string {
  return entries.map(formatSpecialAttackSummaryLine).filter(Boolean).join("; ");
}

function normalizeSaveType(raw: unknown): PcSpecialAttackSaveType | null {
  if (raw === "fort" || raw === "ref" || raw === "will") return raw;
  return null;
}

function normalizeKind(raw: unknown): PcSpecialAttackKind {
  return raw === "special" ? "special" : "natural";
}

export function normalizeSpecialAttackEntry(raw: unknown): PcSpecialAttackEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const name = typeof rec.name === "string" ? rec.name.trim() : "";
  if (!name && typeof rec.notes !== "string") return null;
  const count =
    typeof rec.count === "number" && Number.isFinite(rec.count)
      ? Math.max(1, Math.trunc(rec.count))
      : 1;
  return {
    id: typeof rec.id === "string" && rec.id ? rec.id : createSpecialAttackId(),
    kind: normalizeKind(rec.kind),
    templateId: typeof rec.templateId === "string" ? rec.templateId : "custom",
    name: name || "Custom attack",
    count,
    primary: rec.primary !== false,
    damageM: typeof rec.damageM === "string" ? rec.damageM : "",
    damageS: typeof rec.damageS === "string" ? rec.damageS : "",
    damageType: typeof rec.damageType === "string" ? rec.damageType : "",
    critical: typeof rec.critical === "string" ? rec.critical : null,
    attackMisc:
      typeof rec.attackMisc === "number" && Number.isFinite(rec.attackMisc)
        ? Math.trunc(rec.attackMisc)
        : 0,
    damageMisc:
      typeof rec.damageMisc === "number" && Number.isFinite(rec.damageMisc)
        ? Math.trunc(rec.damageMisc)
        : 0,
    saveDc:
      rec.saveDc != null && Number.isFinite(rec.saveDc)
        ? Math.trunc(rec.saveDc as number)
        : null,
    saveType: normalizeSaveType(rec.saveType),
    notes: typeof rec.notes === "string" ? rec.notes : "",
  };
}

export function normalizeSpecialAttacks(
  raw: unknown,
  legacyAttacks: string,
): PcSpecialAttackEntry[] {
  if (Array.isArray(raw)) {
    return raw
      .map(normalizeSpecialAttackEntry)
      .filter((e): e is PcSpecialAttackEntry => e != null);
  }
  const trimmed = legacyAttacks.trim();
  if (!trimmed) return [];
  return [
    {
      id: createSpecialAttackId(),
      kind: "special",
      templateId: "custom",
      name: "Legacy special attacks",
      count: 1,
      primary: true,
      damageM: "",
      damageS: "",
      damageType: "",
      critical: null,
      attackMisc: 0,
      damageMisc: 0,
      saveDc: null,
      saveType: null,
      notes: trimmed,
    },
  ];
}

/** Migrate/normalize specialAttacks on combat and rebuild the FG attacks string. */
export function applySpecialAttacksNormalization(combat: {
  attacks: string;
  specialAttacks?: PcSpecialAttackEntry[];
}): void {
  const hadStructured = Array.isArray(combat.specialAttacks);
  const entries = normalizeSpecialAttacks(
    combat.specialAttacks,
    hadStructured ? "" : combat.attacks,
  );
  combat.specialAttacks = entries;
  if (entries.length > 0 || hadStructured) {
    combat.attacks = syncSpecialAttacksString(entries);
  }
}

/** Sync derived FG string from structured entries. */
export function syncSpecialAttacksString(entries: PcSpecialAttackEntry[]): string {
  return formatSpecialAttacksString(entries);
}

/**
 * Natural weapons as WeaponAttackRow for Actions rolls.
 * Uses negative inventoryIndex so they do not collide with inventory weapons.
 */
export function computeNaturalAttackRows(
  state: PcPlanState,
  combatStats: CombatComputed,
): WeaponAttackRow[] {
  const entries = state.combat.specialAttacks ?? [];
  const sizeMod = state.combat.sizeMod;
  const strMod = abilityModifier(state.abilities.str);
  const multiattack = hasMultiattack(state.feats);
  const rows: WeaponAttackRow[] = [];

  entries.forEach((entry, index) => {
    if (entry.kind !== "natural") return;
    const diceRaw = specialAttackDamageDice(entry, sizeMod);
    const typeLabel =
      formatDamageType(entry.damageType) ?? (entry.damageType || null);
    const primaryColor = weaponDamageColor(entry.damageType) ?? "#C9A227";
    const damageDice = parseDamageDice(diceRaw, primaryColor);
    if (damageDice.length === 0 && !entry.notes?.trim()) return;

    const secondaryPenalty = entry.primary ? 0 : multiattack ? -2 : -5;
    const attackMisc = entry.attackMisc ?? 0;
    const damageMisc = entry.damageMisc ?? 0;
    const attackBonus =
      combatStats.bab + strMod + sizeMod + attackMisc + secondaryPenalty;

    const strDamage = entry.primary
      ? strMod
      : strMod > 0
        ? Math.floor(strMod / 2)
        : strMod;
    const damageModifier = strDamage + damageMisc;

    const count = Math.max(1, entry.count || 1);
    const name = specialAttackDisplayName(entry);
    const standardBonuses = [attackBonus];
    const fullAttackBonuses = Array.from({ length: count }, () => attackBonus);
    const standardDisplay = formatAttackBonuses(standardBonuses);
    const fullAttackDisplay = formatAttackBonuses(fullAttackBonuses);
    const showFullAttack = count > 1;

    const primaryDiceText = formatDamageWithModifier(damageDice, damageModifier);
    const critSuffix = formatCritSuffix(entry.critical);
    const damageDisplay = `${primaryDiceText}${critSuffix}`;
    const primaryPart: WeaponDamagePart = {
      text: `${primaryDiceText}${critSuffix}`,
      damageType: typeLabel,
      color: primaryColor,
    };

    const attackSources = [
      `BAB ${formatModifier(combatStats.bab)}`,
      `Str ${formatModifier(strMod)}`,
      sizeMod !== 0 ? `Size ${formatModifier(sizeMod)}` : null,
      attackMisc !== 0 ? `Misc ${formatModifier(attackMisc)}` : null,
      secondaryPenalty !== 0
        ? `Secondary ${formatModifier(secondaryPenalty)}${multiattack ? " (Multiattack)" : ""}`
        : null,
    ].filter(Boolean) as string[];

    const damageSources = [
      strDamage !== 0
        ? `${entry.primary ? "Str" : "½ Str"} ${formatModifier(strDamage)}`
        : null,
      damageMisc !== 0 ? `Misc ${formatModifier(damageMisc)}` : null,
    ].filter(Boolean) as string[];

    const critInfo = parseWeaponCritical(entry.critical);
    const summary = `${name} ${fullAttackDisplay} melee (${damageDisplay})`;

    rows.push({
      inventoryIndex: -1 - index,
      name,
      mode: "melee",
      attackBonus,
      attackBonuses: fullAttackBonuses,
      attackDisplay: fullAttackDisplay,
      standardBonuses,
      standardDisplay,
      fullAttackBonuses,
      fullAttackDisplay,
      showFullAttack,
      twfHand: null,
      damageDice,
      extraDamageDice: [],
      critOnlyDice: [],
      damageModifier,
      fullAttackDamageModifier: damageModifier,
      damageDisplay,
      extraDamageDisplay: "",
      critExtraDisplay: "",
      damageParts: [primaryPart],
      critDamageParts: [],
      critical: entry.critical ?? null,
      threatMin: critInfo.threatMin,
      critMultiplier: critInfo.multiplier,
      damageType: typeLabel,
      summary,
      attackSources,
      damageSources,
    });
  });

  return rows;
}

export function listSpecialOnlyAttacks(
  entries: PcSpecialAttackEntry[] | undefined,
): PcSpecialAttackEntry[] {
  return (entries ?? []).filter((e) => e.kind === "special");
}

export type SpecialAttackPreviewContext = {
  bab: number;
  strMod: number;
  sizeMod: number;
  multiattack: boolean;
};

/** Dialog / chip preview like `Bite +5 melee (1d8+2)`. */
export function formatSpecialAttackPreview(
  entry: PcSpecialAttackEntry,
  ctx: SpecialAttackPreviewContext | null = null,
): string {
  const name = specialAttackDisplayName(entry);
  if (entry.kind === "special" || !ctx) {
    return formatSpecialAttackSummaryLine(entry);
  }
  const secondaryPenalty = entry.primary ? 0 : ctx.multiattack ? -2 : -5;
  const attackBonus =
    ctx.bab + ctx.strMod + ctx.sizeMod + (entry.attackMisc ?? 0) + secondaryPenalty;
  const diceRaw = specialAttackDamageDice(entry, ctx.sizeMod);
  const strDamage = entry.primary
    ? ctx.strMod
    : ctx.strMod > 0
      ? Math.floor(ctx.strMod / 2)
      : ctx.strMod;
  const damageModifier = strDamage + (entry.damageMisc ?? 0);
  const damageDice = parseDamageDice(diceRaw);
  const damageText = formatDamageWithModifier(damageDice, damageModifier);
  const crit = formatCritSuffix(entry.critical);
  return `${name} ${formatAttackBonuses([attackBonus])} melee (${damageText}${crit})`;
}

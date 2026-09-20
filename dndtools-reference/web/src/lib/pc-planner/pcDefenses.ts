import { extractClassAbilityDescription } from "./parseClassAbilityEffects";
import type { ClassAbilityEntry } from "./parseClassFeatures";
import type { RaceDerivedFeatures } from "./parseRaceFeatures";
import type {
  PcDefenseEntry,
  PcDefenseKind,
  PcDefenseSource,
  PcDefensesState,
} from "./types";

const ENERGY_TYPES = ["acid", "cold", "electricity", "fire", "sonic"] as const;

let defenseIdSeq = 0;

export function createDefenseId(): string {
  defenseIdSeq += 1;
  return `def-${Date.now().toString(36)}-${defenseIdSeq}`;
}

export function emptyDefenses(): PcDefensesState {
  return { entries: [] };
}

export function formatDefenseBadge(entry: PcDefenseEntry): string {
  switch (entry.kind) {
    case "dr": {
      const amount = entry.amount ?? 0;
      const bypass = normalizeBypass(entry.bypass ?? "-");
      return `DR: ${amount}/${bypass}`;
    }
    case "resistance": {
      const subject = (entry.subject ?? "").trim() || "unknown";
      const amount = entry.amount;
      return amount != null ? `Resist: ${subject} ${amount}` : `Resist: ${subject}`;
    }
    case "immunity":
      return `Immune: ${(entry.subject ?? "").trim() || "unknown"}`;
    case "vulnerability":
      return `Vulnerable: ${(entry.subject ?? "").trim() || "unknown"}`;
    default:
      return "";
  }
}

export function formatDefensesLine(defenses: PcDefensesState | null | undefined): string {
  const entries = defenses?.entries ?? [];
  return entries.map(formatDefenseBadge).filter(Boolean).join("; ");
}

function normalizeBypass(raw: string): string {
  const trimmed = raw.trim().replace(/[−–—]/g, "-");
  if (!trimmed || trimmed === "-" || trimmed === "/") return "-";
  return trimmed.replace(/^\/+/, "").trim() || "-";
}

function finiteInt(raw: string): number | null {
  const n = Number.parseInt(raw.replace(/[−–—]/g, "-"), 10);
  return Number.isFinite(n) ? n : null;
}

function entryKey(entry: Pick<PcDefenseEntry, "kind" | "amount" | "bypass" | "subject">): string {
  return [
    entry.kind,
    entry.amount ?? "",
    entry.kind === "dr" ? normalizeBypass(entry.bypass ?? "-") : "",
    (entry.subject ?? "").trim().toLowerCase(),
  ].join("|");
}

function makeEntry(
  partial: Omit<PcDefenseEntry, "id"> & { id?: string },
): PcDefenseEntry {
  return {
    id: partial.id ?? createDefenseId(),
    kind: partial.kind,
    amount: partial.amount,
    bypass: partial.bypass != null ? normalizeBypass(partial.bypass) : undefined,
    subject: partial.subject?.trim() || undefined,
    source: partial.source,
    sourceLabel: partial.sourceLabel?.trim() || undefined,
  };
}

export function formatDefenseOriginTooltip(entry: PcDefenseEntry): string | undefined {
  if (entry.source === "custom") return undefined;
  if (entry.sourceLabel?.trim()) return `From ${entry.sourceLabel.trim()}`;
  if (entry.source === "race") return "From racial traits";
  if (entry.source === "class") return "From class abilities";
  return undefined;
}

/** Parse DR / resist / immune / vulnerable phrases from free text. */
export function parseDefenseEntriesFromText(
  text: string,
  source: PcDefenseSource,
  sourceLabel?: string,
): PcDefenseEntry[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const label = sourceLabel?.trim() || undefined;
  const out: PcDefenseEntry[] = [];

  const drPattern =
    /\b(?:DR|damage reduction)\s+(\d+)\s*(?:\/\s*([^;,.\n]+))?/gi;
  for (const match of normalized.matchAll(drPattern)) {
    const amount = finiteInt(match[1] ?? "");
    if (amount == null) continue;
    out.push(
      makeEntry({
        kind: "dr",
        amount,
        bypass: normalizeBypass(match[2] ?? "-"),
        source,
        sourceLabel: label,
      }),
    );
  }

  const resistTo =
    /\bresistance to\s+(acid|cold|electricity|fire|sonic)(?:\s+(\d+))?/gi;
  for (const match of normalized.matchAll(resistTo)) {
    const subject = (match[1] ?? "").toLowerCase();
    const amount = match[2] != null ? finiteInt(match[2]) : null;
    out.push(
      makeEntry({
        kind: "resistance",
        subject,
        amount: amount ?? undefined,
        source,
        sourceLabel: label,
      }),
    );
  }

  const typedAmount =
    /\b(acid|cold|electricity|fire|sonic)\s+resistance\s+(\d+)\b/gi;
  for (const match of normalized.matchAll(typedAmount)) {
    out.push(
      makeEntry({
        kind: "resistance",
        subject: (match[1] ?? "").toLowerCase(),
        amount: finiteInt(match[2] ?? "") ?? undefined,
        source,
        sourceLabel: label,
      }),
    );
  }

  const resistList = /\bresist(?:ance)?(?:\s+to)?\s+([^.;]+)/gi;
  for (const match of normalized.matchAll(resistList)) {
    const chunk = match[1] ?? "";
    for (const part of chunk.split(/,\s*/)) {
      const pair =
        part.trim().match(/^(acid|cold|electricity|fire|sonic)\s+(\d+)$/i) ??
        part.trim().match(/^(\d+)\s+(acid|cold|electricity|fire|sonic)$/i);
      if (!pair) continue;
      const a = finiteInt(pair[1] ?? "");
      const b = finiteInt(pair[2] ?? "");
      if (a != null && ENERGY_TYPES.includes((pair[2] ?? "").toLowerCase() as (typeof ENERGY_TYPES)[number])) {
        out.push(
          makeEntry({
            kind: "resistance",
            subject: (pair[2] ?? "").toLowerCase(),
            amount: a,
            source,
            sourceLabel: label,
          }),
        );
      } else if (
        b != null &&
        ENERGY_TYPES.includes((pair[1] ?? "").toLowerCase() as (typeof ENERGY_TYPES)[number])
      ) {
        out.push(
          makeEntry({
            kind: "resistance",
            subject: (pair[1] ?? "").toLowerCase(),
            amount: b,
            source,
            sourceLabel: label,
          }),
        );
      }
    }
  }

  const immunePattern = /\bimmun(?:ity|e)(?:\s+to)?\s+([^.;]+)/gi;
  for (const match of normalized.matchAll(immunePattern)) {
    for (const part of (match[1] ?? "").split(/,\s*|\s+and\s+/i)) {
      const subject = part.trim().replace(/\.$/, "");
      if (!subject) continue;
      out.push(makeEntry({ kind: "immunity", subject, source, sourceLabel: label }));
    }
  }

  const vulnPattern = /\bvulnerab(?:le|ility)(?:\s+to)?\s+([^.;]+)/gi;
  for (const match of normalized.matchAll(vulnPattern)) {
    for (const part of (match[1] ?? "").split(/,\s*|\s+and\s+/i)) {
      const subject = part.trim().replace(/\.$/, "");
      if (!subject) continue;
      out.push(makeEntry({ kind: "vulnerability", subject, source, sourceLabel: label }));
    }
  }

  return dedupeDefenseEntries(out);
}

/** Prefer higher DR/resist amounts; keep unique immunity/vulnerability subjects. */
export function dedupeDefenseEntries(entries: PcDefenseEntry[]): PcDefenseEntry[] {
  const byKey = new Map<string, PcDefenseEntry>();

  for (const entry of entries) {
    if (entry.kind === "dr") {
      const key = `dr|${normalizeBypass(entry.bypass ?? "-")}`;
      const prev = byKey.get(key);
      if (!prev || (entry.amount ?? 0) > (prev.amount ?? 0)) {
        byKey.set(key, entry);
      } else if (
        prev &&
        (entry.amount ?? 0) === (prev.amount ?? 0) &&
        !prev.sourceLabel &&
        entry.sourceLabel
      ) {
        byKey.set(key, { ...prev, sourceLabel: entry.sourceLabel });
      }
      continue;
    }
    if (entry.kind === "resistance") {
      const key = `resistance|${(entry.subject ?? "").toLowerCase()}`;
      const prev = byKey.get(key);
      if (!prev || (entry.amount ?? 0) > (prev.amount ?? 0)) {
        byKey.set(key, entry);
      } else if (
        prev &&
        (entry.amount ?? 0) === (prev.amount ?? 0) &&
        !prev.sourceLabel &&
        entry.sourceLabel
      ) {
        byKey.set(key, { ...prev, sourceLabel: entry.sourceLabel });
      }
      continue;
    }
    const key = entryKey(entry);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, entry);
    } else if (!prev.sourceLabel && entry.sourceLabel) {
      byKey.set(key, { ...prev, sourceLabel: entry.sourceLabel });
    }
  }

  return [...byKey.values()];
}

export function mergeDefenseSources(
  raceEntries: PcDefenseEntry[],
  classEntries: PcDefenseEntry[],
): PcDefenseEntry[] {
  return dedupeDefenseEntries([...raceEntries, ...classEntries]);
}

export function parseDefensesFromRace(
  race: RaceDerivedFeatures | null,
  raceName?: string | null,
): PcDefenseEntry[] {
  if (!race) return [];
  const label = raceName?.trim()
    ? `${raceName.trim()} racial traits`
    : "racial traits";
  if (race.defenses?.entries?.length) {
    return race.defenses.entries.map((e) => ({
      ...e,
      source: "race" as const,
      sourceLabel: e.sourceLabel?.trim() || label,
    }));
  }
  const text = [...(race.traits ?? [])].join(". ");
  return parseDefenseEntriesFromText(text, "race", label);
}

export function parseDefensesFromClassAbilities(
  classAbilities: ClassAbilityEntry[],
  classDescriptions: ReadonlyMap<string, string> = new Map(),
): PcDefenseEntry[] {
  const out: PcDefenseEntry[] = [];
  for (const ability of classAbilities) {
    const label = `${ability.className}: ${ability.name}`;
    out.push(...parseDefenseEntriesFromText(ability.name, "class", label));
    const classText = classDescriptions.get(ability.classSlug);
    if (!classText) continue;
    const section = extractClassAbilityDescription(classText, ability.name);
    if (section) out.push(...parseDefenseEntriesFromText(section, "class", label));
  }
  return dedupeDefenseEntries(out);
}

export function computeAutoDefenses(
  race: RaceDerivedFeatures | null,
  classAbilities: ClassAbilityEntry[] = [],
  classDescriptions: ReadonlyMap<string, string> = new Map(),
  raceName?: string | null,
): PcDefensesState {
  return {
    entries: mergeDefenseSources(
      parseDefensesFromRace(race, raceName),
      parseDefensesFromClassAbilities(classAbilities, classDescriptions),
    ),
  };
}

/** Migrate legacy string fields or normalize structured entries. */
export function normalizeDefensesState(raw: unknown): PcDefensesState {
  if (!raw || typeof raw !== "object") return emptyDefenses();
  const rec = raw as Record<string, unknown>;

  if (Array.isArray(rec.entries)) {
    const entries: PcDefenseEntry[] = [];
    for (const item of rec.entries) {
      if (!item || typeof item !== "object") continue;
      const entry = item as Record<string, unknown>;
      const kind = entry.kind;
      if (
        kind !== "dr" &&
        kind !== "resistance" &&
        kind !== "immunity" &&
        kind !== "vulnerability"
      ) {
        continue;
      }
      const source =
        entry.source === "race" || entry.source === "class" || entry.source === "custom"
          ? entry.source
          : "custom";
      entries.push(
        makeEntry({
          id: typeof entry.id === "string" ? entry.id : undefined,
          kind: kind as PcDefenseKind,
          amount:
            typeof entry.amount === "number" && Number.isFinite(entry.amount)
              ? Math.trunc(entry.amount)
              : undefined,
          bypass: typeof entry.bypass === "string" ? entry.bypass : undefined,
          subject: typeof entry.subject === "string" ? entry.subject : undefined,
          source,
          sourceLabel: typeof entry.sourceLabel === "string" ? entry.sourceLabel : undefined,
        }),
      );
    }
    return { entries: dedupeDefenseEntries(entries) };
  }

  // Legacy string shape
  const parts: string[] = [];
  const str = (key: string) => (typeof rec[key] === "string" ? (rec[key] as string).trim() : "");
  const dr = str("dr");
  if (dr) parts.push(`DR ${dr.includes("/") ? dr : `${dr}/-`}`);
  const resistances = str("resistances");
  if (resistances) parts.push(`resistance to ${resistances}`);
  const immunities = str("immunities");
  if (immunities) parts.push(`immunity to ${immunities}`);
  const vulnerabilities = str("vulnerabilities");
  if (vulnerabilities) parts.push(`vulnerable to ${vulnerabilities}`);
  const extra = str("extra");
  if (extra) parts.push(extra);

  if (parts.length === 0) return emptyDefenses();
  return {
    entries: parseDefenseEntriesFromText(parts.join("; "), "custom"),
  };
}

export const DEFENSE_ENERGY_OPTIONS = ENERGY_TYPES;

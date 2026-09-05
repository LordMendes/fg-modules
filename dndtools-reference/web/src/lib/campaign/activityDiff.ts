import type { AbilityKey, PcPlanState } from "@/lib/pc-planner/types";

export type ActivityDetailChange = {
  path: string;
  from: string | null;
  to: string | null;
};

const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

function str(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function pushIfChanged(
  out: ActivityDetailChange[],
  path: string,
  before: unknown,
  after: unknown,
) {
  const from = str(before);
  const to = str(after);
  if (from === to) return;
  out.push({ path, from, to });
}

function classLevelsLabel(
  levels: PcPlanState["identity"]["classLevels"],
): string {
  if (!levels.length) return "none";
  return levels.map((c) => `${c.className} ${c.level}`).join(" / ");
}

/**
 * Compact field-level diff of two PC sheet states for the campaign activity log.
 */
export function diffPcPlanState(
  before: PcPlanState,
  after: PcPlanState,
): ActivityDetailChange[] {
  const out: ActivityDetailChange[] = [];

  pushIfChanged(out, "name", before.identity.name, after.identity.name);
  pushIfChanged(out, "race", before.identity.race, after.identity.race);
  pushIfChanged(
    out,
    "alignment",
    before.identity.alignment,
    after.identity.alignment,
  );
  pushIfChanged(
    out,
    "classes",
    classLevelsLabel(before.identity.classLevels),
    classLevelsLabel(after.identity.classLevels),
  );
  pushIfChanged(out, "deity", before.identity.deity, after.identity.deity);

  for (const key of ABILITY_KEYS) {
    pushIfChanged(
      out,
      `${key.toUpperCase()} base`,
      before.abilityBase?.[key] ?? before.abilities[key],
      after.abilityBase?.[key] ?? after.abilities[key],
    );
    pushIfChanged(
      out,
      `${key.toUpperCase()} score`,
      before.abilities[key],
      after.abilities[key],
    );
    pushIfChanged(
      out,
      `${key.toUpperCase()} damage`,
      before.abilityDamage?.[key] ?? 0,
      after.abilityDamage?.[key] ?? 0,
    );
  }

  pushIfChanged(
    out,
    "HP current",
    before.hitPoints?.current,
    after.hitPoints?.current,
  );
  const beforeHd = JSON.stringify(before.hitPoints?.rolls ?? []);
  const afterHd = JSON.stringify(after.hitPoints?.rolls ?? []);
  if (beforeHd !== afterHd) {
    out.push({ path: "hit dice", from: "updated", to: "updated" });
  }

  if (before.combat && after.combat) {
    const combatKeys = [
      "sizeMod",
      "meleeMisc",
      "rangedMisc",
      "grappleMisc",
      "fortMisc",
      "refMisc",
      "willMisc",
      "initMisc",
      "armor",
      "shield",
      "natural",
      "deflection",
      "dodge",
      "acMisc",
      "speedBase",
      "speedArmor",
      "speedMisc",
      "srBase",
      "srMisc",
      "attacks",
    ] as const;
    for (const key of combatKeys) {
      pushIfChanged(out, `combat.${key}`, before.combat[key], after.combat[key]);
    }
  }

  const beforeSkills = JSON.stringify(before.skills ?? []);
  const afterSkills = JSON.stringify(after.skills ?? []);
  if (beforeSkills !== afterSkills) {
    out.push({ path: "skills", from: "updated", to: "updated" });
  }

  const beforeFeats = JSON.stringify(before.feats ?? []);
  const afterFeats = JSON.stringify(after.feats ?? []);
  if (beforeFeats !== afterFeats) {
    out.push({
      path: "feats",
      from: `${before.feats?.length ?? 0} feats`,
      to: `${after.feats?.length ?? 0} feats`,
    });
  }

  const beforeSpells = JSON.stringify(before.spellClasses ?? []);
  const afterSpells = JSON.stringify(after.spellClasses ?? []);
  if (beforeSpells !== afterSpells) {
    out.push({ path: "spells", from: "updated", to: "updated" });
  }

  const beforeInv = JSON.stringify(before.inventory ?? []);
  const afterInv = JSON.stringify(after.inventory ?? []);
  if (beforeInv !== afterInv) {
    out.push({
      path: "inventory",
      from: `${before.inventory?.length ?? 0} items`,
      to: `${after.inventory?.length ?? 0} items`,
    });
  }

  const beforeTreasure = JSON.stringify(before.treasure ?? []);
  const afterTreasure = JSON.stringify(after.treasure ?? []);
  if (beforeTreasure !== afterTreasure) {
    out.push({ path: "treasure", from: "updated", to: "updated" });
  }

  if ((before.notes ?? "") !== (after.notes ?? "")) {
    out.push({ path: "notes", from: "updated", to: "updated" });
  }

  const beforeProfile = before.identity.profileImageKey ?? null;
  const afterProfile = after.identity.profileImageKey ?? null;
  if (beforeProfile !== afterProfile) {
    out.push({
      path: "profile image",
      from: beforeProfile ? "set" : "none",
      to: afterProfile ? "set" : "none",
    });
  }
  const beforeToken = before.identity.tokenImageKey ?? null;
  const afterToken = after.identity.tokenImageKey ?? null;
  if (beforeToken !== afterToken) {
    out.push({
      path: "token image",
      from: beforeToken ? "set" : "none",
      to: afterToken ? "set" : "none",
    });
  }

  return out;
}

export function summarizePcUpdate(
  pcName: string,
  actorUsername: string,
  changes: ActivityDetailChange[],
): string {
  if (changes.length === 0) return `${actorUsername} updated ${pcName}`;
  if (changes.length === 1) {
    const c = changes[0];
    if (c.path === "notes") return `${actorUsername} updated notes on ${pcName}`;
    if (c.from != null && c.to != null && c.from !== "updated") {
      return `${actorUsername} changed ${pcName} ${c.path}: ${c.from} to ${c.to}`;
    }
    return `${actorUsername} updated ${pcName} (${c.path})`;
  }
  const paths = changes.slice(0, 3).map((c) => c.path).join(", ");
  const more = changes.length > 3 ? ` +${changes.length - 3} more` : "";
  return `${actorUsername} updated ${pcName} (${paths}${more})`;
}

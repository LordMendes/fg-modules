import type {
  SpellActionSet,
  SpellCastActionFields,
  SpellFollowUpAction,
  SpellSaveType,
} from "@/lib/fg-spell-actions/types";
import { tryLookupSrdSpell, normalizeSpellKey } from "@/lib/npc-creator/srdSpellLookup";

export type SpellToActionSetResult = {
  actions: SpellActionSet;
  confidence: "high" | "low";
  schoolShort?: string;
  rangeFeet?: number | null;
  areaShape?: "circle" | "square" | "cone" | "ray" | null;
};

function normalizeSaveType(raw: string | undefined): SpellSaveType | "" {
  const lower = (raw ?? "").trim().toLowerCase();
  if (lower === "fort" || lower === "fortitude") return "fort";
  if (lower === "ref" || lower === "reflex") return "reflex";
  if (lower === "will") return "will";
  return "";
}

function inferSaveType(save: string | null | undefined): SpellSaveType | "" {
  if (!save) return "";
  const lower = save.toLowerCase();
  if (/\bfort/i.test(lower)) return "fort";
  if (/\bref/i.test(lower)) return "reflex";
  if (/\bwill/i.test(lower)) return "will";
  return "";
}

function parseAreaHint(
  area: string | null | undefined,
): { rangeFeet: number | null; areaShape: SpellToActionSetResult["areaShape"] } {
  if (!area) return { rangeFeet: null, areaShape: null };
  const lower = area.toLowerCase();
  if (/\bray\b/.test(lower)) return { rangeFeet: null, areaShape: "ray" };
  if (/\bcone\b/.test(lower)) return { rangeFeet: null, areaShape: "cone" };
  const radius = lower.match(/(\d+)[- ]?ft\.?[- ]?radius/);
  if (radius) {
    return { rangeFeet: Number(radius[1]), areaShape: "circle" };
  }
  const spread = lower.match(/(\d+)[- ]?ft\.?[- ]?radius spread/);
  if (spread) {
    return { rangeFeet: Number(spread[1]), areaShape: "circle" };
  }
  if (/\bburst\b/.test(lower)) {
    const burst = lower.match(/(\d+)[- ]?ft/);
    return { rangeFeet: burst ? Number(burst[1]) : 20, areaShape: "circle" };
  }
  return { rangeFeet: null, areaShape: null };
}

function followUpsFromHit(hit: ReturnType<typeof tryLookupSrdSpell>): SpellFollowUpAction[] {
  if (!hit) return [];
  const actions: SpellFollowUpAction[] = [];
  if (hit.action2) actions.push(hit.action2 as SpellFollowUpAction);
  if (hit.actions) actions.push(...(hit.actions as SpellFollowUpAction[]));
  return actions;
}

function inferFollowUps(
  name: string,
  hit: ReturnType<typeof tryLookupSrdSpell>,
): SpellFollowUpAction[] {
  const existing = followUpsFromHit(hit);
  if (existing.length > 0) return existing;

  const key = normalizeSpellKey(name);
  if (key === "bless") {
    return [
      {
        type: "effect",
        label: "Bless; ATK: 1 morale; SAVE: 1 morale vs fear",
        durmod: 1,
        durunit: "minute",
      },
    ];
  }
  if (key === "hold person") {
    return [
      {
        type: "effect",
        label: "Hold Person; Paralyzed",
        durmod: 1,
        durunit: "round",
      },
    ];
  }
  if (key === "cure light wounds") {
    return [{ type: "heal", dice: "d8", statmax: 5, statmult: 1 }];
  }
  if (key === "scorching ray") {
    return [{ type: "damage", dice: "4d6", dmgType: "fire" }];
  }

  return [];
}

function inferCastFields(
  name: string,
  hit: ReturnType<typeof tryLookupSrdSpell>,
): SpellCastActionFields {
  const key = normalizeSpellKey(name);
  const cast: SpellCastActionFields = {
    othertags: hit?.othertags ?? "",
    schoolShort: hit?.schoolShort ?? "",
    srnotallowed: hit?.srNotAllowed ?? false,
    savetype: normalizeSaveType(hit?.savetype) || inferSaveType(hit?.save),
    atktype: hit?.atktype ?? "",
    onmissdamage: hit?.onmissdamage ?? "",
  };

  if (key === "scorching ray" && !cast.atktype) {
    cast.atktype = "rtouch";
  }
  if (key === "fireball" && !cast.onmissdamage) {
    cast.onmissdamage = "half";
  }

  return cast;
}

/** Build a best-effort SpellActionSet from compendium / SRD metadata. */
export function spellToActionSet(spellName: string): SpellToActionSetResult {
  const hit = tryLookupSrdSpell(spellName);
  const followUps = inferFollowUps(spellName, hit);
  const cast = inferCastFields(spellName, hit);
  const area = parseAreaHint(hit?.area ?? null);

  let confidence: "high" | "low" = "low";
  if (hit && (cast.savetype || cast.atktype || followUps.length > 0)) {
    confidence = followUps.length > 0 && (cast.savetype || cast.atktype || hit.srNotAllowed)
      ? "high"
      : "low";
  }
  if (hit?.action2 || hit?.actions?.length) confidence = "high";

  return {
    actions: {
      cast,
      followUps: followUps.length > 0 ? followUps : undefined,
      action2: followUps[0],
    },
    confidence,
    schoolShort: hit?.schoolShort,
    ...area,
  };
}

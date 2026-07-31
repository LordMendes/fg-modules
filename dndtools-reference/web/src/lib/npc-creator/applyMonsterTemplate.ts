import type { AbilityKey, MonsterTemplateDelta, NpcFgExportState } from "./types";

function appendText(existing: string, addition: string): string {
  const a = addition.trim();
  if (!a) return existing;
  const e = existing.trim();
  if (!e || e === "-" || e === "—") return a;
  if (e.includes(a)) return e;
  return `${e}; ${a}`;
}

function applyNaturalArmorNote(ac: string, bonus: number): string {
  if (!bonus) return ac;
  const note = `+${bonus} natural (template)`;
  if (ac.includes(note)) return ac;
  const trimmed = ac.trim();
  if (!trimmed) return note;
  return `${trimmed}; ${note}`;
}

/**
 * Apply a 3.5 monster template delta onto current NPC state.
 * Does not auto-recompute attack/save lines — caller should prompt review.
 */
export function applyMonsterTemplate(
  state: NpcFgExportState,
  delta: MonsterTemplateDelta,
): NpcFgExportState {
  const next = structuredClone(state);

  if (delta.abilityMods) {
    for (const key of Object.keys(delta.abilityMods) as AbilityKey[]) {
      const mod = delta.abilityMods[key];
      if (typeof mod === "number") {
        next.abilities[key] = Math.max(0, next.abilities[key] + mod);
      }
    }
  }

  if (typeof delta.crMod === "number") {
    next.identity.cr = Math.max(0, next.identity.cr + delta.crMod);
  }

  if (delta.levelAdjustment) {
    next.identity.levelAdjustment = delta.levelAdjustment;
  }

  if (delta.typeOverride) {
    next.identity.creatureTypeTag = delta.typeOverride;
  }

  if (delta.naturalArmorBonus) {
    next.defense.ac = applyNaturalArmorNote(
      next.defense.ac,
      delta.naturalArmorBonus,
    );
  }

  if (delta.specialQualitiesAppend) {
    next.specialqualitiesExtra = appendText(
      next.specialqualitiesExtra,
      delta.specialQualitiesAppend,
    );
  }

  if (delta.specialAttacksAppend) {
    next.offense.specialattacks = appendText(
      next.offense.specialattacks,
      delta.specialAttacksAppend,
    );
  }

  if (delta.notesHtml) {
    const blurb = `<p><b>Template applied: ${delta.name}</b> (${delta.kind}). ${delta.notesHtml}</p>`;
    next.notesFormattedHtml = next.notesFormattedHtml.trim()
      ? `${next.notesFormattedHtml.trim()}\n${blurb}`
      : blurb;
  }

  return next;
}

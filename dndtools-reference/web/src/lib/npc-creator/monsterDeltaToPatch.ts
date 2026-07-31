import type { MonsterTemplateDelta, NpcFgExportState } from "./types";

/** Convert a monster delta into a mergeable patch (for conflict detection). */
export function monsterDeltaToPatch(
  state: NpcFgExportState,
  delta: MonsterTemplateDelta,
): Record<string, unknown> {
  const abilities: Record<string, number> = {};
  if (delta.abilityMods) {
    for (const [key, mod] of Object.entries(delta.abilityMods)) {
      if (typeof mod !== "number") continue;
      const k = key as keyof NpcFgExportState["abilities"];
      abilities[k] = Math.max(0, state.abilities[k] + mod);
    }
  }

  const patch: Record<string, unknown> = {};
  if (Object.keys(abilities).length) patch.abilities = abilities;

  if (typeof delta.crMod === "number") {
    patch.identity = {
      ...((patch.identity as object) ?? {}),
      cr: Math.max(0, state.identity.cr + delta.crMod),
    };
  }
  if (delta.levelAdjustment) {
    patch.identity = {
      ...((patch.identity as object) ?? {}),
      levelAdjustment: delta.levelAdjustment,
    };
  }
  if (delta.typeOverride) {
    patch.identity = {
      ...((patch.identity as object) ?? {}),
      creatureTypeTag: delta.typeOverride,
    };
  }
  if (delta.naturalArmorBonus) {
    const note = `+${delta.naturalArmorBonus} natural (template)`;
    const ac = state.defense.ac.trim();
    patch.defense = {
      ac: ac.includes(note) ? ac : ac ? `${ac}; ${note}` : note,
    };
  }
  if (delta.specialQualitiesAppend) {
    const e = state.specialqualitiesExtra.trim();
    const a = delta.specialQualitiesAppend.trim();
    patch.specialqualitiesExtra =
      !e || e === "-" || e === "—"
        ? a
        : e.includes(a)
          ? e
          : `${e}; ${a}`;
  }
  if (delta.specialAttacksAppend) {
    const e = state.offense.specialattacks.trim();
    const a = delta.specialAttacksAppend.trim();
    patch.offense = {
      specialattacks:
        !e || e === "-" || e === "—"
          ? a
          : e.includes(a)
            ? e
            : `${e}; ${a}`,
    };
  }
  if (delta.notesHtml) {
    const blurb = `<p><b>Template applied: ${delta.name}</b> (${delta.kind}). ${delta.notesHtml}</p>`;
    patch.notesFormattedHtml = state.notesFormattedHtml.trim()
      ? `${state.notesFormattedHtml.trim()}\n${blurb}`
      : blurb;
  }
  return patch;
}

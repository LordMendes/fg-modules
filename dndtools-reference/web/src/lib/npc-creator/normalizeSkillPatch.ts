import { mergeNpcFgState } from "./mergeState";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Normalize skill/agent JSON patches: expand spell shorthand via SRD lookup
 * while keeping the patch as a partial (not a full default merge).
 */
export function normalizeSkillPatch(raw: unknown): unknown {
  if (!isPlainObject(raw)) return raw;
  const out = structuredClone(raw);
  if (isPlainObject(out.spellcasting) && Array.isArray(out.spellcasting.spells)) {
    const expanded = mergeNpcFgState({
      spellcasting: out.spellcasting,
    });
    out.spellcasting = {
      ...out.spellcasting,
      spells: expanded.spellcasting.spells,
    };
  }
  return out;
}

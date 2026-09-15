/** PHB skill synergies: +2 when you have 5+ ranks in the source skill. */
const SYNERGY_TABLE: Record<string, string[]> = {
  bluff: ["diplomacy", "disguise", "intimidate", "sleight of hand"],
  diplomacy: ["bluff", "intimidate", "sense motive"],
  disguise: ["bluff"],
  "escape artist": ["use rope"],
  "handle animal": ["ride"],
  heal: ["survival"],
  hide: ["move silently"],
  intimidate: ["bluff"],
  jump: ["tumble"],
  "knowledge (local)": ["gather information"],
  "move silently": ["hide"],
  perform: ["diplomacy", "disguise", "intimidate"],
  profession: ["diplomacy", "sense motive"],
  ride: ["handle animal"],
  search: ["survival"],
  "sense motive": ["diplomacy"],
  "speak language": ["diplomacy", "sense motive"],
  spellcraft: ["concentration", "use magic device"],
  survival: ["search"],
  tumble: ["balance", "jump"],
  "use magic device": ["spellcraft"],
  "use rope": ["climb", "escape artist"],
};

const SYNERGY_BONUS = 2;

function normalizeSkillKey(name: string, slug?: string | null): string {
  return (slug ?? name).trim().toLowerCase();
}

export function synergyBonusForSkill(
  targetName: string,
  targetSlug: string | null | undefined,
  skills: { name: string; slug?: string | null; ranks: number }[],
): number {
  const targetKey = normalizeSkillKey(targetName, targetSlug);
  let total = 0;
  for (const [sourceKey, targets] of Object.entries(SYNERGY_TABLE)) {
    const source = skills.find(
      (row) => normalizeSkillKey(row.name, row.slug) === sourceKey,
    );
    if (!source || source.ranks < 5) continue;
    if (targets.some((t) => normalizeSkillKey(t) === targetKey)) {
      total += SYNERGY_BONUS;
    }
  }
  return total;
}

export function applySkillSynergies<T extends { name: string; slug?: string | null; ranks: number; synergyMisc?: number }>(
  skills: T[],
  suppressed: boolean,
): T[] {
  if (suppressed) {
    return skills.map((row) => ({ ...row, synergyMisc: 0 }));
  }
  return skills.map((row) => ({
    ...row,
    synergyMisc: synergyBonusForSkill(row.name, row.slug, skills),
  }));
}

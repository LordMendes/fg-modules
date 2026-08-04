import type { ClassLevelEntry } from "./types";

export type ParsedPcShortcutQuery = {
  nameQuery: string;
  classFilter?: string;
  levelFilter?: number;
};

export function parsePcShortcutQuery(raw: string): ParsedPcShortcutQuery {
  let text = raw.trim();
  if (/^pc\b/i.test(text)) {
    text = text.replace(/^pc\b/i, "").trim();
  }

  let classFilter: string | undefined;
  let levelFilter: number | undefined;

  const lvlMatch = text.match(/\b(?:lvl|level)\s*(\d+)\b/i);
  if (lvlMatch) {
    levelFilter = parseInt(lvlMatch[1], 10);
    text = text.replace(lvlMatch[0], "").trim();
  }

  const classLevelMatch = text.match(/\b([a-z]+)\s+(\d+)\b/i);
  if (classLevelMatch && !levelFilter) {
    classFilter = classLevelMatch[1].toLowerCase();
    levelFilter = parseInt(classLevelMatch[2], 10);
    text = text.replace(classLevelMatch[0], "").trim();
  }

  return {
    nameQuery: text,
    classFilter,
    levelFilter,
  };
}

export function matchesClassLevelFilter(
  classLevels: ClassLevelEntry[],
  classFilter?: string,
  levelFilter?: number,
): boolean {
  if (!classFilter && levelFilter === undefined) return true;

  return classLevels.some((entry) => {
    const nameMatch =
      !classFilter ||
      entry.classSlug.toLowerCase().includes(classFilter) ||
      entry.className.toLowerCase().includes(classFilter);
    const levelMatch = levelFilter === undefined || entry.level === levelFilter;
    return nameMatch && levelMatch;
  });
}

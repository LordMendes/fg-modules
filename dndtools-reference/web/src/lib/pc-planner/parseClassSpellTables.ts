type SlotArray = number[];

function emptySlots(): SlotArray {
  return Array.from({ length: 10 }, () => 0);
}

function parseCellCount(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "—" || trimmed === "-" || trimmed === "–") return 0;
  const match = trimmed.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

/** Parse a dndtools HTML table row into spell-level counts (0th–9th). */
function parseSpellLevelCells(cells: string[]): SlotArray | null {
  const slots = emptySlots();
  let parsedAny = false;
  for (let i = 0; i < Math.min(cells.length, 10); i++) {
    const count = parseCellCount(cells[i]);
    if (count > 0) parsedAny = true;
    slots[i] = count;
  }
  return parsedAny ? slots : null;
}

function extractTableRows(html: string): string[][] {
  const rows: string[][] = [];
  for (const rowMatch of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)) {
      cells.push(cellMatch[1].replace(/<[^>]+>/g, "").trim());
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

function findHeaderSpellColumns(headerCells: string[]): { start: number; count: number } | null {
  const normalized = headerCells.map((c) => c.toLowerCase().replace(/\s+/g, ""));
  let start = -1;
  let count = 0;
  for (let i = 0; i < normalized.length; i++) {
    if (/^0?th$/.test(normalized[i])) {
      start = i;
      count = 1;
      for (let j = i + 1; j < normalized.length && /^(\d+)(st|nd|rd|th)$/.test(normalized[j]); j++) {
        count++;
      }
      break;
    }
  }
  return start >= 0 && count >= 1 ? { start, count: Math.min(count, 10) } : null;
}

function rowLevel(cells: string[]): number | null {
  const first = cells[0]?.trim() ?? "";
  const match = first.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function parseSpellTableFromHtml(
  html: string | null | undefined,
  tableKind: "perDay" | "known",
  casterLevel: number,
): SlotArray | null {
  if (!html) return null;

  const rows = extractTableRows(html);
  if (rows.length === 0) return null;

  let spellCols: { start: number; count: number } | null = null;
  let headerRowIndex = -1;

  for (let i = 0; i < rows.length; i++) {
    const headerText = rows[i].join(" ").toLowerCase();
    const isPerDay = headerText.includes("spells per day");
    const isKnown = headerText.includes("spells known");
    if ((tableKind === "perDay" && isPerDay) || (tableKind === "known" && isKnown)) {
      spellCols = findHeaderSpellColumns(rows[i]);
      headerRowIndex = i;
      break;
    }
  }

  if (!spellCols) {
    for (let i = 0; i < rows.length; i++) {
      const cols = findHeaderSpellColumns(rows[i]);
      if (cols) {
        spellCols = cols;
        headerRowIndex = i;
        break;
      }
    }
  }

  if (!spellCols) return null;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const cells = rows[i];
    const level = rowLevel(cells);
    if (level == null || level !== casterLevel) continue;
    const slice = cells.slice(spellCols.start, spellCols.start + spellCols.count);
    return parseSpellLevelCells(slice);
  }

  return null;
}

export function parseSpellsPerDayFromAdvancementHtml(
  html: string | null | undefined,
  casterLevel: number,
): SlotArray | null {
  return parseSpellTableFromHtml(html, "perDay", casterLevel);
}

export function parseSpellsKnownFromHtml(
  html: string | null | undefined,
  casterLevel: number,
): SlotArray | null {
  return parseSpellTableFromHtml(html, "known", casterLevel);
}

export type { SlotArray as ParsedSlotArray };

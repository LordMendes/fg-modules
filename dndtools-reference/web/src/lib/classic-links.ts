/** Classic dndtools.org URL shapes → canonical site slugs (matches scraper/parsers/classic.py). */

const CLASSIC_ID_RE = /^(.+)--(\d+)$/;

const RECORD_ID_CATEGORIES = [
  "feats",
  "spells",
  "monsters",
  "items",
  "equipment",
  "races",
  "domains",
  "deities",
  "psionics",
  "templates",
  "rules",
] as const;

type RecordIdCategory = (typeof RECORD_ID_CATEGORIES)[number];

function isRecordIdCategory(category: string): category is RecordIdCategory {
  return (RECORD_ID_CATEGORIES as readonly string[]).includes(category);
}

/**
 * Map a classic 3-segment entity pathname to the site's canonical 2-segment path.
 * Returns null when the path is not a classic entity URL.
 */
export function canonicalEntityPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 3) return null;

  const [category, bookPart, recordPart] = segments;

  if (category === "classes") {
    const bookMatch = CLASSIC_ID_RE.exec(bookPart);
    if (!bookMatch) return null;
    return `/classes/${recordPart}-${bookMatch[2]}`;
  }

  if (!isRecordIdCategory(category)) return null;

  const recordMatch = CLASSIC_ID_RE.exec(recordPart);
  if (!recordMatch) return null;

  return `/${category}/${recordMatch[1]}-${recordMatch[2]}`;
}

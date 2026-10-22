export type FeatSectionHtml = {
  prerequisiteHtml: string | null;
  benefitHtml: string | null;
  normalHtml: string | null;
  specialHtml: string | null;
};

const INLINE_LABELS: { key: keyof FeatSectionHtml; pattern: RegExp }[] = [
  { key: "benefitHtml", pattern: /\bB\s*enefits?\s*:/i },
  { key: "normalHtml", pattern: /\bNormals?\s*:/i },
  { key: "specialHtml", pattern: /\bSpecials?\s*:/i },
];

function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function emptyToNull(html: string | null | undefined): string | null {
  if (!html) return null;
  return htmlToText(html) ? html.trim() : null;
}

function wrapParagraph(html: string): string | null {
  const inner = html
    .trim()
    .replace(/^<p\b[^>]*>/i, "")
    .replace(/<\/p>\s*$/i, "")
    .trim();
  if (!htmlToText(inner)) return null;
  return `<p>${inner}</p>`;
}

function similarLead(a: string, b: string): boolean {
  const left = a.toLowerCase().split(/\s+/).filter(Boolean);
  const right = b.toLowerCase().split(/\s+/).filter(Boolean);
  if (left.length < 8 || right.length < 8) return a.toLowerCase() === b.toLowerCase();
  const lead = left.slice(0, 12);
  const pool = new Set(right.slice(0, 20));
  const overlap = lead.filter((word) => pool.has(word)).length;
  return overlap >= 8;
}

function splitParagraphs(html: string): string[] {
  const matches = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi);
  return matches && matches.length > 0 ? matches : [html];
}

function peelInlineSections(html: string): FeatSectionHtml {
  const result: FeatSectionHtml = {
    prerequisiteHtml: html,
    benefitHtml: null,
    normalHtml: null,
    specialHtml: null,
  };

  const matches = INLINE_LABELS.flatMap((label) => {
    const match = label.pattern.exec(html);
    if (!match || match.index === undefined) return [];
    return [{ key: label.key, index: match.index, length: match[0].length }];
  }).sort((a, b) => a.index - b.index);

  if (matches.length === 0) return result;

  const first = matches[0];
  result.prerequisiteHtml = wrapParagraph(html.slice(0, first.index));

  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const end = i + 1 < matches.length ? matches[i + 1].index : html.length;
    const body = wrapParagraph(html.slice(current.index + current.length, end));
    if (!body) continue;
    const existing = result[current.key];
    result[current.key] = existing ? `${existing}${body}` : body;
  }

  return result;
}

function dropLeakedParagraphs(
  prerequisiteHtml: string,
  otherHtml: Array<string | null>,
): string | null {
  const otherTexts = otherHtml
    .map((html) => (html ? htmlToText(html).toLowerCase() : ""))
    .filter(Boolean);
  const kept: string[] = [];

  for (const block of splitParagraphs(prerequisiteHtml)) {
    const text = htmlToText(block);
    if (!text) continue;
    const normalized = text.toLowerCase();
    const leaked = otherTexts.some(
      (other) =>
        normalized === other ||
        (normalized.length >= 40 && other.includes(normalized)) ||
        (other.length >= 40 && normalized.includes(other)) ||
        similarLead(normalized, other),
    );
    if (leaked) continue;
    kept.push(block);
  }

  // Classic overlay appends Benefit/Special as extra <p> tags after the real prereq.
  if (kept.length > 1) {
    return kept[0];
  }

  return kept.length > 0 ? kept.join("") : null;
}

/** Strip Benefit/Normal/Special text that leaked into prerequisiteHtml. */
export function isolateFeatSections(input: FeatSectionHtml): FeatSectionHtml {
  const peeled = input.prerequisiteHtml
    ? peelInlineSections(input.prerequisiteHtml)
    : {
        prerequisiteHtml: null,
        benefitHtml: null,
        normalHtml: null,
        specialHtml: null,
      };

  const benefitHtml = emptyToNull(input.benefitHtml) ?? peeled.benefitHtml;
  const normalHtml = emptyToNull(input.normalHtml) ?? peeled.normalHtml;
  const specialHtml = emptyToNull(input.specialHtml) ?? peeled.specialHtml;
  const prerequisiteHtml = peeled.prerequisiteHtml
    ? dropLeakedParagraphs(peeled.prerequisiteHtml, [
        benefitHtml,
        normalHtml,
        specialHtml,
      ])
    : null;

  return {
    prerequisiteHtml: emptyToNull(prerequisiteHtml),
    benefitHtml,
    normalHtml,
    specialHtml,
  };
}

export function buildFeatSections(
  indexData: Record<string, unknown>,
): { title: string; html: string }[] {
  const value = (key: string): string | null => {
    const raw = indexData[key];
    if (typeof raw !== "string" || raw.length === 0) return null;
    if (raw.includes("Do not touch this field")) return null;
    return raw;
  };

  const isolated = isolateFeatSections({
    prerequisiteHtml: value("prerequisiteHtml"),
    benefitHtml: value("benefitHtml"),
    normalHtml: value("normalHtml"),
    specialHtml: value("specialHtml"),
  });

  return (
    [
      ["Prerequisite", isolated.prerequisiteHtml],
      ["Benefit", isolated.benefitHtml],
      ["Normal", isolated.normalHtml],
      ["Special", isolated.specialHtml],
    ] as const
  ).flatMap(([title, html]) => (html ? [{ title, html }] : []));
}

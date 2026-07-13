import DOMPurify from "isomorphic-dompurify";

const CATEGORY_PREFIXES = [
  "spells",
  "feats",
  "monsters",
  "classes",
  "skills",
  "races",
  "items",
  "equipment",
  "domains",
  "deities",
  "psionics",
  "templates",
  "rules",
] as const;

export function rewriteInternalLinks(html: string | null | undefined): string {
  if (!html) return "";

  let result = html;
  for (const cat of CATEGORY_PREFIXES) {
    result = result.replace(
      new RegExp(`href="/${cat}/([^"]+)"`, "g"),
      `href="/${cat}/$1"`,
    );
    result = result.replace(
      new RegExp(`href='/${cat}/([^']+)'`, "g"),
      `href="/${cat}/$1"`,
    );
  }
  return result;
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  const rewritten = rewriteInternalLinks(html);
  return DOMPurify.sanitize(rewritten, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "b", "i", "u", "a", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "h5", "h6", "table", "thead", "tbody",
      "tr", "th", "td", "span", "div", "blockquote", "sup", "sub",
    ],
    ALLOWED_ATTR: ["href", "class", "colspan", "rowspan"],
  });
}

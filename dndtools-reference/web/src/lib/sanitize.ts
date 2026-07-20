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

function withEntityTableClass(attrs: string): string {
  const classMatch = attrs.match(/\sclass="([^"]*)"/i);
  if (classMatch) {
    const classes = classMatch[1].includes("entity-table")
      ? classMatch[1]
      : `${classMatch[1]} entity-table`.trim();
    return attrs.replace(/\sclass="[^"]*"/i, ` class="${classes}"`);
  }
  return `${attrs} class="entity-table"`;
}

/** Wrap prose tables for scroll + shared entity-table styling. */
export function formatProseHtml(html: string | null | undefined): string {
  const sanitized = sanitizeHtml(html);
  if (!sanitized.includes("<table")) return sanitized;

  return sanitized
    .replace(/<table(\s[^>]*)?>/gi, (_match, attrs = "") => {
      return `<div class="table-wrap"><table${withEntityTableClass(attrs)}>`;
    })
    .replace(/<\/table>/gi, "</table></div>");
}

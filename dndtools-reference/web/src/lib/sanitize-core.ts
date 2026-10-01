import { canonicalEntityPath } from "@/lib/classic-links";

export const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "em", "b", "i", "u", "a", "ul", "ol", "li",
    "h1", "h2", "h3", "h4", "h5", "h6", "table", "thead", "tbody",
    "tr", "th", "td", "span", "div", "blockquote", "sup", "sub",
  ],
  ALLOWED_ATTR: ["href", "class", "colspan", "rowspan"],
};

export type SanitizeConfig = typeof SANITIZE_CONFIG;

export type HtmlSanitizer = {
  sanitize: (html: string, config: SanitizeConfig) => string;
};

/** Last-resort cleanup if DOMPurify cannot run. */
export function fallbackSanitize(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

function rewriteHrefValue(href: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }

  const hashIndex = href.indexOf("#");
  const queryIndex = href.indexOf("?");
  const pathEnd =
    queryIndex === -1
      ? hashIndex === -1
        ? href.length
        : hashIndex
      : hashIndex === -1
        ? queryIndex
        : Math.min(queryIndex, hashIndex);
  const pathOnly = href.slice(0, pathEnd);
  const suffix = href.slice(pathEnd);

  const canonical = canonicalEntityPath(pathOnly);
  return canonical ? `${canonical}${suffix}` : href;
}

export function rewriteInternalLinks(html: string | null | undefined): string {
  if (!html) return "";

  return html.replace(/\bhref=(["'])([^"']*)\1/gi, (_match, _quote, href) => {
    return `href="${rewriteHrefValue(href)}"`;
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
export function wrapProseTables(html: string): string {
  if (!html.includes("<table")) return html;

  return html
    .replace(/<table(\s[^>]*)?>/gi, (_match, attrs = "") => {
      return `<div class="table-wrap"><table${withEntityTableClass(attrs)}>`;
    })
    .replace(/<\/table>/gi, "</table></div>");
}

export function applyHtmlSanitizer(
  html: string | null | undefined,
  sanitizer: HtmlSanitizer | null,
): string {
  if (!html) return "";
  const rewritten = rewriteInternalLinks(html);
  if (!sanitizer) return fallbackSanitize(rewritten);
  try {
    return sanitizer.sanitize(rewritten, SANITIZE_CONFIG);
  } catch (error) {
    console.error("HTML sanitizer failed", error);
    return fallbackSanitize(rewritten);
  }
}

export function formatProseHtmlWith(
  html: string | null | undefined,
  sanitizer: HtmlSanitizer | null,
): string {
  return wrapProseTables(applyHtmlSanitizer(html, sanitizer));
}

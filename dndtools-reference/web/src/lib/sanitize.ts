import { createRequire } from "node:module";
import {
  applyHtmlSanitizer,
  formatProseHtmlWith,
  type HtmlSanitizer,
} from "@/lib/sanitize-core";

export { rewriteInternalLinks } from "@/lib/sanitize-core";

let purify: HtmlSanitizer | null | undefined;

/**
 * isomorphic-dompurify constructs JSDOM at import time. That throws in the
 * standalone image when jsdom is missing or its CSS path is wrong, which 500s
 * every entity page. Load it lazily and fall back to regex sanitizing.
 */
function getPurify(): HtmlSanitizer | null {
  if (purify !== undefined) return purify;
  try {
    const require = createRequire(import.meta.url);
    const loaded = require("isomorphic-dompurify") as
      | HtmlSanitizer
      | { default: HtmlSanitizer };
    const instance =
      loaded && typeof loaded === "object" && "sanitize" in loaded
        ? loaded
        : loaded.default;
    purify = instance ?? null;
  } catch (error) {
    console.error("HTML sanitizer unavailable", error);
    purify = null;
  }
  return purify;
}

export function sanitizeHtml(html: string | null | undefined): string {
  return applyHtmlSanitizer(html, getPurify());
}

export function formatProseHtml(html: string | null | undefined): string {
  return formatProseHtmlWith(html, getPurify());
}

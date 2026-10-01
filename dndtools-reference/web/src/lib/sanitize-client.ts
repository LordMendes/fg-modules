import DOMPurify from "isomorphic-dompurify";
import {
  applyHtmlSanitizer,
  formatProseHtmlWith,
  type HtmlSanitizer,
} from "@/lib/sanitize-core";

export { rewriteInternalLinks } from "@/lib/sanitize-core";

const purify = DOMPurify as unknown as HtmlSanitizer;

export function sanitizeHtml(html: string | null | undefined): string {
  return applyHtmlSanitizer(html, purify);
}

export function formatProseHtml(html: string | null | undefined): string {
  return formatProseHtmlWith(html, purify);
}

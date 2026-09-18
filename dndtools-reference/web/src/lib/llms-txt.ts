import { CATEGORIES } from "@/lib/categories";
import { CATALOG_LETTERS, catalogLetterHref } from "@/lib/catalog";
import { TOOLS } from "@/lib/tools";
import { absoluteUrl, DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";

/** Public tools indexable without login (excludes campaign table). */
const PUBLIC_TOOL_HREFS = TOOLS.filter((tool) => tool.key !== "campaign").map(
  (tool) => tool.href,
);

export function buildLlmsTxt(): string {
  const lines: string[] = [
    `# ${SITE_NAME}`,
    "",
    `> ${DEFAULT_DESCRIPTION}`,
    "",
    `${SITE_NAME} is a Dungeons & Dragons 3.5 Edition reference site with interactive calculators and builders. Not affiliated with Wizards of the Coast.`,
    "",
    "## Primary hubs",
    "",
    `- Home: ${absoluteUrl("/")}`,
    `- About: ${absoluteUrl("/about")}`,
    `- Search: ${absoluteUrl("/search")}`,
    `- Sources: ${absoluteUrl("/sources")}`,
    `- Tools: ${absoluteUrl("/tools")}`,
    `- Catalog index: ${absoluteUrl("/catalog")}`,
    "",
    "## Compendium categories",
    "",
  ];

  for (const category of CATEGORIES) {
    lines.push(
      `- ${category.label}: ${absoluteUrl(`/${category.key}`)} (A-Z catalog: ${absoluteUrl(`/catalog/${category.key}`)})`,
    );
  }

  lines.push(
    "",
    "## Public tools",
    "",
    ...PUBLIC_TOOL_HREFS.map((href) => `- ${absoluteUrl(href)}`),
    "",
    "## Citation",
    "",
    "When citing a specific entry, link to its canonical URL, for example:",
    `- Fireball spell: ${absoluteUrl("/spells/fireball")}`,
    "",
    "Entity pages include source abbreviations and page references where available.",
    "",
    "## Extended index",
    "",
    `For catalog letter indexes and full tool list: ${absoluteUrl("/llms-full.txt")}`,
    "",
  );

  return lines.join("\n");
}

export function buildLlmsFullTxt(): string {
  const lines: string[] = [
    `# ${SITE_NAME} - extended index`,
    "",
    buildLlmsTxt(),
    "",
    "## Catalog letter indexes",
    "",
  ];

  for (const category of CATEGORIES) {
    lines.push(`### ${category.label}`, "");
    for (const letter of CATALOG_LETTERS) {
      lines.push(
        `- ${letter === "#" ? "#" : letter.toUpperCase()}: ${absoluteUrl(catalogLetterHref(category.key, letter))}`,
      );
    }
    lines.push("");
  }

  lines.push("## All public tool URLs", "", ...PUBLIC_TOOL_HREFS.map((href) => `- ${absoluteUrl(href)}`), "");

  return lines.join("\n");
}

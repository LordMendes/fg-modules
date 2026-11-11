import { CATEGORIES } from "@/lib/categories";
import { CATALOG_LETTERS, catalogLetterHref, catalogLetterLabel } from "@/lib/catalog";
import { TOOLS } from "@/lib/tools";
import { absoluteUrl, DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";

/** Public tools indexable without login (excludes campaign table). */
const PUBLIC_TOOLS = TOOLS.filter((tool) => tool.key !== "campaign");

/** Markdown link. Lighthouse's llms.txt audit only counts `[label](url)`, not bare URLs. */
function mdLink(label: string, path: string): string {
  return `[${label}](${absoluteUrl(path)})`;
}

function bullet(label: string, path: string, note?: string): string {
  const item = `- ${mdLink(label, path)}`;
  return note ? `${item}: ${note}` : item;
}

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
    bullet("Home", "/"),
    bullet("About", "/about"),
    bullet("Search", "/search"),
    bullet("Sources", "/sources"),
    bullet("Tools", "/tools"),
    bullet("Catalog index", "/catalog"),
    "",
    "## Compendium categories",
    "",
  ];

  for (const category of CATEGORIES) {
    lines.push(
      bullet(category.label, `/${category.key}`, mdLink("A-Z catalog", `/catalog/${category.key}`)),
    );
  }

  lines.push(
    "",
    "## Public tools",
    "",
    ...PUBLIC_TOOLS.map((tool) => bullet(tool.label, tool.href)),
    "",
    "## Citation",
    "",
    "When citing a specific entry, link to its canonical URL, for example:",
    bullet("Fireball spell", "/spells/fireball"),
    "",
    "Entity pages include source abbreviations and page references where available.",
    "",
    "## Extended index",
    "",
    `For catalog letter indexes and the full tool list, see ${mdLink("llms-full.txt", "/llms-full.txt")}.`,
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
      lines.push(bullet(catalogLetterLabel(letter), catalogLetterHref(category.key, letter)));
    }
    lines.push("");
  }

  lines.push(
    "## All public tool URLs",
    "",
    ...PUBLIC_TOOLS.map((tool) => bullet(tool.label, tool.href)),
    "",
  );

  return lines.join("\n");
}

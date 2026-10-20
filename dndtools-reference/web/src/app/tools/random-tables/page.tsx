import Link from "next/link";
import { Suspense } from "react";
import { RandomTablesTool } from "@/components/tools/random-tables";
import { ToolExplainer } from "@/components/tool-explainer";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getToolFaqs } from "@/lib/tool-faqs";

const faqs = getToolFaqs("random-tables");

const TOOL_PATH = "/tools/random-tables";
const TOOL_NAME = "Random Tables";
const TOOL_DESCRIPTION =
  "Roll traps, NPC sketches, pocket loot, magic items, and spellbooks from the compendium.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function RandomTablesPage() {
  return (
    <>
      <JsonLd
        data={toolPageJsonLd(
          [
            { name: "Home", path: "/" },
            { name: "Tools", path: "/tools" },
            { name: TOOL_NAME, path: TOOL_PATH },
          ],
          {
            name: TOOL_NAME,
            description: TOOL_DESCRIPTION,
            url: absoluteUrl(TOOL_PATH),
          },
          absoluteUrl,
          faqs,
        )}
      />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/tools">Tools</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">Random Tables</span>
      </nav>

      <div className="page-header">
        <h1>Random Tables</h1>
        <p>
          Pick a table type, set how many rows you need, and roll keyed results
          for traps, quick NPCs, pocket change, magic gear, or wizard spellbooks.
        </p>
        <p>
          <em>Trap DCs and treasure ranks follow Dungeon Master&apos;s Guide style tables.</em>
        </p>
      </div>

      <Suspense fallback={null}>
        <RandomTablesTool />
      </Suspense>
      <ToolExplainer faqs={faqs} />
    </>
  );
}

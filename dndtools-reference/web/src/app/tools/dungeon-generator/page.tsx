import Link from "next/link";
import { Suspense } from "react";
import { DungeonGenerator } from "@/components/tools/dungeon-generator";
import { ToolExplainer } from "@/components/tool-explainer";
import { ToolLicenseFooter } from "@/components/tool-license-footer";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getToolFaqs } from "@/lib/tool-faqs";

const faqs = getToolFaqs("dungeon-generator");

const TOOL_PATH = "/tools/dungeon-generator";
const TOOL_NAME = "Dungeon Generator";
const TOOL_DESCRIPTION =
  "Generate a keyed dungeon map with rooms, corridors, doors, stairs, and level-appropriate contents.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function DungeonGeneratorPage() {
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
        <span aria-current="page">Dungeon Generator</span>
      </nav>

      <div className="page-header">
        <h1>Dungeon Generator</h1>
        <p>
          Build a keyed dungeon for your next delve: rooms, corridors, doors,
          and stairs on an SVG map, with stocking tuned to dungeon level.{" "}
          <em>Dungeon Master&apos;s Guide</em> treasure tables feed hoard lines
          when you roll treasure.
        </p>
      </div>

      <Suspense fallback={null}>
        <DungeonGenerator />
      </Suspense>
      <ToolExplainer faqs={faqs} />
      <ToolLicenseFooter toolKey="dungeon-generator" />
    </>
  );
}

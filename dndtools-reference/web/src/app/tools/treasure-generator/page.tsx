import Link from "next/link";
import { Suspense } from "react";
import { TreasureGenerator } from "@/components/tools/treasure-generator";
import { ToolExplainer } from "@/components/tool-explainer";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getToolFaqs } from "@/lib/tool-faqs";

const faqs = getToolFaqs("treasure-generator");

const TOOL_PATH = "/tools/treasure-generator";
const TOOL_NAME = "Treasure Generator";
const TOOL_DESCRIPTION =
  "Roll Dungeon Master's Guide treasure by level: coins, gems, art, mundane gear, and magic items.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function TreasureGeneratorPage() {
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
        <span aria-current="page">Treasure Generator</span>
      </nav>

      <div className="page-header">
        <h1>Treasure Generator</h1>
        <p>
          Roll treasure hoards using <em>Dungeon Master&apos;s Guide</em> tables for
          coins, valuables, mundane gear, and random magic items. Use a seed to
          reproduce the same hoard.
        </p>
      </div>

      <Suspense fallback={null}>
        <TreasureGenerator />
      </Suspense>
      <ToolExplainer faqs={faqs} />
    </>
  );
}
